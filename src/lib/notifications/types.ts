/** Notification rows as the UI shows them. No server imports. */

export type NotificationKind =
  | "follow"
  | "follow_request"
  | "follow_accepted"
  | "club_request"
  | "club_request_approved"
  | "club_comment"
  | "club_post_pinned"
  | "other";

const KINDS: ReadonlySet<string> = new Set([
  "follow",
  "follow_request",
  "follow_accepted",
  "club_request",
  "club_request_approved",
  "club_comment",
  "club_post_pinned",
]);

export interface NotificationItem {
  id: string;
  kind: NotificationKind;
  isRead: boolean;
  createdAt: string;
  actor: { username: string; displayName: string | null; avatarUrl: string | null } | null;
  /** For club notifications: the club as it's named now. */
  club?: { slug: string; name: string } | null;
  /** Fallback text for kinds this UI doesn't know yet. */
  title: string;
}

export function toKind(type: string): NotificationKind {
  return KINDS.has(type) ? (type as NotificationKind) : "other";
}

/** The sentence after the actor's name. */
export function notificationText(n: Pick<NotificationItem, "kind" | "title" | "club">): string {
  const club = n.club?.name ?? "a club";
  switch (n.kind) {
    case "follow":
      return "started following you";
    case "follow_request":
      return "asked to follow you";
    case "follow_accepted":
      return "accepted your follow request";
    case "club_request":
      return `asked to join ${club}`;
    case "club_request_approved":
      return `let you into ${club}`;
    case "club_comment":
      return `commented on your post in ${club}`;
    case "club_post_pinned":
      return `pinned an announcement in ${club}`;
    default:
      return n.title;
  }
}

/** Where tapping a notification goes. */
export function notificationHref(n: Pick<NotificationItem, "kind" | "actor" | "club">): string {
  if (n.kind === "follow_request") return "/people?tab=requests";
  if (n.kind === "club_request" && n.club) return `/clubs/${n.club.slug}/manage`;
  if (n.kind.startsWith("club_") && n.club) return `/clubs/${n.club.slug}`;
  if (n.actor) return `/profile/${n.actor.username}`;
  return "/people";
}

/** "now", "5m", "3h", "2d", then a date. */
export function timeAgo(iso: string, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 60) return "now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  if (s < 7 * 86400) return `${Math.floor(s / 86400)}d`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" });
}
