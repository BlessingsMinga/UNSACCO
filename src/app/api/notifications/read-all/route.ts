import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { ok, handleApiError, parseBody } from "@/lib/api";

const markReadSchema = z.object({
  id: z.string().min(1).optional(),
});

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
    const data = await parseBody(req, markReadSchema);
    const { id } = data;
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
