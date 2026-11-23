import { afterEach, describe, expect, it, vi } from "vitest";

/** site-url.ts reads the env when it loads, so each case re-imports the modules. */
async function load(env: { site?: string; app?: string }) {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", env.site ?? "");
  vi.stubEnv("NEXT_PUBLIC_APP_URL", env.app ?? "");
  return import("@/lib/marketing/links");
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("appHref", () => {
  it("stays relative on one host, so previews and local ports link to themselves", async () => {
    const links = await load({ site: "https://cuberhub.me" });
    expect(links.appHref("/timer")).toBe("/timer");
    expect(links.OPEN_APP_HREF).toBe("/home");
  });

  it("points at the app host once the hosts are split", async () => {
    const links = await load({ site: "https://cuberhub.me", app: "https://app.cuberhub.me" });
    expect(links.appHref("/timer")).toBe("https://app.cuberhub.me/timer");
    expect(links.OPEN_APP_HREF).toBe("https://app.cuberhub.me/home");
    expect(links.SIGN_IN_HREF).toBe("https://app.cuberhub.me/login");
  });
});
