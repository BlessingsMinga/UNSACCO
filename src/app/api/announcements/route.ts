/**
 * GET /api/announcements - List all announcements (authenticated users)
 * POST /api/announcements - Create a new announcement (admin only)
 */
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, requireAdmin, audit } from "@/lib/auth";
import { ok, handleApiError, parseBody } from "@/lib/api";
import { z } from "zod";

const announcementSchema = z.object({
    title: z.string().min(1, "Title is required").max(200),
    content: z.string().min(1, "Content is required"),
    priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).optional().default("NORMAL"),
});

export async function GET(req: NextRequest) {
    try {
        await requireAuth();
        const url = new URL(req.url);
        const limit = Math.min(Number(url.searchParams.get("limit")) || 50, 100);
        const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
        const skip = (page - 1) * limit;

        const [announcements, total] = await Promise.all([
            db.announcement.findMany({
                orderBy: { createdAt: "desc" },
                skip,
                take: limit,
                include: {
                    author: { select: { fullName: true } },
                },
            }),
            db.announcement.count(),
        ]);

        return ok({
            announcements: announcements.map((a: { id: string; title: string; content: string; priority: string; createdAt: Date; author: { fullName: string | null } }) => ({
                id: a.id,
                title: a.title,
                content: a.content,
                priority: a.priority,
                createdAt: a.createdAt,
                authorName: a.author.fullName,
            })),
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        });
    } catch (e) {
        return handleApiError(e);
    }
}

export async function POST(req: Request) {
    try {
        const admin = await requireAdmin();
        const data = await parseBody(req, announcementSchema);

        const announcement = await db.announcement.create({
            data: {
                title: data.title,
                content: data.content,
                priority: data.priority,
                createdBy: admin.id,
            },
            include: {
                author: { select: { fullName: true } },
            },
        });

        await audit(admin.id, "ANNOUNCEMENT_CREATE", "Announcement", announcement.id, `Created announcement: ${announcement.title}`);

        return ok(announcement, 201);
    } catch (e) {
        return handleApiError(e);
    }
}