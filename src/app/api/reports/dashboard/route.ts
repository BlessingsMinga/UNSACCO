import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { ok, handleApiError } from "@/lib/api";
import { SHARE_PRICE } from "@/lib/constants";

export const runtime = "nodejs";

// Member dashboard aggregate — overview cards + charts
export async function GET() {
  try {
    const user = await requireAuth();
    const [savings, shares, savingsTxns, shareTxns, investments, savingsStats] = await Promise.all([
      db.savingsAccount.findUnique({ where: { userId: user.id } }),
      db.shareHolding.findUnique({ where: { userId: user.id } }),
      db.savingsTransaction.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 6,
      }),
      db.shareTransaction.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 6,
      }),
      db.investmentMember.findMany({
        where: { userId: user.id },
        include: { investment: { select: { name: true, category: true, status: true, expectedROI: true, actualProfit: true, amountInvested: true } } },
      }),
      db.savingsTransaction.aggregate({
        where: { userId: user.id, type: "DEPOSIT", createdAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth() - 5, 1) } },
        _sum: { amount: true },
      }),
    ]);

    // Last 6 months savings flow (deposits vs withdrawals)
    const now = new Date();
    const months: { label: string; key: string; deposits: number; withdrawals: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        label: d.toLocaleString("en", { month: "short" }),
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
        deposits: 0,
        withdrawals: 0,
      });
    }
    const allRecent = await db.savingsTransaction.findMany({
      where: { userId: user.id, createdAt: { gte: new Date(now.getFullYear(), now.getMonth() - 5, 1) } },
      select: { type: true, amount: true, createdAt: true },
    });
    for (const t of allRecent) {
      const key = `${t.createdAt.getFullYear()}-${String(t.createdAt.getMonth() + 1).padStart(2, "0")}`;
      const m = months.find((x) => x.key === key);
      if (!m) continue;
      if (t.type === "DEPOSIT" || t.type === "INTEREST" || t.type === "DIVIDEND") m.deposits += t.amount;
      if (t.type === "WITHDRAWAL") m.withdrawals += t.amount;
    }

    const shareValue = (shares?.numberOfShares ?? 0) * SHARE_PRICE;

    return ok({
      user: {
        id: user.id,
        fullName: user.fullName,
        role: user.role,
        status: user.status,
        studentId: user.studentId,
        email: user.email,
        program: user.program,
        yearOfStudy: user.yearOfStudy,
        joinedAt: user.joinedAt,
      },
      savingsBalance: savings?.balance ?? 0,
      interestAccrued: savings?.interestAccrued ?? 0,
      numberOfShares: shares?.numberOfShares ?? 0,
      shareValue,
      netWorth: (savings?.balance ?? 0) + shareValue,
      monthlyFlow: months,
      totalDeposits6m: savingsStats._sum.amount ?? 0,
      recentSavings: savingsTxns,
      recentShares: shareTxns,
      investments: investments.map((im) => ({
        id: im.investmentId,
        name: im.investment.name,
        category: im.investment.category,
        status: im.investment.status,
        contributed: im.amountContributed,
        sharePct: im.sharePct,
        expectedReturn: im.expectedReturn,
        actualReturn: im.actualReturn,
        expectedROI: im.investment.expectedROI,
      })),
    });
  } catch (e) {
    return handleApiError(e);
  }
}
