import { CubeMark } from "@/components/layout/logo";

/**
 * Shown while the timer's server shell resolves auth + settings (a Supabase
 * round-trip). The pulsing mark keeps the wait on-brand rather than blank;
 * the pulse is off under prefers-reduced-motion.
 */
export default function TimerLoading() {
  return (
    <div role="status" className="flex flex-1 flex-col items-center justify-center gap-4">
      <CubeMark title="CubeHub" className="size-16 motion-safe:animate-pulse" />
      <p className="text-sm text-muted-foreground">Loading your timer…</p>
    </div>
  );
}
