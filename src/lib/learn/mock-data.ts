export type PuzzleMock = {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
  series: SeriesMock[];
};

export type SeriesMock = {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
  cases: AlgorithmCaseMock[];
};

export type AlgorithmCaseMock = {
  id: string;
  name: string;
  moves: string; // the algorithm itself (dummy for now)
  learned?: boolean;
  starred?: boolean;
};

export const MOCK_LEARN_DATA: PuzzleMock[] = [
  {
    id: "333",
    name: "3x3 Cube",
    description: "Learn how to solve the classic 3x3 Rubik's Cube.",
    series: [
      {
        id: "beginner",
        name: "Beginner Method (LBL)",
        description: "The easiest way to solve the 3x3 cube. Learn layer by layer.",
        cases: [
          { id: "cross", name: "The Cross", moves: "F R U R' U' F'", learned: true },
          { id: "corners", name: "First Layer Corners", moves: "R U R' U'", learned: true },
        ],
      },
      {
        id: "cfop",
        name: "CFOP Intro",
        description: "An introduction to the advanced CFOP method: Cross, F2L, OLL, PLL.",
        cases: [],
      },
      {
        id: "oll",
        name: "OLL",
        description: "Orientation of the Last Layer (All 57 cases).",
        cases: [
          { id: "oll-1", name: "OLL 1 (Dot)", moves: "R U2 R2 F R F' U2 R' F R F'", starred: true },
          { id: "oll-2", name: "OLL 2 (Dot)", moves: "F R U R' U' F' f R U R' U' f'" },
        ],
      },
      {
        id: "pll",
        name: "PLL",
        description: "Permutation of the Last Layer (All 21 cases).",
        cases: [
          { id: "t-perm", name: "T Perm", moves: "R U R' U' R' F R2 U' R' U' R U R' F'", learned: true, starred: true },
          { id: "j-perm", name: "Jb Perm", moves: "R U R' F' R U R' U' R' F R2 U' R' U'" },
          { id: "ua-perm", name: "Ua Perm", moves: "R U' R U R U R U' R' U' R2", learned: true },
        ],
      },
    ],
  },
  {
    id: "222",
    name: "2x2 Cube",
    description: "Learn how to solve the pocket 2x2 cube.",
    series: [
      {
        id: "ortega",
        name: "Ortega Method",
        description: "The intermediate method for solving the 2x2 cube fast.",
        cases: [
          { id: "adj-swap", name: "Adjacent Swap", moves: "R U R' U' R' F R2 U' R' U' R U R' F'" },
        ],
      },
    ],
  },
];
