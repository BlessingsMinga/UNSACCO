import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, audit } from "@/lib/auth";
import { ok, fail, handleApiError, parseBody, generateReference } from "@/lib/api";
import { loanRepaymentSchema } from "@/lib/validation";
import { createNotification } from "@/lib/notifications/create";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth();
    const data = await parseBody(req, loanRepaymentSchema);
    const { id } = await params;

    const ref = generateReference("LNR");

    // Atomic transaction with fresh reads inside to prevent TOCTOU races
    const result = await db.$transaction(async (tx) => {
      const loan = await tx.loanApplication.findUnique({
        where: { id },
        include: { product: true },
      });

      if (!loan) throw new Error("NOT_FOUND");
      if (loan.userId !== user.id) throw new Error("FORBIDDEN");
      if (loan.status !== "DISBURSED") throw new Error("Loan is not in disbursed status");
      if (loan.balance <= 0) throw new Error("Loan is fully paid");
      if (data.amount > loan.balance)
        throw new Error(`Repayment cannot exceed outstanding balance of MK ${loan.balance.toLocaleString()}`);

      // Check savings balance inside the transaction (fresh, locked read)
      const savings = await tx.savingsAccount.findUnique({ where: { userId: user.id } });
      if (!savings || savings.balance < data.amount) {
        throw new Error(`Insufficient savings balance. You have MK ${savings?.balance?.toLocaleString() ?? 0} in savings.`);
      }

      const newSavingsBalance = savings.balance - data.amount;
      const newLoanBalance = loan.balance - data.amount;

      // Record repayment
      const repayment = await tx.loanRepayment.create({
        data: {
          loanId: loan.id,
          amount: data.amount,
          principalPortion: data.amount >= loan.balance ? loan.balance : data.amount,
          interestPortion: 0,
          balanceAfter: Math.max(0, newLoanBalance),
          dueDate: new Date(),
          paidDate: new Date(),
          status: "PAID",
          reference: ref,
          method: data.method,
        },
      });

      // Deduct from savings
      await tx.savingsAccount.update({
        where: { userId: user.id },
        data: { balance: newSavingsBalance },
      });

      // Record savings transaction with correct balanceAfter
      await tx.savingsTransaction.create({
        data: {
          accountId: savings.id,
          userId: user.id,
          type: "LOAN_REPAYMENT",
          amount: data.amount,
          balanceAfter: newSavingsBalance,
          description: `Loan repayment - ${loan.product.name}`,
          reference: ref,
          method: data.method,
          status: "COMPLETED",
        },
      });

      // Update loan balance and optionally close
      await tx.loanApplication.update({
        where: { id: loan.id },
        data: {
          balance: newLoanBalance,
          ...(newLoanBalance <= 0 ? { status: "CLOSED", closedAt: new Date() } : {}),
        },
      });

      return { repayment, remainingBalance: newLoanBalance, newSavingsBalance };
    });

    await audit(user.id, "LOAN_REPAY", "LoanRepayment", result.repayment.id, `Repaid MK ${data.amount.toLocaleString()}`);

    await createNotification({
      userId: user.id,
      type: "LOAN_REPAYMENT",
      title: "Loan Repayment",
      message: `MK ${data.amount.toLocaleString()} repaid on your loan. Remaining balance: MK ${result.remainingBalance.toLocaleString()}.`,
      link: "/loans",
      entityId: result.repayment.id,
    });

    return ok({ repayment: result.repayment, remainingBalance: result.remainingBalance });
  } catch (e) {
    return handleApiError(e);
  }
}