import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { ok, notFound, handleApiError } from "@/lib/api";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
    const { id } = await params;
    const investment = await db.investment.findUnique({
      where: { id },
      include: {
        members: {
          include: { user: { select: { fullName: true, studentId: true } } },
        },
      },
    });
    if (!investment) return notFound("Investment not found.");
    return ok(investment);
  } catch (e) {
    return handleApiError(e);
  }
}
