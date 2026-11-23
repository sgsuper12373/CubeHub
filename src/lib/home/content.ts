import changelog from "@/content/changelog.json";
import tips from "@/content/cubby-tips.json";

/**
 * Home's static content (docs/home-plan.md → Cubby's tip, What's new). The
 * changelog also feeds the marketing site's /roadmap "Shipped" list later.
 */

export type ChangelogEntry = { id: string; date: string; title: string; line: string; link: string };

export const CHANGELOG: readonly ChangelogEntry[] = [...(changelog as ChangelogEntry[])].sort((a, b) =>
  a.date < b.date ? 1 : -1,
);

/** The latest entries the visitor hasn't dismissed. */
export function latestChanges(dismissed: ReadonlySet<string>, count = 2): ChangelogEntry[] {
  return CHANGELOG.filter((e) => !dismissed.has(e.id)).slice(0, count);
}

export const CUBBY_TIPS: readonly string[] = tips as string[];

/** One tip per local day, the same all day, cycling through the pool. */
export function tipForDay(date: Date, pool: readonly string[] = CUBBY_TIPS): string {
  const dayNumber = Math.floor(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000,
  );
  return pool[((dayNumber % pool.length) + pool.length) % pool.length];
}

export function localDayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
