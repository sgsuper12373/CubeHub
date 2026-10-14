import Link from "next/link";

import { ProfileAvatar } from "@/components/profile/profile-avatar";
import type { PersonRow as Person } from "@/lib/social/types";

/** One cuber in a list: photo, name and @username linking to the profile, and an action on the right. */
export function PersonRow({
  person,
  detail,
  linked = true,
  children,
}: {
  person: Person;
  /** False for blocked cubers, whose profiles you can't open. */
  linked?: boolean;
  /** A short line under the name (a time, a date). */
  detail?: React.ReactNode;
  children?: React.ReactNode;
}) {
  const name = person.displayName || person.username;
  const body = (
    <>
      <ProfileAvatar url={person.avatarUrl} name={name} size="sm" />
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold text-foreground">{name}</span>
        <span className="block truncate text-xs text-muted-foreground">
          @{person.username}
          {detail && <> · {detail}</>}
        </span>
      </span>
    </>
  );
  return (
    <li className="flex items-center gap-3 py-2.5">
      {linked ? (
        <Link href={`/profile/${person.username}`} className="flex min-w-0 flex-1 items-center gap-3 rounded-lg">
          {body}
        </Link>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-3">{body}</div>
      )}
      {children && <div className="flex shrink-0 items-center gap-2">{children}</div>}
    </li>
  );
}

export function PersonList({ children }: { children: React.ReactNode }) {
  return <ul className="divide-y divide-border rounded-2xl border border-border bg-card/60 px-4">{children}</ul>;
}

export function EmptyState({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border px-4 py-10 text-center">
      <p className="text-sm font-medium text-foreground">{title}</p>
      {children && <div className="text-xs text-muted-foreground">{children}</div>}
    </div>
  );
}
