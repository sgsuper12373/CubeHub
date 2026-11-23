import type { Metadata } from "next";
import Link from "next/link";

import { ProsePage } from "@/components/marketing/prose-page";
import { appHref } from "@/lib/marketing/links";

export const metadata: Metadata = {
  title: "About | CuberHub",
  description: "CuberHub is a speedcubing platform built in India, for Indian cubers: timer, tutorials, drills, profiles and clubs in one place.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <ProsePage
      eyebrow="About"
      title="One place for every part of cubing."
      lead="CuberHub brings the timer, the tutorials, the drills and your cubing friends into one place, so you don't need five tabs to practise."
    >
      <section>
        <h2>Why it exists</h2>
        <p className="mt-2">
          Cubers juggle a timer on one site, algorithms on another, and their club on a chat app. CuberHub puts them
          together and makes them work with each other: the Drill Lab knows which cases you&apos;ve learned, your profile
          shows your real PBs, and your club sees what you&apos;re practising.
        </p>
      </section>
      <section>
        <h2>Built in India</h2>
        <p className="mt-2">
          It&apos;s built by a student at IIT Palakkad for the Indian cubing community first: college clubs today, prices
          in rupees and India-first rankings next. It&apos;s free to use, and works without an account.
        </p>
      </section>
      <section>
        <h2>Where it&apos;s going</h2>
        <p className="mt-2">
          See the <Link href="/roadmap">roadmap</Link> for what&apos;s next, or <Link href={appHref("/timer")}>start timing</Link>.
        </p>
      </section>
    </ProsePage>
  );
}
