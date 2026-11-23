import type { Metadata } from "next";

import { HandoffSender } from "@/components/handoff/handoff-sender";
import { CubeMark } from "@/components/layout/logo";

/**
 * Root host, no chrome. `src/proxy.ts` rewrites app paths on cuberhub.me here
 * until the visitor has been handed off (lib/handoff.ts), so the browser's
 * address bar still shows the page they asked for. Static: the work is all in
 * the client.
 */
export const metadata: Metadata = {
  title: "Opening CuberHub…",
  robots: { index: false, follow: false },
};

export default function HandoffPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-12 text-center">
      <CubeMark className="size-16 motion-safe:animate-pulse" />
      <HandoffSender />
    </main>
  );
}
