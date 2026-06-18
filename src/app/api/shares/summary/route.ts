import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { ok, handleApiError } from "@/lib/api";
import { SHARE_PRICE } from "@/lib/constants";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await requireAuth();
    const holding = await db.shareHolding.findUnique({ where: { userId: user.id } });
    if (!holding) return ok(null);

    const [bought, sold, lastTxn] = await Promise.all([
      db.shareTransaction.aggregate({
        where: { userId: user.id, type: "BUY" },
        _sum: { numberOfShares: true },
      }),
      db.shareTransaction.aggregate({
        where: { userId: user.id, type: "SELL" },
        _sum: { numberOfShares: true },
      }),
      db.shareTransaction.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    // dividend entitlement is simplified: shares * dividend per share (placeholder 0)
    return ok({
      numberOfShares: holding.numberOfShares,
      totalValue: holding.numberOfShares * SHARE_PRICE,
      sharePrice: SHARE_PRICE,
      totalBought: bought._sum.numberOfShares ?? 0,
      totalSold: sold._sum.numberOfShares ?? 0,
      lastTransaction: lastTxn,
    });
  } catch (e) {
    return handleApiError(e);
  }
}
