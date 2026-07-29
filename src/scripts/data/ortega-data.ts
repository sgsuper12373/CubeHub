/**
 * 2x2 Ortega method algorithm cases.
 * The Ortega method solves the 2x2 by:
 * 1. Solve one face (intuitive)
 * 2. Solve the opposite face (OLL)
 * 3. Permute both layers (PBL)
 */

export type SeedAlgorithm = {
  moves: string;
  is_main: boolean;
  label?: string;
};

export type SeedCase = {
  case_number: number;
  name: string;
  description: string;
  cube_state: string;
  algorithms: SeedAlgorithm[];
};

export const ORTEGA_CASES: SeedCase[] = [
  // --- OLL cases (orient the opposite face) ---
  {
    case_number: 1,
    name: "Sune",
    description: "One corner oriented correctly on the opposite face.",
    cube_state: "R U R' U R U2 R'",
    algorithms: [
      { moves: "R U R' U R U2 R'", is_main: true },
    ],
  },
  {
    case_number: 2,
    name: "Anti-Sune",
    description: "One corner oriented correctly (mirror of Sune).",
    cube_state: "R U2 R' U' R U' R'",
    algorithms: [
      { moves: "R U2 R' U' R U' R'", is_main: true },
    ],
  },
  {
    case_number: 3,
    name: "Pi / Bruno",
    description: "Two diagonal corners oriented.",
    cube_state: "F R U R' U' R U R' U' F'",
    algorithms: [
      { moves: "F R U R' U' R U R' U' F'", is_main: true },
    ],
  },
  {
    case_number: 4,
    name: "H / Blinker",
    description: "Two adjacent corners oriented on opposite sides.",
    cube_state: "F R U R' U' F2 L' U' L U F",
    algorithms: [
      { moves: "R2 U2 R U2 R2", is_main: true },
    ],
  },
  {
    case_number: 5,
    name: "L / Headlights",
    description: "Two adjacent corners oriented on the same side.",
    cube_state: "F R U' R' U' R U R' F'",
    algorithms: [
      { moves: "F R U' R' U' R U R' F'", is_main: true },
    ],
  },
  {
    case_number: 6,
    name: "U / Bowtie",
    description: "No corners oriented on the opposite face (all twisted).",
    cube_state: "R U2 R2 U' R2 U' R2 U2 R",
    algorithms: [
      { moves: "R U2 R2 U' R2 U' R2 U2 R", is_main: true },
    ],
  },
  {
    case_number: 7,
    name: "T / Chameleon",
    description: "Two diagonal corners oriented, opposite diagonal.",
    cube_state: "R U R' U' R' F R F'",
    algorithms: [
      { moves: "R U R' U' R' F R F'", is_main: true },
    ],
  },
  // --- PBL cases (permute both layers) ---
  {
    case_number: 8,
    name: "Adjacent / Adjacent",
    description: "Adjacent swap on both layers.",
    cube_state: "R U' R F2 R' U R'",
    algorithms: [
      { moves: "R U' R F2 R' U R'", is_main: true },
    ],
  },
  {
    case_number: 9,
    name: "Diagonal / Diagonal",
    description: "Diagonal swap on both layers.",
    cube_state: "R2 F2 R2",
    algorithms: [
      { moves: "R2 F2 R2", is_main: true },
    ],
  },
  {
    case_number: 10,
    name: "Adjacent / Diagonal",
    description: "Adjacent swap on top, diagonal swap on bottom.",
    cube_state: "R U R' U' R' F R2 U' R' U' R U R' F'",
    algorithms: [
      { moves: "R U R' U' R' F R2 U' R' U' R U R' F'", is_main: true, label: "T Perm" },
    ],
  },
];
