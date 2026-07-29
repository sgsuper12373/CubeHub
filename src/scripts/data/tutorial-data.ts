/**
 * Beginner LBL (Layer-By-Layer) tutorial series data.
 * These are structured as sequential tutorial steps (content_md + cube_state),
 * not as algorithm cases.
 */

export type SeedTutorialStep = {
  title: string;
  content_md: string;
  cube_state: string; // setup alg for cubing.js
  order_index: number;
};

export type SeedTutorialSeries = {
  slug: string;
  title: string;
  description: string;
  puzzle_type: string;
  difficulty: string;
  order_index: number;
  steps: SeedTutorialStep[];
};

export const BEGINNER_LBL_SERIES: SeedTutorialSeries = {
  slug: "beginner",
  title: "Beginner Method (Layer-By-Layer)",
  description: "The easiest way to solve a 3x3 Rubik's Cube. Learn to solve it layer by layer — first the white cross, then corners, the middle layer, and finally the last layer.",
  puzzle_type: "333",
  difficulty: "beginner",
  order_index: 0,
  steps: [
    {
      title: "The White Cross",
      order_index: 0,
      cube_state: "",
      content_md: `## Step 1: The White Cross

The first step is to form a white cross on the bottom of the cube (hold white on bottom).

### What you're aiming for
- A white cross on the bottom face
- The edge colours match the centre colours on each side

### Tips
- There is no single algorithm for this — it's intuitive
- Look for white edge pieces and move them to the bottom
- Make sure the side colours of each edge match the centre colours

This step takes practice. Don't worry if it feels slow at first — everyone starts here.`,
    },
    {
      title: "First Layer Corners",
      order_index: 1,
      cube_state: "R U R' U'",
      content_md: `## Step 2: First Layer Corners

Now complete the first layer by inserting the white corner pieces.

### Key Algorithm
**R U R' U'** — Repeat this up to 5 times to insert a corner.

### How to use it
1. Hold the cube with the white cross on the bottom
2. Find a white corner piece in the top layer
3. Position it above where it needs to go
4. Apply **R U R' U'** until the corner drops into place

If a corner is already in the bottom layer but in the wrong position, use the same algorithm to pop it out first, then re-insert it correctly.`,
    },
    {
      title: "Second Layer Edges",
      order_index: 2,
      cube_state: "U R U' R' U' F' U F",
      content_md: `## Step 3: Second Layer Edges

Insert the middle layer edge pieces to complete the first two layers (F2L).

### Right Insert
**U R U' R' U' F' U F**
Use this when the edge needs to go to the right.

### Left Insert
**U' L' U L U F U' F'**
Use this when the edge needs to go to the left.

### How to use it
1. Hold the solved first layer on the bottom
2. Find an edge piece in the top layer that doesn't have yellow
3. Align it with its matching centre
4. Determine if it goes right or left, then apply the correct algorithm`,
    },
    {
      title: "Yellow Cross",
      order_index: 3,
      cube_state: "F R U R' U' F'",
      content_md: `## Step 4: Yellow Cross (OLL Step 1)

Form a yellow cross on the top face. You may see a dot, an L shape, or a line.

### The Algorithm
**F R U R' U' F'**

### When to use it
- **Dot** → Apply once to get an L, then continue
- **L shape** → Hold the L in the top-left corner, then apply
- **Line** → Hold it horizontal, then apply
- **Cross** → Already done! Move to the next step.`,
    },
    {
      title: "Yellow Edges",
      order_index: 4,
      cube_state: "R U R' U R U2 R'",
      content_md: `## Step 5: Orient Yellow Corners (OLL Step 2)

Get all yellow stickers facing up on the top layer.

### The Algorithm (Sune)
**R U R' U R U2 R'**

### How to use it
1. Hold the cube with yellow on top
2. Find a corner where yellow is NOT on top
3. Hold it in the front-right position
4. Repeat **R U R' U R U2 R'** until all yellow stickers face up
5. Don't worry if the sides look scrambled — that's normal`,
    },
    {
      title: "Position Yellow Corners",
      order_index: 5,
      cube_state: "U R U' L' U R' U' L",
      content_md: `## Step 6: Position the Corners (PLL Step 1)

Move the yellow corners to their correct positions (matching side colours).

### The Algorithm
**U R U' L' U R' U' L**

### How to use it
1. Look at the corners — find two that are already in the correct position (the colours match the sides, even if rotated)
2. If two correct corners are on the same side, hold that side as the back
3. If no corners are correct, apply the algorithm once from any angle
4. Repeat until all corners are in the right spots`,
    },
    {
      title: "Position Yellow Edges",
      order_index: 6,
      cube_state: "R U' R U R U R U' R' U' R2",
      content_md: `## Step 7: Position the Edges (PLL Step 2) — SOLVED!

The final step. Cycle the last-layer edges into their correct positions.

### Clockwise Cycle (Ua Perm)
**R U' R U R U R U' R' U' R2**

### Counter-clockwise Cycle (Ub Perm)
**R2 U R U R' U' R' U' R' U R'**

### How to use it
1. Check if any edge is already in the correct position (colours match the centre)
2. Hold that solved edge as the back face
3. Determine if the other edges need to cycle clockwise or counter-clockwise
4. Apply the correct algorithm

🎉 **Congratulations!** If everything went right, your cube is now solved!`,
    },
  ],
};

export const CFOP_INTRO_SERIES: SeedTutorialSeries = {
  slug: "cfop",
  title: "CFOP Introduction",
  description: "An overview of the CFOP speedcubing method — Cross, F2L, OLL, PLL. This is the most popular advanced method used by world-class speedcubers.",
  puzzle_type: "333",
  difficulty: "intermediate",
  order_index: 1,
  steps: [
    {
      title: "What is CFOP?",
      order_index: 0,
      cube_state: "",
      content_md: `## What is CFOP?

CFOP (also called the Fridrich Method) is the most widely used speedcubing method. It stands for:

- **C**ross — Solve the cross on the bottom
- **F2L** — First Two Layers (pair corners and edges intuitively)
- **O**LL — Orient Last Layer (make the top face all one colour)
- **P**LL — Permute Last Layer (move the top pieces to their correct positions)

### Why learn CFOP?
The beginner method solves in ~7 steps. CFOP reduces this to 4 stages with far fewer moves overall, making sub-30-second solves achievable.

### Prerequisites
You should be comfortable with the beginner method before learning CFOP. The cross step is similar, and understanding how pieces move will help with F2L.

### How to approach it
1. Start with cross on bottom (you may already do this)
2. Learn intuitive F2L (the biggest speed gain)
3. Learn 2-look OLL (7 algorithms instead of 57)
4. Learn 2-look PLL (6 algorithms instead of 21)
5. Gradually learn full OLL and PLL as you get faster`,
    },
  ],
};
