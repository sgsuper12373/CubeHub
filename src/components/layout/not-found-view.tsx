import Link from "next/link";
import { Compass } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

/**
 * The 404 page body, shared by the root `not-found.tsx` (unknown URLs, no
 * navbar) and the `(app)` one (`notFound()` from a page, navbar kept).
 */
export function NotFoundView() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-6 px-4 py-16 text-center">
      <div className="grid size-14 place-items-center rounded-2xl border border-border bg-muted/40 text-primary">
        <Compass className="size-7" aria-hidden />
      </div>
      <div className="space-y-2">
        <p className="font-mono text-sm text-muted-foreground">404</p>
        <h1 className="text-3xl font-bold tracking-tight">This page doesn&apos;t exist</h1>
        <p className="text-muted-foreground">
          The link may be broken, or the page may have moved.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <Link href="/" className={buttonVariants({ size: "lg" })}>
          Home
        </Link>
        <Link href="/timer" className={buttonVariants({ size: "lg", variant: "outline" })}>
          Timer
        </Link>
        <Link href="/learn" className={buttonVariants({ size: "lg", variant: "outline" })}>
          Learn
        </Link>
      </div>
    </div>
  );
}
