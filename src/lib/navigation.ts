import {
  BarChart3,
  GraduationCap,
  ShoppingCart,
  Swords,
  Timer,
  User,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export const navItems: NavItem[] = [
  { label: "Timer", href: "/timer", icon: Timer },
  { label: "Stats", href: "/stats", icon: BarChart3 },
  { label: "Learn", href: "/learn", icon: GraduationCap },
  { label: "Compete", href: "/compete", icon: Swords },
  { label: "Shop", href: "/shop", icon: ShoppingCart },
  { label: "Profile", href: "/settings", icon: User },
];

/**
 * The bottom bar fits five tabs on a phone; a sixth makes every target too
 * narrow to hit reliably. Stats is the one that drops, because it is reachable
 * from the timer's own stats drawer — where a cuber is already looking at their
 * numbers when they want more of them.
 */
export const mobileNavItems: NavItem[] = navItems.filter(
  (item) => item.href !== "/stats",
);
