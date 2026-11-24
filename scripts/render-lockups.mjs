/**
 * Renders the press lockups with the "cuberhub" wordmark.
 *
 *   node scripts/render-lockups.mjs
 *
 * The old lockups (public/brand/cubehub-lockup-*.svg) have the wordmark and
 * tagline outlined as glyph paths, so the rename means re-setting them. This
 * keeps each old file's background and CH mark, outlines "cuber" + "hub" and
 * the tagline in Outfit (the brand font; fetched from Google Fonts, so it
 * needs the network) with scripts/outline-text.py (needs python3 and
 * fontTools), and writes:
 *
 *   public/brand/cuberhub-lockup-<variant>.svg   text as paths, no font needed
 *   public/brand/cuberhub-lockup-<variant>.png   2400x1112, Playwright's Chromium
 *   public/brand/cuberhub-lockup-<variant>.webp  lossless copy of the PNG (sharp)
 *
 * Chromium does the rasterising because the mark's CSS uses oklch() and
 * color-mix(). The old cubehub-* files are left alone (docs/brand.md → Files).
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { chromium } from "@playwright/test";
import sharp from "sharp";

const root = resolve(import.meta.dirname, "..");
const work = mkdtempSync(join(tmpdir(), "lockups-"));
const VARIANTS = ["slate", "classic", "paper", "slate-transparent", "classic-transparent"];

// Layout, in the 1200x556 viewBox. The old wordmark started at x 513.7 with
// its baseline at 320 and the tagline's caps 49 below that; "cuberhub" is a
// letter longer, so it's fitted between the old left edge and a right margin
// that mirrors the mark's left one.
const LEFT = 513.7;
const RIGHT = 1155;
const BLOCK_CENTRE = 292.25; // the old wordmark + tagline block's vertical centre
const GAP = 49; // baseline to tagline cap top
const TAG_CAP = 20.8; // tagline cap height
const TRACKING = -0.03; // wordmark, in em (as the OG card)
const TAGLINE = "THE UNIFIED CUBING PLATFORM";

async function fetchOutfit() {
  // An old user agent makes Google Fonts answer with TrueType, which fontTools reads.
  const css = await (
    await fetch("https://fonts.googleapis.com/css2?family=Outfit:wght@500;700", { headers: { "User-Agent": "Mozilla/4.0" } })
  ).text();
  const urls = {};
  for (const block of css.split("@font-face").slice(1)) {
    const weight = block.match(/font-weight:\s*(\d+)/)?.[1];
    const url = block.match(/url\((https:[^)]+\.ttf)\)/)?.[1];
    if (weight && url) urls[weight] = url;
  }
  const files = {};
  for (const weight of ["500", "700"]) {
    if (!urls[weight]) throw new Error(`no Outfit ${weight} TTF in the Google Fonts CSS`);
    const file = join(work, `outfit-${weight}.ttf`);
    writeFileSync(file, Buffer.from(await (await fetch(urls[weight])).arrayBuffer()));
    files[weight] = file;
  }
  return files;
}

function outline(runs) {
  const out = execFileSync("python3", ["-E", "-P", join(root, "scripts/outline-text.py")], { input: JSON.stringify(runs) });
  return JSON.parse(out.toString());
}

function layout(fonts) {
  // 1. Measure at size 100, then scale the wordmark to fit LEFT..RIGHT.
  const [probe] = outline([{ font: fonts["700"], text: "cuberhub", size: 100, tracking: TRACKING, x: 0, baseline: 0 }]);
  const size = (100 * (RIGHT - LEFT)) / (probe.bounds[2] - probe.bounds[0]);
  const ascent = (-probe.bounds[1] * size) / 100;
  // 2. Tagline cap height from the font's H.
  const [h] = outline([{ font: fonts["500"], text: "H", size: 100, x: 0, baseline: 0 }]);
  const tagSize = (100 * TAG_CAP) / -h.bounds[1];
  // 3. Centre the block (ascender top to tagline baseline) where the old one was.
  const height = ascent + GAP + TAG_CAP;
  const baseline = BLOCK_CENTRE - height / 2 + ascent;
  const x = LEFT - (probe.bounds[0] * size) / 100;
  const [cuber] = outline([{ font: fonts["700"], text: "cuber", size, tracking: TRACKING, x, baseline }]);
  const hubX = x + cuber.advance + TRACKING * size;
  const [hub] = outline([{ font: fonts["700"], text: "hub", size, tracking: TRACKING, x: hubX, baseline }]);
  // 4. Track the tagline out to the wordmark's width.
  const tagBaseline = baseline + GAP + TAG_CAP;
  const [plain] = outline([{ font: fonts["500"], text: TAGLINE, size: tagSize, x: 0, baseline: 0 }]);
  const wordWidth = hub.bounds[2] - cuber.bounds[0];
  const tracking = (wordWidth - (plain.bounds[2] - plain.bounds[0])) / (tagSize * (TAGLINE.length - 1));
  const [tag] = outline([
    { font: fonts["500"], text: TAGLINE, size: tagSize, tracking, x: cuber.bounds[0] - plain.bounds[0], baseline: tagBaseline },
  ]);
  return { cuber, hub, tag };
}

function lockupSvg(variant, { cuber, hub, tag }) {
  const svg = readFileSync(join(root, `public/brand/cubehub-lockup-${variant}.svg`), "utf8");
  // Background and mark: everything up to the end of the nested mark <svg>.
  const markEnd = svg.indexOf("</svg>") + "</svg>".length;
  const tail = svg.slice(markEnd);
  const fills = [...tail.matchAll(/<path [^>]*fill="([^"]+)"/g)].map((m) => m[1]);
  const glow = /filter="url\(#hg\)"/.test(tail);
  const [word, hubFill, tagFill] = glow ? [fills[0], fills[2], fills[3]] : fills;
  const defs = tail.match(/<defs>[\s\S]*?<\/defs>/)?.[0] ?? "<defs></defs>";
  return (
    svg.slice(0, markEnd) +
    defs +
    `<path d="${cuber.d}" fill="${word}"/>` +
    (glow ? `<path d="${hub.d}" fill="${hubFill}" opacity=".45" filter="url(#hg)"/>` : "") +
    `<path d="${hub.d}" fill="${hubFill}"/>` +
    `<path d="${tag.d}" fill="${tagFill}"/>` +
    "</svg>\n"
  );
}

const fonts = await fetchOutfit();
const text = layout(fonts);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 556 }, deviceScaleFactor: 2 });
for (const variant of VARIANTS) {
  const base = join(root, `public/brand/cuberhub-lockup-${variant}`);
  writeFileSync(`${base}.svg`, lockupSvg(variant, text));
  await page.goto(`file://${base}.svg`);
  await page.screenshot({ path: `${base}.png`, omitBackground: variant.endsWith("-transparent") });
  await sharp(`${base}.png`).webp({ lossless: true, effort: 6 }).toFile(`${base}.webp`);
  console.log(`wrote ${base}.{svg,png,webp}`);
}
await browser.close();
