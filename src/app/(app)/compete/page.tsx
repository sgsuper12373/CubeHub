import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Compete — CubeHub",
};

export default function CompetePage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center">
      <h1 className="text-3xl font-semibold tracking-tight">Compete</h1>
      <p className="mt-2 text-muted-foreground">
        Ranked racing arrives in Phase 4.
      </p>
    </div>
  );
}
