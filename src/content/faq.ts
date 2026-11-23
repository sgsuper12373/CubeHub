/**
 * The landing page's FAQ (docs/landing-plan.md → FAQ), also emitted as
 * FAQPage JSON-LD. Every answer was checked against the app on 2026-11-24;
 * re-check when features change.
 */
export const FAQ: { q: string; a: string }[] = [
  {
    q: "Is CuberHub free?",
    a: "Yes. The timer, stats, Learn, the Drill Lab and the Playground are free to use.",
  },
  {
    q: "Do I need an account?",
    a: "No. Everything works without one, and your solves are saved in your browser. Sign in to sync them across devices, follow friends and join clubs.",
  },
  {
    q: "Does it work offline?",
    a: "The timer does, once the page has loaded: scrambles are generated on your device.",
  },
  {
    q: "Can I import my times from csTimer?",
    a: "Yes. Export a backup from csTimer and import it on the Stats page. You can export everything back out as JSON or CSV too.",
  },
  {
    q: "Are the scrambles WCA-legal?",
    a: "They're random-state scrambles from cubing.js, the same kind of scrambler WCA competitions use.",
  },
  {
    q: "Do you support smart cubes?",
    a: "Not yet. Bluetooth smart cubes with solve review are on the roadmap.",
  },
  {
    q: "Which puzzles are supported?",
    a: "The timer does 2x2 to 5x5, 3x3 one-handed, Pyraminx, Skewb and Megaminx. Learn covers 3x3 and 2x2 for now, with more to come.",
  },
  {
    q: "Who makes CuberHub?",
    a: "It's a student-built project from India, made by and for Indian cubers.",
  },
];
