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
    rateLimitOrThrow(req, "PAYMENT");
    const user = await requireAuth();
    const data = await parseBody(req, withdrawalSchema);

    if (data.method === "PAYCHANGU") {
      const phone = user.phone?.replace(/^0+/, "").replace(/[^0-9]/g, "");
      if (!phone) {
        return fail("Please update your phone number in your profile to receive mobile money.");
      }

      // Phase 1: Reserve the funds - create pending transaction inside atomic read
      const { savings, pendingTxn } = await db.$transaction(async (tx) => {
        const savings = await tx.savingsAccount.findUnique({ where: { userId: user.id } });
        if (!savings) throw new Error("NOT_FOUND");
        if (savings.balance < data.amount) {
          throw new Error("Insufficient savings balance for this withdrawal.");
        }
        const balanceAfter = savings.balance - data.amount;
        if (balanceAfter < MIN_SAVINGS_DEPOSIT) {
          throw new Error(`Minimum savings balance of MK ${MIN_SAVINGS_DEPOSIT.toLocaleString()} must be maintained after withdrawal.`);
        }

        const ref = generateReference("PWD");
        const pendingTxn = await tx.savingsTransaction.create({
          data: {
            accountId: savings.id,
            userId: user.id,
            type: "WITHDRAWAL",
            amount: data.amount,
            balanceAfter,
            description: data.description || "Withdrawal via PayChangu to mobile money (pending)",
            reference: ref,
            method: "PAYCHANGU",
            status: "PENDING",
            recordedById: user.id,
          },
        });

        return { savings, pendingTxn };
      });

      // Phase 2: Call external PayChangu API (outside transaction - retryable)
      const network = phone.startsWith("99") ? "airtel" : "tnm";
      const payoutRes = await disburseToMobileMoney({
        amount: data.amount,
        phone,
        network,
        reference: pendingTxn.reference,
        narration: data.description || "Savings withdrawal via PayChangu",
      });

      if (payoutRes.status !== "success") {
        await db.savingsTransaction.update({
          where: { id: pendingTxn.id },
          data: { status: "FAILED" },
        });
        return fail(payoutRes.message || "Withdrawal disbursement failed");
      }

      // Phase 3: Atomically commit the deduction and mark completed
      await db.$transaction(async (tx) => {
        const freshSavings = await tx.savingsAccount.findUnique({ where: { userId: user.id } });
        if (!freshSavings) throw new Error("NOT_FOUND");

        const balanceAfter = freshSavings.balance - data.amount;
        if (balanceAfter < 0) {
          throw new Error("Insufficient balance after disbursement. Contact support.");
        }

        await tx.savingsAccount.update({
          where: { id: savings.id },
          data: { balance: balanceAfter },
        });

        await tx.savingsTransaction.update({
          where: { id: pendingTxn.id },
          data: {
            status: "COMPLETED",
            balanceAfter,
            description: data.description || "Withdrawal via PayChangu to mobile money",
          },
        });
      });

      const completedTxn = await db.savingsTransaction.findUnique({ where: { id: pendingTxn.id } });

      await audit(user.id, "WITHDRAWAL", "SavingsTransaction", completedTxn!.id, `Withdrawal ${data.amount} to mobile money`);

      await createNotification({
        userId: user.id,
        type: "WITHDRAWAL",
        title: "Savings Withdrawal",
        message: `MK ${data.amount.toLocaleString()} sent to your mobile money wallet (${phone}).`,
        link: "/savings",
        entityId: completedTxn!.id,
      });

      return ok({
        transaction: completedTxn,
        newBalance: completedTxn!.balanceAfter,
        message: `MK ${data.amount.toLocaleString()} sent to your mobile money wallet`,
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
