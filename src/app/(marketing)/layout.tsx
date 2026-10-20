import Link from "next/link";

import { Logo } from "@/components/layout/logo";
import { MarketingNavbar, MobileHeaderAction } from "@/components/marketing/marketing-header";

/**
 * Public marketing pages (landing). Gets the navbar so visitors can sign in,
 * but no bottom nav — these aren't tab destinations, so `main` also skips the
 * `pb-16` spacer the app shell needs.
 *
 * `Navbar` is `hidden md:block` and the bottom nav doesn't exist here, which
 * would leave a phone visitor with no chrome and no route to sign in — hence
 * the small mobile header below. It matches the navbar's `h-14` so the hero's
 * viewport maths holds at both breakpoints.
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
      <MarketingNavbar />

      <header className="sticky top-0 z-40 flex h-14 items-center border-b border-border bg-background/80 px-4 backdrop-blur-sm md:hidden">
        <Link href="/" aria-label="CubeHub home">
          <Logo />
        </Link>
        <div className="ml-auto">
          <MobileHeaderAction />
        </div>
      </header>

      <main className="flex flex-1 flex-col">{children}</main>
    </>
  );
}
