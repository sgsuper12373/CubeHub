import type { Metadata } from "next";

import { ProsePage } from "@/components/marketing/prose-page";

/**
 * DRAFT, written from what the code does (2026-11-24). Have it reviewed before
 * launch; noindex until then.
 */
export const metadata: Metadata = {
  title: "Privacy | CuberHub",
  description: "What CuberHub stores about you, where, and why.",
  alternates: { canonical: "/privacy" },
  robots: { index: false },
};

export default function PrivacyPage() {
  return (
    <ProsePage eyebrow="Legal" title="Privacy" lead="What CuberHub stores, where, and why, in plain words.">
      <section>
        <h2>Without an account</h2>
        <p className="mt-2">
          Your solves, sessions and settings are saved in your browser (local storage) and never leave your device. A
          cookie remembers your theme.
        </p>
      </section>
      <section>
        <h2>With an account</h2>
        <ul className="mt-2">
          <li>Your email address, and your name and photo if you sign in with Google, to identify your account.</li>
          <li>Your profile, solves, sessions, settings, learning progress and drill results, so they sync across devices.</li>
          <li>Who you follow, the clubs you join, and what you post in them.</li>
        </ul>
        <p className="mt-2">
          Accounts and data are held by Supabase, our database and sign-in provider. Session cookies keep you signed in.
          Your profile is public unless you make it private when you edit your profile.
        </p>
      </section>
      <section>
        <h2>Analytics</h2>
        <p className="mt-2">
          We count page views and measure page speed with Vercel Web Analytics and Speed Insights. They set no cookies and
          don&apos;t track you across sites.
        </p>
      </section>
      <section>
        <h2>Your choices</h2>
        <p className="mt-2">
          Export all your solves from the Stats page at any time, make your profile private from Edit profile, or sign out on any device.
        </p>
      </section>
    </ProsePage>
  );
}
