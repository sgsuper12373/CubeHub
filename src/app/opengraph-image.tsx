import { ImageResponse } from "next/og";

/**
 * Generated at request time rather than checked in as a binary, so there is no
 * asset to keep in sync with the brand. Colours are the literal values behind
 * the dark-theme `--background` / `--primary` tokens — Satori has no access to
 * the stylesheet, so they cannot be referenced as variables here.
 */

export const alt = "CubeHub — Speedcubing Timer, Tutorials & Competitions";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          background: "#252525",
          padding: "80px",
        }}
      >
        <div
          style={{
            fontSize: 88,
            fontWeight: 700,
            color: "#fafafa",
            letterSpacing: "-0.03em",
          }}
        >
          CubeHub
        </div>
        <div
          style={{
            marginTop: 16,
            fontSize: 40,
            color: "#5eead4",
            letterSpacing: "-0.02em",
          }}
        >
          Speedcubing timer, tutorials &amp; competitions
        </div>
        <div
          style={{
            marginTop: 48,
            fontSize: 28,
            color: "#a1a1a1",
          }}
        >
          WCA scrambles · Works offline · Free forever
        </div>
      </div>
    ),
    size,
  );
}
