# Brand

## The CH mark and wordmark

All logo components are in `src/components/layout/logo.tsx`. They are inline SVG plus live
text: there are no image requests, the text stays crisp and selectable, and everything
recolours with the theme. Styles are the "CubeHub brand mark + wordmark" section of
`src/app/globals.css` (`.chm*` classes).

| Component | Use |
|---|---|
| `<CubeMark />` | The mark alone. Pass `title="CubeHub"` when it stands without the wordmark, so it gets an accessible name; otherwise it's `aria-hidden`. `glow={false}` turns off the glow, which only shows in dark themes anyway. |
| `<Logo />` | Navbar lockup: a 32px mark plus the "cube**hub**" wordmark. |
| `<BrandLockup />` | Landing hero: a large mark, the wordmark, and the "The unified cubing platform" tagline. `stacked` puts the mark above the text. `as="h1"` makes it the page heading. `tagline={null}` hides the tagline. |

The wordmark and tagline use **Outfit** (`--font-brand`, loaded in `src/app/layout.tsx`).
Nothing else does; body text stays Geist. Outfit is a variable font, so it's loaded without
`weight`: Turbopack's `next/font` fails the build on a multi-weight list for it.

## Tokens

| Hook | Drives | Falls back to |
|---|---|---|
| `--logo-c` | The C, the nodes, the glow, and "hub" in the wordmark | `--primary` |
| `--logo-h` | The H and the small cube | `--foreground` |
| `--logo-wire` | The cube wireframe | `--logo-c` |

Face shading (top, front, side) is derived from those colours with `color-mix()` against
`white` and `black`, so any theme gets a matching 3D look. These CSS keywords and the
classic `oklch()` values below are fine in `globals.css`, because the colour guard only
scans `.ts`/`.tsx` files.

### Overriding per theme

No theme overrides the logo today. To give a theme a logo colour different from its primary
or foreground:

1. Add `"logo-c"`, `"logo-h"` and/or `"logo-wire"` to `TOKEN_NAMES` in `src/themes/types.ts`.
2. Set the value in that theme's file (e.g. `src/themes/paper.ts`). Themes that leave it
   unset keep the fallback.
3. Regenerate the CSS with `npx vitest run -u`.

The favicon reads the same hooks, so it follows automatically.

## The classic palette

`data-logo="classic"` on any ancestor gives the original blue C, orange H and blue
wireframe (`[data-logo="classic"]` in `globals.css`), whatever the theme.

The landing hero uses it, behind one constant in
`src/components/marketing/hero-section.tsx`:

```ts
const LANDING_LOGO_STYLE: "classic" | "theme" = "classic";
```

Set it to `"theme"` for the hero to follow the active theme like the rest of the app.

Theme selectors are plain `[data-theme="…"]`, so a mark inside any element with
`data-theme` takes that theme's colours. The glow is the exception: it is keyed on `.dark`
on `<html>`. The landing page's theme swatches (`customize-section.tsx`) don't show the
logo today.

## Favicon

- **Static fallback:** `src/app/icon.png` (64×64) and `src/app/apple-icon.png` (180×180),
  both Slate. Browsers use them before JS runs, and they're used for bookmarks. Home-screen
  icons always use the apple-icon.
- **Theme-aware:** `<ThemeFavicon />` (`src/components/brand/theme-favicon.tsx`, rendered
  once in the root layout) calls `applyThemeFavicon()` (`src/lib/brand/favicon.ts`). That
  function reads the current `--background`, `--logo-c`/`--primary` and
  `--logo-h`/`--foreground`, draws a flat "CH" tile on a 64×64 canvas, and points every
  `<link rel~="icon">` at the PNG data URL. It's a canvas rather than an SVG favicon so it
  works in Safari.
- **When it redraws:**
  - after hydration, so `THEME_INIT_SCRIPT` has already resolved "system"
  - whenever `<html>`'s `data-theme`, `class` or `style` changes
  - whenever Next inserts a new static icon link into `<head>`. Metadata streams in after
    hydration and is re-inserted on client navigations, and browsers use the last icon
    link.
- **Fallback colours:** if a token doesn't resolve, the drawing uses `BRAND_FALLBACK` in
  `src/themes/brand.ts`, which holds Slate's values. They live there because `src/themes/`
  is exempt from the colour guard.
- **System theme:** `<SystemThemeSync />` re-applies the theme when the OS light/dark
  setting changes while the preference is "system", so the page and the favicon both
  follow it without a reload.

## Files

| File | Used for |
|---|---|
| `src/app/icon.png`, `apple-icon.png` | Static tab and home-screen icons |
| `src/app/opengraph-image.png` + `.alt.txt` | Social card (the Slate OG image, 1200×630) |
| `public/brand/cubehub-{lockup,mark}-{slate,classic,paper}.{svg,png,webp}` | Pre-rendered lockups and marks, for press, docs and email. The app UI doesn't use them. The WebP files are lossless copies of the PNGs, 30–65% smaller, for web pages; keep the PNGs for email (patchy WebP support) and existing links. |
| `public/brand/cubehub-lockup-{slate,classic}-transparent.*` | The same, without a background (alpha kept in the WebP) |
| `public/brand/cubehub-og-{slate,classic}.{svg,png}` | OG card sources. Copy one to `src/app/opengraph-image.png` to switch. PNG only: social cards need PNG or JPEG. |
| `docs/brand/cubehub-avatar-{slate,classic}.*` | YouTube and social avatars. Not served. |
| `docs/brand/raster/` | The earlier raster logo set. Social media only; don't use in the app. |
