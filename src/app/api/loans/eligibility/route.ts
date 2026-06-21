import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { ok, handleApiError } from "@/lib/api";
import { LOAN_ELIGIBILITY_MIN_SAVINGS, LOAN_ELIGIBILITY_SAVINGS_RATIO, MIN_SHAREHOLDING_FOR_LOAN } from "@/lib/constants";

export async function GET(_req: NextRequest) {
  try {
    const user = await requireAuth();
    const [savings, shares, activeLoans] = await Promise.all([
      db.savingsAccount.findUnique({ where: { userId: user.id } }),
      db.shareHolding.findUnique({ where: { userId: user.id } }),
      db.loanApplication.findMany({
        where: { userId: user.id, status: { in: ["PENDING", "APPROVED", "DISBURSED"] } },
      }),
    ]);

    const savingsBalance = savings?.balance ?? 0;
    const shareCount = shares?.numberOfShares ?? 0;
    const maxLoanFromSavings = savingsBalance / LOAN_ELIGIBILITY_SAVINGS_RATIO;
    const hasMinimumSavings = savingsBalance >= LOAN_ELIGIBILITY_MIN_SAVINGS;
    const hasMinimumShares = shareCount >= MIN_SHAREHOLDING_FOR_LOAN;
    const activeLoanCount = activeLoans.length;

    return ok({
      eligible: hasMinimumSavings && hasMinimumShares && activeLoanCount === 0,
      savingsBalance,
      shareCount,
      maxLoanAmount: Math.floor(maxLoanFromSavings),
      hasMinimumSavings,
      hasMinimumShares,
      activeLoanCount,
      reason: !hasMinimumSavings
        ? `Minimum savings of MK ${LOAN_ELIGIBILITY_MIN_SAVINGS.toLocaleString()} required`
        : !hasMinimumShares
          ? `Minimum ${MIN_SHAREHOLDING_FOR_LOAN} shares required`
          : activeLoanCount > 0
            ? "You have an active loan already"
            : undefined,
    });
  } catch (e) {
    return handleApiError(e);
  }
}