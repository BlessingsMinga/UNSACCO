import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { ok, handleApiError } from "@/lib/api";
import { SAVINGS_INTEREST_RATE } from "@/lib/constants";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await requireAuth();
    const account = await db.savingsAccount.findUnique({ where: { userId: user.id } });
    if (!account) return ok(null);

    // Aggregate stats
    const [deposits, withdrawals, interest, lastTxn, txnCount, monthlyAgg] = await Promise.all([
      db.savingsTransaction.aggregate({
        where: { userId: user.id, type: "DEPOSIT" },
        _sum: { amount: true },
      }),
      db.savingsTransaction.aggregate({
        where: { userId: user.id, type: "WITHDRAWAL" },
        _sum: { amount: true },
      }),
      db.savingsTransaction.aggregate({
        where: { userId: user.id, type: { in: ["INTEREST", "DIVIDEND"] } },
        _sum: { amount: true },
      }),
      db.savingsTransaction.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
      }),
      db.savingsTransaction.count({ where: { userId: user.id } }),
      db.savingsTransaction.findMany({
        where: { userId: user.id, type: "DEPOSIT", createdAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth() - 5, 1) } },
        select: { amount: true, createdAt: true },
      }),
    ]);

    // Build last-6-months deposit series
    const months: { label: string; month: string; total: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      months.push({
        label: d.toLocaleString("en", { month: "short" }),
        month: key,
        total: 0,
      });
    }
    for (const t of monthlyAgg) {
      const key = `${t.createdAt.getFullYear()}-${String(t.createdAt.getMonth() + 1).padStart(2, "0")}`;
      const m = months.find((x) => x.month === key);
      if (m) m.total += t.amount;
    }

    return ok({
      balance: account.balance,
      interestAccrued: account.interestAccrued,
      totalDeposits: deposits._sum.amount ?? 0,
      totalWithdrawals: withdrawals._sum.amount ?? 0,
      totalInterest: interest._sum.amount ?? 0,
      transactionCount: txnCount,
      lastTransaction: lastTxn,
      interestRate: SAVINGS_INTEREST_RATE,
      monthlyDeposits: months,
    });
  } catch (e) {
    return handleApiError(e);
  }
}
