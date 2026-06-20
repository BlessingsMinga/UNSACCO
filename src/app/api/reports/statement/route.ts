import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { ok, handleApiError } from "@/lib/api";
import { formatCurrency, formatDateTime, SHARE_PRICE } from "@/lib/constants";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await requireAuth();
    const [savings, shares, shareTxns, savingsTxns, investments] = await Promise.all([
      db.savingsAccount.findUnique({ where: { userId: user.id } }),
      db.shareHolding.findUnique({ where: { userId: user.id } }),
      db.shareTransaction.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } }),
      db.savingsTransaction.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } }),
      db.investmentMember.findMany({
        where: { userId: user.id },
        include: { investment: true },
      }),
    ]);

    const shareValue = (shares?.numberOfShares ?? 0) * SHARE_PRICE;
    const netWorth = (savings?.balance ?? 0) + shareValue;

    const statement = {
      member: {
        name: user.fullName,
        studentId: user.studentId,
        email: user.email,
      },
      asOf: new Date().toISOString(),
      summary: {
        savingsBalance: savings?.balance ?? 0,
        numberOfShares: shares?.numberOfShares ?? 0,
        shareValue,
        netWorth,
      },
      savingsTransactions: savingsTxns,
      shareTransactions: shareTxns,
      investments: investments.map((im) => ({
        name: im.investment.name,
        category: im.investment.category,
        status: im.investment.status,
        contributed: im.amountContributed,
        sharePct: im.sharePct,
        expectedReturn: im.expectedReturn,
        actualReturn: im.actualReturn,
      })),
    };

    // Plain-text friendly statement for print/export
    const printable = [
      `UNISSACO  MEMBER STATEMENT`,
      `Name: ${user.fullName ?? "—"}`,
      `Student ID: ${user.studentId ?? "—"}`,
      `Email: ${user.email}`,
      `Generated: ${formatDateTime(new Date())}`,
      ``,
      `SAVINGS BALANCE:      ${formatCurrency(savings?.balance ?? 0)}`,
      `SHARES:               ${shares?.numberOfShares ?? 0} (${formatCurrency(shareValue)})`,
      `NET WORTH:            ${formatCurrency(netWorth)}`,
      ``,
      `--- Recent Savings Transactions ---`,
      ...savingsTxns.slice(0, 15).map(
        (t) => `${formatDateTime(t.createdAt)}  ${t.type.padEnd(10)}  ${formatCurrency(t.amount).padStart(16)}  ref:${t.reference}`
      ),
      ``,
      `--- Recent Share Transactions ---`,
      ...shareTxns.slice(0, 15).map(
        (t) => `${formatDateTime(t.createdAt)}  ${t.type.padEnd(8)}  ${t.numberOfShares} shares  ${formatCurrency(t.totalAmount)}  ref:${t.reference}`
      ),
    ].join("\n");

    return ok({ statement, printable });
  } catch (e) {
    return handleApiError(e);
  }
}
