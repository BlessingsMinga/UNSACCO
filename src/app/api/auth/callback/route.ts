/**
 * Auth callback route for Supabase OAuth.
 * Handles the OAuth redirect from Google (via Supabase Auth).
 * Exchanges the auth code for a session, then creates/links the user
 * in the Prisma database and establishes a custom session.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { createSession, audit } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("[AUTH/CALLBACK] Code exchange error:", error.message);
      return NextResponse.redirect(
        new URL("/?error=auth_callback_failed", requestUrl.origin)
      );
    }

    const supabaseUser = data.user;
    if (!supabaseUser?.email) {
      return NextResponse.redirect(
        new URL("/?error=no_email", requestUrl.origin)
      );
    }

    const email = supabaseUser.email.toLowerCase().trim();
    const fullName =
      supabaseUser.user_metadata?.full_name ??
      supabaseUser.user_metadata?.name ??
      email.split("@")[0];
    const avatarUrl = supabaseUser.user_metadata?.avatar_url ??
      supabaseUser.user_metadata?.picture ??
      null;
    const googleId = supabaseUser.identities?.find(
      (id) => id.provider === "google"
    )?.id ?? supabaseUser.id;

    try {
      // Check if a user already exists with this googleId
      let user = await db.user.findUnique({ where: { googleId } });

      if (user) {
        // Existing Google-linked user — check status
        if (
          user.role === "MEMBER" &&
          (user.status === "SUSPENDED" || user.status === "CLOSED")
        ) {
          return NextResponse.redirect(
            new URL(
              `/?error=${user.status === "SUSPENDED" ? "suspended" : "closed"}`,
              requestUrl.origin
            )
          );
        }

        // Update avatar if Google has a newer one
        if (avatarUrl && avatarUrl !== user.avatarUrl) {
          await db.user.update({
            where: { id: user.id },
            data: { avatarUrl },
          });
        }
      } else {
        // No user with this googleId — check if email already exists
        const existingByEmail = await db.user.findUnique({ where: { email } });

        if (existingByEmail) {
          // Link Google account to existing user
          user = await db.user.update({
            where: { id: existingByEmail.id },
            data: {
              googleId,
              avatarUrl: avatarUrl ?? existingByEmail.avatarUrl,
            },
          });
        } else {
          // Create a new user with Google account
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
              description:
                "Membership fee contribution (waived, credited as initial savings)",
              reference: `GOOGLE-${googleId.slice(0, 8)}-${Date.now()}`,
              method: "SYSTEM",
              status: "COMPLETED",
              recordedById: user.id,
            },
          });
          await db.shareHolding.create({ data: { userId: user.id } });
        }
      }

      // Create custom session
      await createSession(user.id, user.role);
      await audit(
        user.id,
        "LOGIN",
        "User",
        user.id,
        `User logged in via Google (Supabase Auth) (${email})`
      );
    } catch (e) {
      console.error("[AUTH/CALLBACK] User sync error:", e);
      return NextResponse.redirect(
        new URL("/?error=user_sync_failed", requestUrl.origin)
      );
    }
  }

  // Redirect to the app root
  return NextResponse.redirect(new URL("/", requestUrl.origin));
}