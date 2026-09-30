import type { Metadata } from "next";
import { Geist, Geist_Mono, JetBrains_Mono } from "next/font/google";
import "./globals.css";

import { cookies } from "next/headers";

import { AuthListener } from "@/components/auth/auth-listener";
import { ConfirmHost } from "@/components/ui/confirm-dialog";
import { Toaster } from "@/components/ui/toast";
import { THEME_INIT_SCRIPT } from "@/themes/init-script";
import {
  parseThemePreference,
  resolveThemeId,
  THEME_COOKIE,
  themeMode,
} from "@/themes/preference";

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
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  preload: false,
  display: "swap",
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  // Required, or Next warns at build and Open Graph URLs resolve relative.
  metadataBase: new URL(SITE_URL),
  title: "CubeHub — Speedcubing Timer, Tutorials & Competitions",
  description:
    "The all-in-one speedcubing platform for the Indian cubing community — timer, tutorials, ranked matches, and cube recommendations.",
  openGraph: {
    type: "website",
    siteName: "CubeHub",
    title: "CubeHub — Speedcubing Timer, Tutorials & Competitions",
    description:
      "The all-in-one speedcubing platform for the Indian cubing community — timer, tutorials, ranked matches, and cube recommendations.",
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
      className={`${modeClass}${geistSans.variable} ${geistMono.variable} ${jetbrainsMono.variable} h-full antialiased`}
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
        <Toaster />
        <ConfirmHost />
        {children}
      </body>
    </html>
  );
}
