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

    const [total, transactions] = await Promise.all([
      db.shareTransaction.count({ where: { userId: user.id } }),
      db.shareTransaction.findMany({
        where: { userId: user.id },
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
