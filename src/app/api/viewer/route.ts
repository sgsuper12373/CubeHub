import { getProfile, getUser } from "@/lib/auth/dal";
import { getNotifications } from "@/lib/notifications/dal";
import { SIGNED_OUT_VIEWER, type Viewer } from "@/lib/auth/viewer";

/**
 * The signed-in user's navbar data, for statically rendered pages (the
 * landing page) that can't read cookies on the server. Same accessors the
 * (app) layout uses. Per-user, so never cached.
 */
export async function GET() {
  const headers = { "Cache-Control": "private, no-store" };
  const user = await getUser();
  if (!user) return Response.json(SIGNED_OUT_VIEWER, { headers });

  const [profile, notifications] = await Promise.all([getProfile(), getNotifications()]);
  const viewer: Viewer = { signedIn: true, profile, notifications };
  return Response.json(viewer, { headers });
}
