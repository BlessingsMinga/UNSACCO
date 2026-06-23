import { db } from "@/lib/db";
import { requireAuth, audit } from "@/lib/auth";
import { withdrawalSchema } from "@/lib/validation";
import { ok, fail, handleApiError, parseBody, generateReference } from "@/lib/api";
import { createNotification } from "@/lib/notifications/create";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const user = await requireAuth();
    const data = await parseBody(req, withdrawalSchema);

    const result = await db.$transaction(async (tx) => {
      const account = await tx.savingsAccount.findUnique({ where: { userId: user.id } });
      if (!account) throw new Error("NOT_FOUND");
      if (account.balance < data.amount) {
        throw new Error("Insufficient savings balance for this withdrawal.");
      }
      const balanceAfter = account.balance - data.amount;
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