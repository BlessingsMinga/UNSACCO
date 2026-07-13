/**
 * Scheduled task system for UNSACCO.
 * Handles periodic financial operations:
 * - Monthly savings interest crediting
 * - Loan repayment due date tracking
 * - Late payment penalty application
 * - Dividend payout processing
 * - Member status cleanup
 *
 * These can be triggered via:
 * 1. Vercel Cron Jobs (serverless functions)
 * 2. A standalone Node.js worker
 * 3. Manual admin trigger via API
 */

import { db } from "@/lib/db";
import { calculateMonthlySavingsInterest } from "@/lib/financial";
import {
    SAVINGS_INTEREST_RATE,
    LOAN_LATE_PENALTY,
} from "@/lib/constants";
import { verifyPayment, verifyPayout } from "@/lib/paychangu";
import { handleFailedPayment, handleSuccessfulPayment } from "@/app/api/payments/webhook/route";

// ── Savings Interest ─────────────────────────────────────────────────────────

/**
 * Credit monthly interest to all savings accounts.
 * Interest = balance × (annualRate / 100 / 12)
 * Rounded to 2 decimal places.
 *
 * Should be run on the 1st of every month.
 */
export async function creditMonthlyInterest(): Promise<{ totalAccounts: number; totalInterest: number }> {
    const accounts = await db.savingsAccount.findMany({
        include: { user: { select: { id: true } } },
    });

    let totalInterest = 0;
    let totalAccounts = 0;

    for (const account of accounts) {
        if (account.balance <= 0) continue;

        const interest = calculateMonthlySavingsInterest(account.balance, SAVINGS_INTEREST_RATE);
        if (interest <= 0) continue;

        await db.$transaction(async (tx) => {
            const newBalance = account.balance + interest;
            const newAccrued = (account.interestAccrued || 0) + interest;

            await tx.savingsAccount.update({
                where: { id: account.id },
                data: {
                    balance: newBalance,
                    interestAccrued: newAccrued,
                },
            });

            await tx.savingsTransaction.create({
                data: {
                    accountId: account.id,
                    userId: account.user.id,
                    type: "INTEREST",
                    amount: interest,
                    balanceAfter: newBalance,
                    description: `Monthly interest credit (${SAVINGS_INTEREST_RATE}% p.a.)`,
                    reference: `INT-${new Date().toISOString().slice(0, 7).replace("-", "")}-${account.id.slice(0, 6)}`,
                    method: "SYSTEM",
                    status: "COMPLETED",
                },
            });
        });

        totalInterest += interest;
        totalAccounts++;
    }

    console.log(`[CRON] Credited interest: ${totalAccounts} accounts, MK ${totalInterest.toFixed(2)} total`);
    return { totalAccounts, totalInterest };
}

// ── Loan Overdue Detection ───────────────────────────────────────────────────

/**
 * Mark loan repayments as OVERDUE if past their due date.
 * Apply late payment penalties.
 *
 * Should be run daily.
 */
export async function processOverdueLoans(): Promise<{
    markedOverdue: number;
    penaltiesApplied: number;
    totalPenalty: number;
}> {
    const now = new Date();

    // Find all PENDING repayments past their due date
    const overdueRepayments = await db.loanRepayment.findMany({
        where: {
            status: "PENDING",
            dueDate: { lt: now },
        },
        include: {
            loan: {
                include: { product: true },
            },
        },
    });

    let markedOverdue = 0;
    let penaltiesApplied = 0;
    let totalPenalty = 0;

    for (const repayment of overdueRepayments) {
        // Mark repayment as overdue
        await db.loanRepayment.update({
            where: { id: repayment.id },
            data: { status: "OVERDUE" },
        });
        markedOverdue++;

        // Apply late penalty if configured
        const penaltyRate = repayment.loan.product?.latePaymentPenalty || LOAN_LATE_PENALTY;
        if (penaltyRate > 0) {
            const penalty = repayment.amount * (penaltyRate / 100);
            // Add penalty to loan balance
            await db.loanApplication.update({
                where: { id: repayment.loan.id },
                data: { balance: { increment: penalty } },
            });
            penaltiesApplied++;
            totalPenalty += penalty;
        }
    }

    console.log(`[CRON] Overdue loans: ${markedOverdue} marked overdue, ${penaltiesApplied} penalties applied (MK ${totalPenalty.toFixed(2)})`);
    return { markedOverdue, penaltiesApplied, totalPenalty };
}

// ── Dividend Auto-Payout ─────────────────────────────────────────────────────

/**
 * Process pending dividend payouts by disbursing to member savings accounts.
 * Should be run after dividends are declared.
 */
