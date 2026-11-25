import { isCompanionEventName, type CompanionEventName } from "@/lib/companion/bus";
import { MOODS, type CubbyMood } from "@/lib/companion/renderer";
import type { ReactionKind } from "@/lib/companion/director";

/**
 * Cubby's per-page content (docs/cubby-cubing-companion.md → Content model):
 * one JSON file per page in src/content/cubby/, checked in so copy changes
 * are a normal PR. Lines may use {name} (the companion's name) and, in
 * reactions, the event's values ({time}, {delta}).
 */

export interface TourStep {
  id: string;
  /** A `data-tour` value; null shows a centred card. Missing targets are skipped. */
  target: string | null;
  title: string;
  body: string;
  mood?: CubbyMood;
  /** Wait for this event instead of a Next click. */
  waitFor?: CompanionEventName;
  /** The tour version that added this step (What's new tours show only newer steps). */
  since: number;
}

export type GreetingWhen = "firstVisit" | "returning" | `daysAway>=${number}` | "morning" | "afternoon" | "evening" | "night" | "always";

export interface Greeting {
  when: GreetingWhen;
  line: string;
  actions?: { label: string; href: string }[];
}

export interface PageContent {
  page: string;
  tourVersion: number;
  tour: TourStep[];
  greetings: Greeting[];
  reactions: Partial<Record<ReactionKind, string[]>>;
  tips: string[];
}

const REACTIONS: readonly ReactionKind[] = ["pb", "penalty", "mastered", "error", "stretch", "misstop", "solved", "bldDnf"];

/** Problems with a content file, empty when it's valid. */
export function contentProblems(raw: unknown): string[] {
  const out: string[] = [];
  if (!raw || typeof raw !== "object") return ["not an object"];
  const c = raw as Record<string, unknown>;
  if (typeof c.page !== "string" || !c.page) out.push("page: missing");
  if (!Number.isInteger(c.tourVersion) || (c.tourVersion as number) < 1) out.push("tourVersion: a positive integer");
  if (!Array.isArray(c.tour)) out.push("tour: an array");
  else {
    const ids = new Set<string>();
    c.tour.forEach((s: unknown, i) => {
      const step = (s ?? {}) as Record<string, unknown>;
      const at = `tour[${i}]`;
      if (typeof step.id !== "string" || !step.id) out.push(`${at}.id: missing`);
      else if (ids.has(step.id)) out.push(`${at}.id: duplicate "${step.id}"`);
      else ids.add(step.id);
      if (step.target !== null && (typeof step.target !== "string" || !/^[a-z0-9-]+$/.test(step.target))) out.push(`${at}.target: a data-tour value or null`);
      if (typeof step.title !== "string" || !step.title.trim()) out.push(`${at}.title: missing`);
      if (typeof step.body !== "string" || !step.body.trim()) out.push(`${at}.body: missing`);
      if (step.mood !== undefined && !(MOODS as readonly unknown[]).includes(step.mood)) out.push(`${at}.mood: unknown`);
      if (step.waitFor !== undefined && !isCompanionEventName(step.waitFor)) out.push(`${at}.waitFor: unknown event`);
      if (!Number.isInteger(step.since) || (step.since as number) < 1 || (step.since as number) > (c.tourVersion as number)) out.push(`${at}.since: 1..tourVersion`);
    });
  }
  if (!Array.isArray(c.greetings)) out.push("greetings: an array");
  else
    c.greetings.forEach((g: unknown, i) => {
      const gr = (g ?? {}) as Record<string, unknown>;
      if (!isGreetingWhen(gr.when)) out.push(`greetings[${i}].when: unknown condition`);
      if (typeof gr.line !== "string" || !gr.line.trim()) out.push(`greetings[${i}].line: missing`);
      if (gr.actions !== undefined) {
        if (!Array.isArray(gr.actions) || gr.actions.length > 2) out.push(`greetings[${i}].actions: up to two`);
        else
          gr.actions.forEach((a: unknown, j) => {
            const act = (a ?? {}) as Record<string, unknown>;
            if (typeof act.label !== "string" || typeof act.href !== "string" || !act.href.startsWith("/")) out.push(`greetings[${i}].actions[${j}]: label and a local href`);
          });
      }
    });
  if (!c.reactions || typeof c.reactions !== "object") out.push("reactions: an object");
  else
    for (const [k, v] of Object.entries(c.reactions as Record<string, unknown>)) {
      if (!(REACTIONS as readonly string[]).includes(k)) out.push(`reactions.${k}: unknown reaction`);
      if (!Array.isArray(v) || v.some((l) => typeof l !== "string" || !l.trim())) out.push(`reactions.${k}: an array of lines`);
    }
  if (!Array.isArray(c.tips) || c.tips.some((t) => typeof t !== "string" || !t.trim())) out.push("tips: an array of lines");
  return out;
}

