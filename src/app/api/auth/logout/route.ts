import { destroySession, getCurrentUser, audit } from "@/lib/auth";
import { ok, handleApiError } from "@/lib/api";

export const runtime = "nodejs";

export async function POST() {
  try {
    const user = await getCurrentUser();
    if (user) await audit(user.id, "LOGOUT", "User", user.id, "User logged out");
    await destroySession();
    return ok({ success: true });
  } catch (e) {
    return handleApiError(e);
  }
}
