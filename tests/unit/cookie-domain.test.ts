import { describe, expect, it } from "vitest";

import { cookieDomainFor } from "@/lib/site-url";

describe("cookieDomainFor", () => {
  it("is the parent domain when the hosts are split", () => {
    expect(cookieDomainFor("https://cuberhub.me", true)).toBe(".cuberhub.me");
    expect(cookieDomainFor("https://www.cuberhub.me", true)).toBe(".cuberhub.me");
  });

  it("is undefined in single-host mode", () => {
    expect(cookieDomainFor("https://cuberhub.me", false)).toBeUndefined();
    expect(cookieDomainFor("https://pre-cube-hub.vercel.app", false)).toBeUndefined();
  });

  it("is undefined on localhost and IP addresses, where browsers refuse a domain cookie", () => {
    expect(cookieDomainFor("http://localhost:3000", true)).toBeUndefined();
    expect(cookieDomainFor("http://app.localhost:3000", true)).toBeUndefined();
    expect(cookieDomainFor("http://127.0.0.1:3000", true)).toBeUndefined();
  });
});
