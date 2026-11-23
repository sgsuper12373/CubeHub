import type { Metadata } from "next";

import { FeaturePage } from "@/components/marketing/feature-page";
import { featurePage } from "@/content/features";

const page = featurePage("drill-lab");

export const metadata: Metadata = {
  title: `${page.metaTitle} | CuberHub`,
  description: page.description,
  alternates: { canonical: "/features/drill-lab" },
  openGraph: { title: page.metaTitle, description: page.description, url: "/features/drill-lab" },
};

export default function Page() {
  return <FeaturePage page={page} />;
}
