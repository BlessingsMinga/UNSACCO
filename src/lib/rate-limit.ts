/**
 * Simple in-memory rate limiter for API route protection.
 * Tracks request counts per IP address within a sliding window.
 *
 * NOTE: For production with multiple server instances, replace this
 * with a Redis-backed solution (e.g., @upstash/ratelimit or ioredis).
 */

interface RateLimitEntry {
    count: number;
    resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Cleanup stale entries every 60 seconds
const CLEANUP_INTERVAL = 60_000;
let lastCleanup = Date.now();

function cleanup(): void {
    const now = Date.now();
    if (now - lastCleanup < CLEANUP_INTERVAL) return;
    lastCleanup = now;
    for (const [key, entry] of store) {
        if (now >= entry.resetAt) {
            store.delete(key);
        }
    }
}

export interface RateLimitConfig {
    /** Maximum number of requests allowed within the window */
    max: number;
    /** Time window in seconds */
    windowSeconds: number;
}

export const RATE_LIMIT_CONFIGS = {
    // Auth endpoints: 5 requests per minute (login, register)
    AUTH: { max: 5, windowSeconds: 60 },
    // Payment/withdrawal: 10 requests per minute
    PAYMENT: { max: 10, windowSeconds: 60 },
    // Standard API: 30 requests per minute
    STANDARD: { max: 30, windowSeconds: 60 },
    // Admin: 60 requests per minute
    ADMIN: { max: 60, windowSeconds: 60 },
} as const;

export type RateLimitScope = keyof typeof RATE_LIMIT_CONFIGS;

/**
 * Check if a request is rate-limited.
 * Returns an object with `allowed` boolean and remaining/timing info.
 */
export function checkRateLimit(
    ip: string,
    scope: RateLimitScope = "STANDARD"
): { allowed: boolean; remaining: number; resetAt: number } {
    cleanup();

    const config = RATE_LIMIT_CONFIGS[scope];
    const key = `${scope}:${ip}`;
    const now = Date.now();

    let entry = store.get(key);

    // First request or window expired — create/reset entry
    if (!entry || now >= entry.resetAt) {
        entry = { count: 1, resetAt: now + config.windowSeconds * 1000 };
        store.set(key, entry);
        return { allowed: true, remaining: config.max - 1, resetAt: entry.resetAt };
    }

    entry.count++;

    if (entry.count > config.max) {
        return { allowed: false, remaining: 0, resetAt: entry.resetAt };
    }

    return { allowed: true, remaining: config.max - entry.count, resetAt: entry.resetAt };
}

/**
 * Extract client IP from Next.js request object.
 * Handles various proxy headers (Cloudflare, Vercel, nginx, Caddy).
 */
export function getClientIp(request: Request): string {
    const forwarded = request.headers.get("x-forwarded-for");
    if (forwarded) {
        return forwarded.split(",")[0].trim();
    }
    const realIp = request.headers.get("x-real-ip");
    if (realIp) return realIp;
    const cfIp = request.headers.get("cf-connecting-ip");
    if (cfIp) return cfIp;

    return "127.0.0.1";
}

/**
 * Rate limit middleware helper for route handlers.
 * Throws an error with UNAUTHORIZED semantics if rate-limited,
 * or returns the result object for manual handling.
 */
export function rateLimitOrThrow(
    request: Request,
    scope: RateLimitScope = "STANDARD"
): { allowed: boolean; remaining: number; resetAt: number; retryAfter: number } {
    const ip = getClientIp(request);
    const result = checkRateLimit(ip, scope);

    if (!result.allowed) {
        const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);
        const error = new Error(`Rate limit exceeded. Try again in ${retryAfter} seconds.`);
        (error as { status?: number }).status = 429;
        (error as { retryAfter?: number }).retryAfter = retryAfter;
        throw error;
    }

    return {
        ...result,
        retryAfter: 0,
    };
}
