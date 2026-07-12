import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Learn — CubeHub",
};

export default function LearnPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center">
      <h1 className="text-3xl font-semibold tracking-tight">Learn</h1>
      <p className="mt-2 text-muted-foreground">
        Tutorials arrive in Phase 2.
      </p>
    </div>
  );
}
