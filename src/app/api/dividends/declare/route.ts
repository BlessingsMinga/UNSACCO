import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, audit } from "@/lib/auth";
import { ok, fail, handleApiError, parseBody } from "@/lib/api";
import { dividendDeclarationSchema } from "@/lib/validation";
import { DIVIDEND_MIN_SHARES, DIVIDEND_TAX_RATE } from "@/lib/constants";

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    const data = await parseBody(req, dividendDeclarationSchema);

    // Check period uniqueness
    const existing = await db.dividendDeclaration.findUnique({ where: { period: data.period } });
    if (existing) return fail(`Dividend for period ${data.period} already declared`);

    // Get total eligible shares (active members with shares)
    const holdings = await db.shareHolding.findMany({
      where: {
        numberOfShares: { gte: DIVIDEND_MIN_SHARES },
        user: { status: "ACTIVE" },
      },
    });

    const totalEligibleShares = holdings.reduce((sum, h) => sum + h.numberOfShares, 0);
    if (totalEligibleShares === 0) return fail("No eligible shareholders found");

    const ratePerShare = data.totalAmount / totalEligibleShares;

    // Create declaration
    const declaration = await db.dividendDeclaration.create({
      data: {
        period: data.period,
        label: data.label,
        totalAmount: data.totalAmount,
        ratePerShare,
        eligibleShares: totalEligibleShares,
        status: "DECLARED",
        declaredById: admin.id,
        notes: data.notes,
      },
    });

    // Create payout records for each eligible member
    const payouts = holdings.map((h) => {
      const totalAmount = h.numberOfShares * ratePerShare;
      const deductedAtSource = DIVIDEND_TAX_RATE > 0 ? totalAmount * (DIVIDEND_TAX_RATE / 100) : 0;
      return {
        declarationId: declaration.id,
        userId: h.userId,
        numberOfShares: h.numberOfShares,
        amountPerShare: ratePerShare,
        totalAmount,
        deductedAtSource,
        netAmount: totalAmount - deductedAtSource,
        status: "PENDING",
      };
    });

    if (payouts.length > 0) {
      await db.dividendPayout.createMany({ data: payouts });
    }

    await audit(admin.id, "DIVIDEND_DECLARE", "DividendDeclaration", declaration.id,
      `Declared ${data.label}: MK ${data.totalAmount.toLocaleString()} for ${totalEligibleShares} shares (MK ${ratePerShare.toFixed(2)}/share)`);

    return ok({
      declaration,
      totalEligibleShares,
      ratePerShare,
      memberCount: payouts.length,
    }, 201);
  } catch (e) {
    return handleApiError(e);
  }
}