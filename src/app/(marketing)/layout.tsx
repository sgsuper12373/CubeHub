import { Navbar } from "@/components/layout/navbar";
import { getProfile } from "@/lib/auth/dal";

/**
 * Public marketing pages (landing). Gets the navbar so visitors can sign in,
 * but no bottom nav — these aren't tab destinations, so `main` also skips the
 * `pb-16` spacer the app shell needs.
 */
export default async function MarketingLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const profile = await getProfile();

  return (
    <>
      <Navbar profile={profile} />
      <main className="flex flex-1 flex-col">{children}</main>
    </>
  );
}
