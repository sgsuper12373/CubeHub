import { MarketingHeader } from "@/components/marketing/marketing-header";

/**
 * Public marketing pages. One header for every width (docs/landing-plan.md →
 * Header): transparent over the hero, solid once the page scrolls, a menu
 * sheet on phones. No bottom nav: these aren't tab destinations, so `main`
 * also skips the `pb-16` spacer the app shell needs.
 *
 * Static: nothing here reads cookies on the server. The signed-in bits are
 * client islands (marketing-header.tsx); the root layout's SIGNED_IN_HINT_SCRIPT
 * lets them pick the right chrome before first paint.
 */
export default function MarketingLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <MarketingHeader />
      <main className="flex flex-1 flex-col">{children}</main>
    </>
  );
}
