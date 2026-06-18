// Lightweight, dependency-free auth utilities.
// - Password hashing: Node.js scrypt + per-user salt (N=16384, r=8, p=1)
// - Sessions: HMAC-SHA256 signed JWT-style tokens (stateless, httpOnly cookie)

import crypto from "crypto";
import { cookies } from "next/headers";
import { db } from "@/lib/db";

const SESSION_SECRET =
  process.env.SESSION_SECRET ||
  "unissacco-dev-secret-change-in-production-32bytes-min!!";
const COOKIE_NAME = "unissacco_session";
const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

// ── Password hashing ────────────────────────────────────────────────────────

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .scryptSync(password, salt, 64)
    .toString("hex");
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [scheme, salt, hash] = stored.split("$");
    if (scheme !== "scrypt" || !salt || !hash) return false;
    const test = crypto.scryptSync(password, salt, 64).toString("hex");
    // constant-time compare
    return crypto.timingSafeEqual(Buffer.from(test, "hex"), Buffer.from(hash, "hex"));
  } catch {
    return false;
  }
}

// ── Token (JWT-style) ───────────────────────────────────────────────────────

function b64url(input: string | Buffer): string {
  const b = typeof input === "string" ? Buffer.from(input) : input;
  return b.toString("base64url");
}

function sign(payload: object): string {
  const header = { alg: "HS256", typ: "JWT" };
  const body = { ...payload, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS };
  const head = b64url(JSON.stringify(header));
  const data = b64url(JSON.stringify(body));
  const sig = crypto.createHmac("sha256", SESSION_SECRET).update(`${head}.${data}`).digest();
  return `${head}.${data}.${sig.toString("base64url")}`;
}

function verify<T = unknown>(token: string): T | null {
  try {
    const [head, data, sig] = token.split(".");
    if (!head || !data || !sig) return null;
    const expected = crypto
      .createHmac("sha256", SESSION_SECRET)
      .update(`${head}.${data}`)
      .digest()
      .toString("base64url");
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
    const body = JSON.parse(Buffer.from(data, "base64url").toString("utf8"));
    if (body.exp && body.exp < Math.floor(Date.now() / 1000)) return null;
    return body as T;
  } catch {
    return null;
  }
}

// ── Session cookie helpers (server-side, route handlers) ─────────────────────

export async function createSession(userId: string, role: string): Promise<void> {
  const token = sign({ sub: userId, role });
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: TOKEN_TTL_SECONDS,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

type SessionPayload = { sub: string; role: string };

export async function getSessionToken(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(COOKIE_NAME)?.value;
}

export type AuthUser = {
  id: string;
  email: string;
  role: string;
  status: string;
  fullName: string | null;
  studentId: string | null;
  phone: string | null;
  program: string | null;
  yearOfStudy: string | null;
  avatarUrl: string | null;
  joinedAt: Date;
};

export async function getCurrentUser(): Promise<AuthUser | null> {
  const token = await getSessionToken();
  if (!token) return null;
  const payload = verify<SessionPayload>(token);
  if (!payload?.sub) return null;
  const user = await db.user.findUnique({
    where: { id: payload.sub },
    select: {
      id: true,
      email: true,
      role: true,
      status: true,
      fullName: true,
      studentId: true,
      phone: true,
      program: true,
      yearOfStudy: true,
      avatarUrl: true,
      joinedAt: true,
    },
  });
  if (!user) return null;
  // Suspended / closed accounts cannot use the platform (admins can still manage)
  if (user.role === "MEMBER" && (user.status === "SUSPENDED" || user.status === "CLOSED")) {
    return null;
  }
  return user;
}

export async function requireAuth(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}

export async function requireAdmin(): Promise<AuthUser> {
  const user = await requireAuth();
  if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") throw new Error("FORBIDDEN");
  return user;
}

export async function audit(
  userId: string | null,
  action: string,
  entity: string,
  entityId: string | null,
  details: string,
  ipAddress?: string
): Promise<void> {
  try {
    await db.auditLog.create({
      data: { userId, action, entity, entityId, details, ipAddress },
    });
  } catch {
    // audit failures must never break the main flow
  }
}
