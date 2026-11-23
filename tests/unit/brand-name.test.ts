import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * The product is CuberHub. The old "CubeHub" spelling may survive only in
 * internal names (storage keys like `cubehub.timer.v1`, the `cubehub-theme`
 * cookie, identifiers such as `isCubeHubExport`), never in text a visitor
 * reads. A whole-word, case-sensitive "CubeHub" is always visible text or a
 * comment, so it's flagged everywhere under src/.
 */
function* files(dir: string): Generator<string> {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* files(path);
    else if (/\.(tsx?|css|txt|json|md)$/.test(name)) yield path;
  }
}

describe("brand name", () => {
  it('no visible "CubeHub" left in src/', () => {
    const hits: string[] = [];
    for (const file of files("src")) {
      readFileSync(file, "utf8")
        .split("\n")
        .forEach((line, i) => {
          if (/\bCubeHub\b/.test(line)) hits.push(`${file}:${i + 1}: ${line.trim()}`);
        });
    }
    expect(hits).toEqual([]);
  });
});