export function isGreetingWhen(v: unknown): v is GreetingWhen {
  if (typeof v !== "string") return false;
  if (["firstVisit", "returning", "morning", "afternoon", "evening", "night", "always"].includes(v)) return true;
  return /^daysAway>=\d+$/.test(v);
}

/** Fills {name} and any other {key} from `values`; unknown keys stay as written. */
export function fillLine(line: string, values: Record<string, string | null | undefined>): string {
  return line.replace(/\{(\w+)\}/g, (whole, key: string) => {
    const v = values[key];
    return v === undefined || v === null ? whole : v;
  });
}

export interface GreetingContext {
  firstVisit: boolean;
  /** Whole days since the previous visit to this page; null on a first visit. */
  daysAway: number | null;
  hour: number;
}

function matches(when: GreetingWhen, ctx: GreetingContext): boolean {
  if (when === "always") return true;
  if (when === "firstVisit") return ctx.firstVisit;
  if (when === "returning") return !ctx.firstVisit;
  if (when === "morning") return ctx.hour >= 5 && ctx.hour < 12;
  if (when === "afternoon") return ctx.hour >= 12 && ctx.hour < 17;
  if (when === "evening") return ctx.hour >= 17 && ctx.hour < 22;
  if (when === "night") return ctx.hour >= 22 || ctx.hour < 5;
  const days = Number(when.slice("daysAway>=".length));
  return ctx.daysAway !== null && ctx.daysAway >= days;
}

/** How specific a condition is: the most specific matching group wins. */
function rank(when: GreetingWhen): number {
  if (when === "firstVisit") return 4;
  if (when.startsWith("daysAway")) return 3;
  if (when === "always" || when === "returning") return 1;
  return 2;
}

/** The greeting to show, or null. `random` picks within the most specific matching group. */
export function pickGreeting(pool: Greeting[], ctx: GreetingContext, random: () => number = Math.random): Greeting | null {
  const hits = pool.filter((g) => matches(g.when, ctx));
  if (hits.length === 0) return null;
  const best = Math.max(...hits.map((g) => rank(g.when)));
  const top = hits.filter((g) => rank(g.when) === best);
  return top[Math.min(top.length - 1, Math.floor(random() * top.length))];
}

export function pickLine(lines: string[] | undefined, random: () => number = Math.random): string | null {
  if (!lines || lines.length === 0) return null;
  return lines[Math.min(lines.length - 1, Math.floor(random() * lines.length))];
}

/**
 * A line with every {key} filled: lines that would show a raw placeholder
 * (a PB with no previous time has no {delta}) are left out. Null if none fit.
 */
export function pickFilledLine(lines: string[] | undefined, values: Record<string, string | null | undefined>, random: () => number = Math.random): string | null {
  const filled = (lines ?? []).map((l) => fillLine(l, values)).filter((l) => !/\{\w+\}/.test(l));
  return pickLine(filled, random);
}
