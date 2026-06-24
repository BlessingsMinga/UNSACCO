import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { ok, handleApiError } from "@/lib/api";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();
    const url = new URL(req.url);
    const limit = Math.min(Number(url.searchParams.get("limit")) || 50, 100);
    const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
    const skip = (page - 1) * limit;
    const unreadOnly = url.searchParams.get("unread") === "true";

    const where: Record<string, unknown> = { userId: user.id };
    if (unreadOnly) where.read = false;

    const [notifications, unreadCount, total] = await Promise.all([
      db.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      db.notification.count({
        where: { userId: user.id, read: false },
      }),
      db.notification.count({ where }),
    ]);

    return ok({ notifications, unreadCount, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (e) {
    return handleApiError(e);
  }
}
