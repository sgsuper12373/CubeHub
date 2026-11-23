/**
 * CuberHub's community links (docs/landing-plan.md → Built for Indian cubers).
 * A link renders only when it has a real URL, and a follower count only when
 * it's real: fill these in when the accounts exist. Discord stays out until
 * the server does (open question 2).
 */
export const COMMUNITY_LINKS: { name: "Instagram" | "YouTube" | "Discord"; url: string | null; followers: number | null }[] = [
  { name: "Instagram", url: null, followers: null },
  { name: "YouTube", url: null, followers: null },
];

/** Where "Contribute" points (a GitHub repo or a contact form, open question 3). Null hides the link. */
export const CONTRIBUTE_URL: string | null = null;
