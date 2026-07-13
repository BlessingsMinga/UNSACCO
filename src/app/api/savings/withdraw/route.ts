import { db } from "@/lib/db";
import { requireAuth, audit } from "@/lib/auth";
import { withdrawalSchema } from "@/lib/validation";
import { ok, fail, handleApiError, parseBody, generateReference } from "@/lib/api";
import { createNotification } from "@/lib/notifications/create";
import { MIN_SAVINGS_DEPOSIT } from "@/lib/constants";
import { disburseToMobileMoney } from "@/lib/paychangu";
import { rateLimitOrThrow } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    await rateLimitOrThrow(req, "PAYMENT");
    const user = await requireAuth();
    const data = await parseBody(req, withdrawalSchema);

    if (data.method === "PAYCHANGU") {
      const phone = user.phone?.replace(/^0+/, "").replace(/[^0-9]/g, "");
      if (!phone) {
        return fail("Please update your phone number in your profile to receive mobile money.");
      }

      // Phase 1: reserve funds before calling the payout provider.  The conditional
      // decrement is the concurrency guard: two requests cannot reserve the same money.
      const { pendingTxn } = await db.$transaction(async (tx) => {
        const savings = await tx.savingsAccount.findUnique({ where: { userId: user.id } });
        if (!savings) throw new Error("NOT_FOUND");

        const reserved = await tx.savingsAccount.updateMany({
          where: {
            id: savings.id,
            balance: { gte: data.amount + MIN_SAVINGS_DEPOSIT },
          },
          data: { balance: { decrement: data.amount } },
        });
        if (reserved.count !== 1) {
          throw new Error(`Insufficient savings balance. A minimum balance of MK ${MIN_SAVINGS_DEPOSIT.toLocaleString()} must be maintained.`);
        }

        const reservedAccount = await tx.savingsAccount.findUniqueOrThrow({ where: { id: savings.id } });

        const ref = generateReference("PWD");
        const pendingTxn = await tx.savingsTransaction.create({
          data: {
            accountId: savings.id,
            userId: user.id,
            type: "WITHDRAWAL",
            amount: data.amount,
            balanceAfter: reservedAccount.balance,
            description: data.description || "Withdrawal via PayChangu to mobile money (pending)",
            reference: ref,
            method: "PAYCHANGU",
            status: "PENDING",
            recordedById: user.id,
          },
        });

        return { pendingTxn };
      });

      // Phase 2: Call external PayChangu API (outside transaction - retryable)
      const network = phone.startsWith("99") ? "airtel" : "tnm";
      let payoutRes;
      try {
        payoutRes = await disburseToMobileMoney({
          amount: data.amount,
          phone,
          network,
          reference: pendingTxn.reference,
          narration: data.description || "Savings withdrawal via PayChangu",
        });
      } catch (error) {
        await db.$transaction(async (tx) => {
          const failed = await tx.savingsTransaction.updateMany({
            where: { id: pendingTxn.id, status: "PENDING" },
            data: { status: "FAILED" },
          });
          if (failed.count === 1) {
            await tx.savingsAccount.update({ where: { id: pendingTxn.accountId }, data: { balance: { increment: data.amount } } });
          }
        });
        throw error;
      }

      if (payoutRes.status !== "success") {
        // Release the reservation only once; a provider retry must not credit twice.
        await db.$transaction(async (tx) => {
          const failed = await tx.savingsTransaction.updateMany({
            where: { id: pendingTxn.id, status: "PENDING" },
            data: { status: "FAILED" },
          });
          if (failed.count === 1) {
            await tx.savingsAccount.update({
              where: { id: pendingTxn.accountId },
              data: { balance: { increment: data.amount } },
            });
          }
        });
        return fail(payoutRes.message || "Withdrawal disbursement failed");
      }

      // A successful API response means the payout was accepted, not settled.
      // Keep the funds reserved until reconciliation confirms delivery.
      await db.$transaction(async (tx) => {
        const processing = await tx.savingsTransaction.updateMany({
          where: { id: pendingTxn.id, status: "PENDING" },
          data: {
            status: "PROCESSING",
            description: data.description || "Withdrawal via PayChangu to mobile money (awaiting settlement)",
          },
        });
        if (processing.count !== 1) throw new Error("Withdrawal is no longer pending.");
      });

      const processingTxn = await db.savingsTransaction.findUnique({ where: { id: pendingTxn.id } });
      await audit(user.id, "WITHDRAWAL_REQUESTED", "SavingsTransaction", processingTxn!.id, `Withdrawal ${data.amount} submitted to PayChangu`);

      return ok({
        transaction: processingTxn,
        newBalance: processingTxn!.balanceAfter,
        message: `Withdrawal of MK ${data.amount.toLocaleString()} has been submitted and will complete after PayChangu confirms delivery.`,
      });
    }

    // Original flow for non-PayChangu methods
    const result = await db.$transaction(async (tx) => {
      const account = await tx.savingsAccount.findUnique({ where: { userId: user.id } });
      if (!account) throw new Error("NOT_FOUND");
      if (account.balance < data.amount) {
        throw new Error("Insufficient savings balance for this withdrawal.");
      }
      const balanceAfter = account.balance - data.amount;
      if (balanceAfter < MIN_SAVINGS_DEPOSIT) {
        throw new Error(`Minimum savings balance of MK ${MIN_SAVINGS_DEPOSIT.toLocaleString()} must be maintained after withdrawal.`);
      }
      const txn = await tx.savingsTransaction.create({
        data: {
          accountId: account.id,
          userId: user.id,
          type: "WITHDRAWAL",
          amount: data.amount,
          balanceAfter,
          description: data.description || "Member withdrawal",
          reference: generateReference("WDR"),
          method: data.method,
          status: "COMPLETED",
          recordedById: user.id,
        },
      });
      await tx.savingsAccount.update({
        where: { id: account.id },
        data: { balance: balanceAfter },
      });
      return { txn, balanceAfter };
    });

    await audit(user.id, "WITHDRAWAL", "SavingsTransaction", result.txn.id, `Withdrawal ${data.amount}`);

    await createNotification({
      userId: user.id,
      type: "WITHDRAWAL",
      title: "Savings Withdrawal",
      message: `MK ${data.amount.toLocaleString()} withdrawn from your savings account. New balance: MK ${result.balanceAfter.toLocaleString()}.`,
      link: "/savings",
      entityId: result.txn.id,
    });

    return ok({
      transaction: result.txn,
      newBalance: result.balanceAfter,
    });
  } catch (e) {
    return handleApiError(e);
  }
}