export async function processDividendPayouts(): Promise<{
    processed: number;
    totalAmount: number;
}> {
    const pendingPayouts = await db.dividendPayout.findMany({
        where: { status: "PENDING" },
        include: { declaration: true, user: true },
    });

    let processed = 0;
    let totalAmount = 0;

    for (const payout of pendingPayouts) {
        const netAmount = payout.netAmount;
        if (netAmount <= 0) continue;

        await db.$transaction(async (tx) => {
            // Credit to member's savings account
            const savings = await tx.savingsAccount.findUnique({
                where: { userId: payout.userId },
            });

            if (savings) {
                const newBalance = savings.balance + netAmount;
                await tx.savingsAccount.update({
                    where: { id: savings.id },
                    data: { balance: newBalance },
                });

                await tx.savingsTransaction.create({
                    data: {
                        accountId: savings.id,
                        userId: payout.userId,
                        type: "DIVIDEND",
                        amount: netAmount,
                        balanceAfter: newBalance,
                        description: `Dividend payout: ${payout.declaration.label}`,
                        reference: payout.reference || `DIV-${payout.id.slice(0, 8)}`,
                        method: "SYSTEM",
                        status: "COMPLETED",
                    },
                });
            }

            // Mark payout as completed
            await tx.dividendPayout.update({
                where: { id: payout.id },
                data: {
                    status: "PAID",
                    paidAt: new Date(),
                    reference: payout.reference || `DIV-${payout.id.slice(0, 8)}`,
                },
            });
        });

        processed++;
        totalAmount += netAmount;
    }

    if (pendingPayouts.length > 0) {
        // Mark declaration as paid out if all individual payouts are processed
        const declarationId = pendingPayouts[0].declarationId;
        const remainingPayouts = await db.dividendPayout.count({
            where: { declarationId, status: { not: "PAID" } },
        });

        if (remainingPayouts === 0) {
            await db.dividendDeclaration.update({
                where: { id: declarationId },
                data: { status: "PAID_OUT", paidOutAt: new Date() },
            });
        }
    }

    console.log(`[CRON] Dividend payouts: ${processed} processed, MK ${totalAmount.toFixed(2)} total`);
    return { processed, totalAmount };
}

// ── PayChangu payout reconciliation ─────────────────────────────────────────

/** Complete or reverse reserved withdrawals only after provider settlement. */
export async function reconcilePaychanguPayouts(): Promise<{ settled: number; failed: number; creditedPayments: number }> {
    const withdrawals = await db.savingsTransaction.findMany({
        where: { type: "WITHDRAWAL", method: "PAYCHANGU", status: "PROCESSING" },
        take: 100,
    });
    let settled = 0;
    let failed = 0;
    let creditedPayments = 0;

    for (const withdrawal of withdrawals) {
        try {
            const result = await verifyPayout(withdrawal.reference);
            const status = result.data?.transaction?.status?.toLowerCase();
            if (["success", "successful", "completed"].includes(status || "")) {
                const completed = await db.savingsTransaction.updateMany({
                    where: { id: withdrawal.id, status: "PROCESSING" },
                    data: { status: "COMPLETED", description: withdrawal.description.replace(" (awaiting settlement)", "") },
                });
                settled += completed.count;
            } else if (["failed", "cancelled", "reversed"].includes(status || "")) {
                await db.$transaction(async (tx) => {
                    const markedFailed = await tx.savingsTransaction.updateMany({
                        where: { id: withdrawal.id, status: "PROCESSING" },
                        data: { status: "FAILED" },
                    });
                    if (markedFailed.count === 1) {
                        await tx.savingsAccount.update({ where: { id: withdrawal.accountId }, data: { balance: { increment: withdrawal.amount } } });
                        failed++;
                    }
                });
            }
        } catch (error) {
            console.error(`[CRON] PayChangu payout reconciliation failed for ${withdrawal.reference}`, error);
        }
    }
    const pendingReferences = await Promise.all([
        db.loanRepayment.findMany({ where: { method: "PAYCHANGU", status: "PENDING" }, select: { reference: true }, take: 100 }),
        db.savingsTransaction.findMany({ where: { type: "DEPOSIT", method: "PAYCHANGU", status: "PENDING" }, select: { reference: true }, take: 100 }),
        db.shareTransaction.findMany({ where: { status: "PENDING" }, select: { reference: true }, take: 100 }),
    ]);
    for (const reference of new Set(pendingReferences.flat().map(({ reference }) => reference))) {
        try {
            const verification = await verifyPayment(reference);
            if (verification.data?.status === "success") {
                await handleSuccessfulPayment({ tx_ref: reference });
                creditedPayments++;
            } else if (verification.data?.status === "failed") {
                await handleFailedPayment({ tx_ref: reference });
            }
        } catch {
            // Pending and failed provider results are expected; the next run retries.
        }
    }
    return { settled, failed, creditedPayments };
}

// ── Master Cron Runner ───────────────────────────────────────────────────────

/**
 * Run all scheduled tasks.
 * Returns a summary of what was done.
 */
export async function runAllCronJobs(): Promise<{
    interest: { totalAccounts: number; totalInterest: number };
    overdue: { markedOverdue: number; penaltiesApplied: number; totalPenalty: number };
    dividends: { processed: number; totalAmount: number };
    paychanguPayouts: { settled: number; failed: number; creditedPayments: number };
}> {
    console.log("[CRON] Starting all scheduled jobs...");

    const [interest, overdue, dividends, paychanguPayouts] = await Promise.all([
        creditMonthlyInterest().catch((e) => {
            console.error("[CRON] Interest crediting failed:", e);
            return { totalAccounts: 0, totalInterest: 0 };
        }),
        processOverdueLoans().catch((e) => {
            console.error("[CRON] Overdue processing failed:", e);
            return { markedOverdue: 0, penaltiesApplied: 0, totalPenalty: 0 };
        }),
        processDividendPayouts().catch((e) => {
            console.error("[CRON] Dividend processing failed:", e);
            return { processed: 0, totalAmount: 0 };
        }),
        reconcilePaychanguPayouts().catch((e) => {
            console.error("[CRON] PayChangu payout reconciliation failed:", e);
            return { settled: 0, failed: 0, creditedPayments: 0 };
        }),
    ]);

    console.log("[CRON] All jobs completed.");
    return { interest, overdue, dividends, paychanguPayouts };
}
