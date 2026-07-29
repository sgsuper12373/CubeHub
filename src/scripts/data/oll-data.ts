export type SeedAlgorithm = {
  moves: string;
  is_main: boolean;
  label?: string;
};

export type SeedCase = {
  case_number: number;
  name: string;
  description: string;
  cube_state: string; // setup alg for cubing.js
  algorithms: SeedAlgorithm[];
};

export const OLL_CASES: SeedCase[] = [
  {
    case_number: 1,
    name: 'OLL 1',
    description: 'Dot, Run',
    cube_state: "F R' F' R U2 F R' F' R2 U2 R'",
    algorithms: [{ moves: "R U2 R2 F R F' U2 R' F R F'", is_main: true }]
  },
  {
    case_number: 2,
    name: 'OLL 2',
    description: 'Dot, Zamboni',
    cube_state: "f U R U' R' f' F U R U' R' F'",
    algorithms: [{ moves: "F R U R' U' F' f R U R' U' f'", is_main: true }]
  },
  {
    case_number: 3,
    name: 'OLL 3',
    description: 'Dot, Anti-Frying Pan',
    cube_state: "F U R U' R' F' U f U R U' R' f'",
    algorithms: [{ moves: "f R U R' U' f' U' F R U R' U' F'", is_main: true }]
  },
  {
    case_number: 4,
    name: 'OLL 4',
    description: 'Dot, Frying Pan',
    cube_state: "F U R U' R' F' U' f U R U' R' f'",
    algorithms: [{ moves: "f R U R' U' f' U F R U R' U' F'", is_main: true }]
  },
  {
    case_number: 5,
    name: 'OLL 5',
    description: 'Square shape',
    cube_state: "r' U' R U' R' U2 r",
    algorithms: [{ moves: "r' U2 R U R' U r", is_main: true }]
  },
  {
    case_number: 6,
    name: 'OLL 6',
    description: 'Square shape',
    cube_state: "r U R' U R U2 r'",
    algorithms: [{ moves: "r U2 R' U' R U' r'", is_main: true }]
  },
  {
    case_number: 7,
    name: 'OLL 7',
    description: 'Lightning, Wide',
    cube_state: "r U2 R' U' R U' r'",
    algorithms: [{ moves: "r U R' U R U2 r'", is_main: true }]
  },
  {
    case_number: 8,
    name: 'OLL 8',
    description: 'Lightning, Wide',
    cube_state: "r' U2 R U R' U r",
    algorithms: [{ moves: "r' U' R U' R' U2 r", is_main: true }]
  },
  {
    case_number: 9,
    name: 'OLL 9',
    description: 'Kite',
    cube_state: "F U R U' R2 F' R U R' U' R'",
    algorithms: [{ moves: "R U R' U' R' F R2 U R' U' F'", is_main: true }]
  },
  {
    case_number: 10,
    name: 'OLL 10',
    description: 'Kite',
    cube_state: "R U2 R' F R' F' R U' R U' R'",
    algorithms: [{ moves: "R U R' U R' F R F' R U2 R'", is_main: true }]
  },
  {
    case_number: 11,
    name: 'OLL 11',
    description: 'Lightning',
    cube_state: "r U2 R' F R' F' R U' R U' r'",
    algorithms: [{ moves: "r U R' U R' F R F' R U2 r'", is_main: true }]
  },
  {
    case_number: 12,
    name: 'OLL 12',
    description: 'Lightning',
    cube_state: "r R' U R' U2 R U R' U R M",
    algorithms: [{ moves: "M' R' U' R U' R' U2 R U' R r'", is_main: true }]
  },
  {
    case_number: 13,
    name: 'OLL 13',
    description: 'Knight',
    cube_state: "F R U' R' U R U2 R' U' F'",
    algorithms: [{ moves: "F U R U2 R' U' R U R' F'", is_main: true }]
  },
  {
    case_number: 14,
    name: 'OLL 14',
    description: 'Knight',
    cube_state: "F U F' R' F R U' R' F' R",
    algorithms: [{ moves: "R' F R U R' F' R F U' F'", is_main: true }]
  },
  {
    case_number: 15,
    name: 'OLL 15',
    description: 'Knight',
    cube_state: "l' U' l U' L' U L l' U l",
    algorithms: [{ moves: "l' U' l L' U' L U l' U l", is_main: true }]
  },
  {
    case_number: 16,
    name: 'OLL 16',
    description: 'Knight',
    cube_state: "r U r' U R U' R' r U' r'",
    algorithms: [{ moves: "r U r' R U R' U' r U' r'", is_main: true }]
  },
  {
    case_number: 17,
    name: 'OLL 17',
    description: 'Dot, Diagonal',
    cube_state: "M U R U R' U' r R2 F R F'",
    algorithms: [{ moves: "F R' F' R2 r' U R U' R' U' M'", is_main: true }]
  },
  {
    case_number: 18,
    name: 'OLL 18',
    description: 'Dot',
    cube_state: "r' U2 R U R' U r2 U2 R' U' R U' r'",
    algorithms: [{ moves: "r U R' U R U2 r2 U' R U' R' U2 r", is_main: true }]
  },
  {
    case_number: 19,
    name: 'OLL 19',
    description: 'Dot, Diagonal',
    cube_state: "F R' F' R M U R U' R' U' R' r",
    algorithms: [{ moves: "r' R U R U R' U' M' R' F R F'", is_main: true }]
  },
  {
    case_number: 20,
    name: 'OLL 20',
    description: 'Dot',
    cube_state: "M U R U R' U' M2 U R U' r'",
    algorithms: [{ moves: "r U R' U' M2 U R U' R' U' M'", is_main: true }]
  },
  {
    case_number: 21,
    name: 'OLL 21',
    description: 'Cross, Pi',
    cube_state: "R U R' U R U' R' U R U2 R'",
    algorithms: [{ moves: "R U2 R' U' R U R' U' R U' R'", is_main: true }]
  },
  {
    case_number: 22,
    name: 'OLL 22',
    description: 'Cross, Wheel',
    cube_state: "R' U2 R2 U R2 U R2 U2 R'",
    algorithms: [{ moves: "R U2 R2 U' R2 U' R2 U2 R", is_main: true }]
  },
  {
    case_number: 23,
    name: 'OLL 23',
    description: 'Cross, Headlights',
    cube_state: "R' U2 R' D' R U2 R' D R2",
    algorithms: [{ moves: "R2 D' R U2 R' D R U2 R", is_main: true }]
  },
  {
    case_number: 24,
    name: 'OLL 24',
    description: 'Cross, Chameleon',
    cube_state: "F R' F' r U R U' r'",
    algorithms: [{ moves: "r U R' U' r' F R F'", is_main: true }]
  },
  {
    case_number: 25,
    name: 'OLL 25',
    description: 'Cross, Bowtie',
    cube_state: "R' F' r U R U' r' F",
    algorithms: [{ moves: "F' r U R' U' r' F R", is_main: true }]
  },
  {
    case_number: 26,
    name: 'OLL 26',
    description: 'Cross, Anti-Sune',
    cube_state: "R U R' U R U2 R'",
    algorithms: [
      { moves: "R U2 R' U' R U' R'", is_main: true },
      { moves: "R U' R' U' R U' R'", is_main: false }
    ]
  },
  {
    case_number: 27,
    name: 'OLL 27',
    description: 'Cross, Sune',
    cube_state: "R U2 R' U' R U' R'",
    algorithms: [
      { moves: "R U R' U R U2 R'", is_main: true },
      { moves: "R U R' U R U' R'", is_main: false }
    ]
  },
  {
    case_number: 28,
    name: 'OLL 28',
    description: 'Arrow',
    cube_state: "M U' M' U2 M U' M'",
    algorithms: [{ moves: "M U M' U2 M U M'", is_main: true }]
  },
  {
    case_number: 29,
    name: 'OLL 29',
    description: 'Awkward',
    cube_state: "R U' R' F' U F R U R' U R U' R'",
    algorithms: [{ moves: "R U R' U' R U' R' F' U' F R U R'", is_main: true }]
  },
  {
    case_number: 30,
    name: 'OLL 30',
    description: 'Awkward',
    cube_state: "F U R U2 R' U R U2 R' U' F'",
    algorithms: [{ moves: "F U R U2 R' U' R U2 R' U' F'", is_main: true }]
  },
  {
    case_number: 31,
    name: 'OLL 31',
    description: 'P shape',
    cube_state: "R' F R U R' U' F' U R",
    algorithms: [{ moves: "R' U' F U R U' R' F' R", is_main: true }]
  },
  {
    case_number: 32,
    name: 'OLL 32',
    description: 'P shape',
    cube_state: "f R' F' R U R U' R' S'",
    algorithms: [{ moves: "S R U R' U' R' F R f'", is_main: true }]
  },
  {
    case_number: 33,
    name: 'OLL 33',
    description: 'T shape',
    cube_state: "F R' F' R U R U' R'",
    algorithms: [{ moves: "R U R' U' R' F R F'", is_main: true }]
  },
  {
    case_number: 34,
    name: 'OLL 34',
    description: 'C shape',
    cube_state: "F U R' U' R' F' R U R2 U' R'",
    algorithms: [{ moves: "R U R2 U' R' F R U R U' F'", is_main: true }]
  },
  {
    case_number: 35,
    name: 'OLL 35',
    description: 'Fish',
    cube_state: "R U2 R' F R' F' R2 U2 R'",
    algorithms: [{ moves: "R U2 R2 F R F' R U2 R'", is_main: true }]
  },
  {
    case_number: 36,
    name: 'OLL 36',
    description: 'W shape',
    cube_state: "F' L F L' U' L' U' L U L' U L",
    algorithms: [{ moves: "L' U' L U' L' U L U L F' L' F", is_main: true }]
  },
  {
    case_number: 37,
    name: 'OLL 37',
    description: 'Fish',
    cube_state: "F R U' R' U' R U R' F'",
    algorithms: [{ moves: "F R U' R' U' R U R' F'", is_main: true }]
  },
  {
    case_number: 38,
    name: 'OLL 38',
    description: 'W shape',
    cube_state: "F R' F' R U R U R' U' R U' R'",
    algorithms: [{ moves: "R U R' U R U' R' U' R' F R F'", is_main: true }]
  },
  {
    case_number: 39,
    name: 'OLL 39',
    description: 'Big Lightning',
    cube_state: "L U F' U' L' U L F L'",
    algorithms: [{ moves: "L F' L' U' L U F U' L'", is_main: true }]
  },
  {
    case_number: 40,
    name: 'OLL 40',
    description: 'Big Lightning',
    cube_state: "R' U' F U R U' R' F' R",
    algorithms: [{ moves: "R' F R U R' U' F' U R", is_main: true }]
  },
  {
    case_number: 41,
    name: 'OLL 41',
    description: 'Awkward',
    cube_state: "F U R U' R' F' R U2 R' U' R U' R'",
    algorithms: [{ moves: "R U R' U R U2 R' F R U R' U' F'", is_main: true }]
  },
  {
    case_number: 42,
    name: 'OLL 42',
    description: 'Awkward',
    cube_state: "F U R U' R' F' R' U2 R U R' U R",
    algorithms: [{ moves: "R' U' R U' R' U2 R F R U R' U' F'", is_main: true }]
  },
  {
    case_number: 43,
    name: 'OLL 43',
    description: 'P shape',
    cube_state: "f' U' L' U L f",
    algorithms: [{ moves: "f' L' U' L U f", is_main: true }]
  },
  {
    case_number: 44,
    name: 'OLL 44',
    description: 'P shape',
    cube_state: "f U R U' R' f'",
    algorithms: [{ moves: "f R U R' U' f'", is_main: true }]
  },
  {
    case_number: 45,
    name: 'OLL 45',
    description: 'T shape',
    cube_state: "F U R U' R' F'",
    algorithms: [{ moves: "F R U R' U' F'", is_main: true }]
  },
  {
    case_number: 46,
    name: 'OLL 46',
    description: 'C shape',
    cube_state: "R' U' F R' F' R U R",
    algorithms: [{ moves: "R' U' R' F R F' U R", is_main: true }]
  },
  {
    case_number: 47,
    name: 'OLL 47',
    description: 'Small L',
    cube_state: "R' U' F R' F' R F R' F' R U R",
    algorithms: [{ moves: "R' U' R' F R F' R' F R F' U R", is_main: true }]
  },
  {
    case_number: 48,
    name: 'OLL 48',
    description: 'Small L',
    cube_state: "F U R U' R' U R U' R' F'",
    algorithms: [{ moves: "F R U R' U' R U R' U' F'", is_main: true }]
  },
  {
    case_number: 49,
    name: 'OLL 49',
    description: 'Small L',
    cube_state: "r' U r2 U' r2 U' r2 U r",
    algorithms: [{ moves: "r U' r2 U r2 U r2 U' r", is_main: true }]
  },
  {
    case_number: 50,
    name: 'OLL 50',
    description: 'Small L',
    cube_state: "r U' r2 U r2 U r2 U' r'",
    algorithms: [{ moves: "r' U r2 U' r2 U' r2 U r'", is_main: true }]
  },
  {
    case_number: 51,
    name: 'OLL 51',
    description: 'Line',
    cube_state: "f U R U' R' U R U' R' f'",
    algorithms: [{ moves: "f R U R' U' R U R' U' f'", is_main: true }]
  },
  {
    case_number: 52,
    name: 'OLL 52',
    description: 'Line',
    cube_state: "F R U R' y' U R' U' R U' R'",
    algorithms: [{ moves: "R U R' U R U' y R U' R' F'", is_main: true }]
  },
  {
    case_number: 53,
    name: 'OLL 53',
    description: 'Small L',
    cube_state: "r' U' R U' R' U R U' R' U2 r",
    algorithms: [{ moves: "r' U2 R U R' U' R U R' U r", is_main: true }]
  },
  {
    case_number: 54,
    name: 'OLL 54',
    description: 'Small L',
    cube_state: "r U R' U R U' R' U R U2 r'",
    algorithms: [{ moves: "r U2 R' U' R U R' U' R U' r'", is_main: true }]
  },
  {
    case_number: 55,
    name: 'OLL 55',
    description: 'Line',
    cube_state: "R U' R' U' R U R2 F R2 U R' U' R' F' R",
    algorithms: [{ moves: "R' F R U R U' R2 F' R2 U' R' U R U R'", is_main: true }]
  },
  {
    case_number: 56,
    name: 'OLL 56',
    description: 'Line',
    cube_state: "r U r' R U R' U' R U R' U' r U' r'",
    algorithms: [{ moves: "r U r' U R U' R' U R U' R' r U' r'", is_main: true }]
  },
  {
    case_number: 57,
    name: 'OLL 57',
    description: 'Line',
    cube_state: "r U R' U' M U R U' R'",
    algorithms: [{ moves: "R U R' U' M' U R U' r'", is_main: true }]
  }
];
