import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { splitRepayment } from "@/lib/financial";
import { verifyPayment } from "@/lib/paychangu";

type PaymentData = {
  charge_id?: string;
  tx_ref?: string;
  reference?: string;
  amount?: number | string;
  currency?: string;
  status?: string;
};

type PaymentEvent = {
  event_type?: string;
  status?: string;
  data?: PaymentData;
} & PaymentData;

function amountsMatch(expected: number, received: unknown): boolean {
  const value = typeof received === "number" ? received : Number(received);
  return Number.isFinite(value) && value > 0 && Math.round(value * 100) === Math.round(expected * 100);
}

function paymentReference(data: PaymentData | undefined): string | null {
  const reference = data?.tx_ref || data?.reference;
  return typeof reference === "string" && reference.length > 0 ? reference : null;
}

function eventPayload(event: PaymentEvent): PaymentData {
  return { ...event, ...event.data };
}

function isSuccessful(event: PaymentEvent, data: PaymentData): boolean {
  return event.status === "success" || data.status === "success" || event.event_type === "transaction.successful";
}

function isFailed(event: PaymentEvent, data: PaymentData): boolean {
  return event.status === "failed" || data.status === "failed" || event.event_type === "transaction.failed";
}

export async function POST(request: NextRequest) {
  let webhookEventId: string | undefined;
  try {
    const body = await request.text();
    // PayChangu signs webhooks with the webhook secret generated in its dashboard,
    // not with the API secret used to initiate or verify payments.
    const signature = request.headers.get("signature");
    const webhookSecret = process.env.PAYCHANGU_WEBHOOK_SECRET;
    if (!webhookSecret) return NextResponse.json({ error: "Server configuration error" }, { status: 500 });

    const expectedSignature = crypto.createHmac("sha256", webhookSecret).update(body).digest("hex");
    if (!signature || signature.length !== expectedSignature.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const event = JSON.parse(body) as PaymentEvent;
    const data = eventPayload(event);
    if (!paymentReference(data)) return NextResponse.json({ error: "Invalid payment payload" }, { status: 400 });

    const eventRecord = await db.paymentWebhookEvent.upsert({
      where: { payloadHash: crypto.createHash("sha256").update(body).digest("hex") },
      create: {
        provider: "PAYCHANGU",
        payloadHash: crypto.createHash("sha256").update(body).digest("hex"),
        eventType: event.event_type,
        reference: paymentReference(data),
        status: data.status || event.status,
        payload: event,
      },
      update: { receivedAt: new Date() },
    });
    webhookEventId = eventRecord.id;

    if (isSuccessful(event, data)) {
      await handleSuccessfulPayment(data);
    } else if (isFailed(event, data)) {
      await handleFailedPayment(data);
    }
    await db.paymentWebhookEvent.update({ where: { id: eventRecord.id }, data: { processedAt: new Date(), error: null } });
    return NextResponse.json({ status: "received" });
  } catch (error) {
    if (webhookEventId) {
      await db.paymentWebhookEvent.update({
        where: { id: webhookEventId },
        data: { error: error instanceof Error ? error.message.slice(0, 1000) : "Unknown processing error" },
      }).catch(() => undefined);
    }
    console.error("Webhook processing failed", error);
    // A 5xx tells the provider to retry; all processors below are idempotent.
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function handleSuccessfulPayment(data: PaymentData): Promise<void> {
  const reference = paymentReference(data);
  if (!reference) throw new Error("Payment event has no reference");

  // A signed webhook is a notification, not payment proof. Re-query PayChangu
  // before crediting any local ledger entry.
  const verification = await verifyPayment(reference);
  const providerPayment = verification.data;
  if (
    verification.status !== "success" ||
    providerPayment?.status !== "success" ||
    providerPayment.tx_ref !== reference ||
    providerPayment.currency !== "MWK"
  ) {
    throw new Error(`PayChangu verification failed for ${reference}`);
  }
  const verifiedAmount = providerPayment.amount;

  // The local pending record—not client-controlled metadata—determines what is credited.
  const repayment = await db.loanRepayment.findUnique({ where: { reference } });
  if (repayment) {
    if (!amountsMatch(repayment.amount, verifiedAmount)) throw new Error(`Amount mismatch for repayment ${reference}`);
    await processLoanRepayment(repayment.id);
    return;
  }

  const deposit = await db.savingsTransaction.findFirst({ where: { reference, method: "PAYCHANGU" } });
  if (deposit) {
    if (!amountsMatch(deposit.amount, verifiedAmount)) throw new Error(`Amount mismatch for savings deposit ${reference}`);
    await processSavingsDeposit(deposit.id);
    return;
  }

  const sharePurchase = await db.shareTransaction.findFirst({ where: { reference } });
  if (sharePurchase) {
    if (!amountsMatch(sharePurchase.totalAmount, verifiedAmount)) throw new Error(`Amount mismatch for share purchase ${reference}`);
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

export async function handleFailedPayment(data: PaymentData): Promise<void> {
  const reference = paymentReference(data);
  if (!reference) return;

  await db.$transaction(async (tx) => {
    await tx.loanRepayment.updateMany({ where: { reference, status: "PENDING" }, data: { status: "FAILED" } });
    await tx.savingsTransaction.updateMany({ where: { reference, status: "PENDING" }, data: { status: "FAILED" } });
    await tx.shareTransaction.updateMany({ where: { reference, status: "PENDING" }, data: { status: "FAILED" } });
  });
}
