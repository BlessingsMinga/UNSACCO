import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";
import { SHARE_PRICE, LOAN_INTEREST_RATE } from "@/lib/constants";

export async function POST(request: NextRequest) {
    try {
        const body = await request.text();
        const signature = request.headers.get("paychangu-signature");
        const secretKey = process.env.PAYCHANGU_SECRET_KEY;
        if (!secretKey) {
            console.error("PAYCHANGU_SECRET_KEY is not configured");
            return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
        }
        const expectedSignature = crypto
            .createHmac("sha256", secretKey)
            .update(body)
            .digest("hex");
        if (!signature || !crypto.timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(expectedSignature, "hex"))) {
            return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
        }
        const event = JSON.parse(body);
        console.log("PayChangu Webhook Event:", event.event_type);
        switch (event.event_type) {
            case "transaction.successful":
                await handleSuccessfulPayment(event.data);
                break;
            case "transaction.failed":
                await handleFailedPayment(event.data);
                break;
            default:
                console.log("Unhandled event type:", event.event_type);
        }
        return NextResponse.json({ status: "received" });
    } catch (error) {
        console.error("Webhook error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

async function handleSuccessfulPayment(data: any) {
    const { charge_id, tx_ref, amount, meta } = data;
    const reference = charge_id || tx_ref;
    console.log("Payment successful:", reference, amount, "MWK", meta);
    const paymentType = meta?.type || "UNKNOWN";
    switch (paymentType) {
        case "LOAN_REPAYMENT":
            await processLoanRepayment(reference, amount, meta);
            break;
        case "SAVINGS_DEPOSIT":
            await processSavingsDeposit(reference, amount, meta);
            break;
        case "SHARE_PURCHASE":
            await processSharePurchase(reference, amount, meta);
            break;
        default:
            const repayment = await db.loanRepayment.findUnique({ where: { reference } });
            if (repayment) {
                await processLoanRepayment(reference, amount, meta);
            } else {
                console.log("Unknown payment type:", paymentType, "for", reference);
            }
    }
}

async function processLoanRepayment(reference: string, amount: number, meta: any) {
    const repayment = await db.loanRepayment.findUnique({
        where: { reference },
        include: { loan: { include: { product: true } } },
    });
    if (!repayment) { console.error("Repayment not found for reference:", reference); return; }
    if (repayment.status !== "PENDING") {
        console.log("Repayment", reference, "already processed (status:", repayment.status, ")");
        return;
    }
    const loan = repayment.loan;
    await db.$transaction(async (tx) => {
        // Re-read loan inside transaction to avoid stale balance race conditions
        const freshLoan = await tx.loanApplication.findUnique({
            where: { id: loan.id },
            include: { product: true },
        });
        if (!freshLoan) { console.error("Loan not found for repayment:", reference); return; }

        const currentBalance = freshLoan.balance;
        const annualRate = freshLoan.interestRate || LOAN_INTEREST_RATE;

        // Calculate interest portion: monthly interest on current balance
        // Using standard reducing-balance convention: interest = balance × (rate/100/12)
        const monthlyInterest = currentBalance * (annualRate / 100 / 12);
        let interestPortion = Math.min(amount, monthlyInterest);
        interestPortion = Math.round(interestPortion * 100) / 100; // avoid floating-point noise

        // Principal is the remainder after covering interest
        let principalPortion = amount - interestPortion;
        // Cap principal at remaining balance
        if (principalPortion > currentBalance) {
            principalPortion = currentBalance;
            interestPortion = amount - principalPortion;
        }
        // If amount is less than interest, all goes to interest
        if (principalPortion < 0) {
            principalPortion = 0;
            interestPortion = amount;
        }

        const newBalance = Math.max(0, currentBalance - principalPortion);

        await tx.loanRepayment.update({
            where: { id: repayment.id },
            data: {
                status: "PAID",
                principalPortion,
                interestPortion,
                paidDate: new Date(),
                balanceAfter: newBalance,
            },
        });

        // Record a savings deposit — member paid INTO the SACCO via mobile money
        const savings = await tx.savingsAccount.findUnique({ where: { userId: loan.userId } });
        if (savings) {
            const newSavingsBalance = savings.balance + amount;
            await tx.savingsAccount.update({ where: { id: savings.id }, data: { balance: newSavingsBalance } });
            await tx.savingsTransaction.create({
                data: {
                    accountId: savings.id, userId: loan.userId, type: "LOAN_REPAYMENT",
                    amount, balanceAfter: newSavingsBalance,
                    description: "Loan repayment via PayChangu - " + (freshLoan.product?.name || "Loan"),
                    reference, method: "PAYCHANGU", status: "COMPLETED",
                },
            });
        }

        await tx.loanApplication.update({
            where: { id: loan.id },
            data: {
                balance: { decrement: principalPortion },
                ...(newBalance <= 0 ? { status: "CLOSED", closedAt: new Date() } : {}),
            },
        });
    });
    console.log("Loan repayment completed:", reference);
}

async function processSavingsDeposit(reference: string, amount: number, meta: any) {
    const userId = meta?.userId;
    if (!userId) { console.error("No userId in meta for savings deposit:", reference); return; }
    const existingTxn = await db.savingsTransaction.findFirst({ where: { reference, status: "COMPLETED" } });
    if (existingTxn) { console.log("Savings deposit", reference, "already processed (idempotency skip)"); return; }
    await db.$transaction(async (tx) => {
        const savings = await tx.savingsAccount.findUnique({ where: { userId } });
        if (!savings) { console.error("Savings account not found for user", userId); return; }
        const newBalance = savings.balance + amount;
        await tx.savingsAccount.update({ where: { id: savings.id }, data: { balance: newBalance } });
        await tx.savingsTransaction.create({
            data: {
                accountId: savings.id, userId, type: "DEPOSIT",
                amount, balanceAfter: newBalance,
                description: meta.description || "Deposit via PayChangu",
                reference, method: "PAYCHANGU", status: "COMPLETED",
            },
        });
    });
    console.log("Savings deposit completed:", reference, amount, "MWK");
}

async function processSharePurchase(reference: string, amount: number, meta: any) {
    const userId = meta?.userId;
    if (!userId) { console.error("No userId in meta for share purchase:", reference); return; }
    const existingTxn = await db.shareTransaction.findFirst({ where: { reference, status: "COMPLETED" } });
    if (existingTxn) { console.log("Share purchase", reference, "already processed (idempotency skip)"); return; }
    const numberOfShares = meta?.numberOfShares ? parseInt(meta.numberOfShares, 10) : Math.floor(amount / SHARE_PRICE);
    await db.$transaction(async (tx) => {
        const holding = await tx.shareHolding.findUnique({ where: { userId } });
        if (!holding) { console.error("Share holding not found for user", userId); return; }
        const sharesAfter = holding.numberOfShares + numberOfShares;
        const totalValue = sharesAfter * SHARE_PRICE;
        await tx.shareHolding.update({ where: { id: holding.id }, data: { numberOfShares: sharesAfter, totalValue } });
        await tx.shareTransaction.create({
            data: {
                holdingId: holding.id, userId, type: "BUY",
                numberOfShares, pricePerShare: SHARE_PRICE, totalAmount: amount,
                sharesAfter, reference, status: "COMPLETED",
            },
        });
    });
    console.log("Share purchase completed:", reference, numberOfShares, "shares");
}

async function handleFailedPayment(data: any) {
    const { charge_id, tx_ref, amount, meta } = data;
    const reference = charge_id || tx_ref;
    console.log("Payment failed:", reference, amount, "MWK");
    const paymentType = meta?.type || "UNKNOWN";
    switch (paymentType) {
        case "LOAN_REPAYMENT": {
            const repayment = await db.loanRepayment.findUnique({ where: { reference } });
            if (repayment && repayment.status === "PENDING") {
                await db.loanRepayment.update({ where: { id: repayment.id }, data: { status: "FAILED" } });
                console.log("Loan repayment marked as failed:", reference);
            }
            break;
        }
        case "SAVINGS_DEPOSIT": {
            const txn = await db.savingsTransaction.findFirst({ where: { reference, status: "PENDING" } });
            if (txn) {
                await db.savingsTransaction.update({ where: { id: txn.id }, data: { status: "FAILED" } });
                console.log("Savings deposit marked as failed:", reference);
            }
            break;
        }
        case "SHARE_PURCHASE": {
            const txn = await db.shareTransaction.findFirst({ where: { reference, status: "PENDING" } });
            if (txn) {
                await db.shareTransaction.update({ where: { id: txn.id }, data: { status: "FAILED" } });
                console.log("Share purchase marked as failed:", reference);
            }
            break;
        }
        default:
            console.log("Unknown payment type for failed payment:", paymentType, reference);
    }
}