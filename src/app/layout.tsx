import type { Metadata } from "next";
import { Geist, Geist_Mono, JetBrains_Mono, Outfit } from "next/font/google";
import "./globals.css";

import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

import { AuthListener } from "@/components/auth/auth-listener";
import { ThemeFavicon } from "@/components/brand/theme-favicon";
import { ThemeSwitcher } from "@/components/dev/theme-switcher";
import { SystemThemeSync } from "@/components/layout/system-theme-sync";
import { ConfirmHost } from "@/components/ui/confirm-dialog";
import { Toaster } from "@/components/ui/toast";
import { SIGNED_IN_HINT_SCRIPT } from "@/lib/auth/viewer";
import { SITE_URL } from "@/lib/site-url";
import { THEME_INIT_SCRIPT } from "@/themes/init-script";
import { DEFAULT_THEME_ID } from "@/themes";
import { themeMode } from "@/themes/preference";

/**
 * Vercel Web Analytics and Speed Insights run only on Vercel deployments
 * (`VERCEL=1`, set at build and run time). Local dev, `next start`, Playwright
 * and GitHub CI leave it unset, so they never load the scripts or request
 * /_vercel/*, which would 404 off Vercel. No custom events: Hobby plan.
 */
const ON_VERCEL = process.env.VERCEL === "1";

// Preload only what paints in the first viewport. Measured on / (phone and
// desktop): Geist (body, nav, hero copy), Outfit (the logo and the hero
// lockup) and Geist Mono (the hero timer card). Everything else gets
// preload: false; its @font-face is still declared, so the browser fetches
// the file once an element actually renders in it. display: "swap" is the
// default, spelled out so nobody wonders.
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  preload: true,
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  preload: true,
  display: "swap",
});

// Brand font: only the logo wordmark and tagline use it (--font-brand in
// globals.css; weights 500 and 700). Body text stays Geist. Outfit is a
// variable font, so no `weight`: one file covers both, and Turbopack's
// next/font fails the build on a multi-weight list for it.
const outfit = Outfit({
  variable: "--font-brand",
  subsets: ["latin"],
  preload: true,
  display: "swap",
});

// Paper's timer font (Paper's --font-timer), so it paints above the fold
// only for Paper visitors (the landing hero's timer card), and never as the
// LCP element there (that's the hero copy). Preloading it would make every
// Slate visitor download a file they never use.
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  preload: false,
  display: "swap",
});

export const metadata: Metadata = {
  // Required, or Next warns at build and Open Graph URLs resolve relative.
  metadataBase: new URL(SITE_URL),
  title: "CubeHub — Speedcubing Timer, Tutorials & Stats",
  description:
    "The all-in-one speedcubing platform for the Indian cubing community — timer, stats, tutorials, algorithm drills and cuber profiles.",
  openGraph: {
    type: "website",
    siteName: "CubeHub",
    title: "CubeHub — Speedcubing Timer, Tutorials & Stats",
    description:
      "The all-in-one speedcubing platform for the Indian cubing community — timer, stats, tutorials, algorithm drills and cuber profiles.",
    url: SITE_URL,
  },
  twitter: {
    card: "summary_large_image",
  },
};

/**
 * Document shell only. Page chrome (navbar, bottom nav) belongs to the
 * route-group layouts — see `docs/architecture.md`. Keeping it out of here
 * is what lets /login render without an app navbar.
 *
 * `AuthListener` stays at the root so cross-tab sign-in/out is picked up on
 * every route, including the auth pages themselves.
 *
 * No cookies() here: reading a request API in the root layout would make
 * every route dynamic, the landing page included. The theme cookie is still
 * the source of truth; THEME_INIT_SCRIPT applies it before first paint.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Token values are keyed on [data-theme] (src/themes/); `.dark` is derived
  // from the theme's mode for shadcn `dark:` variants. The server always
  // renders the default; THEME_INIT_SCRIPT swaps in the cookie's theme (or the
  // OS one for "system") before first paint.
  const modeClass = themeMode(DEFAULT_THEME_ID) === "dark" ? "dark " : "";

  return (
    // suppressHydrationWarning: THEME_INIT_SCRIPT may change data-theme and
    // the `dark` class before hydration, and SIGNED_IN_HINT_SCRIPT may add
    // data-signed-in.
    <html
      lang="en"
      data-theme={DEFAULT_THEME_ID}
      suppressHydrationWarning
      className={`${modeClass}${geistSans.variable} ${geistMono.variable} ${jetbrainsMono.variable} ${outfit.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        {/* For static pages' signed-in chrome; see src/lib/auth/viewer.ts. */}
        <script dangerouslySetInnerHTML={{ __html: SIGNED_IN_HINT_SCRIPT }} />
      </head>
      {/* suppressHydrationWarning: browser extensions (e.g. ColorZilla's
          `cz-shortcut-listen`, Grammarly's `data-gr-*`) inject attributes onto
          <body> before React hydrates. This suppresses the one-level attribute
          diff for <body> only — child mismatches are still reported. */}
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <AuthListener />
        {/* Both render nothing. They run after hydration, so THEME_INIT_SCRIPT
            has already applied the theme the favicon reads. */}
        <SystemThemeSync />
        <ThemeFavicon />
        <Toaster />
        <ConfirmHost />
        {/* TEMP(step 8): renders nothing unless enabled; see the component. */}
        <ThemeSwitcher />
        {children}
        {ON_VERCEL && <Analytics />}
        {ON_VERCEL && <SpeedInsights />}
      </body>
    </html>
  );
}
