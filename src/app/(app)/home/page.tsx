import { redirect } from "next/navigation";

/**
 * Placeholder until the Home page lands (docs/home-plan.md, branch feat/home).
 * The app shell already sends people here: the app host's `/`, the `(auth)`
 * layout's signed-in redirect and the sidebar logo. Until Home exists, it
 * hands them to the timer, where they landed before.
 */
export default function HomePlaceholder() {
  redirect("/timer");
}
