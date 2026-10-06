import type { Metadata } from "next";

import { PlaygroundScreen } from "@/components/playground/playground-screen";
import { DEFAULT_PLAYGROUND_PUZZLE, isPlaygroundPuzzle } from "@/lib/playground/puzzles";

export const metadata: Metadata = {
  title: "Playground — CubeHub",
  description: "Turn, scramble and solve a virtual 3x3 or 2x2 in your browser.",
};

interface Props {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

/** `?puzzle=222` opens the 2x2, so a link can pick the puzzle. */
export default async function PlaygroundPage({ searchParams }: Props) {
  const { puzzle } = await searchParams;
  const initialPuzzle = isPlaygroundPuzzle(puzzle) ? puzzle : DEFAULT_PLAYGROUND_PUZZLE;
  return <PlaygroundScreen key={initialPuzzle} initialPuzzle={initialPuzzle} />;
}
