import { ImageResponse } from "next/og";
import { getPublicCase } from "@/lib/learn/public-dal";
import { caseHeading, parseCaseNumber } from "@/lib/learn/case-route";
import { getPuzzleName } from "@/lib/learn/puzzle-names";

/**
 * The share image for a case page, in the style of the root OG image
 * (src/app/opengraph-image.tsx): literal dark-theme colours, since Satori can't
 * read the stylesheet. Data comes from the cookie-free client, so the image is
 * cached and refreshed daily. An unknown case gets a generic image.
 */

export const alt = "A CubeHub algorithm case";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 86400;

export default async function CaseOpengraphImage({
  params,
}: {
  params: Promise<{ puzzle: string; series: string; case: string }>;
}) {
  const { puzzle, series, case: segment } = await params;
  const n = parseCaseNumber(segment);
  const c = n === null ? null : await getPublicCase(puzzle, series, n);

  const heading = c ? caseHeading(c, c.setName) : "Algorithm tutorials";
  const subtitle = c ? `${getPuzzleName(puzzle)} · ${c.setName}` : "CubeHub Learn";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#252525",
          padding: "72px 80px",
        }}
      >
        <div style={{ display: "flex", fontSize: 36, fontWeight: 700, color: "#fafafa" }}>
          Cube<span style={{ color: "#5eead4" }}>Hub</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 30, color: "#a1a1a1" }}>{subtitle}</div>
          <div
            style={{
              marginTop: 12,
              fontSize: heading.length > 28 ? 64 : 88,
              fontWeight: 700,
              color: "#fafafa",
              letterSpacing: "-0.03em",
              lineHeight: 1.05,
            }}
          >
            {heading}
          </div>
          {c?.mainMoves && (
            <div
              style={{
                marginTop: 32,
                display: "flex",
                fontSize: c.mainMoves.length > 40 ? 34 : 42,
                color: "#5eead4",
              }}
            >
              {c.mainMoves}
            </div>
          )}
        </div>
        <div style={{ display: "flex", fontSize: 28, color: "#a1a1a1" }}>
          {c?.moveCount
            ? `${c.moveCount} moves${c.algorithmCount > 1 ? ` · ${c.algorithmCount} algorithms` : ""} · 3D viewer · Drill mode`
            : "3D viewer · Drill mode · Free"}
        </div>
      </div>
    ),
    size,
  );
}
