import { getCurrentUser } from "@/lib/auth";
import { ok, handleApiError } from "@/lib/api";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await getCurrentUser();
    return ok({ user, authenticated: !!user });
  } catch (e) {
    return handleApiError(e);
  }
}
