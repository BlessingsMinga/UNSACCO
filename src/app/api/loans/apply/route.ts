import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, audit } from "@/lib/auth";
import { ok, fail, handleApiError, parseBody, generateReference } from "@/lib/api";
import { loanApplicationSchema } from "@/lib/validation";
import { LOAN_ELIGIBILITY_MIN_SAVINGS, LOAN_ELIGIBILITY_SAVINGS_RATIO, MIN_SHAREHOLDING_FOR_LOAN } from "@/lib/constants";

export async function POST(req: NextRequest) {
  try {
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
    if (activeLoans.length > 0) {
      return fail("You already have an active loan. Please clear it before applying for a new one.");
    }

    // Calculate monthly installment (simple interest, equal principal)
    const interestRate = product.interestRate;
    const repaymentPeriod = product.repaymentPeriod;
    const totalInterest = (data.amountApplied * interestRate * repaymentPeriod) / (100 * 12);
    const totalRepayable = data.amountApplied + totalInterest;
    const monthlyInstallment = totalRepayable / repaymentPeriod;

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

    return ok(loan, 201);
  } catch (e) {
    return handleApiError(e);
  }
}