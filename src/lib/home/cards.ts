/**
 * Which cards /home shows, for whom, in what order (docs/home-plan.md → Who
 * sees what, Customising Home). Pure, so it's unit-tested without React.
 */

/** Every card id Home knows. The greeting and quick start row isn't a card: it's always there. */
export const CARD_IDS = [
  "welcome",
  "daily",
  "stats",
  "learning",
  "drill",
  "streak",
  "tip",
  "playground",
  "friends",
  "clubs",
  "whatsnew",
] as const;

export type CardId = (typeof CARD_IDS)[number];

export type Visitor = "guest-new" | "guest-returning" | "member-new" | "member";

/** Signed in with fewer solves than this: still "new" (the welcome card's setup steps). */
export const NEW_MEMBER_SOLVES = 20;

export function detectVisitor(input: { signedIn: boolean; solveCount: number }): Visitor {
  if (!input.signedIn) return input.solveCount > 0 ? "guest-returning" : "guest-new";
  return input.solveCount < NEW_MEMBER_SOLVES ? "member-new" : "member";
}

export type CardMeta = {
  id: CardId;
  title: string;
  /** The right rail from xl; joins the end of the main column below xl. */
  column: "main" | "rail";
  /** Shown in the Customize sheet (the welcome card manages itself). */
  customizable: boolean;
  /** Needs an account (friends, clubs). */
  signedInOnly: boolean;
};

export const CARDS: Record<CardId, CardMeta> = {
  welcome: { id: "welcome", title: "Start here", column: "main", customizable: false, signedInOnly: false },
  daily: { id: "daily", title: "Daily scramble", column: "main", customizable: true, signedInOnly: false },
  stats: { id: "stats", title: "Your stats", column: "main", customizable: true, signedInOnly: false },
  learning: { id: "learning", title: "Continue learning", column: "main", customizable: true, signedInOnly: false },
  drill: { id: "drill", title: "Drill queue", column: "main", customizable: true, signedInOnly: false },
  streak: { id: "streak", title: "Streak and daily goal", column: "main", customizable: true, signedInOnly: false },
  tip: { id: "tip", title: "Cubby's tip", column: "main", customizable: true, signedInOnly: false },
  playground: { id: "playground", title: "Playground", column: "main", customizable: true, signedInOnly: false },
  friends: { id: "friends", title: "Friends activity", column: "rail", customizable: true, signedInOnly: true },
  clubs: { id: "clubs", title: "Your clubs", column: "rail", customizable: true, signedInOnly: true },
  whatsnew: { id: "whatsnew", title: "What's new", column: "rail", customizable: true, signedInOnly: false },
};

/**
 * The cards each kind of visitor starts with, in order. A regular member gets
 * the plan's default set, the daily scramble first; a returning guest gets it
 * too (guests can solve it; it's local until they sign in). New visitors start
 * with the welcome card instead and can switch the daily on. Streak and goal
 * is off by default and can be switched on.
 */
export const DEFAULT_CARDS: Record<Visitor, readonly CardId[]> = {
  "guest-new": ["welcome", "learning", "playground", "tip", "whatsnew"],
  "guest-returning": ["daily", "stats", "streak", "learning", "tip", "whatsnew"],
  "member-new": ["welcome", "learning", "drill", "tip", "friends", "clubs", "whatsnew"],
  member: ["daily", "stats", "learning", "drill", "tip", "friends", "clubs", "whatsnew"],
};

/** The cards that can be switched on even if a visitor's defaults leave them off. */
export function availableCards(visitor: Visitor): CardId[] {
  const signedIn = visitor === "member" || visitor === "member-new";
  return CARD_IDS.filter((id) => CARDS[id].customizable && (signedIn || !CARDS[id].signedInOnly));
}

/**
 * The saved layout: cards switched off, and cards switched on that the
 * defaults leave off. Stored as `user_settings.home_layout` (signed in) or the
 * `cubehub.home.v1` localStorage key (guests). `order` is reserved for drag
 * reordering (v1.1).
 */
export type HomeLayout = { hidden: string[]; shown: string[]; order?: string[] };

export const EMPTY_LAYOUT: HomeLayout = { hidden: [], shown: [] };

function isCardId(v: unknown): v is CardId {
  return typeof v === "string" && (CARD_IDS as readonly string[]).includes(v);
}

