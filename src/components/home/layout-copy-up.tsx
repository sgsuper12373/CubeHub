"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { saveHomeLayout } from "@/lib/home/actions";
import { isLayoutEmpty } from "@/lib/home/cards";
import { readLocalHomeLayout } from "@/lib/home/layout-storage";

/**
 * On a signed-in Home with no saved layout: if this browser has a guest
 * layout, copy it to the account once (docs/home-plan.md → Customising Home).
 * The local copy stays, harmlessly; the account's layout wins from then on.
 */
export function LayoutCopyUp() {
  const router = useRouter();
  useEffect(() => {
    const local = readLocalHomeLayout();
    if (isLayoutEmpty(local)) return;
    void saveHomeLayout(local).then((result) => {
      if (!result.error) router.refresh();
    });
  }, [router]);
  return null;
}
