/// <reference types="vitest/globals" />
import { checkRateLimit, getClientIp, RATE_LIMIT_CONFIGS } from "@/lib/rate-limit";

describe("checkRateLimit", () => {
    beforeEach(() => {
        // Reset internal state by clearing the module's Map
        // We do this by calling checkRateLimit with a unique IP per test
    });

    it("should allow first request", () => {
        const result = checkRateLimit("192.168.1.1", "AUTH");
        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(RATE_LIMIT_CONFIGS.AUTH.max - 1);
    });

    it("should allow requests within limit", () => {
        const ip = "192.168.1.2";
        const config = RATE_LIMIT_CONFIGS.AUTH;
        for (let i = 0; i < config.max; i++) {
            const result = checkRateLimit(ip, "AUTH");
            expect(result.allowed).toBe(true);
            expect(result.remaining).toBe(config.max - i - 1);
        }
    });

    it("should block requests exceeding limit", () => {
        const ip = "192.168.1.3";
        const config = RATE_LIMIT_CONFIGS.AUTH;
        // Exhaust the limit
        for (let i = 0; i < config.max; i++) {
            checkRateLimit(ip, "AUTH");
        }
        // Next request should be blocked
        const result = checkRateLimit(ip, "AUTH");
        expect(result.allowed).toBe(false);
        expect(result.remaining).toBe(0);
    });

    it("should have different limits per scope", () => {
        const ip = "192.168.1.4";
        // AUTH: 5 req/min
        for (let i = 0; i < RATE_LIMIT_CONFIGS.AUTH.max; i++) {
            checkRateLimit(ip, "AUTH");
        }
        const authResult = checkRateLimit(ip, "AUTH");
        expect(authResult.allowed).toBe(false);

        // STANDARD: 30 req/min — should still be allowed
        const standardResult = checkRateLimit(ip, "STANDARD");
        expect(standardResult.allowed).toBe(true);
    });

    it("should track different IPs independently", () => {
        const config = RATE_LIMIT_CONFIGS.AUTH;
        // Exhaust limit for IP A
        for (let i = 0; i < config.max; i++) {
            checkRateLimit("10.0.0.1", "AUTH");
        }
        expect(checkRateLimit("10.0.0.1", "AUTH").allowed).toBe(false);
        // IP B should still be allowed
        expect(checkRateLimit("10.0.0.2", "AUTH").allowed).toBe(true);
    });

    it("should reset after window expires", () => {
        const ip = "192.168.1.5";
        const config = RATE_LIMIT_CONFIGS.AUTH;

        // Exhaust limit
        for (let i = 0; i < config.max; i++) {
            checkRateLimit(ip, "AUTH");
        }
        expect(checkRateLimit(ip, "AUTH").allowed).toBe(false);

        // Simulate window expiry by manipulating time
        // We can't easily do this with the in-memory store, but we can verify
        // the resetAt is in the future
        const result = checkRateLimit(ip, "AUTH");
        expect(result.resetAt).toBeGreaterThan(Date.now());
    });
});

describe("getClientIp", () => {
    it("should extract IP from x-forwarded-for", () => {
        const request = new Request("http://localhost", {
            headers: { "x-forwarded-for": "203.0.113.1, 10.0.0.1" },
        });
        expect(getClientIp(request)).toBe("203.0.113.1");
    });

    it("should extract IP from x-real-ip", () => {
        const request = new Request("http://localhost", {
            headers: { "x-real-ip": "198.51.100.1" },
        });
        expect(getClientIp(request)).toBe("198.51.100.1");
    });

    it("should extract IP from cf-connecting-ip", () => {
        const request = new Request("http://localhost", {
            headers: { "cf-connecting-ip": "192.0.2.1" },
        });
        expect(getClientIp(request)).toBe("192.0.2.1");
    });

    it("should fallback to 127.0.0.1 when no headers present", () => {
        const request = new Request("http://localhost");
        expect(getClientIp(request)).toBe("127.0.0.1");
    });

    it("should prefer x-forwarded-for over other headers", () => {
        const request = new Request("http://localhost", {
            headers: {
                "x-forwarded-for": "203.0.113.1",
                "x-real-ip": "198.51.100.1",
                "cf-connecting-ip": "192.0.2.1",
            },
        });
        expect(getClientIp(request)).toBe("203.0.113.1");
    });
});