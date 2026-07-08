import { db } from "@/lib/db";
import { requireAuth, audit } from "@/lib/auth";
import { buySharesSchema } from "@/lib/validation";
import { ok, fail, handleApiError, parseBody, generateReference } from "@/lib/api";
import { SHARE_PRICE } from "@/lib/constants";
import { initiateStandardCheckout } from "@/lib/paychangu";
import { rateLimitOrThrow } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    rateLimitOrThrow(req, "PAYMENT");
    const user = await requireAuth();
    const data = await parseBody(req, buySharesSchema);

    const cost = data.numberOfShares * SHARE_PRICE;
    const ref = generateReference("SHB");

    // paymentMethod comes from the validated schema (defaults to "SAVINGS")
    const paymentMethod = data.paymentMethod;

    if (paymentMethod === "PAYCHANGU") {
      // PayChangu Standard Checkout - redirect to hosted payment page

      // Find or create share holding (handle race condition)
      let holding = await db.shareHolding.findUnique({ where: { userId: user.id } });
      if (!holding) {
        holding = await db.shareHolding.create({ data: { userId: user.id } });
      }

      // Create a pending share transaction
      const pendingTxn = await db.shareTransaction.create({
        data: {
          holdingId: holding.id,
          userId: user.id,
          type: "BUY",
          numberOfShares: data.numberOfShares,
          pricePerShare: SHARE_PRICE,
          totalAmount: cost,
          sharesAfter: 0,
          reference: ref,
          status: "PENDING",
        },
      });

      // Initiate PayChangu Standard Checkout
      const checkoutResponse = await initiateStandardCheckout({
        amount: cost,
        txRef: ref,
        email: user.email || undefined,
        firstName: user.fullName?.split(" ")[0] || "Member",
        lastName: user.fullName?.split(" ").slice(1).join(" ") || "UNSACCO",
        meta: {
          userId: user.id,
          type: "SHARE_PURCHASE",
          numberOfShares: String(data.numberOfShares),
          transactionId: pendingTxn.id,
        },
        title: "UNSACCO - Share Purchase",
        description: `Purchase of ${data.numberOfShares} share(s) for MK ${cost.toLocaleString()}`,
      });

      if (checkoutResponse.status !== "success" || !checkoutResponse.data?.checkout_url) {
        await db.shareTransaction.update({
          where: { id: pendingTxn.id },
          data: { status: "FAILED" },
        });
        return fail(checkoutResponse.message || "Payment initiation failed");
      }

      return ok({
        checkout_url: checkoutResponse.data.checkout_url,
        tx_ref: ref,
        numberOfShares: data.numberOfShares,
        totalAmount: cost,
        status: "PENDING",
      });
    }

    // Original SAVINGS flow
    const result = await db.$transaction(async (tx) => {
      const account = await tx.savingsAccount.findUnique({ where: { userId: user.id } });
      if (!account) throw new Error("NOT_FOUND");
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
          description: `Share purchase  ${data.numberOfShares} share(s)`,
          reference: ref,
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
          reference: ref,
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