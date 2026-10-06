import {
  BarChart3,
  Box,
  GraduationCap,
  ShoppingCart,
  Swords,
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
  { label: "Compete", href: "/compete", icon: Swords },
  { label: "Shop", href: "/shop", icon: ShoppingCart },
  { label: "Profile", href: "/settings", icon: User },
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
 * narrow to hit reliably. Two drop:
 * - Stats, because it is reachable from the timer's own stats drawer, where a
 *   cuber is already looking at their numbers when they want more of them.
 * - Compete, which is still a placeholder page. Drill took its slot; Compete
 *   comes back when it has something to show.
 * - Playground, which is linked from the Learn page instead: it is a side
 *   trip from learning, not a daily destination like the timer.
 */
const MOBILE_HIDDEN: ReadonlySet<string> = new Set(["/stats", "/compete", "/playground"]);

export const mobileNavItems: NavItem[] = navItems.filter((item) => !MOBILE_HIDDEN.has(item.href));
