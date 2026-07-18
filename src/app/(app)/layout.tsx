import { BottomNav } from "@/components/layout/bottom-nav";
import { Navbar } from "@/components/layout/navbar";
import { getProfile } from "@/lib/auth/dal";

/**
 * The signed-in app shell: navbar + mobile bottom nav.
 *
 * This group is a *chrome* boundary, not an access boundary — /timer,
 * /learn, /compete and /shop are all public. Routes that require an
 * account live in the nested `(protected)` group; content that requires
 * an account or a subscription is gated by RLS on the row itself.
 * See `docs/access-control.md`.
 */
export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const profile = await getProfile();

  return (
    <>
      <Navbar profile={profile} />
      <main className="flex flex-1 flex-col pb-16 md:pb-0">{children}</main>
      <BottomNav />
    </>
  );
}
