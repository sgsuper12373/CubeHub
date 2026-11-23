/**
 * Renders the social (Open Graph) cards with the "cuberhub" wordmark.
 *
 *   node scripts/render-og-card.mjs
 *
 * The old cards (public/brand/cubehub-og-*.svg) have the wordmark outlined as
 * glyph paths, so renaming the brand meant re-setting the text. This keeps the
 * background and the CH mark from those SVGs, sets the wordmark and tagline in
 * Outfit (the brand font, fetched from Google Fonts, so it needs the network)
 * and screenshots the result at 1200x630 with Playwright's Chromium.
 *
 * Writes public/brand/cuberhub-og-{slate,classic}.png. Copy one to
 * src/app/opengraph-image.png to switch the live card (docs/brand.md → Files).
 */
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { chromium } from "@playwright/test";

const root = resolve(import.meta.dirname, "..");
const work = mkdtempSync(join(tmpdir(), "og-card-"));

function cardHtml(variant) {
  const svg = readFileSync(join(root, `public/brand/cubehub-og-${variant}.svg`), "utf8");
  // Everything up to the end of the nested mark <svg>, then close the group
  // and the card: the background and the mark, without the outlined text.
  const markEnd = svg.indexOf("</svg>") + "</svg>".length;
  writeFileSync(join(work, `bg-${variant}.svg`), svg.slice(0, markEnd) + "</g></svg>");
  // The text colours, in order: wordmark, "hub" glow, "hub", tagline.
  const fills = [...svg.slice(markEnd).matchAll(/fill="([^"]+)"/g)].map((m) => m[1]);
  const [word, , hub, tag] = fills;
  return `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@500;700&display=block" rel="stylesheet">
<style>
html,body{margin:0;width:1200px;height:630px;overflow:hidden}
.bg{position:absolute;inset:0}
.t{position:absolute;left:512px;top:0;height:630px;display:flex;flex-direction:column;justify-content:center;font-family:Outfit}
.w{font-weight:700;font-size:124px;letter-spacing:-0.03em;line-height:1;color:${word};margin-top:-14px}
.h{color:${hub};text-shadow:0 0 18px color-mix(in oklch,${hub},transparent 45%)}
.g{font-weight:500;font-size:25px;letter-spacing:0.24em;text-transform:uppercase;color:${tag};margin-top:34px;padding-left:6px}
</style></head><body><img class="bg" src="bg-${variant}.svg" width="1200" height="630">
<div class="t"><div class="w">cuber<span class="h">hub</span></div><div class="g">The unified cubing platform</div></div>
</body></html>`;
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
for (const variant of ["slate", "classic"]) {
  const file = join(work, `og-${variant}.html`);
  writeFileSync(file, cardHtml(variant));
  await page.goto(`file://${file}`);
  await page.evaluate(() => document.fonts.ready);
  const out = join(root, `public/brand/cuberhub-og-${variant}.png`);
  await page.screenshot({ path: out });
  console.log(`wrote ${out}`);
}
await browser.close();
