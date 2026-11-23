import { describe, expect, it } from "vitest";

import { isRootPath, routeForHost, type HostConfig } from "@/lib/host-routing";

const SPLIT: HostConfig = { siteUrl: "https://cuberhub.me", appUrl: "https://app.cuberhub.me" };
const SINGLE: HostConfig = { siteUrl: "https://cuberhub.me", appUrl: "https://cuberhub.me" };
const ROOT = "cuberhub.me";
const APP = "app.cuberhub.me";

const route = (host: string, path: string, search = "", config = SPLIT) =>
  routeForHost(host, path, search, config);

describe("routeForHost", () => {
  it("passes everything in single-host mode", () => {
    for (const path of ["/", "/timer", "/features/timer", "/robots.txt", "/login"]) {
      expect(route(ROOT, path, "", SINGLE)).toEqual({ kind: "pass" });
    }
  });

  it("serves marketing pages on the root host", () => {
    for (const path of ["/", "/features/timer", "/features", "/roadmap", "/about", "/privacy", "/terms"]) {
      expect(route(ROOT, path)).toEqual({ kind: "pass" });
    }
  });

  it("moves app paths from the root host to the app host with a 308, keeping the query", () => {
    expect(route(ROOT, "/timer", "?x=1")).toEqual({
      kind: "redirect",
      to: "https://app.cuberhub.me/timer?x=1",
      status: 308,
    });
    for (const path of [
      "/home",
      "/stats",
      "/learn/333/pll/1",
      "/learn/333/drill",
      "/playground",
      "/clubs/iit",
      "/profile/someone",
      "/people",
      "/friends",
      "/settings",
      "/compete",
      "/shop",
      "/master-access/cases",
      "/login",
      "/signup/check-email",
      "/auth/callback",
    ]) {
      expect(route(ROOT, path)).toMatchObject({ kind: "redirect", status: 308, to: `https://app.cuberhub.me${path}` });
    }
  });

  it("serves app paths on the app host", () => {
    for (const path of ["/home", "/timer", "/learn/333", "/login", "/auth/confirm", "/settings"]) {
      expect(route(APP, path)).toEqual({ kind: "pass" });
    }
  });

  it("sends the app host's / to /home with a 307", () => {
    expect(route(APP, "/")).toEqual({ kind: "redirect", to: "https://app.cuberhub.me/home", status: 307 });
  });

  it("moves marketing paths from the app host to the root host", () => {
    expect(route(APP, "/features/drill-lab", "?ref=nav")).toEqual({
      kind: "redirect",
      to: "https://cuberhub.me/features/drill-lab?ref=nav",
      status: 308,
    });
    expect(route(APP, "/roadmap")).toMatchObject({ kind: "redirect", to: "https://cuberhub.me/roadmap" });
  });

  it("gives the app host its own robots.txt and sitemap", () => {
    expect(route(APP, "/robots.txt")).toEqual({ kind: "rewrite", to: "/app-robots.txt" });
    expect(route(APP, "/sitemap.xml")).toEqual({ kind: "rewrite", to: "/app-sitemap.xml" });
    expect(route(ROOT, "/robots.txt")).toEqual({ kind: "pass" });
    expect(route(ROOT, "/sitemap.xml")).toEqual({ kind: "pass" });
  });

  it("never touches internals, API routes, files or metadata images", () => {
    for (const host of [ROOT, APP]) {
      for (const path of [
        "/_next/static/chunks/a.js",
        "/_next/image",
        "/api/viewer",
        "/cubing/esm/index.js",
        "/brand/cuberhub-og-slate.png",
        "/favicon.ico",
        "/icon",
        "/apple-icon",
        "/opengraph-image",
        "/twitter-image",
        "/learn/333/pll/1/opengraph-image",
        "/opengraph-image-1a2b3c",
        "/.well-known/security.txt",
      ]) {
        expect(route(host, path)).toEqual({ kind: "pass" });
      }
    }
  });

  it("passes requests to any other host, such as a deployment URL", () => {
    expect(route("cubehub-abc123.vercel.app", "/timer")).toEqual({ kind: "pass" });
    expect(route("cubehub-abc123.vercel.app", "/")).toEqual({ kind: "pass" });
  });

  it("matches hosts case-insensitively and with ports", () => {
    const local: HostConfig = { siteUrl: "http://localhost:3000", appUrl: "http://app.localhost:3000" };
    expect(route("APP.localhost:3000", "/", "", local)).toEqual({
      kind: "redirect",
      to: "http://app.localhost:3000/home",
      status: 307,
    });
    expect(route("localhost:3000", "/timer", "", local)).toMatchObject({
      kind: "redirect",
      to: "http://app.localhost:3000/timer",
    });
    // Same hostname, different port: a different host.
    expect(route("localhost:3100", "/timer", "", local)).toEqual({ kind: "pass" });
  });
});

describe("isRootPath", () => {
  it("matches exact paths and /** prefixes only", () => {
    expect(isRootPath("/")).toBe(true);
    expect(isRootPath("/features")).toBe(true);
    expect(isRootPath("/features/timer")).toBe(true);
    expect(isRootPath("/featuresx")).toBe(false);
    expect(isRootPath("/roadmap/2027")).toBe(false);
    expect(isRootPath("/timer")).toBe(false);
  });
});
