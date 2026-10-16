import { Lock, Users } from "lucide-react";
import Link from "next/link";

import { clubTagLabel, clubTypeLabel, roleLabel, type ClubRole, type ClubSummary } from "@/lib/clubs/types";

import { ClubBadge } from "./club-badge";

/** One club in a grid: badge, name, type, tags and size. */
export function ClubCard({ club, role }: { club: ClubSummary; role?: ClubRole }) {
  return (
    <li>
      <Link
        href={`/clubs/${club.slug}`}
        className="flex h-full gap-3 rounded-2xl border border-border bg-card/60 p-4 transition-colors hover:border-primary/40 hover:bg-card"
      >
        <ClubBadge name={club.name} slug={club.slug} />
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-sm font-semibold text-foreground">{club.name}</span>
            {!club.isPublic && <Lock className="size-3.5 shrink-0 text-muted-foreground" aria-label="Private" />}
          </div>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {clubTypeLabel(club.type)}
            <span aria-hidden>·</span>
            <Users className="size-3.5" aria-hidden />
            {club.memberCount} {club.memberCount === 1 ? "member" : "members"}
            {role && role !== "member" && (
              <>
                <span aria-hidden>·</span>
                <span className="font-medium text-primary">{roleLabel(role)}</span>
              </>
            )}
          </p>
          {club.description && <p className="line-clamp-2 text-xs text-muted-foreground">{club.description}</p>}
          {club.tags.length > 0 && <TagList tags={club.tags} />}
        </div>
      </Link>
    </li>
  );
}

export function TagList({ tags }: { tags: readonly string[] }) {
  return (
    <ul className="flex flex-wrap gap-1" aria-label="Tags">
      {tags.map((t) => (
        <li key={t} className="rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
          {clubTagLabel(t)}
        </li>
      ))}
    </ul>
  );
}

export function ClubGrid({ children }: { children: React.ReactNode }) {
  return <ul className="grid gap-3 sm:grid-cols-2">{children}</ul>;
}
