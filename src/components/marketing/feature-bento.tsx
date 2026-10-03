import Link from "next/link";
import { ArrowRight, Boxes, GraduationCap, ShoppingCart, Swords, Target, Timer } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { SectionHeading, SoonTag } from "@/components/marketing/section-heading";
import { Sparkline } from "@/components/stats/sparkline";
import { ScramblePreview } from "@/components/timer/scramble-preview";
import { cn } from "@/lib/utils";

/**
 * The product, one tile per surface. Each tile shows a small, honest slice of
 * the real UI (stats rows, a drill table, a 3D case) rather than a generic
 * icon card, and surfaces that haven't shipped yet say so.
 */

const TREND = [11.42, 10.87, 12.03, 10.21, 9.94, 10.66, 9.71, 10.12, 9.42, 9.18, 9.86, 8.74];

const DRILL_ROWS = [
  { name: "OLL 33", tag: "due", median: "2.41" },
  { name: "PLL Gb", tag: "due", median: "3.07" },
  { name: "OLL 45", tag: "new", median: "—" },
] as const;

const FEATURED_CUBES = [
  { name: "QiYi MS 3×3", price: "₹449" },
  { name: "MoYu RS3 M V5", price: "₹649" },
  { name: "GAN 356 M", price: "₹2,499" },
] as const;

