"use client";

import Link from "next/link";

import { Navbar } from "@/components/layout/navbar";
import { refreshViewer, useViewer } from "@/components/marketing/use-viewer";
import { buttonVariants } from "@/components/ui/button";

/*
 * The landing page's signed-in chrome. The page is static, so the server
 * renders it signed out and the browser fills in the user (use-viewer.ts).
 * Before that answer, the auth cookie decides: on the server and while
 * hydrating via CSS on <html data-signed-in> (set by an inline script before
 * first paint), afterwards from document.cookie. A signed-in visitor never
 * sees "Sign In" flash; their name and bell appear once the request returns.
 */

// Shown only when <html> does / doesn't carry data-signed-in. `contents`
// keeps the wrapper out of the layout.
const IF_SIGNED_IN = "hidden [html[data-signed-in]_&]:contents";
const IF_SIGNED_OUT = "contents [html[data-signed-in]_&]:hidden";

function SignInLink() {
  return (
    <Link href="/login" className={buttonVariants({ size: "sm" })}>
      Sign In
    </Link>
  );
}

export function MarketingNavbar() {
  const { viewer, likelySignedIn } = useViewer();

  let account: React.ReactNode | undefined;
  if (!viewer) {
    if (likelySignedIn === null) {
      account = (
        <span className={IF_SIGNED_OUT}>
          <SignInLink />
        </span>
      );
    } else if (likelySignedIn) {
      account = null;
    }
  }

  return (
    <Navbar
      profile={viewer?.profile ?? null}
      notifications={viewer?.notifications ?? { items: [], unread: 0 }}
      account={account}
      onNotificationsRead={refreshViewer}
    />
  );
}

/** The phone header's one action: the timer when signed in, else Sign In. */
export function MobileHeaderAction() {
  const { viewer, likelySignedIn } = useViewer();

  const openTimer = (
    <Link href="/timer" className={buttonVariants({ size: "sm", variant: "ghost" })}>
      Open timer
    </Link>
  );

  if (viewer) return viewer.profile ? openTimer : <SignInLink />;
  if (likelySignedIn !== null) return likelySignedIn ? openTimer : <SignInLink />;
  return (
    <>
      <span className={IF_SIGNED_IN}>{openTimer}</span>
      <span className={IF_SIGNED_OUT}>
        <SignInLink />
      </span>
    </>
  );
}
