import "server-only";

import { getHomeSummary } from "@/lib/home/dal";
import { getLearnNav } from "@/lib/learn/public-dal";
import { suggestNextSet, type NextSet } from "@/lib/learn/next-set";

/** The signed-in cuber's next set, from their own learning progress and the cached Learn index. */
export async function getNextSet(username: string): Promise<NextSet | null> {
  const [summary, nav] = await Promise.all([getHomeSummary(username), getLearnNav()]);
  const names: Record<string, string> = {};
  for (const p of nav) for (const s of p.series) names[`${p.puzzle}/${s.slug}`] = s.name;
  return suggestNextSet(summary.learning, names);
}
