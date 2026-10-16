import "server-only";
import { cache } from "react";

import { getUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

import { toKind, type NotificationItem } from "./types";

const LIMIT = 30;

/**
 * The signed-in cuber's latest notifications, with each actor's current name
 * and photo (looked up by id, since names can change). Actors the viewer can
 * no longer see (blocked) come back as null.
 */
export const getNotifications = cache(async (): Promise<{ items: NotificationItem[]; unread: number }> => {
  const user = await getUser();
  if (!user) return { items: [], unread: 0 };

  const supabase = await createClient();
  const [{ data, error }, { count }] = await Promise.all([
    supabase
      .from("notifications")
      .select("id, type, title, data, is_read, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(LIMIT),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_read", false),
  ]);
  if (error) {
    console.error("notifications query failed", error);
    return { items: [], unread: 0 };
  }

  const rows = data ?? [];
  const actorIds = [
    ...new Set(rows.map((r) => (r.data as { actor_id?: unknown })?.actor_id).filter((v): v is string => typeof v === "string")),
  ];
  const actors = new Map<string, NotificationItem["actor"]>();
  if (actorIds.length > 0) {
    const { data: people } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .in("id", actorIds);
    for (const p of people ?? []) {
      actors.set(p.id, { username: p.username, displayName: p.display_name, avatarUrl: p.avatar_url });
    }
  }

  // Club notifications carry club_id: look up the current name and slug (a
  // club can be renamed), and drop them for clubs that are gone.
  const clubIds = [
    ...new Set(rows.map((r) => (r.data as { club_id?: unknown })?.club_id).filter((v): v is string => typeof v === "string")),
  ];
  const clubs = new Map<string, { slug: string; name: string }>();
  if (clubIds.length > 0) {
    const { data: found } = await supabase.from("clubs").select("id, slug, name").in("id", clubIds);
    for (const c of found ?? []) clubs.set(c.id, { slug: c.slug, name: c.name });
  }

  const items = rows.flatMap((r): NotificationItem[] => {
    const actorId = (r.data as { actor_id?: unknown })?.actor_id;
    const actor = typeof actorId === "string" ? (actors.get(actorId) ?? null) : null;
    // A follow notification whose actor is hidden (blocked) has nothing to show.
    if (typeof actorId === "string" && !actor) return [];
    const clubId = (r.data as { club_id?: unknown })?.club_id;
    const club = typeof clubId === "string" ? (clubs.get(clubId) ?? null) : null;
    if (typeof clubId === "string" && !club) return [];
    return [
      {
        id: r.id,
        kind: toKind(r.type as string),
        isRead: r.is_read,
        createdAt: r.created_at,
        actor,
        club,
        title: r.title,
      },
    ];
  });

  return { items, unread: count ?? 0 };
});
