import { db } from "@/lib/db";
import { requireAdmin, audit } from "@/lib/auth";
import { ok, notFound, fail, handleApiError } from "@/lib/api";

export const runtime = "nodejs";

const ALLOWED_STATUSES = ["PENDING", "ACTIVE", "SUSPENDED", "CLOSED"];

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const member = await db.user.findUnique({
      where: { id },
      select: {
        id: true,
        fullName: true,
        email: true,
        studentId: true,
        phone: true,
        program: true,
        yearOfStudy: true,
        gender: true,
        address: true,
        nextOfKin: true,
        nextOfKinPhone: true,
        role: true,
        status: true,
        joinedAt: true,
        approvedAt: true,
        createdAt: true,
        savingsAccount: { select: { id: true, balance: true } },
        shareHoldings: { select: { id: true, numberOfShares: true } },
        savingsTxns: { orderBy: { createdAt: "desc" }, take: 10 },
        shareTxns: { orderBy: { createdAt: "desc" }, take: 10 },
      },
    });
    if (!member) return notFound("Member not found.");
    await audit(admin.id, "MEMBER_VIEW", "User", id, `Viewed member ${member.email}`);
    return ok(member);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const body = (await req.json().catch(() => ({}))) as { status?: string };
    if (!body.status || !ALLOWED_STATUSES.includes(body.status)) {
      return fail("Invalid status value.", 400);
    }

    const target = await db.user.findUnique({ where: { id } });
    if (!target) return notFound("Member not found.");
    if (target.role !== "MEMBER" && body.status !== target.status) {
      return fail("Only member accounts can have their status changed here.", 400);
    }

    const patch: { status: string; approvedAt?: Date; suspendedAt?: Date | null } = {
      status: body.status,
    };
    if (body.status === "ACTIVE" && target.status !== "ACTIVE") {
      patch.approvedAt = new Date();
    }
    if (body.status === "SUSPENDED") patch.suspendedAt = new Date();
    if (body.status !== "SUSPENDED") patch.suspendedAt = null;

    const updated = await db.user.update({ where: { id }, data: patch });

    // Ensure savings & share accounts exist when activating
    if (body.status === "ACTIVE") {
      const existingSavings = await db.savingsAccount.findUnique({ where: { userId: id } });
      if (!existingSavings) await db.savingsAccount.create({ data: { userId: id } });
      const existingShares = await db.shareHolding.findUnique({ where: { userId: id } });
      if (!existingShares) await db.shareHolding.create({ data: { userId: id } });
    }

    await audit(
      admin.id,
      body.status === "ACTIVE" ? "MEMBER_APPROVE" : `MEMBER_${body.status}`,
      "User",
      id,
      `Set member ${target.email} status to ${body.status}`
    );

    return ok({
      id: updated.id,
      status: updated.status,
      approvedAt: updated.approvedAt,
    });
  } catch (e) {
    return handleApiError(e);
  }
}
