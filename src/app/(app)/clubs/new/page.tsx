import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ClubForm } from "@/components/clubs/club-form";
import { EmptyState } from "@/components/social/person-row";
import { getCreateEligibility } from "@/lib/clubs/dal";
import { OWNED_MAX } from "@/lib/clubs/types";

export const metadata: Metadata = { title: "Create a club — CubeHub", robots: { index: false } };

/** Signed in, with a chosen username, owning fewer than 3 clubs (create_club checks again). */
export default async function NewClubPage() {
  const eligibility = await getCreateEligibility();
  if (!eligibility) redirect("/login?next=%2Fclubs%2Fnew");

  return (
    <div className="mx-auto w-full max-w-xl space-y-6 px-4 py-8">
      <div>
        <Link href="/clubs" className="text-sm text-muted-foreground hover:text-foreground">
          ← Clubs
        </Link>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-foreground">Create a club</h1>
        <p className="text-sm text-muted-foreground">You&apos;ll be its owner. You can change everything later.</p>
      </div>

      {!eligibility.hasUsername ? (
        <EmptyState title="Choose a username first">
          Clubs show who runs them.{" "}
          <Link href="/profile/edit" className="text-primary hover:underline">
            Pick your username
          </Link>
          , then come back.
        </EmptyState>
      ) : eligibility.owned >= OWNED_MAX ? (
        <EmptyState title={`You own ${OWNED_MAX} clubs already`}>
          That&apos;s the limit for now. Transfer one to another member, or delete one, to make another.
        </EmptyState>
      ) : (
        <ClubForm mode="create" />
      )}
    </div>
  );
}
