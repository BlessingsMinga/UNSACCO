/**
 * NextAuth v4 configuration for UNSACCO.
 * Uses credentials provider with Prisma adapter for database-backed sessions.
 */
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/auth";

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: "credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    throw new Error("Email and password are required");
                }

                const user = await db.user.findUnique({
                    where: { email: credentials.email.toLowerCase().trim() },
                });

                if (!user) {
                    throw new Error("Invalid email or password");
                }

                if (!verifyPassword(credentials.password, user.passwordHash)) {
                    throw new Error("Invalid email or password");
                }

                // Check if member account is suspended/closed
                if (user.role === "MEMBER" && (user.status === "SUSPENDED" || user.status === "CLOSED")) {
                    throw new Error(
                        user.status === "SUSPENDED"
                            ? "Your account is suspended. Contact the administrator."
                            : "Your account has been closed. Contact the administrator."
                    );
                }

                return {
                    id: user.id,
                    email: user.email,
                    name: user.fullName,
                    role: user.role,
                    status: user.status,
                };
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.role = (user as unknown as { role: string }).role;
                token.status = (user as unknown as { status: string }).status;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                (session.user as unknown as { id: string }).id = token.id as string;
                (session.user as unknown as { role: string }).role = token.role as string;
                (session.user as unknown as { status: string }).status = token.status as string;
            }
            return session;
        },
    },
    pages: {
        signIn: "/login",
        error: "/login",
    },
    session: {
        strategy: "jwt",
        maxAge: 7 * 24 * 60 * 60, // 7 days
    },
    secret: process.env.NEXTAUTH_SECRET || process.env.SESSION_SECRET,
};