import {
  BarChart3,
  Box,
  GraduationCap,
  Target,
  Timer,
  User,
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
};

export const navItems: NavItem[] = [
  { label: "Timer", href: "/timer", icon: Timer },
  { label: "Stats", href: "/stats", icon: BarChart3 },
  { label: "Learn", href: "/learn", icon: GraduationCap },
  { label: "Drill", href: "/learn/333/drill", icon: Target, match: /^\/learn\/[^/]+\/drill(\/|$)/ },
  { label: "Playground", href: "/playground", icon: Box },
  // Compete and Shop are left out until they exist (founder, 2026-10-14): an
  // empty tab disappoints beta testers. Their pages and the landing teasers stay.
  // Your own public profile; Settings and Friends are reached from there, so they light it up too.
  { label: "Profile", href: "/profile", icon: User, match: /^\/(profile|settings|friends)(\/|$)/ },
];

/**
 * The one tab to highlight for a path: a tab with its own `match` wins over a
 * plain prefix, so /learn/333/drill is Drill, not Learn.
 */
export function activeNavHref(pathname: string, items: readonly NavItem[]): string | null {
  const specific = items.find((item) => item.match?.test(pathname));
  if (specific) return specific.href;
  const prefix = items.find(
    (item) => !item.match && (pathname === item.href || pathname.startsWith(`${item.href}/`)),
  );
  return prefix?.href ?? null;
}

/**
 * The bottom bar fits five tabs on a phone; a sixth makes every target too
 * narrow to hit reliably. Playground drops: it is linked from the Learn page
 * instead, a side trip from learning, not a daily destination like the timer.
 * Stats took the slot Shop had (Shop is out of the nav until it exists).
 */
const MOBILE_HIDDEN: ReadonlySet<string> = new Set(["/playground"]);

export const mobileNavItems: NavItem[] = navItems.filter((item) => !MOBILE_HIDDEN.has(item.href));
