/**
 * Google OAuth sign-in route for UNSACCO.
 * Accepts a Google ID token from the client, verifies it server-side,
 * then creates/finds the user and establishes a session.
 */
import { db } from "@/lib/db";
import { createSession, audit } from "@/lib/auth";
import { ok, fail, handleApiError, parseBody } from "@/lib/api";
import { rateLimitOrThrow } from "@/lib/rate-limit";
import { OAuth2Client } from "google-auth-library";
import { z } from "zod";

export const runtime = "nodejs";

const googleClient = new OAuth2Client(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);

export async function POST(req: Request) {
    try {
        rateLimitOrThrow(req, "AUTH");

        const googleSchema = z.object({
            credential: z.string().min(1, "Credential token is required"),
        });
        const { credential } = await parseBody(req, googleSchema);

        // Verify the Google ID token server-side
        const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();
        if (!payload?.email) {
            return fail("Google account has no email address.", 400);
        }

        const googleId = payload.sub;
        const email = payload.email.toLowerCase().trim();
        const fullName = payload.name ?? email.split("@")[0];
        const avatarUrl = payload.picture ?? null;

        // Check if a user already exists with this googleId
        let user = await db.user.findUnique({ where: { googleId } });

        if (user) {
            // Existing Google-linked user — check status
            if (user.role === "MEMBER" && (user.status === "SUSPENDED" || user.status === "CLOSED")) {
                return fail(
                    user.status === "SUSPENDED"
                        ? "Your account is suspended. Contact the administrator."
                        : "Your account has been closed. Contact the administrator.",
                    403
                );
            }

            // Update avatar if Google has a newer one
            if (avatarUrl && avatarUrl !== user.avatarUrl) {
                await db.user.update({ where: { id: user.id }, data: { avatarUrl } });
            }
        } else {
            // No user with this googleId — check if email already exists
            const existingByEmail = await db.user.findUnique({ where: { email } });

            if (existingByEmail) {
                // Link Google account to existing user
                user = await db.user.update({
                    where: { id: existingByEmail.id },
                    data: { googleId, avatarUrl: avatarUrl ?? existingByEmail.avatarUrl },
                });
            } else {
                // Create a new user with Google account
                // Generate a random password hash (user won't use password login)
                const crypto = await import("crypto");
                const randomPassword = crypto.randomBytes(32).toString("hex");
                const { hashPassword } = await import("@/lib/auth");

                user = await db.user.create({
                    data: {
                        email,
                        passwordHash: hashPassword(randomPassword),
                        googleId,
                        fullName,
                        avatarUrl,
                        role: "MEMBER",
                        status: "PENDING",
                        emailVerified: true, // Google already verified the email
                    },
                });

                // Create savings account and share holding for new member
                const { MEMBERSHIP_FEE } = await import("@/lib/constants");
                const savings = await db.savingsAccount.create({
                    data: { userId: user.id, balance: MEMBERSHIP_FEE },
                });
                await db.savingsTransaction.create({
                    data: {
                        accountId: savings.id,
                        userId: user.id,
                        type: "DEPOSIT",
                        amount: MEMBERSHIP_FEE,
                        balanceAfter: MEMBERSHIP_FEE,
                        description: "Membership fee contribution (waived, credited as initial savings)",
                        reference: `GOOGLE-${googleId.slice(0, 8)}-${Date.now()}`,
                        method: "SYSTEM",
                        status: "COMPLETED",
                        recordedById: user.id,
                    },
                });
                await db.shareHolding.create({ data: { userId: user.id } });
            }
        }

        // Create session
        await createSession(user.id, user.role);
        await audit(user.id, "LOGIN", "User", user.id, `User logged in via Google (${email})`);

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