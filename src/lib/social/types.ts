/**
 * Shared social types and the pure rules the UI derives from them. No server
 * imports, so client components and unit tests can use them.
 */

export type FollowStatus = "none" | "pending" | "accepted";

/** From `get_follow_summary`: counts, and the viewer's relationship. */
export interface FollowSummary {
  followers: number;
  following: number;
  iFollow: FollowStatus;
  followsMe: boolean;
  blockedByMe: boolean;
}

/** A cuber in a list (followers, search, suggestions, requests). */
export interface PersonRow {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
}

/** A list row with what the viewer needs to act on it: follow state and one headline time. */
export interface PersonWithStat extends PersonRow {
  isPublic: boolean;
  iFollow: FollowStatus;
  followsMe: boolean;
  /** "3x3 Ao12 12.34", or null when they have no 3x3 times you can see. */
  headline: string | null;
}

export type FeedKind = "pb" | "practice" | "badge" | "learned";

/** One line of the People feed (`get_activity_feed`). */
export interface FeedItem {
  kind: FeedKind;
  person: PersonRow;
  puzzleType: string | null;
  /** PB category, badge slug or algorithm-set slug, by kind. */
  category: string | null;
  timeMs: number | null;
  /** Solves that day (practice) or cases learned (learned). */
  n: number | null;
  /** Badge title or algorithm-set name. */
  label: string | null;
  at: string;
}

/** What the follow button shows. */
export type FollowButtonState =
  | "hidden" // your own profile
  | "sign-in"
  | "follow"
  | "follow-back" // they follow you, you don't follow them
  | "requested"
  | "following"; // includes friends (mutual)

export function followButtonState(
  summary: Pick<FollowSummary, "iFollow" | "followsMe"> | null,
  opts: { signedIn: boolean; isOwner: boolean },
): FollowButtonState {
  if (opts.isOwner) return "hidden";
  if (!opts.signedIn) return "sign-in";
  if (!summary) return "follow";
  if (summary.iFollow === "accepted") return "following";
  if (summary.iFollow === "pending") return "requested";
  return summary.followsMe ? "follow-back" : "follow";
}

/** Friends are mutual, accepted follows. */
export function isFriend(summary: Pick<FollowSummary, "iFollow" | "followsMe"> | null): boolean {
  return summary?.iFollow === "accepted" && summary.followsMe;
}

export function toFollowSummary(raw: unknown): FollowSummary | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const status = r.i_follow;
  return {
    followers: typeof r.followers === "number" ? r.followers : 0,
    following: typeof r.following === "number" ? r.following : 0,
    iFollow: status === "pending" || status === "accepted" ? status : "none",
    followsMe: r.follows_me === true,
    blockedByMe: r.blocked_by_me === true,
  };
}

/** "1 follower", "1,204 followers" (Indian grouping, like the rest of the profile). */
export function countLabel(n: number, singular: string, plural: string): string {
  return `${n.toLocaleString("en-IN")} ${n === 1 ? singular : plural}`;
}

export const REPORT_REASONS = [
  { value: "spam", label: "Spam or fake account" },
  { value: "harassment", label: "Harassment or bullying" },
  { value: "inappropriate", label: "Inappropriate name, photo or bio" },
  { value: "impersonation", label: "Pretending to be someone else" },
  { value: "other", label: "Something else" },
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number]["value"];

export function isReportReason(v: string): v is ReportReason {
  return REPORT_REASONS.some((r) => r.value === v);
}

export const REPORT_NOTE_MAX = 500;
