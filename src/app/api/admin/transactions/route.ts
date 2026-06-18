import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { ok, handleApiError } from "@/lib/api";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const limit = Math.min(Number(searchParams.get("limit")) || 100, 300);
    const offset = Math.max(Number(searchParams.get("offset")) || 0, 0);
    const type = searchParams.get("type");

    const where: { type?: string } = {};
    if (type && type !== "ALL") where.type = type;

    const [total, transactions] = await Promise.all([
      db.savingsTransaction.count({ where }),
      db.savingsTransaction.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
        include: { user: { select: { fullName: true, studentId: true, email: true } } },
      }),
    ]);

    return ok({ transactions, total, limit, offset });
  } catch (e) {
    return handleApiError(e);
  }
}
