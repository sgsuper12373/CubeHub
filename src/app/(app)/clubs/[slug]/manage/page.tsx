import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { ClubForm } from "@/components/clubs/club-form";
import { InviteLinks } from "@/components/clubs/invite-links";
import { DeleteClubForm, MemberMenu, RequestButtons, UnbanButton } from "@/components/clubs/manage-controls";
import { EmptyState, PersonList, PersonRow } from "@/components/social/person-row";
import { getUser } from "@/lib/auth/dal";
import {
  getClubBans,
  getClubBySlug,
  getClubInvites,
  getClubMembers,
  getClubSettings,
  getJoinRequests,
  getMembership,
} from "@/lib/clubs/dal";
import { canManage, roleLabel } from "@/lib/clubs/types";
import { timeAgo } from "@/lib/notifications/types";

export const metadata: Metadata = { title: "Manage club — CubeHub", robots: { index: false } };

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ saved?: string }>;
}

/**
 * Owner and admins: requests, invite links, members, bans. Owner only:
 * settings and delete.
 */
export default async function ManageClubPage({ params, searchParams }: Props) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const club = await getClubBySlug(slug);
  if (!club) notFound();

  const membership = await getMembership(club.id);
  if (membership.kind === "signed-out") redirect(`/login?next=${encodeURIComponent(`/clubs/${slug}/manage`)}`);
  if (!canManage(membership) || membership.kind !== "member") redirect(`/clubs/${club.slug}`);
  const myRole = membership.role;
  const isOwner = myRole === "owner";

  const [requests, members, bans, settings, user, invites] = await Promise.all([
    getJoinRequests(club.id),
    getClubMembers(club.id),
    getClubBans(club.id),
    isOwner ? getClubSettings(club.id) : null,
    getUser(),
    getClubInvites(club.id),
  ]);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8 px-4 py-8">
      <div>
        <Link href={`/clubs/${club.slug}`} className="text-sm text-muted-foreground hover:text-foreground">
          ← {club.name}
        </Link>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-foreground">Manage club</h1>
        {sp.saved && (
          <p role="status" className="mt-1 text-sm text-primary">
            Settings saved.
          </p>
        )}
      </div>

      {(requests.length > 0 || !club.isPublic) && (
        <Section title="Join requests" count={requests.length}>
          {requests.length === 0 ? (
            <EmptyState title="No requests waiting" />
          ) : (
            <PersonList>
              {requests.map((r) => (
                <PersonRow
                  key={r.id}
                  person={r.person}
                  linked={!r.hidden}
                  detail={
                    <>
                      {timeAgo(r.createdAt)}
                      {r.message && <span className="mt-0.5 block whitespace-normal text-foreground/80">“{r.message}”</span>}
                    </>
                  }
                >
                  <RequestButtons requestId={r.id} slug={club.slug} name={r.person.displayName || r.person.username} />
                </PersonRow>
              ))}
            </PersonList>
          )}
        </Section>
      )}

      <Section title="Invite links">
        <p className="-mt-1 text-xs text-muted-foreground">
          Anyone with a link joins straight away, even while the club is private. Banned cubers can&apos;t use one.
        </p>
        <InviteLinks clubId={club.id} slug={club.slug} invites={invites} />
      </Section>

      <Section title="Members" count={members.length}>
        <PersonList>
          {members.map((m) => (
            <PersonRow key={m.person.id} person={m.person} linked={!m.hidden} detail={m.person.id === user?.id ? `${roleLabel(m.role)} · you` : roleLabel(m.role)}>
              {m.person.id !== user?.id && (
              <MemberMenu
                clubId={club.id}
                slug={club.slug}
                clubName={club.name}
                userId={m.person.id}
                name={m.person.displayName || m.person.username}
                theirRole={m.role}
                myRole={myRole}
              />
              )}
            </PersonRow>
          ))}
        </PersonList>
      </Section>

      {bans.length > 0 && (
        <Section title="Banned" count={bans.length}>
          <PersonList>
            {bans.map((b) => (
              <PersonRow key={b.person.id} person={b.person} linked={!b.hidden} detail={`banned ${timeAgo(b.bannedAt)}`}>
                <UnbanButton clubId={club.id} slug={club.slug} userId={b.person.id} name={b.person.displayName || b.person.username} />
              </PersonRow>
            ))}
          </PersonList>
        </Section>
      )}

      {isOwner && settings && (
        <Section title="Settings">
          <div className="rounded-2xl border border-border bg-card/60 p-4 sm:p-6">
            <ClubForm
              mode="edit"
              clubId={club.id}
              initial={{
                name: settings.name,
                slug: settings.slug,
                description: settings.description ?? "",
                type: settings.type,
                tags: settings.tags ?? [],
                isPublic: settings.is_public,
              }}
            />
          </div>
        </Section>
      )}

      {isOwner && (
        <Section title="Delete club">
          <div className="space-y-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-4 sm:p-6">
            <p className="text-sm text-muted-foreground">
              Deletes the club with all its posts and comments, for everyone. This can&apos;t be undone. To keep it going
              without you, make another member the owner from the Members list instead.
            </p>
            <DeleteClubForm clubId={club.id} name={club.name} />
          </div>
        </Section>
      )}
    </div>
  );
}

function Section({ title, count, children }: { title: string; count?: number; children: React.ReactNode }) {
  return (
    <section className="space-y-3" aria-label={title}>
      <h2 className="text-sm font-semibold text-foreground">
        {title}
        {count !== undefined && <span className="ml-1.5 text-muted-foreground">{count}</span>}
      </h2>
      {children}
    </section>
  );
}
