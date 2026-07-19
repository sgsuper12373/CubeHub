import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { cookies } from "next/headers";

import { AuthListener } from "@/components/auth/auth-listener";
import { Toaster } from "@/components/ui/toast";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
  const themeCookie = cookieStore.get("cubehub-theme")?.value;
  // If there's no cookie, default to "dark". The client resolves "system" via matchMedia.
  // To avoid hydration mismatch, if it's "system", we default to "dark" server-side.
  const resolvedClass =
    themeCookie === "light" ? "light" : "dark";

  return (
    <html
      lang="en"
      className={`${resolvedClass} ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AuthListener />
        <Toaster />
        {children}
      </body>
    </html>
  );
}
