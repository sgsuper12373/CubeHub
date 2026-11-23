import type { Metadata } from "next";

import { ProsePage } from "@/components/marketing/prose-page";

/**
 * DRAFT (2026-11-24): a plain-words starting point, not reviewed legal text.
 * Have it reviewed before launch; noindex until then.
 */
export const metadata: Metadata = {
  title: "Terms | CuberHub",
  description: "The terms for using CuberHub.",
  alternates: { canonical: "/terms" },
  robots: { index: false },
};

export default function TermsPage() {
  return (
    <ProsePage eyebrow="Legal" title="Terms" lead="The short version of how CuberHub works and what we ask of you.">
      <section>
        <h2>Using CuberHub</h2>
        <p className="mt-2">
          CuberHub is free to use. You can use the timer, Learn, the Drill Lab and the Playground without an account.
        </p>
      </section>
      <section>
        <h2>Your account and content</h2>
        <p className="mt-2">
          Keep your sign-in details to yourself. What you post in clubs and on your profile is yours; you&apos;re responsible
          for it, and it must not be abusive, illegal or someone else&apos;s work. Anyone can report content, and
          content that breaks these rules can be removed.
        </p>
      </section>
      <section>
        <h2>The service</h2>
        <p className="mt-2">
          CuberHub is a young project and changes often. We work to keep it running and your data safe, but it comes
          without guarantees; export your solves if you want a copy of your own.
        </p>
      </section>
    </ProsePage>
  );
}
