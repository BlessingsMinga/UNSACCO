import { db } from "@/lib/db";
import { createSession, audit, hashPassword } from "@/lib/auth";
import { registerSchema } from "@/lib/validation";
import { ok, fail, handleApiError, parseBody } from "@/lib/api";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const data = await parseBody(req, registerSchema);

    const existing = await db.user.findFirst({
      where: { OR: [{ email: data.email }, { studentId: data.studentId }] },
      select: { id: true, email: true, studentId: true },
    });
    if (existing) {
      if (existing.email === data.email) return fail("An account with this email already exists.", 409);
      return fail("This Student ID is already registered.", 409);
    }

    const user = await db.user.create({
      data: {
        email: data.email,
        passwordHash: hashPassword(data.password),
        fullName: data.fullName,
        studentId: data.studentId,
        phone: data.phone,
        program: data.program,
        yearOfStudy: data.yearOfStudy,
        gender: data.gender ?? null,
        role: "MEMBER",
        status: "PENDING",
      },
    });

    await db.savingsAccount.create({ data: { userId: user.id } });
    await db.shareHolding.create({ data: { userId: user.id } });

    await createSession(user.id, user.role);
    await audit(user.id, "REGISTER", "User", user.id, `New member registration: ${user.email}`);

    return ok(
      {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        status: user.status,
        studentId: user.studentId,
      },
      201
    );
  } catch (e) {
    return handleApiError(e);
  }
}
