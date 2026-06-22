import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { ok, handleApiError } from "@/lib/api";

export async function GET(_req: NextRequest) {
  try {
    await requireAdmin();
    const declarations = await db.dividendDeclaration.findMany({
      include: {
        _count: { select: { payouts: true } },
        payouts: {
          where: { status: "PAID" },
          select: { netAmount: true },
        },
      },
      orderBy: { declaredAt: "desc" },
    });

    // Add computed stats
    const result = declarations.map((d) => ({
      ...d,
      paidCount: d.payouts.length,
      paidAmount: d.payouts.reduce((sum, p) => sum + p.netAmount, 0),
      payouts: undefined, // remove raw payouts from response
    }));

    return ok(result);
  } catch (e) {
    return handleApiError(e);
  }
}