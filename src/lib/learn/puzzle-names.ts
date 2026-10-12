/** Display names for puzzle ids, shared by the Learn DAL and the cookie-free one. */
export function getPuzzleName(id: string): string {
  if (id === "333") return "3x3 Cube";
  if (id === "222") return "2x2 Cube";
  return id;
}

export function getPuzzleDescription(id: string): string {
  if (id === "333") return "Learn how to solve the classic 3x3 Rubik's Cube.";
  if (id === "222") return "Learn how to solve the pocket 2x2 cube.";
  return "";
}
