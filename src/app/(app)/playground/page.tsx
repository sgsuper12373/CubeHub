import type { Metadata } from "next";

import { PlaygroundScreen, type PlaygroundLink } from "@/components/playground/playground-screen";
import { MAX_ALG_CHARS } from "@/lib/playground/alg-input";
import { DEFAULT_PLAYGROUND_PUZZLE, isPlaygroundPuzzle } from "@/lib/playground/puzzles";

export const metadata: Metadata = {
  title: "Playground — CubeHub",
  description: "Turn, scramble and solve a virtual 3x3 or 2x2 in your browser, and try any algorithm.",
};

interface Props {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

/** A single, not-too-long string param; anything else is ignored. */
function algParam(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" && value.trim() && value.length <= MAX_ALG_CHARS ? value : undefined;
}

/**
 * Links pick the starting cube:
 * - `?puzzle=222` opens the 2x2;
 * - `?case=<alg>` sets up the case that alg solves (Learn's "Try it");
 * - `?setup=<alg>&moves=<alg>` reproduces a shared cube exactly.
 * The screen parses the algs once cubing has loaded and drops what fails.
 */
export default async function PlaygroundPage({ searchParams }: Props) {
  const params = await searchParams;
  const initialPuzzle = isPlaygroundPuzzle(params.puzzle) ? params.puzzle : DEFAULT_PLAYGROUND_PUZZLE;
  const link: PlaygroundLink = {
    caseAlg: algParam(params.case),
    setup: algParam(params.setup),
    moves: algParam(params.moves),
  };
  // Keyed by the whole link, so following another link while here starts over.
  const key = [initialPuzzle, link.caseAlg, link.setup, link.moves].join("|");
  return <PlaygroundScreen key={key} initialPuzzle={initialPuzzle} link={link} />;
}
