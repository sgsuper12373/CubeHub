import { describe, expect, it } from "vitest";

import { clientIp, createRateLimiter, normaliseEmail, normaliseSource } from "@/lib/waitlist/validate";

describe("waitlist email", () => {
  it("trims and lower-cases a real address", () => {
    expect(normaliseEmail("  Cuber+Sub10@Example.IN ")).toBe("cuber+sub10@example.in");
  });

  it("refuses what can't be an address", () => {
    for (const bad of ["", "   ", "cuber", "cuber@", "@example.com", "a b@example.com", "cuber@example", 42, null]) {
      expect(normaliseEmail(bad)).toBeNull();
    }
    expect(normaliseEmail(`${"a".repeat(250)}@x.in`)).toBeNull();
  });

  it("keeps known sources and defaults the rest", () => {
    expect(normaliseSource("landing-hero")).toBe("landing-hero");
    expect(normaliseSource("<script>")).toBe("landing-roadmap");
  });
});

describe("waitlist rate limit", () => {
  it("allows the limit per window per key, then resets", () => {
    const allow = createRateLimiter(2, 1000);
    expect(allow("1.2.3.4", 0)).toBe(true);
    expect(allow("1.2.3.4", 10)).toBe(true);
    expect(allow("1.2.3.4", 20)).toBe(false);
    expect(allow("5.6.7.8", 20)).toBe(true);
    expect(allow("1.2.3.4", 1001)).toBe(true);
  });

  it("reads the client IP from the first forwarded hop", () => {
    const h = (o: Record<string, string>) => ({ get: (k: string) => o[k] ?? null });
    expect(clientIp(h({ "x-forwarded-for": "9.9.9.9, 10.0.0.1" }))).toBe("9.9.9.9");
    expect(clientIp(h({ "x-real-ip": "8.8.8.8" }))).toBe("8.8.8.8");
    expect(clientIp(h({}))).toBe("unknown");
  });
});
