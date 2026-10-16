import { Lock, Users } from "lucide-react";
import Link from "next/link";

import type { ProfileClub } from "@/lib/clubs/dal";
import { roleLabel } from "@/lib/clubs/types";

import { ClubBadge } from "./club-badge";

/** The Clubs row on a profile. Also the phone's way into Clubs (no tab there). */
export function ProfileClubs({ clubs, isOwner }: { clubs: ProfileClub[]; isOwner: boolean }) {
  if (clubs.length === 0 && !isOwner) return null;
  return (
    <section aria-labelledby="profile-clubs" className="space-y-3">
      <div className="flex items-baseline justify-between gap-2">
        <h2 id="profile-clubs" className="text-lg font-bold tracking-tight text-foreground">
          Clubs
        </h2>
        <Link href="/clubs" className="text-sm text-primary hover:underline">
          {isOwner ? "All clubs" : "Browse clubs"}
        </Link>
      </div>
      {clubs.length === 0 ? (
        <Link
          href="/clubs"
          className="flex items-center gap-3 rounded-2xl border border-dashed border-border px-4 py-4 text-sm text-muted-foreground transition-colors hover:bg-muted/40"
        >
          <Users className="size-5 shrink-0" aria-hidden />
          <span>
            <span className="block font-medium text-foreground">Find a club</span>
            Your school, college, city or online crew.
          </span>
        </Link>
      ) : (
        <ul className="hide-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          {clubs.map((c) => (
            <li key={c.slug} className="shrink-0">
              <Link
                href={`/clubs/${c.slug}`}
                className="flex items-center gap-2.5 rounded-xl border border-border bg-card/60 py-2 pr-3.5 pl-2 transition-colors hover:border-primary/40"
              >
                <ClubBadge name={c.name} slug={c.slug} size="sm" className="size-8 rounded-lg text-xs" />
                <span className="min-w-0">
                  <span className="flex max-w-[12rem] items-center gap-1 truncate text-sm font-semibold text-foreground">
                    {c.name}
                    {!c.isPublic && <Lock className="size-3 shrink-0 text-muted-foreground" aria-label="Private" />}
                  </span>
                  {c.role !== "member" && <span className="block text-xs text-primary">{roleLabel(c.role)}</span>}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
