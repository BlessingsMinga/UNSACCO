/**
 * POST /api/auth/reset-password/request
 * Request a password reset email.
 *
 * POST /api/auth/reset-password/confirm
 * Confirm a password reset with a token.
 */
import { NextRequest } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { emailSchema } from "@/lib/validation";
import { ok, fail, handleApiError } from "@/lib/api";
import { rateLimitOrThrow } from "@/lib/rate-limit";
import { sendPasswordResetEmail } from "@/lib/email";

// In-memory store for reset tokens (use Redis in production)
const resetTokens = new Map<string, { userId: string; expiresAt: number }>();

const RESET_TOKEN_TTL = 60 * 60 * 1000; // 1 hour

/**
 * POST /api/auth/reset-password/request
 * Send a password reset email.
 */
export async function POST(request: NextRequest) {
    try {
        const url = new URL(request.url);
        const action = url.searchParams.get("action") || "request";

        if (action === "request") {
            return handleResetRequest(request);
        } else if (action === "confirm") {
            return handleResetConfirm(request);
        }

        return fail("Invalid action. Use 'request' or 'confirm'.", 400);
    } catch (e) {
        return handleApiError(e);
    }
}

async function handleResetRequest(request: NextRequest) {
    await rateLimitOrThrow(request, "AUTH");

    const { email } = await request.json().catch(() => ({ email: "" }));
    const parsed = emailSchema.safeParse(email);

    if (!parsed.success) {
        return fail("Please provide a valid email address.", 400);
    }

    const user = await db.user.findUnique({ where: { email: parsed.data } });

    // Don't reveal whether the email exists — always return success
    if (!user) {
        return ok({ message: "If an account with that email exists, a reset link has been sent." });
    }

    // Generate reset token
    const token = crypto.randomBytes(32).toString("hex");
    resetTokens.set(token, {
        userId: user.id,
        expiresAt: Date.now() + RESET_TOKEN_TTL,
    });

    const resetLink = `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password?token=${token}`;

    // Send email asynchronously — don't block the response
    sendPasswordResetEmail({ email: user.email, resetLink }).catch((e) => {
        console.error("[RESET] Failed to send reset email:", e);
    });

    return ok({ message: "If an account with that email exists, a reset link has been sent." });
}

async function handleResetConfirm(request: NextRequest) {
    await rateLimitOrThrow(request, "AUTH");

    const { token, password } = await request.json().catch(() => ({ token: "", password: "" }));

    if (!token || !password) {
        return fail("Token and password are required.", 400);
    }

    if (password.length < 8) {
        return fail("Password must be at least 8 characters.", 400);
    }

    const stored = resetTokens.get(token);
    if (!stored || stored.expiresAt < Date.now()) {
        resetTokens.delete(token);
        return fail("Invalid or expired reset token.", 400);
    }

    // Update password
    await db.user.update({
        where: { id: stored.userId },
        data: { passwordHash: hashPassword(password) },
    });

    // Clean up used token
    resetTokens.delete(token);

    return ok({ message: "Password reset successful. You can now log in with your new password." });
}
