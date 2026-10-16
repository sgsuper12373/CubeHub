/**
 * Club posts: limits, validation and video links (docs/clubs.md → Posts). No
 * server imports. The database checks the same rules (`club_posts` checks in
 * `20261020000100_clubs.sql`); the composer also checks algorithms with
 * cubing.js, which the database can't.
 */

export const TEXT_MAX = 1000;
export const CAPTION_MAX = 500;
export const ALG_MAX = 200;
export const SETUP_MAX = 200;
export const VIDEO_URL_MAX = 300;
export const PINS_MAX = 3;
/** The author can edit for this long after posting. */
export const EDIT_WINDOW_MS = 15 * 60 * 1000;

export type PostKind = "text" | "alg" | "video";
export type AlgPuzzle = "333" | "222";

export const POST_KINDS: { id: PostKind; label: string }[] = [
  { id: "text", label: "Text" },
  { id: "alg", label: "Algorithm" },
  { id: "video", label: "Video" },
];

// Same patterns as the table's check constraints.
const ALG_RE = /^[\s()]*([RLUDFBrludfbMESxyz]w?(2'|'2|[23'])?[\s()]*)+$/;
const VIDEO_RE =
  /^https:\/\/((www|m)\.)?(youtube\.com\/(watch\?v=|shorts\/|live\/)|youtu\.be\/|instagram\.com\/(p|reels?|tv)\/)[A-Za-z0-9_?=&/.%-]+$/i;

export interface PostInput {
  kind: PostKind;
  /** The text of a text post, or the optional caption of the others. */
  body: string;
  alg: string;
  puzzle: string;
  setup: string;
  videoUrl: string;
}

export type PostField = "body" | "alg" | "puzzle" | "setup" | "videoUrl";

/** The row to write: unused fields are null, as the table's checks require. */
export interface PostValues {
  kind: PostKind;
  body: string | null;
  alg: string | null;
  puzzle: AlgPuzzle | null;
  setup: string | null;
  video_url: string | null;
}

export type PostValidation = { ok: true; value: PostValues } | { ok: false; field: PostField; error: string };

/** Collapses runs of spaces in notation; keeps the moves as typed. */
export function tidyAlg(alg: string): string {
  return alg.trim().replace(/\s+/g, " ");
}

export function isAlgNotation(alg: string): boolean {
  return ALG_RE.test(alg);
}

export function validatePostInput(input: PostInput): PostValidation {
  const body = input.body.trim();

  if (input.kind === "text") {
    if (!body) return { ok: false, field: "body", error: "Write something first." };
    if (body.length > TEXT_MAX) return { ok: false, field: "body", error: `Keep it under ${TEXT_MAX} characters.` };
    return { ok: true, value: { kind: "text", body, alg: null, puzzle: null, setup: null, video_url: null } };
  }

  if (body.length > CAPTION_MAX) {
    return { ok: false, field: "body", error: `Keep the caption under ${CAPTION_MAX} characters.` };
  }

  if (input.kind === "alg") {
    const alg = tidyAlg(input.alg);
    if (!alg) return { ok: false, field: "alg", error: "Type the algorithm." };
    if (alg.length > ALG_MAX) return { ok: false, field: "alg", error: `Keep it under ${ALG_MAX} characters.` };
    if (!isAlgNotation(alg)) {
      return { ok: false, field: "alg", error: "Use standard notation, like R U R' U'." };
    }
    if (input.puzzle !== "333" && input.puzzle !== "222") {
      return { ok: false, field: "puzzle", error: "Pick 3x3 or 2x2." };
    }
    const setup = input.setup.trim();
    if (setup.length > SETUP_MAX) {
      return { ok: false, field: "setup", error: `Keep it under ${SETUP_MAX} characters.` };
    }
    return {
      ok: true,
      value: { kind: "alg", body: body || null, alg, puzzle: input.puzzle, setup: setup || null, video_url: null },
    };
  }

  const url = input.videoUrl.trim();
  if (!url) return { ok: false, field: "videoUrl", error: "Paste a YouTube or Instagram link." };
  if (url.length > VIDEO_URL_MAX || !VIDEO_RE.test(url)) {
    return { ok: false, field: "videoUrl", error: "Only YouTube and Instagram links work here." };
  }
  return { ok: true, value: { kind: "video", body: body || null, alg: null, puzzle: null, setup: null, video_url: url } };
}

export type VideoLink = { site: "youtube"; id: string; url: string } | { site: "instagram"; url: string };

/** What a stored video link points at. Null for anything unexpected. */
export function parseVideoUrl(raw: string): VideoLink | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  const host = url.hostname.replace(/^(www|m)\./, "");
  const ID = /^[A-Za-z0-9_-]{6,20}$/;

  if (host === "youtu.be") {
    const id = url.pathname.slice(1).split("/")[0];
    return ID.test(id) ? { site: "youtube", id, url: raw } : null;
  }
  if (host === "youtube.com") {
    const id = url.pathname === "/watch" ? url.searchParams.get("v") : url.pathname.match(/^\/(shorts|live)\/([^/]+)/)?.[2];
    return id && ID.test(id) ? { site: "youtube", id, url: raw } : null;
  }
  if (host === "instagram.com" && /^\/(p|reels?|tv)\//.test(url.pathname)) {
    return { site: "instagram", url: raw };
  }
  return null;
}

/** Milliseconds left to edit, or 0. */
export function editTimeLeft(createdAt: string, now = Date.now()): number {
  return Math.max(0, new Date(createdAt).getTime() + EDIT_WINDOW_MS - now);
}

// ── Reactions and comments ─────────────────────────────────────────────────

export const REACTIONS = [
  { id: "fire", emoji: "🔥", label: "Fire" },
  { id: "clap", emoji: "👏", label: "Clap" },
  { id: "mind_blown", emoji: "🤯", label: "Mind blown" },
] as const;
export type ReactionId = (typeof REACTIONS)[number]["id"];

export function isReactionId(v: string): v is ReactionId {
  return REACTIONS.some((r) => r.id === v);
}

export type ReactionCounts = Record<ReactionId, { count: number; mine: boolean }>;

/** Rows from `club_post_reactions` → counts per post, and which are mine. */
export function tallyReactions(
  rows: readonly { post_id: string; user_id: string; reaction: string }[],
  viewerId: string | null,
): Map<string, ReactionCounts> {
  const out = new Map<string, ReactionCounts>();
  for (const r of rows) {
    if (!isReactionId(r.reaction)) continue;
    let counts = out.get(r.post_id);
    if (!counts) {
      counts = emptyReactions();
      out.set(r.post_id, counts);
    }
    counts[r.reaction].count += 1;
    if (r.user_id === viewerId) counts[r.reaction].mine = true;
  }
  return out;
}

export function emptyReactions(): ReactionCounts {
  return { fire: { count: 0, mine: false }, clap: { count: 0, mine: false }, mind_blown: { count: 0, mine: false } };
}

export const COMMENT_MAX = 500;
/** Comments shown under a post before "Show all". */
export const COMMENTS_PREVIEW = 3;

/** Same values as profile reports (the shared check), worded for club content. */
export const CLUB_REPORT_REASONS = [
  { value: "spam", label: "Spam or scam" },
  { value: "harassment", label: "Harassment or bullying" },
  { value: "inappropriate", label: "Inappropriate content" },
  { value: "impersonation", label: "Pretending to be someone else" },
  { value: "other", label: "Something else" },
] as const;
