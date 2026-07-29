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

export const PLL_CASES: SeedCase[] = [
  {
    case_number: 1,
    name: "Aa Perm",
    description: "Adjacent corner swap. Headlights at back, block on the left.",
    cube_state: "x L' U' L D2 L' U L D2 L2 x'",
    algorithms: [
      { moves: "x L2 D2 L' U' L D2 L' U L' x'", is_main: true },
      { moves: "y' x' R' D R' U2 R D' R' U2 R2 x", is_main: false, label: "R moves variant" }
    ]
  },
  {
    case_number: 2,
    name: "Ab Perm",
    description: "Adjacent corner swap. Headlights at back, block on the right.",
    cube_state: "x L' U L' D2 L U' L' D2 L2 x'",
    algorithms: [
      { moves: "x L2 D2 L U L' D2 L U' L x'", is_main: true },
      { moves: "y x' R2 D2 R' U' R D2 R' U R' x", is_main: false, label: "R moves variant" }
    ]
  },
  {
    case_number: 3,
    name: "E Perm",
    description: "Diagonal corner swap. Edges solved, no blocks.",
    cube_state: "x' D' L' U' L D L' U L D' L' U L D L' U' L x",
    algorithms: [
      { moves: "x' L' U L D' L' U' L D L' U' L D' L' U L D x", is_main: true }
    ]
  },
  {
    case_number: 4,
    name: "F Perm",
    description: "Adjacent corner swap, adjacent edge swap. Full block on one side.",
    cube_state: "R' U' R U' R' U R U R2 F' R U R U' R' F U R",
    algorithms: [
      { moves: "R' U' F' R U R' U' R' F R2 U' R' U' R U R' U R", is_main: true }
    ]
  },
  {
    case_number: 5,
    name: "Ga Perm",
    description: "Adjacent corner swap, edge cycle. Headlights on left, block front-right.",
    cube_state: "D R' U' R D' U R2 U R' U R U' R U' R2",
    algorithms: [
      { moves: "R2 U R' U R' U' R U' R2 U' D R' U R D'", is_main: true }
    ]
  },
  {
    case_number: 6,
    name: "Gb Perm",
    description: "Adjacent corner swap, edge cycle. Headlights on left, block back-right.",
    cube_state: "R2 u R' U R' U' R u' R2 F' U F",
    algorithms: [
      { moves: "F' U' F R2 u R' U R U' R u' R2", is_main: true }
    ]
  },
  {
    case_number: 7,
    name: "Gc Perm",
    description: "Adjacent corner swap, edge cycle. Headlights on left, block back-left.",
    cube_state: "D' R U R' D U' R2 U' R U' R' U R' U R2",
    algorithms: [
      { moves: "R2 U' R U' R U R' U R2 U D' R U' R' D", is_main: true }
    ]
  },
  {
    case_number: 8,
    name: "Gd Perm",
    description: "Adjacent corner swap, edge cycle. Headlights on left, block front-left.",
    cube_state: "R2 u' R U R' U R u R2 y R U' R'",
    algorithms: [
      { moves: "R U R' y' R2 u' R U' R' U R' u R2", is_main: true }
    ]
  },
  {
    case_number: 9,
    name: "H Perm",
    description: "Opposite edge swap. Corners solved.",
    cube_state: "M2 U' M2 U2 M2 U' M2",
    algorithms: [
      { moves: "M2 U M2 U2 M2 U M2", is_main: true },
      { moves: "M2 U' M2 U2 M2 U' M2", is_main: false }
    ]
  },
  {
    case_number: 10,
    name: "Ja Perm",
    description: "Adjacent corner swap, adjacent edge swap. Block forms a 'J' shape on left.",
    cube_state: "x U2 r' U' r U2 R' F R' F' R2 x'",
    algorithms: [
      { moves: "x R2 F R F' R U2 r' U r U2 x'", is_main: true }
    ]
  },
  {
    case_number: 11,
    name: "Jb Perm",
    description: "Adjacent corner swap, adjacent edge swap. Block forms a 'J' shape on right.",
    cube_state: "U R U R2 F' R U R U' R' F R U' R'",
    algorithms: [
      { moves: "R U R' F' R U R' U' R' F R2 U' R' U'", is_main: true },
      { moves: "R U2 R' U' R U2 L' U R' U' L", is_main: false, label: "Alternate" }
    ]
  },
  {
    case_number: 12,
    name: "Na Perm",
    description: "Diagonal corner swap, parallel edge swap. Two 1x1x3 blocks.",
    cube_state: "R U R' U2 R U R2 F' R U R U' R' F R U' R' U' R U' R'",
    algorithms: [
      { moves: "R U R' U R U R' F' R U R' U' R' F R2 U' R' U2 R U' R'", is_main: true }
    ]
  },
  {
    case_number: 13,
    name: "Nb Perm",
    description: "Diagonal corner swap, parallel edge swap. Two 1x1x3 blocks.",
    cube_state: "F r' F' r U r U' r2 D' F r U r' F' D r",
    algorithms: [
      { moves: "r' D' F r U' r' F' D r2 U r' U' r' F r F'", is_main: true }
    ]
  },
  {
    case_number: 14,
    name: "Ra Perm",
    description: "Adjacent corner swap, adjacent edge swap. Headlights at right, block in back.",
    cube_state: "R U2 R' U' R' F' R U2 R U2 R' F R U' R'",
    algorithms: [
      { moves: "R U R' F' R U2 R' U2 R' F R U R U2 R'", is_main: true }
    ]
  },
  {
    case_number: 15,
    name: "Rb Perm",
    description: "Adjacent corner swap, adjacent edge swap. Headlights at back, block on right.",
    cube_state: "U R2 F R U R U' R' F' R U2 R' U2 R",
    algorithms: [
      { moves: "R' U2 R U2 R' F R U R' U' R' F' R2 U'", is_main: true }
    ]
  },
  {
    case_number: 16,
    name: "T Perm",
    description: "Adjacent corner swap, opposite edge swap. Headlights on left.",
    cube_state: "F R U' R' U R U R2 F' R U R U' R'",
    algorithms: [
      { moves: "R U R' U' R' F R2 U' R' U' R U R' F'", is_main: true },
      { moves: "R U R' U' R' F R2 U' R' U' R U R' F'", is_main: false }
    ]
  },
  {
    case_number: 17,
    name: "Ua Perm",
    description: "3-cycle of edges, moving counter-clockwise. Corners solved.",
    cube_state: "M2 U' M U2 M' U' M2",
    algorithms: [
      { moves: "M2 U M U2 M' U M2", is_main: true },
      { moves: "R U' R U R U R U' R' U' R2", is_main: false, label: "R U variant" }
    ]
  },
  {
    case_number: 18,
    name: "Ub Perm",
    description: "3-cycle of edges, moving clockwise. Corners solved.",
    cube_state: "M2 U M U2 M' U M2",
    algorithms: [
      { moves: "M2 U' M U2 M' U' M2", is_main: true },
      { moves: "R2 U R U R' U' R' U' R' U R'", is_main: false, label: "R U variant" }
    ]
  },
  {
    case_number: 19,
    name: "V Perm",
    description: "Diagonal corner swap, adjacent edge swap. 2x2x1 block.",
    cube_state: "F' R' F' R U' R U R2 F R d R U' R",
    algorithms: [
      { moves: "R' U R' d' R' F' R2 U' R' U R' F R F", is_main: true }
    ]
  },
  {
    case_number: 20,
    name: "Y Perm",
    description: "Diagonal corner swap, opposite edge swap. Two 1x1x2 blocks.",
    cube_state: "F R' F' R U R U' R' F R U' R' U R U R' F'",
    algorithms: [
      { moves: "F R U' R' U' R U R' F' R U R' U' R' F R F'", is_main: true }
    ]
  },
  {
    case_number: 21,
    name: "Z Perm",
    description: "Adjacent 2-swaps of edges. Corners solved.",
    cube_state: "M U2 M2 U2 M U' M2 U' M2",
    algorithms: [
      { moves: "M2 U M2 U M' U2 M2 U2 M'", is_main: true },
      { moves: "M' U M2 U M2 U M' U2 M2", is_main: false, label: "Alternate" }
    ]
  }
];
