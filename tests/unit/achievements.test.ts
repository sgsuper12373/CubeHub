import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

const rpc = vi.fn();
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({ rpc }) }));

import { ACHIEVEMENT_ICONS, ACHIEVEMENT_ORDER } from "@/lib/profile/achievement-icons";
import { checkAchievements, toUnlocks, unlockMessage } from "@/lib/profile/achievements";

/** Slugs seeded by the achievements migration, read from the SQL itself. */
function seededSlugs(): string[] {
  const sql = readFileSync(
    join(process.cwd(), "supabase/migrations/20261015000000_achievements.sql"),
    "utf8",
  );
  const seed = sql.slice(sql.indexOf("insert into public.achievements"), sql.indexOf("on conflict (slug)"));
  return [...seed.matchAll(/^\s*\('([a-z0-9-]+)',/gm)].map((m) => m[1]);
}

describe("achievement catalogue", () => {
  it("has an icon, and a place in the order, for every seeded badge", () => {
    const slugs = seededSlugs();
    expect(slugs.length).toBe(20);
    for (const slug of slugs) expect(ACHIEVEMENT_ICONS[slug], slug).toBeDefined();
    expect([...ACHIEVEMENT_ORDER].sort()).toEqual([...slugs].sort());
  });
});

describe("unlock toasts", () => {
  const u = (slug: string, title: string) => ({ slug, title, description: "" });

  it("names a single badge and counts several", () => {
    expect(unlockMessage([])).toBeNull();
    expect(unlockMessage([u("333-sub-20", "Sub-20")])).toBe("Achievement unlocked: Sub-20");
    expect(unlockMessage([u("a", "A"), u("b", "B"), u("c", "C")])).toBe("3 achievements unlocked");
  });

  it("parses the RPC result and drops malformed rows", () => {
    expect(toUnlocks([{ slug: "x", title: "X", description: "d" }, { slug: 1 }, null])).toEqual([
      { slug: "x", title: "X", description: "d" },
    ]);
    expect(toUnlocks("nope")).toEqual([]);
  });
});

describe("checkAchievements", () => {
  afterEach(() => rpc.mockReset());

  it("shares one check between overlapping calls", async () => {
    let finish!: (v: unknown) => void;
    rpc.mockReturnValue(new Promise((r) => (finish = r)));
    const a = checkAchievements();
    const b = checkAchievements();
    finish({ data: [{ slug: "first-solve", title: "First Turn", description: "" }], error: null });
    expect(await a).toEqual(await b);
    expect(rpc).toHaveBeenCalledTimes(1);

    // Once finished, the next solve checks again.
    rpc.mockResolvedValue({ data: [], error: null });
    await checkAchievements();
    expect(rpc).toHaveBeenCalledTimes(2);
  });

  it("treats a failure as nothing new", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "boom" } });
    expect(await checkAchievements()).toEqual([]);
    rpc.mockRejectedValue(new Error("offline"));
    expect(await checkAchievements()).toEqual([]);
  });
});
