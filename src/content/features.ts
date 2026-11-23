import type { ChapterId } from "@/components/marketing/feature-chapters";

/**
 * The marketing site's feature pages (docs/landing-plan.md → SEO and sharing):
 * short, indexable pages for searches the home page can't catch, all on one
 * template (components/marketing/feature-page.tsx). Claims checked against
 * the app on 2026-11-24.
 */
export type FeaturePageContent = {
  slug: "timer" | "drill-lab" | "learn" | "playground";
  visual: ChapterId;
  metaTitle: string;
  description: string;
  eyebrow: string;
  title: string;
  lead: string;
  sections: { title: string; body: string }[];
  cta: { label: string; path: string };
};

export const FEATURE_PAGES: FeaturePageContent[] = [
  {
    slug: "timer",
    visual: "timer",
    metaTitle: "Online Speedcubing Timer with WCA Scrambles and Stats",
    description:
      "A free online Rubik's cube timer: WCA random-state scrambles, inspection, sessions, Ao5 to Ao100, stats and csTimer import. Works without an account.",
    eyebrow: "Timer and stats",
    title: "A speedcubing timer that disappears when you solve.",
    lead: "Open it and time. Random-state scrambles, WCA inspection and every average, with everything but the digits out of the way while the clock runs.",
    sections: [
      { title: "Eight events", body: "2x2 to 5x5, 3x3 one-handed, Pyraminx, Skewb and Megaminx, each with its own scrambles and sessions." },
      { title: "Every average", body: "Mo3, Ao5, Ao12, Ao50 and Ao100, worked out the WCA way, with personal bests and a share card when you beat one." },
      { title: "Stats that explain themselves", body: "Your trend, distribution, consistency and practice days on the Stats page." },
      { title: "Bring your history", body: "Import a csTimer backup, and export everything as JSON or CSV whenever you like." },
    ],
    cta: { label: "Open the timer", path: "/timer" },
  },
  {
    slug: "drill-lab",
    visual: "drill-lab",
    metaTitle: "Drill Lab: Algorithm Practice with Spaced Repetition",
    description:
      "Drill OLL and PLL cases with spaced repetition, time recognition and execution separately, and find out which algorithm is faster for your hands.",
    eyebrow: "Drill Lab",
    title: "Find out which algorithm is actually faster for your hands.",
    lead: "Every rep is timed. The Drill Lab brings your weakest cases back first and tells you when an alternative algorithm beats your main one.",
    sections: [
      { title: "Weakest first", body: "Cases you fail or are slow at come back before the ones you've mastered, on a spaced-repetition schedule." },
      { title: "Recognition, timed", body: "Split recognition from execution to see whether you're slow to spot a case or slow to turn it." },
      { title: "Race your algorithms", body: "Drill two algorithms for the same case and see whose median wins. When an alternative is clearly faster, it says so." },
    ],
    cta: { label: "Open the Drill Lab", path: "/learn/333/drill" },
  },
  {
    slug: "learn",
    visual: "learn",
    metaTitle: "Learn OLL, PLL and the Beginner Method in 3D",
    description:
      "Free Rubik's cube tutorials: the beginner method, CFOP, every OLL and PLL case in 3D with several algorithms each, plus Ortega and CLL for 2x2.",
    eyebrow: "Learn",
    title: "Every OLL and PLL, in 3D.",
    lead: "From your first solve to full CFOP. Each case shows on a cube you can play, with several algorithms to choose from.",
    sections: [
      { title: "3x3 and 2x2", body: "The beginner method and CFOP for 3x3; Ortega and CLL for 2x2." },
      { title: "Every case in 3D", body: "Watch any algorithm play on a cube, and compare the alternatives side by side." },
      { title: "Track what you know", body: "Mark cases learned and see your progress through each set." },
    ],
    cta: { label: "Explore Learn", path: "/learn" },
  },
  {
    slug: "playground",
    visual: "playground",
    metaTitle: "Virtual Rubik's Cube: Turn a Cube in Your Browser",
    description: "A virtual 3x3 cube you can drag, swipe or turn with notation. Try an algorithm before you learn it.",
    eyebrow: "Playground",
    title: "A cube you can turn right here.",
    lead: "No cube to hand? Drag to turn, swipe on your phone, or type moves in notation.",
    sections: [
      { title: "Three ways to turn", body: "Drag on a computer, swipe on a phone, or type notation with undo." },
      { title: "Try before you learn", body: "Paste an algorithm and watch what it does before you commit it to memory." },
    ],
    cta: { label: "Open the Playground", path: "/playground" },
  },
];

export function featurePage(slug: FeaturePageContent["slug"]): FeaturePageContent {
  return FEATURE_PAGES.find((p) => p.slug === slug)!;
}
