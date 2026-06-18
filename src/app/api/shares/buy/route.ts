import { db } from "@/lib/db";
import { requireAuth, audit } from "@/lib/auth";
import { buySharesSchema } from "@/lib/validation";
import { ok, fail, handleApiError, parseBody, generateReference } from "@/lib/api";
import { SHARE_PRICE } from "@/lib/constants";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const user = await requireAuth();
    const data = await parseBody(req, buySharesSchema);

    const result = await db.$transaction(async (tx) => {
      const account = await tx.savingsAccount.findUnique({ where: { userId: user.id } });
      if (!account) throw new Error("NOT_FOUND");
      const cost = data.numberOfShares * SHARE_PRICE;
      if (account.balance < cost) {
        throw new Error(
          `Insufficient savings balance. You need ${cost.toLocaleString()} MWK but have ${account.balance.toLocaleString()} MWK. Deposit funds first.`
        );
      }
      const holding = await tx.shareHolding.findUnique({ where: { userId: user.id } });
      if (!holding) throw new Error("NOT_FOUND");
      const sharesAfter = holding.numberOfShares + data.numberOfShares;
      const totalValue = sharesAfter * SHARE_PRICE;

      // Deduct from savings
      const newBalance = account.balance - cost;
      await tx.savingsAccount.update({ where: { id: account.id }, data: { balance: newBalance } });
      await tx.savingsTransaction.create({
        data: {
          accountId: account.id,
          userId: user.id,
          type: "WITHDRAWAL",
          amount: cost,
          balanceAfter: newBalance,
          description: `Share purchase — ${data.numberOfShares} share(s)`,
          reference: generateReference("SHR"),
          method: "SYSTEM",
          status: "COMPLETED",
          recordedById: user.id,
        },
      });

      // Create share transaction & update holding
      const shareTxn = await tx.shareTransaction.create({
        data: {
          holdingId: holding.id,
          userId: user.id,
          type: "BUY",
          numberOfShares: data.numberOfShares,
          pricePerShare: SHARE_PRICE,
          totalAmount: cost,
          sharesAfter,
          reference: generateReference("SHB"),
          status: "COMPLETED",
        },
      });
      await tx.shareHolding.update({
        where: { id: holding.id },
        data: { numberOfShares: sharesAfter, totalValue },
      });
      return { shareTxn, sharesAfter, totalValue, newBalance };
    });

    await audit(user.id, "SHARE_BUY", "ShareTransaction", result.shareTxn.id, `Bought ${data.numberOfShares} share(s)`);

    return ok({
      transaction: result.shareTxn,
      numberOfShares: result.sharesAfter,
      totalValue: result.totalValue,
      savingsBalance: result.newBalance,
    });
  } catch (e) {
    return handleApiError(e);
  }
}
