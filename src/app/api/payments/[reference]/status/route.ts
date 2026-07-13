import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { fail, handleApiError, ok } from "@/lib/api";

export const runtime = "nodejs";

/** Returns local ledger state only. Provider verification is performed by the webhook. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ reference: string }> }
) {
  try {
    const user = await requireAuth();
    const { reference } = await params;

    const repayment = await db.loanRepayment.findUnique({ where: { reference } });
    if (repayment) {
      const loan = await db.loanApplication.findUnique({ where: { id: repayment.loanId }, select: { userId: true } });
      if (!loan || loan.userId !== user.id) return fail("Payment not found", 404);
      return ok({ status: repayment.status, amount: repayment.amount, reference });
    }

    const deposit = await db.savingsTransaction.findUnique({ where: { reference } });
    if (deposit?.userId === user.id && deposit.method === "PAYCHANGU") {
      return ok({ status: deposit.status, amount: deposit.amount, reference });
    }

    const sharePurchase = await db.shareTransaction.findUnique({ where: { reference } });
    if (sharePurchase?.userId === user.id) {
      return ok({ status: sharePurchase.status, amount: sharePurchase.totalAmount, reference });
    }

    return fail("Payment not found", 404);
  } catch (error) {
    return handleApiError(error);
  }
}
