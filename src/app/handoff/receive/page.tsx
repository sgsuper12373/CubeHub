import type { Metadata } from "next";

import { HandoffReceiver } from "@/components/handoff/handoff-receiver";

/**
 * App host, no chrome, loaded only in a hidden iframe by the root host's
 * /handoff page (lib/handoff.ts). Never indexed.
 */
export const metadata: Metadata = {
  title: "Handoff",
  robots: { index: false, follow: false },
};

export default function HandoffReceivePage() {
  return <HandoffReceiver />;
}
