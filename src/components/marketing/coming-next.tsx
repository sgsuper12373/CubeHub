import { CalendarDays, IndianRupee, Swords, Trophy } from "lucide-react";
import type { LucideIcon } from "lucide-react";

/**
 * What's on the way, in one quiet strip near the bottom of the page, so the
 * sections above only show what a visitor can use today. Keep it in step with
 * docs/roadmap.md, and drop an item here when it ships into the page above.
 */
const NEXT: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: Swords,
    title: "Compete",
    body: "Race on the same scramble, with a rating and bots to warm up against.",
  },
  {
    icon: IndianRupee,
    title: "Cubes in ₹",
    body: "Picks for your level and budget, from sellers who ship in India.",
  },
  {
    icon: Trophy,
    title: "National rankings",
    body: "Country and state leaderboards.",
  },
  {
    icon: CalendarDays,
    title: "Competition calendar",
    body: "WCA comps and meets across India.",
  },
];

export function ComingNext() {
  return (
    <section aria-labelledby="coming-next" className="mx-auto w-full max-w-6xl px-4 pb-16">
      <div className="rounded-3xl border border-border bg-card/60 p-6">
        <h2 id="coming-next" className="text-sm font-semibold text-foreground">
          Coming next
        </h2>
        <ul role="list" className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {NEXT.map(({ icon: Icon, title, body }) => (
            <li key={title} className="flex gap-3">
              <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
              <div>
                <p className="text-sm font-medium text-foreground">{title}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{body}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
