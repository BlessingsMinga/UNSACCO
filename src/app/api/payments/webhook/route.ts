import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { splitRepayment } from "@/lib/financial";

type PaymentData = {
  charge_id?: string;
  tx_ref?: string;
  amount?: number | string;
};

type PaymentEvent = {
  event_type?: string;
  data?: PaymentData;
};

function amountsMatch(expected: number, received: unknown): boolean {
  const value = typeof received === "number" ? received : Number(received);
  return Number.isFinite(value) && value > 0 && Math.round(value * 100) === Math.round(expected * 100);
}

function paymentReference(data: PaymentData | undefined): string | null {
  const reference = data?.tx_ref || data?.charge_id;
  return typeof reference === "string" && reference.length > 0 ? reference : null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get("paychangu-signature");
    const secretKey = process.env.PAYCHANGU_SECRET_KEY;
    if (!secretKey) return NextResponse.json({ error: "Server configuration error" }, { status: 500 });

    const expectedSignature = crypto.createHmac("sha256", secretKey).update(body).digest("hex");
    if (!signature || signature.length !== expectedSignature.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const event = JSON.parse(body) as PaymentEvent;
    if (!event.data) return NextResponse.json({ error: "Invalid payment payload" }, { status: 400 });

    if (event.event_type === "transaction.successful") {
      await handleSuccessfulPayment(event.data);
    } else if (event.event_type === "transaction.failed") {
      await handleFailedPayment(event.data);
    }
    return NextResponse.json({ status: "received" });
  } catch (error) {
    console.error("Webhook processing failed", error);
    // A 5xx tells the provider to retry; all processors below are idempotent.
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

async function handleSuccessfulPayment(data: PaymentData): Promise<void> {
  const reference = paymentReference(data);
  if (!reference) throw new Error("Payment event has no reference");

  // The local pending record—not client-controlled metadata—determines what is credited.
  const repayment = await db.loanRepayment.findUnique({ where: { reference } });
  if (repayment) {
    if (!amountsMatch(repayment.amount, data.amount)) throw new Error(`Amount mismatch for repayment ${reference}`);
    await processLoanRepayment(repayment.id);
    return;
  }

  const deposit = await db.savingsTransaction.findFirst({ where: { reference, method: "PAYCHANGU" } });
  if (deposit) {
    if (!amountsMatch(deposit.amount, data.amount)) throw new Error(`Amount mismatch for savings deposit ${reference}`);
    await processSavingsDeposit(deposit.id);
    return;
  }

  const sharePurchase = await db.shareTransaction.findFirst({ where: { reference } });
  if (sharePurchase) {
    if (!amountsMatch(sharePurchase.totalAmount, data.amount)) throw new Error(`Amount mismatch for share purchase ${reference}`);
    await processSharePurchase(sharePurchase.id);
    return;
  }

  throw new Error(`No pending local transaction for payment ${reference}`);
}

async function processLoanRepayment(repaymentId: string): Promise<void> {
  await db.$transaction(async (tx) => {
    const repayment = await tx.loanRepayment.findUnique({
      where: { id: repaymentId },
      include: { loan: true },
    });
    if (!repayment || repayment.status === "PAID") return;
    if (repayment.status !== "PENDING") throw new Error(`Repayment ${repaymentId} is not processable`);

    // Claim first. A duplicate webhook can never apply the payment twice.
    const claimed = await tx.loanRepayment.updateMany({
      where: { id: repayment.id, status: "PENDING" },
      data: { status: "PROCESSING" },
    });
    if (claimed.count !== 1) return;

    const loan = repayment.loan;
    if (loan.status !== "DISBURSED" || loan.balance <= 0) {
      throw new Error(`Loan ${loan.id} cannot receive a repayment`);
    }
    const { principalPortion, interestPortion } = splitRepayment(repayment.amount, loan.balance, loan.interestRate);
    const balanceAfter = Math.max(0, loan.balance - principalPortion);

    // The repayment and outstanding balance change together. Do not credit the
    // borrower's savings account: a loan repayment is not a savings deposit.
    await tx.loanApplication.update({
      where: { id: loan.id },
      data: {
        balance: balanceAfter,
        ...(balanceAfter === 0 ? { status: "CLOSED", closedAt: new Date() } : {}),
      },
    });
    await tx.loanRepayment.update({
      where: { id: repayment.id },
      data: { status: "PAID", principalPortion, interestPortion, balanceAfter, paidDate: new Date() },
    });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

async function processSavingsDeposit(transactionId: string): Promise<void> {
  await db.$transaction(async (tx) => {
    const deposit = await tx.savingsTransaction.findUnique({ where: { id: transactionId } });
    if (!deposit || deposit.status === "COMPLETED") return;
    if (deposit.status !== "PENDING") throw new Error(`Savings deposit ${transactionId} is not processable`);

    const claimed = await tx.savingsTransaction.updateMany({
      where: { id: deposit.id, status: "PENDING" },
      data: { status: "PROCESSING" },
    });
    if (claimed.count !== 1) return;

    const account = await tx.savingsAccount.update({
      where: { id: deposit.accountId },
      data: { balance: { increment: deposit.amount } },
    });
    await tx.savingsTransaction.update({
      where: { id: deposit.id },
      data: { status: "COMPLETED", balanceAfter: account.balance },
    });
  });
}

async function processSharePurchase(transactionId: string): Promise<void> {
  await db.$transaction(async (tx) => {
    const purchase = await tx.shareTransaction.findUnique({ where: { id: transactionId } });
    if (!purchase || purchase.status === "COMPLETED") return;
    if (purchase.status !== "PENDING") throw new Error(`Share purchase ${transactionId} is not processable`);

    const claimed = await tx.shareTransaction.updateMany({
      where: { id: purchase.id, status: "PENDING" },
      data: { status: "PROCESSING" },
    });
    if (claimed.count !== 1) return;

    const holding = await tx.shareHolding.update({
      where: { id: purchase.holdingId },
      data: {
        numberOfShares: { increment: purchase.numberOfShares },
        totalValue: { increment: purchase.totalAmount },
      },
    });
    await tx.shareTransaction.update({
      where: { id: purchase.id },
      data: { status: "COMPLETED", sharesAfter: holding.numberOfShares },
    });
  });
}

async function handleFailedPayment(data: PaymentData): Promise<void> {
  const reference = paymentReference(data);
  if (!reference) return;

  await db.$transaction(async (tx) => {
    await tx.loanRepayment.updateMany({ where: { reference, status: "PENDING" }, data: { status: "FAILED" } });
    await tx.savingsTransaction.updateMany({ where: { reference, status: "PENDING" }, data: { status: "FAILED" } });
    await tx.shareTransaction.updateMany({ where: { reference, status: "PENDING" }, data: { status: "FAILED" } });
  });
}