/** Reads a stored layout; anything malformed is the default. Unknown ids are dropped. */
export function parseHomeLayout(raw: unknown): HomeLayout | null {
  let value = raw;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      return null;
    }
  }
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const v = value as Record<string, unknown>;
  const list = (x: unknown) => (Array.isArray(x) ? [...new Set(x.filter(isCardId))] : []);
  const layout: HomeLayout = { hidden: list(v.hidden), shown: list(v.shown) };
  if (Array.isArray(v.order)) layout.order = list(v.order);
  return layout;
}

export function isLayoutEmpty(layout: HomeLayout | null): boolean {
  return !layout || (layout.hidden.length === 0 && layout.shown.length === 0 && !layout.order?.length);
}

/**
 * The cards to render, split by column, after the saved layout. The welcome
 * card follows the visitor (it's never in the Customize sheet); `welcomeDone`
 * hides it for good once its steps are ticked.
 */
export function homeCards(
  visitor: Visitor,
  layout: HomeLayout | null,
  opts: { welcomeDone?: boolean } = {},
): { main: CardId[]; rail: CardId[] } {
  const allowed = new Set<CardId>(availableCards(visitor));
  const defaults = DEFAULT_CARDS[visitor];
  const hidden = new Set(layout?.hidden ?? []);
  const shown = (layout?.shown ?? []).filter((id): id is CardId => isCardId(id) && allowed.has(id));

  const picked: CardId[] = [];
  for (const id of defaults) {
    if (id === "welcome") {
      if (!opts.welcomeDone) picked.push(id);
      continue;
    }
    if (allowed.has(id) && !hidden.has(id)) picked.push(id);
  }
  for (const id of shown) {
    if (!picked.includes(id) && !hidden.has(id)) picked.push(id);
  }
  // Keep the canonical order so a card switched on lands where it belongs.
  const order = new Map(CARD_IDS.map((id, i) => [id, i]));
  const defaultIndex = new Map(defaults.map((id, i) => [id, i]));
  picked.sort(
    (a, b) => (defaultIndex.get(a) ?? 100 + order.get(a)!) - (defaultIndex.get(b) ?? 100 + order.get(b)!),
  );

  return {
    main: picked.filter((id) => CARDS[id].column === "main"),
    rail: picked.filter((id) => CARDS[id].column === "rail"),
  };
}

/** Is this card on, given the visitor and layout (for the Customize sheet's switches)? */
export function isCardOn(visitor: Visitor, layout: HomeLayout | null, id: CardId): boolean {
  const { main, rail } = homeCards(visitor, layout, { welcomeDone: true });
  return main.includes(id) || rail.includes(id);
}

/**
 * A new layout with one card switched on or off. Off always records the card
 * as hidden, so it stays off even when the visitor moves on to another
 * default set (a guest who signs in, a new member who passes 20 solves).
 */
export function setCardOn(visitor: Visitor, layout: HomeLayout | null, id: CardId, on: boolean): HomeLayout {
  const base = layout ?? EMPTY_LAYOUT;
  const hidden = base.hidden.filter((h) => h !== id);
  const shown = base.shown.filter((s) => s !== id);
  if (on && !DEFAULT_CARDS[visitor].includes(id)) shown.push(id);
  if (!on) hidden.push(id);
  return { ...base, hidden, shown };
}

// ── Greeting and quick start ──

export function partOfDay(date: Date): "morning" | "afternoon" | "evening" {
  const h = date.getHours();
  if (h >= 5 && h < 12) return "morning";
  if (h >= 12 && h < 17) return "afternoon";
  return "evening";
}

export function greeting(name: string | null, date: Date | null): string {
  if (!name) return "Welcome to CuberHub";
  if (!date) return `Hi, ${name}`;
  return `Good ${partOfDay(date)}, ${name}`;
}

/** First name from a display name, else the username. */
export function greetingName(displayName: string | null, username: string): string {
  const first = displayName?.trim().split(/\s+/)[0];
  return first || username;
}

export function drillButtonLabel(due: number): string {
  if (due <= 0) return "Open Drill Lab";
  return `Drill ${due} due case${due === 1 ? "" : "s"}`;
}

export function continueButtonLabel(series: string | null): string {
  return series ? `Continue ${series}` : "Start learning";
}
