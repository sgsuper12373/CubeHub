import {
  BarChart3,
  Box,
  Contact,
  GraduationCap,
  House,
  Settings,
  Target,
  Timer,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  /**
   * Pages this tab owns when its href is not a plain path prefix. The Drill
   * Lab lives at /learn/<puzzle>/drill, inside Learn's prefix, so without this
   * both tabs would light up.
   */
  match?: RegExp;
  /** The sidebar section it sits in (docs/app-shell-plan.md → Content). */
  group?: NavGroup;
  /** Sub-items: Learn's puzzles and series, filled in from the Learn index at render time. */
  children?: NavItem[];
};

export type NavGroup = "main" | "practice" | "community";

export const navItems: NavItem[] = [
  { label: "Timer", href: "/timer", icon: Timer },
  { label: "Stats", href: "/stats", icon: BarChart3 },
  { label: "Learn", href: "/learn", icon: GraduationCap },
  { label: "Drill", href: "/learn/333/drill", icon: Target, match: /^\/learn\/[^/]+\/drill(\/|$)/ },
  { label: "Playground", href: "/playground", icon: Box },
  // Its own desktop section (founder, 2026-10-14). Phones reach it from
  // People and from profiles; see MOBILE_HIDDEN.
  { label: "Clubs", href: "/clubs", icon: Users },
  // Compete and Shop are left out until they exist (founder, 2026-10-14): an
  // empty tab disappoints beta testers. Their pages and the landing teasers stay.
  // Your own public profile; Settings and People are reached from there, so they light it up too.
  // Someone else's profile doesn't (see activeNavHref).
  { label: "Profile", href: "/profile", icon: User, match: /^\/(profile|settings|people|friends)(\/|$)/ },
];

const HOME: NavItem = {
  label: "Home",
  href: "/home",
  icon: House,
  group: "main",
  // "/" too: in single-host mode the landing page is the way into the app.
  match: /^\/(home(\/|$)|$)/,
};

/**
 * The app sidebar's items, in order, grouped (docs/app-shell-plan.md → Content).
 * Profile isn't here: it's the account row at the bottom of the sidebar, with
 * Settings and the notifications bell. Compete and Shop stay out until they
 * exist; they'll go under Community and Practice.
 */
export const sidebarItems: NavItem[] = [
  HOME,
  { label: "Timer", href: "/timer", icon: Timer, group: "main" },
  { label: "Stats", href: "/stats", icon: BarChart3, group: "main" },
  { label: "Learn", href: "/learn", icon: GraduationCap, group: "practice" },
  {
    label: "Drill Lab",
    href: "/learn/333/drill",
    icon: Target,
    group: "practice",
    match: /^\/learn\/[^/]+\/drill(\/|$)/,
  },
  { label: "Playground", href: "/playground", icon: Box, group: "practice" },
  { label: "Clubs", href: "/clubs", icon: Users, group: "community" },
  { label: "People", href: "/people", icon: Contact, group: "community", match: /^\/(people|friends)(\/|$)/ },
];

/** The sidebar's pinned bottom links (the account row is its own component). */
export const sidebarFooterItems: NavItem[] = [
  { label: "Settings", href: "/settings", icon: Settings },
];

export const NAV_GROUP_LABEL: Record<NavGroup, string | null> = {
  main: null,
  practice: "Practice",
  community: "Community",
};

/**
 * The one tab to highlight for a path: a tab with its own `match` wins over a
 * plain prefix, so /learn/333/drill is Drill, not Learn.
 */
export function activeNavHref(
  pathname: string,
  items: readonly NavItem[],
  /** The signed-in cuber's username; /profile/<anyone else> lights up no tab. */
  ownUsername: string | null = null,
): string | null {
  const specific = items.find((item) => item.match?.test(pathname));
  if (specific?.href === "/profile" && isOtherProfile(pathname, ownUsername)) return null;
  if (specific) return specific.href;
  const prefix = items.find(
    (item) => !item.match && (pathname === item.href || pathname.startsWith(`${item.href}/`)),
  );
  return prefix?.href ?? null;
}

/** /profile/<username>[/…] for a username that isn't yours (edit is yours). */
function isOtherProfile(pathname: string, ownUsername: string | null): boolean {
  const m = /^\/profile\/([^/]+)/.exec(pathname);
  if (!m || m[1] === "edit") return false;
  return decodeURIComponent(m[1]).toLowerCase() !== ownUsername?.toLowerCase();
}

/**
 * The phone bottom bar (below md): Home, Timer, Learn, Drill, and a More tab
 * that opens a sheet with everything else (docs/app-shell-plan.md → Phones).
 * Five targets is the most a phone bar holds before they get too narrow to hit
 * reliably. Before the app shell it was Timer, Stats, Learn, Drill, Profile,
 * with Playground and Clubs reachable only from other pages.
 */
const MOBILE_TABS: ReadonlySet<string> = new Set(["/home", "/timer", "/learn", "/learn/333/drill"]);

export const mobileNavItems: NavItem[] = sidebarItems.filter((item) => MOBILE_TABS.has(item.href));

/** The More sheet's links, in order. Sign in / Sign out is added by the sheet. */
export const mobileMoreItems: NavItem[] = [
  ...sidebarItems.filter((item) => !MOBILE_TABS.has(item.href)),
  { label: "Profile", href: "/profile", icon: User, match: /^\/profile(\/|$)/ },
  ...sidebarFooterItems,
];
