/**
 * Cube State Utilities
 *
 * Uses cubing.js to validate algorithm notation and generate cube state
 * representations. In this codebase, `cube_state` stores setup algorithm
 * notation (e.g., "R U R' U'") which TwistyPlayer renders directly.
 *
 * The validate function ensures the notation parses without errors before
 * we persist it.
 */

import { Alg } from "cubing/alg";
import { cube3x3x3 } from "cubing/puzzles";

/**
 * Validates that a setup moves string is valid cubing notation.
 * Uses cubing.js Alg parser + attempts to apply the algorithm to
 * the 3x3x3 KPuzzle to catch any moves that don't exist on the puzzle.
 *
 * @returns `{ valid: true, normalized: string }` on success,
 *          `{ valid: false, error: string }` on failure.
 */
export async function validateAndNormalizeAlg(
  setupMoves: string
): Promise<{ valid: true; normalized: string } | { valid: false; error: string }> {
  try {
    if (!setupMoves.trim()) {
      return { valid: false, error: "Setup moves cannot be empty." };
    }

    // Step 1: Parse the algorithm notation
    const alg = new Alg(setupMoves);

    // Step 2: Normalize the string (standardizes spacing and notation)
    const normalized = alg.toString();

    // Step 3: Verify the algorithm is valid for a 3x3x3 by applying it
    const kpuzzle = await cube3x3x3.kpuzzle();
    kpuzzle.algToTransformation(alg);

    return { valid: true, normalized };
  } catch (e: unknown) {
    const message =
      e instanceof Error ? e.message : "Unknown error parsing algorithm.";
    return { valid: false, error: message };
  }
}

/**
 * Generates a Kociemba-style 54-character facelet string from setup moves.
 *
 * Uses cubing.js to apply the algorithm to a solved 3x3x3 and reads the
 * resulting piece permutation/orientation data to produce a facelet string
 * in URFDLB order.
 *
 * This is an advanced utility — the main codebase currently uses algorithm
 * notation strings for cube_state rather than facelet strings.
 */
export async function setupMovesToFaceletString(
  setupMoves: string
): Promise<string> {
  const kpuzzle = await cube3x3x3.kpuzzle();
  const alg = new Alg(setupMoves);
  const transformation = kpuzzle.algToTransformation(alg);
  const pattern = transformation.toKPattern();
  const patternData = pattern.patternData;

  // Face indices: U=0, R=1, F=2, D=3, L=4, B=5
  const FACE_CHARS = "URFDLB";

  // ── Corner definitions ──
  // Each corner piece (index 0-7) has 3 facelets (orientation 0, 1, 2).
  // Listed as [face, position_on_that_face] for each orientation.
  // Pieces in solved order: URF, UFL, ULB, UBR, DFR, DLF, DBL, DRB
  const CORNER_FACELETS: [number, number][][] = [
    // Piece 0: URF → U9, R1, F3
    [[0, 8], [1, 0], [2, 2]],
    // Piece 1: UFL → U7, F1, L3
    [[0, 6], [2, 0], [4, 2]],
    // Piece 2: ULB → U1, L1, B3
    [[0, 0], [4, 0], [5, 2]],
    // Piece 3: UBR → U3, B1, R3
    [[0, 2], [5, 0], [1, 2]],
    // Piece 4: DFR → D3, F9, R7
    [[3, 2], [2, 8], [1, 6]],
    // Piece 5: DLF → D1, L9, F7
    [[3, 0], [4, 8], [2, 6]],
    // Piece 6: DBL → D7, B9, L7
    [[3, 6], [5, 8], [4, 6]],
    // Piece 7: DRB → D9, R9, B7
    [[3, 8], [1, 8], [5, 6]],
  ];

  // ── Edge definitions ──
  // Each edge piece (index 0-11) has 2 facelets (orientation 0, 1).
  // Pieces in solved order: UR, UF, UL, UB, DR, DF, DL, DB, FR, FL, BL, BR
  const EDGE_FACELETS: [number, number][][] = [
    // Piece 0: UR → U6, R2
    [[0, 5], [1, 1]],
    // Piece 1: UF → U8, F2
    [[0, 7], [2, 1]],
    // Piece 2: UL → U4, L2
    [[0, 3], [4, 1]],
    // Piece 3: UB → U2, B2
    [[0, 1], [5, 1]],
    // Piece 4: DR → D6, R8
    [[3, 5], [1, 7]],
    // Piece 5: DF → D2, F8
    [[3, 1], [2, 7]],
    // Piece 6: DL → D4, L8
    [[3, 3], [4, 7]],
    // Piece 7: DB → D8, B8
    [[3, 7], [5, 7]],
    // Piece 8: FR → F6, R4
    [[2, 5], [1, 3]],
    // Piece 9: FL → F4, L6
    [[2, 3], [4, 5]],
    // Piece 10: BL → B6, L4
    [[5, 5], [4, 3]],
    // Piece 11: BR → B4, R6
    [[5, 3], [1, 5]],
  ];

  // ── Center definitions ──
  // Center pieces in solved order: U, R, F, D, L, B → position 4 of each face
  const CENTER_FACELETS: [number, number][] = [
    [0, 4], // U center
    [1, 4], // R center
    [2, 4], // F center
    [3, 4], // D center
    [4, 4], // L center
    [5, 4], // B center
  ];

  // Build the 54-char string
  const facelets = new Array<string>(54);

  // Map corners
  const corners = patternData["CORNERS"];
  if (corners) {
    for (let pos = 0; pos < 8; pos++) {
      const piece = corners.pieces[pos];
      const orientation = corners.orientation[pos];
      for (let ori = 0; ori < 3; ori++) {
        const sourceOri = (ori + orientation) % 3;
        const [face, idx] = CORNER_FACELETS[pos][ori];
        const [sourceFace] = CORNER_FACELETS[piece][sourceOri];
        facelets[face * 9 + idx] = FACE_CHARS[sourceFace];
      }
    }
  }

  // Map edges
  const edges = patternData["EDGES"];
  if (edges) {
    for (let pos = 0; pos < 12; pos++) {
      const piece = edges.pieces[pos];
      const orientation = edges.orientation[pos];
      for (let ori = 0; ori < 2; ori++) {
        const sourceOri = (ori + orientation) % 2;
        const [face, idx] = EDGE_FACELETS[pos][ori];
        const [sourceFace] = EDGE_FACELETS[piece][sourceOri];
        facelets[face * 9 + idx] = FACE_CHARS[sourceFace];
      }
    }
  }

  // Map centers
  const centers = patternData["CENTERS"];
  if (centers) {
    for (let pos = 0; pos < 6; pos++) {
      const piece = centers.pieces[pos];
      const [face, idx] = CENTER_FACELETS[pos];
      facelets[face * 9 + idx] = FACE_CHARS[piece];
    }
  }

  return facelets.join("");
}
