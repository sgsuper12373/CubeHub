/** The two signed-in e2e accounts (see docs/todo.md → test accounts). */
export const E2E_USERS = [
  {
    id: "a",
    email: process.env.E2E_USER_A_EMAIL ?? "",
    password: process.env.E2E_USER_A_PASSWORD ?? "",
    state: "playwright/.auth/a.json",
  },
  {
    id: "b",
    email: process.env.E2E_USER_B_EMAIL ?? "",
    password: process.env.E2E_USER_B_PASSWORD ?? "",
    state: "playwright/.auth/b.json",
  },
] as const;

export function hasE2eUsers(): boolean {
  return E2E_USERS.every((u) => u.email && u.password);
}
