import { CubeLoader } from "@/components/ui/cube-loader";

/**
 * Shown while the timer's server shell resolves auth + settings (a Supabase
 * round-trip). The branded cube keeps the wait on-brand rather than blank.
 */
export default function TimerLoading() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4">
      <CubeLoader size={56} label="Loading timer" />
      <p className="text-sm text-muted-foreground">Loading your timer…</p>
    </div>
  );
}
