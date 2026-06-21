import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, audit } from "@/lib/auth";
import { ok, fail, handleApiError, parseBody, generateReference } from "@/lib/api";
import { loanApprovalSchema } from "@/lib/validation";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    const search = url.searchParams.get("search");

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { user: { fullName: { contains: search, mode: "insensitive" } } },
        { user: { email: { contains: search, mode: "insensitive" } } },
        { user: { studentId: { contains: search, mode: "insensitive" } } },
      ];
    }

    const loans = await db.loanApplication.findMany({
      where,
      include: {
        user: { select: { id: true, fullName: true, email: true, studentId: true, phone: true } },
        product: { select: { name: true, interestRate: true, repaymentPeriod: true } },
        repayments: { orderBy: { dueDate: "asc" } },
        guarantors: {
          include: { user: { select: { fullName: true, email: true } } },
        },
      },
      orderBy: { applicationDate: "desc" },
    });

    return ok(loans);
  } catch (e) {
    return handleApiError(e);
  }
}

// Approve or reject a loan
export async function PATCH(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    const body = await req.json();
    const { loanId, action, amountApproved, rejectionReason } = body;

    if (!loanId || !["approve", "reject", "disburse"].includes(action)) {
      return fail("loanId and action (approve/reject/disburse) are required");
    }

    const loan = await db.loanApplication.findUnique({
      where: { id: loanId },
      include: { product: true, guarantors: true },
    });
    if (!loan) return fail("Loan not found", 404);

    if (action === "approve") {
      if (loan.status !== "PENDING") return fail("Loan is not in pending status");

      // Check guarantors if required
      if (loan.product.requiresGuarantor && loan.product.minGuarantors > 0) {
        const approvedGuarantors = loan.guarantors.filter((g) => g.status === "APPROVED").length;
        if (approvedGuarantors < loan.product.minGuarantors) {
          return fail(`Minimum ${loan.product.minGuarantors} approved guarantors required`);
        }
      }

      const approvedAmt = amountApproved ?? loan.amountApplied;
      const totalInterest = (approvedAmt * loan.interestRate * loan.repaymentPeriod) / (100 * 12);
      const totalRepayable = approvedAmt + totalInterest;
      const monthlyInstallment = totalRepayable / loan.repaymentPeriod;

      await db.loanApplication.update({
        where: { id: loanId },
        data: {
          status: "APPROVED",
          amountApproved: approvedAmt,
          monthlyInstallment: Math.ceil(monthlyInstallment),
          totalRepayable: Math.ceil(totalRepayable),
          balance: approvedAmt,
          approvedAt: new Date(),
          approvedById: admin.id,
        },
      });

      await audit(admin.id, "LOAN_APPROVE", "LoanApplication", loanId, `Approved loan: MK ${approvedAmt.toLocaleString()}`);
      return ok({ message: "Loan approved" });
    }

    if (action === "reject") {
      await db.loanApplication.update({
        where: { id: loanId },
        data: {
          status: "REJECTED",
          rejectionReason: rejectionReason || "Declined by administration",
          approvedAt: new Date(),
          approvedById: admin.id,
        },
      });

      await audit(admin.id, "LOAN_REJECT", "LoanApplication", loanId, `Rejected loan: ${rejectionReason || "No reason provided"}`);
      return ok({ message: "Loan rejected" });
    }

    if (action === "disburse") {
      if (loan.status !== "APPROVED") return fail("Loan must be approved before disbursement");
      if (!loan.amountApproved) return fail("Loan has no approved amount");

      // Create savings account deposit for the member
      const savings = await db.savingsAccount.findUnique({ where: { userId: loan.userId } });
      if (!savings) return fail("Member has no savings account");

      const ref = generateReference("LND");

      await db.$transaction([
        db.loanApplication.update({
          where: { id: loanId },
          data: {
            status: "DISBURSED",
            disbursedAt: new Date(),
            disbursedById: admin.id,
          },
        }),
        db.savingsAccount.update({
          where: { userId: loan.userId },
          data: { balance: { increment: loan.amountApproved } },
        }),
        db.savingsTransaction.create({
          data: {
            accountId: savings.id,
            userId: loan.userId,
            type: "LOAN_DISBURSEMENT",
            amount: loan.amountApproved,
            balanceAfter: savings.balance + loan.amountApproved,
            description: `Loan disbursement - ${loan.product.name}`,
            reference: ref,
            method: "SYSTEM",
            status: "COMPLETED",
            recordedById: admin.id,
          },
        }),
      ]);

      await audit(admin.id, "LOAN_DISBURSE", "LoanApplication", loanId, `Disbursed loan: MK ${loan.amountApproved.toLocaleString()}`);
      return ok({ message: "Loan disbursed" });
    }

    return fail("Invalid action");
  } catch (e) {
    return handleApiError(e);
  }
}

// Summary stats for admin dashboard
export async function HEAD() {
  try {
    await requireAdmin();
    const [pending, active, total, repaid] = await Promise.all([
      db.loanApplication.count({ where: { status: "PENDING" } }),
      db.loanApplication.count({ where: { status: "DISBURSED" } }),
      db.loanApplication.count(),
      db.loanRepayment.aggregate({ _sum: { amount: true } }),
    ]);

    return ok({ pending, active, total, totalRepaid: repaid._sum.amount ?? 0 });
  } catch {
    return ok({ pending: 0, active: 0, total: 0, totalRepaid: 0 });
  }
}