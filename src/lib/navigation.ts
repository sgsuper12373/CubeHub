import {
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
  { label: "Learn", href: "/learn", icon: GraduationCap },
  { label: "Compete", href: "/compete", icon: Swords },
  { label: "Shop", href: "/shop", icon: ShoppingCart },
  { label: "Profile", href: "/settings", icon: User },
];
