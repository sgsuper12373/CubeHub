import { NotFoundView } from "@/components/layout/not-found-view";

/** Unknown URLs. Outside the (app) group, so there is no navbar. */
export default function NotFound() {
  return <NotFoundView />;
}
