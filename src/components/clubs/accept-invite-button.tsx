"use client";

import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { acceptInvite } from "@/lib/clubs/actions";
import { toast } from "@/stores/toast-store";

export function AcceptInviteButton({ token, name }: { token: string; name: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      size="lg"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const res = await acceptInvite(token);
          if (!res.ok) {
            toast({ kind: "error", message: res.error, durationMs: 5000 });
            return;
          }
          toast({ kind: "info", message: `Welcome to ${name}!`, durationMs: 3000 });
          router.push(`/clubs/${res.value}`);
        })
      }
    >
      <Check />
      {pending ? "Joining…" : `Join ${name}`}
    </Button>
  );
}
