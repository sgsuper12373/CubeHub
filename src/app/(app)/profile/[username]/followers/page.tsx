import type { Metadata } from "next";

import { FollowListPage } from "@/components/social/follow-list-page";

interface Props {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  return { title: `Followers · @${username} — CubeHub`, robots: { index: false } };
}

export default async function FollowersPage({ params }: Props) {
  const { username } = await params;
  return <FollowListPage username={username} kind="followers" />;
}
