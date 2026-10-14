"use client";

import { Search } from "lucide-react";
import { useEffect, useState } from "react";

import { EmptyState, PersonList, PersonRow } from "@/components/social/person-row";
import { FollowButton } from "@/components/social/follow-button";
import { Input } from "@/components/ui/input";
import { searchPeople } from "@/lib/social/actions";
import type { SearchResult } from "@/lib/social/dal";

const DELAY_MS = 250;

/**
 * Search as you type, a short pause after the last key. Until two characters
 * are typed it shows `children` (the suggestions, rendered on the server).
 */
export function PeopleSearch({ initialQuery, children }: { initialQuery: string; children: React.ReactNode }) {
  const [query, setQuery] = useState(initialQuery);
  const [result, setResult] = useState<{ q: string; rows: SearchResult[] } | null>(null);
  const q = query.trim();

  useEffect(() => {
    if (q.length < 2) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      void searchPeople(q).then((rows) => {
        if (!cancelled) setResult({ q, rows });
      });
    }, DELAY_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [q]);

  // Keep the address in step, so a reload or a shared link shows the same search.
  useEffect(() => {
    const url = new URL(window.location.href);
    if (q.length >= 2) url.searchParams.set("q", q);
    else url.searchParams.delete("q");
    window.history.replaceState(null, "", url);
  }, [q]);

  const settled = result?.q === q ? result.rows : null;

  return (
    <section className="space-y-4" aria-label="Find people">
      <div className="relative" role="search">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by username or name"
          aria-label="Search cubers"
          maxLength={40}
          autoComplete="off"
          className="pl-9"
        />
      </div>

      {q.length < 2 ? (
        children
      ) : settled === null ? (
        <p className="px-1 text-sm text-muted-foreground" aria-live="polite">
          Searching…
        </p>
      ) : settled.length === 0 ? (
        <EmptyState title={`No cubers match “${q}”`} />
      ) : (
        <PersonList>
          {settled.map((p) => (
            <PersonRow key={p.id} person={p}>
              <FollowButton
                targetId={p.id}
                name={p.displayName || p.username}
                initial={p.iFollow === "accepted" ? "following" : p.iFollow === "pending" ? "requested" : "follow"}
                isPrivate={!p.isPublic}
                size="xs"
              />
            </PersonRow>
          ))}
        </PersonList>
      )}
    </section>
  );
}
