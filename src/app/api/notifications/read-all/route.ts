import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { ok, handleApiError } from "@/lib/api";

export async function POST(_req: NextRequest) {
  try {
    const user = await requireAuth();
    const result = await db.notification.updateMany({
      where: { userId: user.id, read: false },
      data: { read: true, readAt: new Date() },
    });
    return ok({ markedRead: result.count });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await req.json();
    const { id } = body;
    if (!id) {
      // Mark all as read
      const result = await db.notification.updateMany({
        where: { userId: user.id, read: false },
        data: { read: true, readAt: new Date() },
      });
      return ok({ markedRead: result.count });
    }
    await db.notification.update({
      where: { id, userId: user.id },
      data: { read: true, readAt: new Date() },
    });
    return ok({ success: true });
  } catch (e) {
    return handleApiError(e);
  }
}