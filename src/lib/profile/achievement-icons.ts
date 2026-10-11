import {
  BookOpenCheck,
  Brain,
  CalendarCheck,
  Compass,
  Crown,
  Flame,
  Footprints,
  Gauge,
  Globe,
  Hourglass,
  Medal,
  Moon,
  Mountain,
  Puzzle,
  Rocket,
  Sparkles,
  Target,
  Timer,
  Trophy,
  Zap,
  type LucideIcon,
} from "lucide-react";

/**
 * Badge icons and display order, keyed by achievement slug. Kept in code so
 * there are no images to host; a slug added to the catalogue without an
 * entry here still shows, with the default icon, at the end.
 * `tests/unit/achievements.test.ts` checks every seeded slug is covered.
 */
export const ACHIEVEMENT_ICONS: Record<string, LucideIcon> = {
  "first-solve": Footprints,
  "solves-100": Medal,
  "solves-1000": Mountain,
  "solves-10000": Crown,
  "333-sub-60": Timer,
  "333-sub-30": Gauge,
  "333-sub-20": Zap,
  "333-sub-15": Rocket,
  "333-sub-10": Sparkles,
  "333-ao5-sub-20": Target,
  "333-ao12-sub-15": Trophy,
  "events-4": Compass,
  "events-8": Globe,
  "streak-7": Flame,
  "streak-30": CalendarCheck,
  "pll-done": Brain,
  "oll-done": BookOpenCheck,
  "222-set-done": Puzzle,
  "night-owl": Moon,
  marathon: Hourglass,
};

/** The order badges appear in: the catalogue order above. */
export const ACHIEVEMENT_ORDER: readonly string[] = Object.keys(ACHIEVEMENT_ICONS);

export function achievementIcon(slug: string): LucideIcon {
  return ACHIEVEMENT_ICONS[slug] ?? Medal;
}
