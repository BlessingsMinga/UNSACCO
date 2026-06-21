import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, audit } from "@/lib/auth";
import { ok, fail, handleApiError, parseBody, generateReference } from "@/lib/api";
import { loanRepaymentSchema } from "@/lib/validation";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth();
    const data = await parseBody(req, loanRepaymentSchema);

    const loan = await db.loanApplication.findUnique({
      where: { id: params.id },
      include: { product: true },
    });

    if (!loan) return fail("Loan not found", 404);
    if (loan.userId !== user.id) return fail("Forbidden", 403);
    if (loan.status !== "DISBURSED") return fail("Loan is not in disbursed status");

    // Check balance
    if (loan.balance <= 0) return fail("Loan is fully paid");
    if (data.amount > loan.balance) return fail(`Repayment cannot exceed outstanding balance of MK ${loan.balance.toLocaleString()}`);

    // Check savings balance
    const savings = await db.savingsAccount.findUnique({ where: { userId: user.id } });
    if (!savings || savings.balance < data.amount) {
      return fail(`Insufficient savings balance. You have MK ${savings?.balance?.toLocaleString() ?? 0} in savings.`);
    }

    const ref = generateReference("LNR");

    // Atomic transaction
    const [repayment] = await db.$transaction([
      // Record repayment
      db.loanRepayment.create({
        data: {
          loanId: loan.id,
          amount: data.amount,
          principalPortion: data.amount >= loan.balance ? loan.balance : data.amount,
          interestPortion: 0,
          balanceAfter: Math.max(0, loan.balance - data.amount),
          dueDate: new Date(),
          paidDate: new Date(),
          status: "PAID",
          reference: ref,
          method: data.method,
        },
      }),
      // Deduct from savings
      db.savingsAccount.update({
        where: { userId: user.id },
        data: { balance: { decrement: data.amount } },
      }),
      // Record savings transaction
      db.savingsTransaction.create({
        data: {
          accountId: savings.id,
          userId: user.id,
          type: "LOAN_REPAYMENT",
          amount: data.amount,
          balanceAfter: savings.balance - data.amount,
          description: `Loan repayment - ${loan.product.name}`,
          reference: ref,
          method: data.method,
          status: "COMPLETED",
        },
      }),
      // Update loan balance
      db.loanApplication.update({
        where: { id: loan.id },
        data: {
          balance: { decrement: data.amount },
          ...(loan.balance - data.amount <= 0 ? { status: "CLOSED", closedAt: new Date() } : {}),
        },
      }),
    ]);

    await audit(user.id, "LOAN_REPAY", "LoanRepayment", repayment.id, `Repaid MK ${data.amount.toLocaleString()} on ${loan.product.name}`);

    return ok({ repayment, remainingBalance: Math.max(0, loan.balance - data.amount) });
  } catch (e) {
    return handleApiError(e);
  }
}