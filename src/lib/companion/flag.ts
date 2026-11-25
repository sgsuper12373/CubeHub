/**
 * Cubby ships behind NEXT_PUBLIC_SHOW_CUBBY=1 (docs/companion-plan.md). Read
 * at build time, so with the flag unset the companion's code is never loaded.
 */
export const SHOW_CUBBY = process.env.NEXT_PUBLIC_SHOW_CUBBY === "1";
