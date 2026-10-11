import type { Alg } from "cubing/alg";

import { loadAlg } from "@/lib/cubing/runtime";

/** Long enough for a Megaminx scramble (~70 moves, about 300 characters). */
export const MAX_SCRAMBLE_LENGTH = 500;

export type ScrambleCheck = { ok: true; scramble: string } | { ok: false; error: string };

/**
 * Tidy a pasted scramble: trim, collapse runs of spaces, keep line breaks
 * (Megaminx is written one line per U move), and turn typographic quotes
 * into the ' that notation uses. Takes the Alg class so it can be tested
 * against cubing directly; the app goes through `checkCustomScramble`.
 */
export function checkScrambleWith(AlgClass: typeof Alg, input: string): ScrambleCheck {
  const scramble = input
    .replace(/[‘’′]/g, "'")
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/\s+/g, " "))
    .filter(Boolean)
    .join("\n");

  if (!scramble) return { ok: false, error: "Paste or type a scramble" };
  if (scramble.length > MAX_SCRAMBLE_LENGTH) {
    return { ok: false, error: `That's longer than ${MAX_SCRAMBLE_LENGTH} characters` };
  }
  try {
    // A syntax check: cubing reads every event's notation, including
    // Megaminx's R++/D-- and Pyraminx tips.
    new AlgClass(scramble.replace(/\n/g, " "));
  } catch {
    return { ok: false, error: "That isn't valid move notation" };
  }
  return { ok: true, scramble };
}

export async function checkCustomScramble(input: string): Promise<ScrambleCheck> {
  const { Alg } = await loadAlg();
  return checkScrambleWith(Alg, input);
}
