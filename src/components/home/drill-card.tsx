import Link from "next/link";

import { HomeCard } from "@/components/home/home-card";
import { DrillIntroCard } from "@/components/home/static-cards";
import { buttonVariants } from "@/components/ui/button";
import { getDrillQueue } from "@/lib/home/dal";
import { casePath } from "@/lib/learn/case-route";
import { formatMs } from "@/lib/timer/format";

/** Drill queue (docs/home-plan.md → card 5): what's due, the slowest three, one switch suggestion. */
export async function DrillCard() {
  const queue = await getDrillQueue();
  if (!queue.started) return <DrillIntroCard />;

  return (
    <HomeCard id="drill" title="Drill queue" seeAll={{ href: "/learn/333/drill", label: "Drill Lab" }}>
      <p className="text-sm text-foreground">
        {queue.due > 0 ? (
          <>
            <span className="font-semibold">{queue.due}</span> case{queue.due === 1 ? "" : "s"} due for review
          </>
        ) : (
          "Nothing due right now."
        )}
      </p>
      {queue.slowest.length > 0 && (
        <>
          <p className="mt-3 text-xs text-muted-foreground">Slowest (recognition + execution)</p>
          <ul className="mt-1 flex flex-col gap-1">
            {queue.slowest.map((c) => (
              <li key={c.id} className="flex items-center justify-between rounded-md bg-muted/40 px-2.5 py-1.5 text-sm">
                <span className="truncate text-foreground">{c.name}</span>
                <span className="font-mono tabular-nums text-muted-foreground">{formatMs(c.ms)}</span>
              </li>
            ))}
          </ul>
        </>
      )}
      {queue.suggestion && (
        <p className="mt-3 text-xs text-muted-foreground">
          Your alt alg for {queue.suggestion.name} is {(queue.suggestion.gainMs / 1000).toFixed(1)} s faster.{" "}
          {queue.suggestion.caseNumber !== null ? (
            <Link
              href={casePath("333", queue.suggestion.subset, queue.suggestion.caseNumber)}
              className="font-medium text-primary hover:underline"
            >
              Switch?
            </Link>
          ) : (
            <Link href="/learn/333/drill" className="font-medium text-primary hover:underline">
              Switch?
            </Link>
          )}
        </p>
      )}
      <Link href="/learn/333/drill" className={buttonVariants({ size: "sm", className: "mt-3" })}>
        {queue.due > 0 ? `Drill ${queue.due} due` : "Drill"}
      </Link>
    </HomeCard>
  );
}
