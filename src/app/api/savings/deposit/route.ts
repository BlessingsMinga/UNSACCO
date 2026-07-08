import { db } from "@/lib/db";
import { requireAuth, audit } from "@/lib/auth";
import { depositSchema } from "@/lib/validation";
import { ok, fail, handleApiError, parseBody, generateReference } from "@/lib/api";
import { createNotification } from "@/lib/notifications/create";
import { initiateStandardCheckout } from "@/lib/paychangu";
import { rateLimitOrThrow } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    rateLimitOrThrow(req, "PAYMENT");
    const user = await requireAuth();
    const data = await parseBody(req, depositSchema);

    // If PayChangu Standard Checkout, redirect to hosted payment page
    if (data.method === "PAYCHANGU") {
      const ref = generateReference("PCD");

      // Create a pending savings transaction
      const savingsAccount = await db.savingsAccount.findUnique({ where: { userId: user.id } });
      if (!savingsAccount) return fail("Savings account not found");

      const pendingTxn = await db.savingsTransaction.create({
        data: {
          accountId: savingsAccount.id,
          userId: user.id,
          type: "DEPOSIT",
          amount: data.amount,
          balanceAfter: 0,
          description: data.description || "Member deposit via PayChangu",
          reference: ref,
          method: "PAYCHANGU",
          status: "PENDING",
          recordedById: user.id,
        },
      });

      // Initiate PayChangu Standard Checkout
      const checkoutResponse = await initiateStandardCheckout({
        amount: data.amount,
        txRef: ref,
        email: user.email || undefined,
        firstName: user.fullName?.split(" ")[0] || "Member",
        lastName: user.fullName?.split(" ").slice(1).join(" ") || "UNSACCO",
        meta: {
          userId: user.id,
          type: "SAVINGS_DEPOSIT",
          description: data.description || "Savings deposit",
          transactionId: pendingTxn.id,
        },
        title: "UNSACCO - Savings Deposit",
        description: `Deposit of MK ${data.amount.toLocaleString()} to your savings account`,
      });

      if (checkoutResponse.status !== "success" || !checkoutResponse.data?.checkout_url) {
        await db.savingsTransaction.update({
          where: { id: pendingTxn.id },
          data: { status: "FAILED" },
        });
        return fail(checkoutResponse.message || "Payment initiation failed");
      }

      return ok({
        checkout_url: checkoutResponse.data.checkout_url,
        tx_ref: ref,
        amount: data.amount,
        status: "PENDING",
        transaction: pendingTxn,
      });
    }

    // Original flow for non-PayChangu methods
    const result = await db.$transaction(async (tx) => {
      const account = await tx.savingsAccount.findUnique({ where: { userId: user.id } });
      if (!account) throw new Error("NOT_FOUND");
      const balanceAfter = account.balance + data.amount;
      const txn = await tx.savingsTransaction.create({
        data: {
          accountId: account.id,
          userId: user.id,
          type: "DEPOSIT",
          amount: data.amount,
          balanceAfter,
          description: data.description || "Member deposit",
          reference: generateReference("DEP"),
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

    await audit(user.id, "DEPOSIT", "SavingsTransaction", result.txn.id, `Deposit ${data.amount}`);

    await createNotification({
      userId: user.id,
      type: "DEPOSIT",
      title: "Savings Deposit",
      message: `MK ${data.amount.toLocaleString()} deposited into your savings account. New balance: MK ${result.balanceAfter.toLocaleString()}.`,
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
