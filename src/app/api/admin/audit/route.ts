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
    const action = searchParams.get("action");

    const where: { action?: string } = {};
    if (action && action !== "ALL") where.action = action;

    const [total, logs] = await Promise.all([
      db.auditLog.count({ where }),
      db.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
        include: {
          user: { select: { fullName: true, email: true } },
        },
      }),
    ]);

    return ok({ logs, total, limit, offset });
  } catch (e) {
    return handleApiError(e);
  }
}
