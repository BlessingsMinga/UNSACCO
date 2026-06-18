import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { ok, handleApiError } from "@/lib/api";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(req.url);
    const limit = Math.min(Number(searchParams.get("limit")) || 50, 200);
    const offset = Math.max(Number(searchParams.get("offset")) || 0, 0);
    const type = searchParams.get("type") || undefined;

    const where: { userId: string; type?: string } = { userId: user.id };
    if (type && type !== "ALL") where.type = type;

    const [total, transactions] = await Promise.all([
      db.savingsTransaction.count({ where }),
      db.savingsTransaction.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
    ]);

    return ok({ transactions, total, limit, offset });
  } catch (e) {
    return handleApiError(e);
  }
}
