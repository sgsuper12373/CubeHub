/** Notification rows as the UI shows them. No server imports. */

export type NotificationKind = "follow" | "follow_request" | "follow_accepted" | "other";

export interface NotificationItem {
  id: string;
  kind: NotificationKind;
  isRead: boolean;
  createdAt: string;
  actor: { username: string; displayName: string | null; avatarUrl: string | null } | null;
  /** Fallback text for kinds this UI doesn't know yet. */
  title: string;
}

export function toKind(type: string): NotificationKind {
  return type === "follow" || type === "follow_request" || type === "follow_accepted" ? type : "other";
}

/** The sentence after the actor's name. */
export function notificationText(n: Pick<NotificationItem, "kind" | "title">): string {
  switch (n.kind) {
    case "follow":
      return "started following you";
    case "follow_request":
      return "asked to follow you";
    case "follow_accepted":
      return "accepted your follow request";
    default:
      return n.title;
  }
}

/** Where tapping a notification goes. */
export function notificationHref(n: Pick<NotificationItem, "kind" | "actor">): string {
  if (n.kind === "follow_request") return "/friends?tab=requests";
  if (n.actor) return `/profile/${n.actor.username}`;
  return "/friends";
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
