import { db } from "@/lib/db";
import { audit, hashPassword } from "@/lib/auth";
import { registerSchema } from "@/lib/validation";
import { ok, fail, handleApiError, parseBody, generateReference } from "@/lib/api";
import { MEMBERSHIP_FEE } from "@/lib/constants";
import { rateLimitOrThrow } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    rateLimitOrThrow(req, "AUTH");
    const data = await parseBody(req, registerSchema);

    const existing = await db.user.findFirst({
      where: { OR: [{ email: data.email }, { studentId: data.studentId }] },
      select: { id: true, email: true, studentId: true },
    });
    if (existing) {
      if (existing.email === data.email) return fail("An account with this email already exists.", 409);
      return fail("This Student ID is already registered.", 409);
    }

    const user = await db.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
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
      const savings = await tx.savingsAccount.create({ data: { userId: createdUser.id, balance: MEMBERSHIP_FEE } });
      await tx.savingsTransaction.create({
        data: {
          accountId: savings.id,
          userId: createdUser.id,
          type: "DEPOSIT",
          amount: MEMBERSHIP_FEE,
          balanceAfter: MEMBERSHIP_FEE,
          description: "Membership fee contribution (waived, credited as initial savings)",
          reference: generateReference("FEE"),
          method: "SYSTEM",
          status: "COMPLETED",
          recordedById: createdUser.id,
        },
      });
      await tx.shareHolding.create({ data: { userId: createdUser.id } });
      return createdUser;
    });
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