export function FeatureBento() {
  return (
    <section id="features" className="relative mx-auto w-full max-w-6xl scroll-mt-20 px-4 py-20 md:py-28">
      <SectionHeading
        eyebrow="Everything in one place"
        icon={Boxes}
        title="One tab for the whole cubing habit"
        lead="No more juggling a timer in one tab, a tutorial blog in another and forum threads to work out which cube to buy next."
      />

      <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Timer & Stats */}
        <Tile
          href="/timer"
          icon={Timer}
          title="Timer & Stats"
          body="WCA scrambles, inspection with voice callouts, +2 and DNF, named sessions and every average from ao5 to ao100."
          className="md:col-span-2"
        >
          <div className="mt-6 grid gap-4 rounded-2xl border border-border/70 bg-surface-raised/50 p-4 sm:grid-cols-[auto_1fr] sm:items-center">
            <dl className="grid grid-cols-3 gap-4 font-mono text-sm tabular-nums sm:grid-cols-1 sm:gap-2">
              <Stat label="Best" value="8.74" highlight />
              <Stat label="ao5" value="9.49" />
              <Stat label="ao12" value="10.14" />
            </dl>
            <Sparkline
              points={TREND}
              ariaLabel="Example trend: twelve solves improving from 11.42 to a best of 8.74"
              className="max-h-20"
            />
          </div>
        </Tile>

        {/* Learn */}
        <Tile
          href="/learn"
          icon={GraduationCap}
          title="Learn"
          body="Beginner method to full CFOP. Every OLL and PLL case in 3D, with several algorithms per case."
          className="lg:row-span-2"
        >
          <div className="relative mt-4 flex flex-1 items-center justify-center">
            <div aria-hidden className="absolute size-48 rounded-full bg-primary/15 blur-3xl" />
            {/* Draggable on desktop (raised above the tile's link so a drag
                doesn't navigate); on touch it's display-only, so a swipe over
                it scrolls the page and a tap opens Learn. */}
            <ScramblePreview
              alg="R U R' U' F' U F R2 U' R' U R U' R' F R F'"
              puzzle="333"
              size={220}
              visualization="3D"
              className="relative flex min-h-[220px] items-center justify-center max-md:pointer-events-none md:z-10 md:cursor-grab md:active:cursor-grabbing"
            />
          </div>
          <ul className="mt-4 flex flex-wrap gap-1.5 text-xs">
            {["Beginner", "CFOP", "OLL · 57", "PLL · 21", "2×2 Ortega"].map((t) => (
              <li key={t} className="rounded-full border border-border bg-surface-raised/60 px-2.5 py-1 font-medium text-muted-foreground">
                {t}
              </li>
            ))}
          </ul>
        </Tile>

        {/* Drill */}
        <Tile
          href="/learn/333/drill"
          icon={Target}
          title="Drill"
          body="Spaced practice that puts your weakest cases first, with recognition timing and random AUF."
        >
          <table className="mt-5 w-full text-left font-mono text-xs tabular-nums">
            <caption className="sr-only">Example drill queue</caption>
            <tbody>
              {DRILL_ROWS.map((r) => (
                <tr key={r.name} className="border-t border-border/60 first:border-t-0">
                  <td className="py-2 font-semibold text-foreground">{r.name}</td>
                  <td className="py-2">
                    <span
                      className={cn(
                        "rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase",
                        r.tag === "due" ? "bg-warning/15 text-warning" : "bg-accent-2/15 text-accent-2",
                      )}
                    >
                      {r.tag}
                    </span>
                  </td>
                  <td className="py-2 text-right text-muted-foreground">{r.median === "—" ? r.median : `${r.median}s`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Tile>

        {/* Compete */}
        <Tile
          href="/compete"
          icon={Swords}
          title="Compete"
          soon
          body="Race other cubers on the same scramble with ELO ranking — or warm up against bots from beginner to sub-10."
        >
          <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-surface-raised/50 px-4 py-3 font-mono text-xs">
            <span className="flex flex-col">
              <span className="text-foreground-subtle">You</span>
              <span className="text-base font-semibold text-foreground tabular-nums">9.81</span>
            </span>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">VS</span>
            <span className="flex flex-col text-right">
              <span className="text-foreground-subtle">Bot · Sub-12</span>
              <span className="text-base font-semibold text-muted-foreground tabular-nums">11.37</span>
            </span>
          </div>
        </Tile>

        {/* Shop */}
        <Tile
          href="/shop"
          icon={ShoppingCart}
          title="Buy cubes in ₹"
          soon
          body="Tell us your level and budget, get three cubes that suit you — from sellers who actually ship in India."
          className="md:col-span-2 lg:col-span-3"
          horizontal
        >
          <ul className="grid gap-2 sm:grid-cols-3 lg:min-w-[30rem]">
            {FEATURED_CUBES.map((cube) => (
              <li
                key={cube.name}
                className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-surface-raised/50 px-4 py-3"
              >
                <span className="text-sm font-medium text-foreground">{cube.name}</span>
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 font-mono text-xs font-bold text-primary tabular-nums">
                  {cube.price}
                </span>
              </li>
            ))}
          </ul>
        </Tile>
      </div>
    </section>
  );
}

function Tile({
  href,
  icon: Icon,
  title,
  body,
  soon = false,
  horizontal = false,
  className,
  children,
}: {
  href: string;
  icon: LucideIcon;
  title: string;
  body: string;
  soon?: boolean;
  horizontal?: boolean;
  className?: string;
  children?: React.ReactNode;
}) {
  // The whole tile is clickable through the title link's ::after overlay, not
  // by wrapping it in <a>: a tile can then hold interactive content (the 3D
  // cube) that sits above the overlay without a drag turning into a click.
  return (
    <div
      className={cn(
        "reveal group relative flex flex-col overflow-hidden rounded-3xl border border-border bg-card p-6 transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/10 has-[a:focus-visible]:ring-3 has-[a:focus-visible]:ring-ring/50",
        horizontal && "lg:flex-row lg:items-center lg:justify-between lg:gap-10",
        className,
      )}
    >
      <div className={cn(horizontal && "lg:max-w-sm")}>
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20 transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
            <Icon className="size-5" aria-hidden />
          </span>
          <h3 className="text-lg font-semibold text-foreground">
            <Link href={href} className="outline-none after:absolute after:inset-0 after:content-['']">
              {title}
            </Link>
          </h3>
          {soon && <SoonTag />}
          <ArrowRight
            className="ml-auto size-4 text-foreground-subtle transition-[color,transform] group-hover:translate-x-0.5 group-hover:text-primary"
            aria-hidden
          />
        </div>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{body}</p>
      </div>
      {horizontal ? <div className="mt-5 lg:mt-0">{children}</div> : children}
    </div>
  );
}

function Stat({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={cn("font-semibold", highlight ? "text-primary" : "text-foreground")}>
        {highlight && <span aria-hidden>★ </span>}
        {value}
      </dd>
    </div>
  );
}
