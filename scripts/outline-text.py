"""Outlines text as SVG path data, for scripts/render-lockups.mjs.

Reads a JSON list of runs on stdin:
  [{"font": "/path/outfit-700.ttf", "text": "cuber", "size": 140, "tracking": -0.03,
    "x": 513.7, "baseline": 320}]
and prints, for each run, {"d": "...", "bounds": [x0, y0, x1, y1], "advance": n}.

`tracking` is in em, added after every glyph but the last. No kerning
(fontTools has no shaper); fine for the lower-case wordmark and the widely
tracked tagline. Needs fontTools (pip install fonttools).
"""
import json
import sys

from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont

_fonts = {}


def font(path):
    if path not in _fonts:
        _fonts[path] = TTFont(path)
    return _fonts[path]


def outline(run):
    f = font(run["font"])
    glyphs = f.getGlyphSet()
    cmap = f.getBestCmap()
    scale = run["size"] / f["head"].unitsPerEm
    x = run["x"]
    svg = SVGPathPen(glyphs, ntos=lambda n: f"{n:.2f}".rstrip("0").rstrip("."))
    bounds = BoundsPen(glyphs)
    text = run["text"]
    for i, ch in enumerate(text):
        name = cmap[ord(ch)]
        g = glyphs[name]
        t = (scale, 0, 0, -scale, x, run["baseline"])
        g.draw(TransformPen(svg, t))
        g.draw(TransformPen(bounds, t))
        x += g.width * scale
        if i < len(text) - 1:
            x += run.get("tracking", 0) * run["size"]
    return {"d": svg.getCommands(), "bounds": list(bounds.bounds or [0, 0, 0, 0]), "advance": x - run["x"]}


print(json.dumps([outline(r) for r in json.load(sys.stdin)]))
