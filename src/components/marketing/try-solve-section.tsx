import { Timer } from "lucide-react";

import { HeroTimerCard } from "@/components/marketing/hero-timer-card";
import { SectionHeading } from "@/components/marketing/section-heading";

/**
 * "Try a solve right here" (docs/landing-plan.md → Try a solve): the hero's
 * timer card, enlarged, in its own full-screen section. It keeps its opt-in
 * rule: it plays a replay until the visitor clicks "Try a solve here", and
 * only then takes Space or touches; scrolling away or Escape hands the page
 * back. Its times are its own; nothing reaches the real timer.
 */
export function TrySolveSection() {
  return (
    <section
      id="try"
      aria-labelledby="try-heading"
      className="mx-auto flex min-h-[100svh] w-full max-w-6xl scroll-mt-16 flex-col items-center justify-center gap-10 px-4 py-20"
    >
      <SectionHeading
        id="try-heading"
        eyebrow="No sign-up"
        icon={Timer}
        title="Try a solve right here."
        lead={
          <>
            Click <strong className="font-semibold text-foreground">Try a solve here</strong>, then hold Space (or
            press and hold the card), release to start, and press again to stop. Escape hands the page back.
          </>
        }
        align="center"
      />
      <HeroTimerCard className="w-full max-w-xl" />
    </section>
  );
}
