import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { updateProfileSchema } from "@/lib/validation";
import { ok, handleApiError, parseBody } from "@/lib/api";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await requireAuth();
    const profile = await db.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        fullName: true,
        studentId: true,
        phone: true,
        program: true,
        yearOfStudy: true,
        gender: true,
        dateOfBirth: true,
        address: true,
        nextOfKin: true,
        nextOfKinPhone: true,
        avatarUrl: true,
        role: true,
        status: true,
        joinedAt: true,
        approvedAt: true,
        createdAt: true,
      },
    });
    return ok(profile);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function PUT(req: Request) {
  try {
    const user = await requireAuth();
    const data = await parseBody(req, updateProfileSchema);
    const updated = await db.user.update({
      where: { id: user.id },
      data: {
        fullName: data.fullName,
        phone: data.phone,
        program: data.program,
        yearOfStudy: data.yearOfStudy,
        gender: data.gender,
        address: data.address,
        nextOfKin: data.nextOfKin,
        nextOfKinPhone: data.nextOfKinPhone,
        avatarUrl: data.avatarUrl || null,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        program: true,
        yearOfStudy: true,
      },
    });
    return ok(updated);
  } catch (e) {
    return handleApiError(e);
  }
}
