import { Plus, Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { ClubCard, ClubGrid } from "@/components/clubs/club-card";
import { EmptyState } from "@/components/social/person-row";
import { buttonVariants } from "@/components/ui/button";
import { getUser } from "@/lib/auth/dal";
import { getMyClubs, searchClubs } from "@/lib/clubs/dal";
import { CLUB_TAGS, CLUB_TYPES } from "@/lib/clubs/types";

export const metadata: Metadata = {
  title: "Clubs — CubeHub",
  description: "Cubing clubs for schools, colleges, cities and online crews.",
};

interface Props {
  searchParams: Promise<{ q?: string; type?: string; tag?: string }>;
}

const SELECT =
  "h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

/** Your clubs, then search (name, type, tag) over every club. */
export default async function ClubsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const user = await getUser();
  const filtering = Boolean(sp.q?.trim() || sp.type || sp.tag);
  const [mine, results] = await Promise.all([getMyClubs(), searchClubs(sp)]);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8 px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Clubs</h1>
          <p className="text-sm text-muted-foreground">Your school, college, city or online crew, in one place.</p>
        </div>
        <Link href={user ? "/clubs/new" : "/login?next=%2Fclubs%2Fnew"} className={buttonVariants()}>
          <Plus />
          Create a club
        </Link>
      </div>

      {mine.length > 0 && (
        <section aria-labelledby="my-clubs" className="space-y-3">
          <h2 id="my-clubs" className="text-sm font-semibold text-foreground">
            Your clubs
          </h2>
          <ClubGrid>
            {mine.map((c) => (
              <ClubCard key={c.id} club={c} role={c.role} />
            ))}
          </ClubGrid>
        </section>
      )}

      <section aria-labelledby="find-clubs" className="space-y-3">
        <h2 id="find-clubs" className="text-sm font-semibold text-foreground">
          {filtering ? "Search results" : "Find a club"}
        </h2>
        <form role="search" className="flex flex-wrap gap-2" action="/clubs">
          <label className="relative min-w-48 flex-1">
            <span className="sr-only">Club name</span>
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <input
              name="q"
              defaultValue={sp.q ?? ""}
              placeholder="Search by name"
              className={`${SELECT} w-full pl-8`}
            />
          </label>
          <label>
            <span className="sr-only">Type</span>
            <select name="type" defaultValue={sp.type ?? ""} className={SELECT}>
              <option value="">Any type</option>
              {CLUB_TYPES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="sr-only">Tag</span>
            <select name="tag" defaultValue={sp.tag ?? ""} className={SELECT}>
              <option value="">Any tag</option>
              {CLUB_TAGS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className={buttonVariants({ variant: "outline", size: "lg" })}>
            Search
          </button>
          {filtering && (
            <Link href="/clubs" className={buttonVariants({ variant: "ghost", size: "lg" })}>
              Clear
            </Link>
          )}
        </form>

        {results.length === 0 ? (
          <EmptyState title={filtering ? "No clubs match" : "No clubs yet"}>
            {filtering ? "Try another name or filter, or " : "Be the first: "}
            <Link href={user ? "/clubs/new" : "/login?next=%2Fclubs%2Fnew"} className="text-primary hover:underline">
              create a club
            </Link>
            .
          </EmptyState>
        ) : (
          <ClubGrid>
            {results.map((c) => (
              <ClubCard key={c.id} club={c} />
            ))}
          </ClubGrid>
        )}
      </section>
    </div>
  );
}
