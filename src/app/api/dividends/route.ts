import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { ok, handleApiError } from "@/lib/api";

export async function GET(_req: NextRequest) {
  try {
    const user = await requireAuth();
    // Member gets their dividend payouts
    const payouts = await db.dividendPayout.findMany({
      where: { userId: user.id },
      include: {
        declaration: {
          select: { period: true, label: true, ratePerShare: true, declaredAt: true, status: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return ok(payouts);
  } catch (e) {
    return handleApiError(e);
  }
}