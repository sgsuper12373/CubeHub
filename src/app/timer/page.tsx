import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Timer — CubeHub",
};

export default function TimerPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center">
      <h1 className="text-3xl font-semibold tracking-tight">Timer</h1>
      <p className="mt-2 text-muted-foreground">
        The solve timer arrives in Phase 1.
      </p>
    </div>
  );
}
