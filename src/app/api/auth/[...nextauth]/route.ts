/**
 * NextAuth v4 API route handler.
 * Handles all authentication via /api/auth/* (signin, signout, session, etc.)
 */
import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth-options";

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };