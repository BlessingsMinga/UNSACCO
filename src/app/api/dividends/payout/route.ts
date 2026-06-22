import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, audit } from "@/lib/auth";
import { ok, fail, handleApiError, generateReference } from "@/lib/api";

// Admin processes payout for a declaration - credits all members' savings
export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    const body = await req.json();
    const { declarationId } = body;

    if (!declarationId) return fail("declarationId is required");

    const declaration = await db.dividendDeclaration.findUnique({
      where: { id: declarationId },
      include: {
        payouts: {
          where: { status: "PENDING" },
          include: { user: { include: { savingsAccount: true } } },
        },
      },
    });

    if (!declaration) return fail("Dividend declaration not found");
    if (declaration.status !== "DECLARED") return fail("Dividend is not in DECLARED status");
    if (declaration.payouts.length === 0) return fail("No pending payouts to process");

    const ref = generateReference("DIV");
    let processedCount = 0;
    let totalPaid = 0;

    // Process each payout
    for (const payout of declaration.payouts) {
      const savings = payout.user.savingsAccount;
      if (!savings) continue;

      await db.$transaction([
        // Update payout status
        db.dividendPayout.update({
          where: { id: payout.id },
          data: {
            status: "PAID",
            paidAt: new Date(),
            reference: `${ref}-${payout.id.slice(0, 6)}`,
          },
        }),
        // Credit savings account
        db.savingsAccount.update({
          where: { id: savings.id },
          data: { balance: { increment: payout.netAmount } },
        }),
        // Record savings transaction
        db.savingsTransaction.create({
          data: {
            accountId: savings.id,
            userId: payout.userId,
            type: "DIVIDEND",
            amount: payout.netAmount,
            balanceAfter: savings.balance + payout.netAmount,
            description: `Dividend payout - ${declaration.label} (${payout.numberOfShares} shares @ MK ${payout.amountPerShare.toFixed(2)})`,
            reference: `${ref}-${payout.id.slice(0, 6)}`,
            method: "SYSTEM",
            status: "COMPLETED",
            recordedById: admin.id,
          },
        }),
      ]);

      processedCount++;
      totalPaid += payout.netAmount;
    }

    // Update declaration status
    await db.dividendDeclaration.update({
      where: { id: declarationId },
      data: { status: "PAID_OUT", paidOutAt: new Date() },
    });

    await audit(admin.id, "DIVIDEND_PAYOUT", "DividendDeclaration", declarationId,
      `Paid out ${declaration.label}: MK ${totalPaid.toLocaleString()} to ${processedCount} members`);

    return ok({
      message: `Paid MK ${totalPaid.toLocaleString()} to ${processedCount} members`,
      processedCount,
      totalPaid,
    });
  } catch (e) {
    return handleApiError(e);
  }
}