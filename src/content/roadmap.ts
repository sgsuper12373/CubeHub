/**
 * The public roadmap: one source for the landing page's board, the /roadmap
 * page, and (with the app shell) Home's "What's new". Keep it in step with
 * docs/roadmap.md: when something ships, move it to "now" as "shipped".
 */

export type RoadmapStatus = "shipped" | "building" | "planned";
export type RoadmapColumn = "now" | "next" | "later";

export type RoadmapItem = {
  title: string;
  detail: string;
  column: RoadmapColumn;
  status: RoadmapStatus;
};

export const ROADMAP_COLUMNS: { id: RoadmapColumn; title: string; lead: string }[] = [
  { id: "now", title: "Now", lead: "Live today" },
  { id: "next", title: "Next", lead: "Being built or up next" },
  { id: "later", title: "Later", lead: "On the list" },
];

export const STATUS_LABEL: Record<RoadmapStatus, string> = {
  shipped: "Shipped",
  building: "Building",
  planned: "Planned",
};

export const ROADMAP: RoadmapItem[] = [
  { column: "now", status: "shipped", title: "Timer and stats", detail: "WCA scrambles, inspection, sessions, every average, csTimer import." },
  { column: "now", status: "shipped", title: "Learn (3x3, 2x2)", detail: "Beginner to CFOP, Ortega and CLL, each case in 3D." },
  { column: "now", status: "shipped", title: "Drill Lab", detail: "Spaced repetition, recognition timing, algorithm races." },
  { column: "now", status: "shipped", title: "Playground", detail: "A cube to turn in the browser, with notation." },
  { column: "now", status: "shipped", title: "Profiles, friends, clubs", detail: "PBs and badges, follows, college clubs." },
  { column: "next", status: "building", title: "Cubby companion", detail: "A practice buddy who shows you around and cheers your PBs." },
  { column: "next", status: "planned", title: "BLD mode with memo split", detail: "Blindfolded solving with memo and execution timed apart." },
  { column: "next", status: "planned", title: "Daily scramble", detail: "One scramble for everyone, every day, with a leaderboard." },
  { column: "next", status: "planned", title: "Compete", detail: "Races on the same scramble, ratings, and bots to warm up against." },
  { column: "next", status: "planned", title: "College tournament rooms", detail: "Run your club's competition online." },
  { column: "later", status: "planned", title: "Bluetooth smart cubes", detail: "Connect a smart cube and review every move of a solve." },
  { column: "later", status: "planned", title: "AI coach", detail: "Advice from your own solves." },
  { column: "later", status: "planned", title: "Cube shop in ₹", detail: "Picks for your level and budget, from sellers who ship in India." },
  { column: "later", status: "planned", title: "National and state rankings", detail: "Leaderboards for India, state by state." },
  { column: "later", status: "planned", title: "Competition calendar", detail: "WCA competitions and meets across India." },
];

export function roadmapColumn(column: RoadmapColumn): RoadmapItem[] {
  return ROADMAP.filter((i) => i.column === column);
}
