"use client";

import dynamic from "next/dynamic";
import { CubeLoader } from "@/components/ui/cube-loader";

const AlgPlayerInner = dynamic(
  () => import("./alg-player-inner").then((mod) => mod.AlgPlayerInner),
  {
    ssr: false,
    loading: () => (
      <div
        className="flex items-center justify-center bg-muted/20 border border-border rounded-2xl p-6"
        style={{ width: "100%", height: 260 }}
      >
        <CubeLoader size={28} label="Loading 3D player..." />
      </div>
    ),
  },
);

export function AlgPlayer({
  moves,
  setupMoves,
  puzzle = "333",
  size = 200,
}: {
  moves: string;
  setupMoves?: string | null;
  puzzle?: string;
  size?: number;
}) {
  return (
    <AlgPlayerInner
      moves={moves}
      setupMoves={setupMoves}
      puzzle={puzzle}
      size={size}
    />
  );
}
