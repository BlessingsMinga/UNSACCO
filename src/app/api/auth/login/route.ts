import { db } from "@/lib/db";
import { createSession, audit, verifyPassword } from "@/lib/auth";
import { loginSchema } from "@/lib/validation";
import { ok, fail, handleApiError, parseBody } from "@/lib/api";
import { rateLimitOrThrow } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    await rateLimitOrThrow(req, "AUTH");
    const data = await parseBody(req, loginSchema);
    const user = await db.user.findUnique({ where: { email: data.email } });
    if (!user || !verifyPassword(data.password, user.passwordHash)) {
      return fail("Invalid email or password.", 401);
    }
    if (user.status !== "ACTIVE") {
      if (user.status === "PENDING") {
        return fail("Your membership is awaiting administrator approval.", 403);
      }
      return fail(
        user.status === "SUSPENDED"
          ? "Your account is suspended. Contact the administrator."
          : "Your account has been closed. Contact the administrator.",
        403
      );
    }

    await createSession(user.id, user.role);
    await audit(user.id, "LOGIN", "User", user.id, "User logged in");

    return ok({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      status: user.status,
      studentId: user.studentId,
    });
  } catch (e) {
    return handleApiError(e);
  }
}
