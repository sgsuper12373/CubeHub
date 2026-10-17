"use client";

import { useRouter } from "next/navigation";
import { useCaseKeys } from "@/components/learn/use-case-keys";

/** ← and → on the case page go to the previous and next case's page. */
export function CaseKeyNav({ prevHref, nextHref }: { prevHref: string | null; nextHref: string | null }) {
  const router = useRouter();
  useCaseKeys(
    prevHref ? () => router.push(prevHref) : null,
    nextHref ? () => router.push(nextHref) : null,
  );
  return null;
}
