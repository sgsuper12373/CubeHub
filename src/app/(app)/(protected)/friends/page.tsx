import { redirect } from "next/navigation";

/** Renamed to /people (2026-10-15). Old links and notifications still land. */
export default async function FriendsRedirect({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; q?: string }>;
}) {
  const { tab, q } = await searchParams;
  const params = new URLSearchParams();
  if (tab === "requests" || tab === "find") params.set("tab", tab);
  if (q) params.set("q", q);
  const query = params.toString();
  redirect(query ? `/people?${query}` : "/people");
}
