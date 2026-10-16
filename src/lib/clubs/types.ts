/**
 * Clubs: shared constants, row shapes and validation (docs/clubs.md). No
 * server imports, so forms and tests can use it. The database checks the same
 * rules (`20261020000100_clubs.sql`); these give the form a friendly message
 * before the round trip.
 */

export const CLUB_TYPES = [
  { id: "school", label: "School" },
  { id: "college", label: "College" },
  { id: "city", label: "City" },
  { id: "online", label: "Online" },
] as const;
export type ClubType = (typeof CLUB_TYPES)[number]["id"];

export const CLUB_TAGS = [
  { id: "333", label: "3x3" },
  { id: "222", label: "2x2" },
  { id: "big_cubes", label: "Big cubes" },
  { id: "one_handed", label: "One-handed" },
  { id: "blindfolded", label: "Blindfolded" },
  { id: "beginners", label: "Beginners" },
  { id: "speedsolving", label: "Speedsolving" },
  { id: "methods", label: "Methods" },
  { id: "casual", label: "Casual" },
] as const;
export type ClubTag = (typeof CLUB_TAGS)[number]["id"];

export const NAME_MIN = 3;
export const NAME_MAX = 40;
export const SLUG_MIN = 3;
export const SLUG_MAX = 40;
export const DESCRIPTION_MAX = 300;
export const TAGS_MAX = 3;
export const REQUEST_MESSAGE_MAX = 200;
export const OWNED_MAX = 3;

const RESERVED_SLUGS = new Set(["new", "manage", "invite", "join"]);
const SLUG_RE = /^[a-z0-9-]+$/;

export type ClubRole = "owner" | "admin" | "moderator" | "member";

export function isClubType(v: string): v is ClubType {
  return CLUB_TYPES.some((t) => t.id === v);
}

export function isClubTag(v: string): v is ClubTag {
  return CLUB_TAGS.some((t) => t.id === v);
}

export function clubTypeLabel(type: string): string {
  return CLUB_TYPES.find((t) => t.id === type)?.label ?? type;
}

export function clubTagLabel(tag: string): string {
  return CLUB_TAGS.find((t) => t.id === tag)?.label ?? tag;
}

/** "Pune Cubers!" → "pune-cubers". Never longer than SLUG_MAX. */
export function slugify(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, SLUG_MAX)
    .replace(/-+$/, "");
}

export interface ClubInput {
  name: string;
  slug: string;
  description: string;
  type: string;
  tags: string[];
  isPublic: boolean;
}

export type ClubField = "name" | "slug" | "description" | "type" | "tags";

export type ClubValidation =
  | { ok: true; value: ClubInput & { type: ClubType; tags: ClubTag[] } }
  | { ok: false; field: ClubField; error: string };

export function validateClubInput(input: ClubInput): ClubValidation {
  const name = input.name.trim().replace(/\s+/g, " ");
  if (name.length < NAME_MIN || name.length > NAME_MAX) {
    return { ok: false, field: "name", error: `Use ${NAME_MIN}–${NAME_MAX} characters.` };
  }

  const slug = input.slug.trim().toLowerCase();
  if (slug.length < SLUG_MIN || slug.length > SLUG_MAX) {
    return { ok: false, field: "slug", error: `Use ${SLUG_MIN}–${SLUG_MAX} characters.` };
  }
  if (!SLUG_RE.test(slug)) {
    return { ok: false, field: "slug", error: "Use lowercase letters, numbers and dashes." };
  }
  if (RESERVED_SLUGS.has(slug)) {
    return { ok: false, field: "slug", error: "That address is reserved. Pick another." };
  }

  const description = input.description.trim();
  if (description.length > DESCRIPTION_MAX) {
    return { ok: false, field: "description", error: `Keep it under ${DESCRIPTION_MAX} characters.` };
  }

  if (!isClubType(input.type)) {
    return { ok: false, field: "type", error: "Pick a type." };
  }

  const tags = [...new Set(input.tags)];
  if (tags.length > TAGS_MAX) {
    return { ok: false, field: "tags", error: `Pick up to ${TAGS_MAX} tags.` };
  }
  if (!tags.every(isClubTag)) {
    return { ok: false, field: "tags", error: "Pick tags from the list." };
  }

  return {
    ok: true,
    value: { name, slug, description, type: input.type, tags, isPublic: input.isPublic },
  };
}

/** A club as a list row or header shows it. */
export interface ClubSummary {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  type: ClubType;
  tags: ClubTag[];
  isPublic: boolean;
  memberCount: number;
}

/** The viewer's relationship to one club. */
export type Membership =
  | { kind: "signed-out" }
  | { kind: "none" }
  | { kind: "requested" }
  | { kind: "member"; role: ClubRole };

export function canManage(m: Membership): boolean {
  return m.kind === "member" && (m.role === "owner" || m.role === "admin");
}

/** Owner, admins, then members, each group by name. */
export const ROLE_ORDER: Record<ClubRole, number> = { owner: 0, admin: 1, moderator: 2, member: 3 };

export function roleLabel(role: ClubRole): string {
  return role === "owner" ? "Owner" : role === "admin" ? "Admin" : "Member";
}

/** The RPCs' error hints whose message is written for the cuber. */
const USER_FACING_HINTS = new Set([
  "not_signed_in",
  "needs_username",
  "owned_limit",
  "club_limit",
  "name_taken",
  "slug_taken",
  "banned",
  "private",
  "public",
  "rate_limited",
  "too_long",
  "owner",
  "self",
  "forbidden",
  "not_member",
  "not_found",
  "bad_role",
  "pin_limit",
  "admins_only",
  "expired",
  "bad_expiry",
]);

export function clubErrorMessage(
  error: { message: string; hint?: string | null } | null,
  fallback: string,
): string {
  if (error?.hint && USER_FACING_HINTS.has(error.hint)) return error.message;
  return fallback;
}

export const INVITE_EXPIRY_OPTIONS = [
  { days: 1, label: "1 day" },
  { days: 7, label: "7 days" },
  { days: 30, label: "30 days" },
  { days: null, label: "Never" },
] as const;

export type InviteState = "active" | "expired" | "revoked" | "used_up";

/** Same order of checks as `get_club_invite`. */
export function inviteState(
  invite: { revokedAt: string | null; expiresAt: string | null; maxUses: number | null; uses: number },
  now = Date.now(),
): InviteState {
  if (invite.revokedAt) return "revoked";
  if (invite.expiresAt && new Date(invite.expiresAt).getTime() <= now) return "expired";
  if (invite.maxUses !== null && invite.uses >= invite.maxUses) return "used_up";
  return "active";
}

/** "in 6 days", "in 3 hours", "in 12 minutes", for an expiry in the future. */
export function timeUntil(iso: string, now = Date.now()): string {
  const s = Math.max(0, Math.round((new Date(iso).getTime() - now) / 1000));
  const unit = (n: number, w: string) => `in ${n} ${w}${n === 1 ? "" : "s"}`;
  if (s >= 86400) return unit(Math.floor(s / 86400), "day");
  if (s >= 3600) return unit(Math.floor(s / 3600), "hour");
  return unit(Math.max(1, Math.floor(s / 60)), "minute");
}
