import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, audit } from "@/lib/auth";
import { ok, fail, handleApiError, parseBody } from "@/lib/api";
import { loanApplicationSchema } from "@/lib/validation";
import { LOAN_ELIGIBILITY_MIN_SAVINGS, MIN_SHAREHOLDING_FOR_LOAN } from "@/lib/constants";
import { createNotification } from "@/lib/notifications/create";
import { rateLimitOrThrow } from "@/lib/rate-limit";
import {
  calculateMonthlyPayment,
  calculateTotalInterest,
  calculateTotalRepayable,
} from "@/lib/financial";

export async function POST(req: NextRequest) {
  try {
    await rateLimitOrThrow(req, "PAYMENT");
    const user = await requireAuth();
    const data = await parseBody(req, loanApplicationSchema);

    // Validate product exists and is active
    const product = await db.loanProduct.findUnique({ where: { id: data.productId } });
    if (!product || product.status !== "ACTIVE") {
      return fail("Loan product not found or inactive");
    }

    // Validate amount within product range
    if (data.amountApplied < product.minAmount || data.amountApplied > product.maxAmount) {
      return fail(`Loan amount must be between MK ${product.minAmount.toLocaleString()} and MK ${product.maxAmount.toLocaleString()}`);
    }

    // Check eligibility
    const [savings, shares, activeLoans] = await Promise.all([
      db.savingsAccount.findUnique({ where: { userId: user.id } }),
      db.shareHolding.findUnique({ where: { userId: user.id } }),
      db.loanApplication.findMany({
        where: { userId: user.id, status: { in: ["PENDING", "APPROVED", "DISBURSED"] } },
      }),
    ]);

    const savingsBalance = savings?.balance ?? 0;
    const shareCount = shares?.numberOfShares ?? 0;

    if (savingsBalance < LOAN_ELIGIBILITY_MIN_SAVINGS) {
      return fail(`Minimum savings of MK ${LOAN_ELIGIBILITY_MIN_SAVINGS.toLocaleString()} required to apply for a loan`);
    }
    if (shareCount < MIN_SHAREHOLDING_FOR_LOAN) {
      return fail(`Minimum ${MIN_SHAREHOLDING_FOR_LOAN} shares required to apply for a loan`);
    }
    const existingProductLoan = activeLoans.find(l => l.productId === data.productId);
    if (existingProductLoan) {
      return fail("You already have an active loan for this product. Please clear your existing loan before applying for a new one.");
    }

    // Calculate loan terms using standard reducing-balance amortization
    const interestRate = product.interestRate;
    const repaymentPeriod = product.repaymentPeriod;
    const monthlyInstallment = calculateMonthlyPayment(data.amountApplied, interestRate, repaymentPeriod);
    const totalInterest = calculateTotalInterest(data.amountApplied, interestRate, repaymentPeriod);
    const totalRepayable = calculateTotalRepayable(data.amountApplied, interestRate, repaymentPeriod);

    const loan = await db.loanApplication.create({
      data: {
        userId: user.id,
        productId: data.productId,
        amountApplied: data.amountApplied,
        interestRate,
        repaymentPeriod,
        monthlyInstallment: Math.ceil(monthlyInstallment),
        totalRepayable: Math.ceil(totalRepayable),
        purpose: data.purpose,
        balance: data.amountApplied,
        status: "PENDING",
      },
      include: {
        product: { select: { name: true } },
      },
    });

    await audit(user.id, "LOAN_APPLY", "LoanApplication", loan.id, `Applied for ${loan.product.name} loan: MK ${data.amountApplied.toLocaleString()}`);

    await createNotification({
      userId: user.id,
      type: "LOAN_APPLIED",
      title: "Loan Application Submitted",
      message: `Your ${loan.product.name} loan application for MK ${data.amountApplied.toLocaleString()} has been submitted and is pending review.`,
      link: "/loans",
      entityId: loan.id,
    });

    return ok(loan, 201);
  } catch (e) {
    return handleApiError(e);
  }
}
