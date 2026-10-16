import type { Metadata } from "next";
import { Geist, Geist_Mono, JetBrains_Mono, Outfit } from "next/font/google";
import "./globals.css";

import { cookies } from "next/headers";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

import { AuthListener } from "@/components/auth/auth-listener";
import { ThemeFavicon } from "@/components/brand/theme-favicon";
import { ThemeSwitcher } from "@/components/dev/theme-switcher";
import { SystemThemeSync } from "@/components/layout/system-theme-sync";
import { ConfirmHost } from "@/components/ui/confirm-dialog";
import { Toaster } from "@/components/ui/toast";
import { SITE_URL } from "@/lib/site-url";
import { THEME_INIT_SCRIPT } from "@/themes/init-script";
import {
  parseThemePreference,
  resolveThemeId,
  THEME_COOKIE,
  themeMode,
} from "@/themes/preference";

/**
 * Vercel Web Analytics and Speed Insights run only on Vercel deployments
 * (`VERCEL=1`, set at build and run time). Local dev, `next start`, Playwright
 * and GitHub CI leave it unset, so they never load the scripts or request
 * /_vercel/*, which would 404 off Vercel. No custom events: Hobby plan.
 */
const ON_VERCEL = process.env.VERCEL === "1";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Paper's timer font. preload: false keeps it out of the <head> preloads; the
// @font-face is still declared, so the browser fetches the file only once an
// element actually renders in it (Paper's --font-timer).
// Brand font: only the logo wordmark and tagline use it (--font-brand in
// globals.css; weights 500 and 700). Body text stays Geist. Outfit is a
// variable font, so no `weight`: one file covers both, and Turbopack's
// next/font fails the build on a multi-weight list for it.
const outfit = Outfit({
  variable: "--font-brand",
  subsets: ["latin"],
  display: "swap",
});

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
 */
export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  // The cookie is the source of truth for the theme. Token values are keyed
  // on [data-theme] (src/themes/); `.dark` is derived from the theme's mode
  // for shadcn `dark:` variants. "system" can't be resolved here, so the
  // server renders the default and THEME_INIT_SCRIPT corrects it before
  // first paint.
  const themeId = resolveThemeId(
    parseThemePreference(cookieStore.get(THEME_COOKIE)?.value),
  );
  const modeClass = themeMode(themeId) === "dark" ? "dark " : "";

  return (
    // suppressHydrationWarning: THEME_INIT_SCRIPT may change data-theme and
    // the `dark` class before hydration (only when the preference is "system").
    <html
      lang="en"
      data-theme={themeId}
      suppressHydrationWarning
      className={`${modeClass}${geistSans.variable} ${geistMono.variable} ${jetbrainsMono.variable} ${outfit.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
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
