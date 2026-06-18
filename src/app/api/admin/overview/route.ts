import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { ok, handleApiError } from "@/lib/api";
import { SHARE_PRICE } from "@/lib/constants";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requireAdmin();

    const [
      totalMembers,
      pendingMembers,
      activeMembers,
      suspendedMembers,
      totalSavingsAgg,
      totalSharesAgg,
      totalInvestedAgg,
      recentMembers,
      recentDeposits,
      totalSharesCount,
    ] = await Promise.all([
      db.user.count({ where: { role: "MEMBER" } }),
      db.user.count({ where: { role: "MEMBER", status: "PENDING" } }),
      db.user.count({ where: { role: "MEMBER", status: "ACTIVE" } }),
      db.user.count({ where: { role: "MEMBER", status: "SUSPENDED" } }),
      db.savingsAccount.aggregate({ _sum: { balance: true } }),
      db.shareHolding.aggregate({ _sum: { numberOfShares: true } }),
      db.investment.aggregate({ where: { status: "ACTIVE" }, _sum: { amountInvested: true } }),
      db.user.findMany({
        where: { role: "MEMBER" },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, fullName: true, studentId: true, email: true, program: true, status: true, createdAt: true },
      }),
      db.savingsTransaction.findMany({
        where: { type: "DEPOSIT" },
        orderBy: { createdAt: "desc" },
        take: 6,
        include: { user: { select: { fullName: true, studentId: true } } },
      }),
      db.shareHolding.aggregate({ _sum: { numberOfShares: true } }),
    ]);

    // Monthly deposits (last 6)
    const now = new Date();
    const months: { label: string; key: string; total: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        label: d.toLocaleString("en", { month: "short" }),
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
        total: 0,
      });
    }
    const recentTxns = await db.savingsTransaction.findMany({
      where: { type: "DEPOSIT", createdAt: { gte: new Date(now.getFullYear(), now.getMonth() - 5, 1) } },
      select: { amount: true, createdAt: true },
    });
    for (const t of recentTxns) {
      const key = `${t.createdAt.getFullYear()}-${String(t.createdAt.getMonth() + 1).padStart(2, "0")}`;
      const m = months.find((x) => x.key === key);
      if (m) m.total += t.amount;
    }

    const shareCapital = (totalSharesCount._sum.numberOfShares ?? 0) * SHARE_PRICE;

    return ok({
      members: {
        total: totalMembers,
        pending: pendingMembers,
        active: activeMembers,
        suspended: suspendedMembers,
      },
      treasury: {
        totalSavings: totalSavingsAgg._sum.balance ?? 0,
        shareCapital,
        totalShares: totalSharesCount._sum.numberOfShares ?? 0,
        totalInvested: totalInvestedAgg._sum.amountInvested ?? 0,
        totalAssets: (totalSavingsAgg._sum.balance ?? 0) + shareCapital,
      },
      monthlyDeposits: months,
      recentMembers,
      recentDeposits,
    });
  } catch (e) {
    return handleApiError(e);
  }
}
