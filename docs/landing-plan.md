# Landing plan: `cuberhub.me`

> **Status:** steps 1–9, 11 and 12 done (Nov 24–25, 2026); step 10 (Meet Cubby) waits on the art · Sumit Garad
> **For:** Claude Code. Read `AGENTS.md`, `docs/architecture.md` (the two timer rules and the
> `(marketing)` static-rendering notes) and `docs/brand.md` first.
> **Related:** `docs/app-shell-plan.md` (hosts, cookies), `docs/home-plan.md`,
> `docs/cubby-cubing-companion.md` (the Meet Cubby section).

## Summary

The landing page moves to the root domain, `cuberhub.me`, while the product moves to
`app.cuberhub.me`. That frees the landing page to be a premium, scroll-driven story: each section
fills the screen, text reveals as it enters, cube pieces float in the background, and the feature
"chapters" pin while their visuals play. None of this code ships to the app host, so the timer's
speed is unaffected.

This round also finishes the **CubeHub → CuberHub rename** in everything a visitor can see, and adds
what the current page lacks: Playground, Cubby, a real roadmap with an email sign-up, a community
section and an FAQ.

**Done when:** `cuberhub.me` shows the new sections, the brand reads CuberHub everywhere a visitor can see
it, every product link goes to `app.cuberhub.me`, social previews show the right domain and image, the
page is still statically rendered (`○` in the build output) and meets the performance budget below.

## What exists today (keep and build on)

From `src/app/(marketing)/page.tsx`: Hero (with the `ScrambleMatrix` notation field and the
`HeroTimerCard` replay plus opt-in "Try a solve") → `FeatureBento` → `LazyCustomizeSection` (real
settings, real theme cookie) → `CtaBand` → `ComingNext` → `SiteFooter`.

Rules that still apply, from `docs/architecture.md`:

- Nothing under `components/marketing/` imports `useTimerStore` or `useSessionStore`. The demo timer keeps
  its own state.
- The landing page never captures Space or touches unless the visitor opts in.
- `/` stays static: nothing reads cookies on the server. Signed-in bits come from `GET /api/viewer` on the
  client (`use-viewer.ts`).

## 1. The CuberHub rename

### What changes

Everything a visitor or user **reads**:

- The wordmark in `src/components/layout/logo.tsx` (`cube<span class="chm-wordmark-hub">hub</span>`
  becomes `cuber<span …>hub</span>`) for `Logo` and `BrandLockup`. Check that the navbar lockup still fits
  at 32 px and on a 360 px-wide phone.
- `aria-label` / `title` text: "CubeHub home", `CubeMark title="CubeHub"`.
- Metadata: `src/app/layout.tsx` (`title`, `siteName`, Open Graph, Twitter), `(marketing)/page.tsx`, and every
  `— CubeHub` page title under `src/app` (about 20 files).
- UI copy: username onboarding ("Choose your CuberHub handle"), report dialogs ("go to the CuberHub team"),
  the notification fallback actor name, import labels ("CuberHub backup"), profile level tooltip.
- `next/og` images (`opengraph-image.tsx`, case OG images) and the favicon if it has text.
- Supabase email templates (confirm, reset, magic link).
- `README.md`, `AGENTS.md`, `docs/brand.md`, `docs/roadmap.md` intro lines.

Find them with `grep -rn "CubeHub\|cubehub" src docs README.md AGENTS.md | grep -v "cubehub[.-]"`.

### What does not change

- Storage keys and cookies (`cubehub.timer.v1`, `cubehub-theme`, …). Renaming them resets users' data.
- The package name, database objects, file and component names, CSS class prefixes (`.chm*`).
- The CH mark itself. "CH" still reads as CuberHub.
- The import format: keep accepting `source: "cubehub"` in backup files; write new exports with
  `"cuberhub"` and accept both.

### Social previews

The live page's `og:url` and `og:image` point at `pre-cube-hub.vercel.app`, because
`NEXT_PUBLIC_SITE_URL` is still the preview domain. Set it to `https://cuberhub.me` in Vercel production
and redeploy. Check with a link-preview tool (WhatsApp, LinkedIn Post Inspector, Discord) before
announcing anything.

## 2. Page structure

Each section is a full-screen "chapter": `min-h-[100svh]`, content vertically centred, generous space.
Use `svh`, not `vh` (mobile browser bars make `vh` jump). On phones a section may grow taller than the
screen; never clip content to fit.

| # | Section | Component | Status |
| --- | --- | --- | --- |
| 0 | Header | `marketing-header.tsx` | Rework |
| 1 | Hero | `hero-section.tsx` | Rework |
| 2 | Try a solve | `hero-timer-card.tsx` → own section | Move and enlarge |
| 3 | Feature chapters (5) | `feature-chapters.tsx` replaces `feature-bento.tsx` | New |
| 4 | Meet Cubby | `meet-cubby.tsx` | New, behind a flag |
| 5 | Make it yours | `customize-section.tsx` | Enlarge |
| 6 | Built for Indian cubers | `community-section.tsx` | New |
| 7 | Roadmap and sign-up | `roadmap-section.tsx` replaces `coming-next.tsx` | New |
| 8 | FAQ | `faq-section.tsx` | New |
| 9 | Final call to action and footer | `cta-band.tsx`, `SiteFooter` | Rework |

### 0. Header

- Desktop (`MarketingNavbar`): wordmark left; centre links **Features**, **Learn**, **Roadmap**, **FAQ**
  (in-page anchors on `/`, real pages elsewhere); right **Sign in** (text) and **Open app** (button).
  Signed in: avatar and **Open app** only.
- Transparent over the hero, becomes a solid `bg-background/80` with blur and a hairline border once the
  page scrolls past 24 px.
- Phones: the existing small header stays (it's the phone version of the same header, not a duplicate),
  with a menu button that opens the same links in a sheet.
- **Open app** → `appUrl("/home")`. **Sign in** → `appUrl("/login")`.

### 1. Hero

**Copy (pick one headline; the others can rotate in A/B tests later):**

- "Every part of cubing. One hub."
- "Time it. Learn it. Drill it. Share it."
- "Your whole cubing practice, in one tab."

Sub-line: "A fast WCA timer, every OLL and PLL in 3D, a drill that finds your slow cases, and friends to
race. Free, and built for Indian cubers."

Buttons: **Start timing free** (primary → `appUrl("/timer")`) and **Explore Learn** (secondary →
`appUrl("/learn")`). Trust row below: WCA random-state scrambles · Works offline · Built for India.

**Motion:**

- The `BrandLockup` mark draws in (wireframe stroke, 600 ms), then the wordmark reveals letter by letter
  (30 ms stagger), then the headline word by word (`RevealText`, below), then buttons fade up.
  Total under 1.6 s. Text is in the HTML from the start; the animation only changes opacity and transform,
  so it doesn't delay the largest paint.
- Background: keep `ScrambleMatrix`. Add a `FloatingField` layer of 8–12 small objects: sticker squares in
  the six cube colours (from theme or sticker tokens, never raw hex), a few cube pieces (corner, edge),
  and notation glyphs (R, U', F2, M). They drift slowly and shift a few pixels with the pointer.
- Cubby, once the companion art exists, peeks from the bottom-right corner and waves once.

### 2. Try a solve

Move `HeroTimerCard` into its own full-screen section titled "Try a solve right here." Keep its opt-in
rule: the visitor clicks **Try it** before Space or touch is captured, and it releases on scroll-away or
`Esc`.

After one solve: "Nice, 14.32. Your next one counts in the real timer." with **Keep going** →
`appUrl("/timer")`. Don't carry the solve over; the demo stays separate from real data (architecture rule).

### 3. Feature chapters

Five chapters. On desktop each **pins** while its visual plays and its text scrolls (scroll-linked, never
scroll-jacked: the page always scrolls at the user's speed). On phones they stack as plain full-screen
sections.

| Chapter | Headline | Visual | Link |
| --- | --- | --- | --- |
| Timer and stats | "A timer that disappears when you solve." | Timer digits counting, then Ao5/Ao12 numbers count up and a trend line draws | `/timer` |
| Learn | "Every OLL and PLL, in 3D." | A cube plays a PLL; the case name types out beside it; the 2D diagram highlights | `/learn` |
| Drill Lab | "Find out which alg is actually faster for your hands." | Two algorithm variants for one case race side by side with their times; the faster one gets a "main" badge | `/learn/333/drill` |
| Playground | "A cube you can turn right here." | A live cube visitors can drag and turn; notation input below | `/playground` |
| Profiles and clubs | "Your PBs, your progress, your college club." | A profile card flips to show PBs and badges; club posts slide past | `/clubs` |

- Drill Lab is the differentiator (it's what makes cubers switch), so it gets the most care.
- Visuals: prefer short, muted, looping **videos** (`.webm` + `.mp4`, under 600 KB each, `preload="none"`,
  played only when on screen) recorded from the real app, or animated SVG. Use live cubing.js only in
  the Learn and Playground chapters, loaded through `lib/cubing/runtime.ts` when the chapter is within
  one screen of the viewport. A poster image shows until then.
- Each chapter's link goes to the app host with `appUrl()`.
- Every chapter has a real `h2` and a sentence of body text, for SEO and screen readers.

### 4. Meet Cubby

Behind `NEXT_PUBLIC_SHOW_CUBBY=1` until the companion art exists.

- Headline: "Meet Cubby, your practice buddy."
- Three of Cubby's expressions in a row (waving, celebrating a PB, focused with a blindfold), each with a
  one-line caption: "Shows you around every page", "Cheers every PB", "Later: coaches you with AI".
- Cubby's eyes follow the pointer while the section is on screen.

### 5. Make it yours

Keep `customize-section.tsx` (its settings are real) and make it a full-screen section:

- A theme picker where clicking a theme recolours the **whole landing page** live, including the CH mark
  (`data-logo` follows the theme in this section only) and, when shown, Cubby's stickers.
- The existing timer settings (precision, hold time, preview style) stay.
- New preview tiles: background image, font size, panel layout, each linking into the app's Settings.
- Copy: "Make it yours. Themes, fonts, layouts and backgrounds, like monkeytype for cubers."

### 6. Built for Indian cubers

- Headline: "Built in India, for Indian cubers."
- Three points: prices in ₹ (when the shop ships), college clubs and tournament rooms, India-first
  rankings and competition calendar (both marked "coming").
- Community links: Discord, Instagram, YouTube (the CuberHub channel), with follower counts only if they're
  real.
- A **Contribute** strip: "CuberHub is built by a student at IIT Palakkad. Designers, cubers and developers
  welcome." with a link to GitHub or a contact form. Confirm the wording before shipping.

### 7. Roadmap and sign-up

Replaces the quiet "Coming next" strip with a three-column **Now / Next / Later** board:

| Now | Next | Later |
| --- | --- | --- |
| Timer and stats | Cubby companion | Bluetooth smart cubes with solve review |
| Learn (3x3, 2x2) | BLD mode with memo split | AI coach |
| Drill Lab | Daily scramble | Cube shop in ₹ |
| Playground | Compete: races, ratings and bots | National and state rankings |
| Profiles, friends, clubs | College tournament rooms | Competition calendar |

- Keep the content in one file, `src/content/roadmap.ts`, shared with a full `/roadmap` page and the app's
  "What's new" card (Home spec). Keep it in step with `docs/roadmap.md`.
- Each item can carry a status chip (Shipped, Building, Planned).
- **Notify me** form: an email field and a submit button. On submit, insert into a new
  `public.waitlist (email citext unique, source text, created_at)` table through a server action:
  - RLS: no select for anyone, insert only through the server action (use a security-definer function so
    the anon key can't read the list).
  - Validate the email, ignore duplicates silently ("You're on the list"), and rate-limit by IP in the
    action (a simple per-IP counter is enough for now).
  - Store `source` ("landing-roadmap", "landing-hero" …).
  - The form keeps the page static: it's a client island calling the server action.
  - Add one line under the field: "One email when something ships. No spam." Add a privacy link.

### 8. FAQ

An accordion (Base UI `Accordion` or a `details`/`summary` list), with `FAQPage` JSON-LD in the page.

Draft questions:

1. Is CuberHub free? (Yes. The timer, Learn, Drill and Playground are free.)
2. Do I need an account? (No. Sign in to sync across devices and join clubs.)
3. Does it work offline? (Yes for the timer, once loaded.)
4. Can I import from csTimer? (Yes, on the Stats page.)
5. Are the scrambles WCA-legal? (Random-state, from cubing.js.)
6. Do you support smart cubes? (Planned; see the roadmap.)
7. Which puzzles? (3x3 and 2x2 today; more later.)
8. Who makes CuberHub? (A student-built project from India.)

Check every answer against the app before shipping.

### 9. Final call to action and footer

- One full-screen band: "Your next PB starts here." with **Open the timer** (primary) and **Create a free
  account** (secondary → `appUrl("/signup")`). The cube field from the hero returns faintly.
- Footer columns: Product (Timer, Learn, Drill Lab, Playground, Stats → app host), Community (Clubs,
  Discord, Instagram, YouTube), Company (Roadmap, About, Contribute), Legal (Privacy, Terms). Keep the
  cubing.js credit. Wordmark "cuberhub" with the tagline "The unified cubing platform".

## 3. Motion system

Build a small set of reusable pieces in `src/components/marketing/motion/` on the `motion` package
(already installed, v12; import from `motion/react`). Use nothing else unless a chapter truly needs GSAP.

| Piece | What it does | Notes |
| --- | --- | --- |
| `RevealText` | Splits text into words (or letters), reveals with opacity and an 8–12 px rise, 30–40 ms stagger, when 30% visible | Renders the full text in the HTML; screen readers get the plain string once (`aria-label` on the wrapper, pieces `aria-hidden`) |
| `FloatingField` | 8–12 decorative objects drifting with CSS keyframes, plus a small pointer parallax through motion values | `aria-hidden`, `pointer-events-none`; pauses when off screen (IntersectionObserver) and on `visibilitychange` |
| `PinnedChapter` | Sticky visual with scroll progress (`useScroll` on the chapter) driving the visual's state | Desktop only (`lg` and up); plain stacked section below |
| `CountUp` | Counts a number up once when visible | Text shows the final number before hydration |
| `FadeUp` | The default entrance for cards and buttons | 300–400 ms, ease-out |

Rules:

- **Reduced motion:** every piece checks `useReducedMotion()`. Reveals become instant, floating stops,
  pinned chapters become plain sections, videos show posters.
- **No scroll hijacking:** no smooth-scroll libraries that replace native scrolling, no forced snapping.
  `scroll-margin-top` on sections so header anchors land correctly.
- **Only animate `opacity` and `transform`.** Never animate layout properties.
- **Tokens only:** colours from the theme (the colour guard `npm run check:colors` must pass). Cube sticker
  colours come from the sticker tokens or `src/lib/stickers.ts`.
- **Off-screen work stops:** canvases, videos and cubing.js players pause when not visible.

## 4. Performance budget

The landing page is the first impression and what Google measures, so it gets a budget even though it no
longer shares a bundle with the timer.

- Core Web Vitals "good": LCP under 2.5 s, CLS under 0.1, INP under 200 ms, on a mid-range phone over 4G.
- `/` stays static (`○`). The build output is part of the PR check.
- First-load JavaScript for `/` no larger than today's plus 40 KB gzipped for the motion pieces. Measure
  with `next build` output before and after and note both numbers in the PR.
- The hero renders with no client JavaScript required for its text and buttons.
- Everything below the hero is lazy: `dynamic()` imports for chapters, the customise section and the FAQ's
  JSON-LD stays server-rendered.
- Images: `next/image` with explicit sizes; videos `preload="none"` with posters.
- Run `npm run check:chunks -- https://cuberhub.me` after deploying.

## 5. SEO and sharing

- One `h1` (the hero headline), an `h2` per section.
- Metadata: title "CuberHub: Speedcubing Timer, OLL/PLL Tutorials and Drills", a 150-character description,
  canonical `https://cuberhub.me/`.
- JSON-LD: `WebApplication` (name, URL, free offer, category), `Organization` (logo, social links),
  `FAQPage`.
- Open Graph image: regenerate with the CuberHub wordmark; 1200×630.
- New indexable marketing pages, each a short page with its own `h1`, a visual and a link into the app
  (this mirrors Flowtimer's feature pages and catches searches the home page can't):
  `/features/timer`, `/features/drill-lab`, `/features/learn`, `/features/playground`, `/roadmap`, `/about`,
  `/privacy`, `/terms`. Build them on one `FeaturePage` template so they're cheap to add.
- Root sitemap lists these; Learn pages are listed by the app host's sitemap (app shell spec).

## 6. Accessibility

- Contrast meets WCAG AA in both themes, including text over the floating field and video posters.
- Every interactive element is reachable and usable by keyboard. The demo timer explains how to start
  and stop it with the keyboard.
- Videos have no audio; decorative ones are `aria-hidden`; informative ones have a text equivalent in
  the chapter copy.
- Focus moves sensibly through pinned chapters (no focus trapped in a sticky element).

## Implementation order

Each step is one PR with `npm run validate` and `npm run test:e2e:prod` green.

1. ✅ **Rename.** Visible CubeHub → CuberHub across the app and emails; wordmark; metadata; OG image;
   `NEXT_PUBLIC_SITE_URL` fixed in production. Ship this first, on its own. *(done; the Vercel variable and the Supabase email templates are still the founder's)*
2. ✅ **Motion pieces.** `RevealText`, `FloatingField`, `CountUp`, `FadeUp`, `PinnedChapter`, with unit
   tests for the reduced-motion paths.
3. ✅ **Header and hero.**
4. ✅ **Try a solve section.** *(later merged into the Timer chapter)*
5. ✅ **Feature chapters.** Record the videos from the real app (Playwright can script the screen
   recordings so they're easy to redo after UI changes). *(animated scenes instead of videos; see decisions.md)*
6. ✅ **Make it yours** enlarged, whole-page theme preview.
7. ✅ **Community, roadmap with waitlist** (migration + server action), **FAQ**. *(Notify me form added Nov 25)*
8. ✅ **Final CTA and footer.**
9. ✅ **Feature pages and `/roadmap`.**
10. **Meet Cubby** when the companion art is ready. *(built with the v0 art behind `NEXT_PUBLIC_SHOW_CUBBY` on `feat/cubby`, 2026-11-26)*
11. ✅ **Links to the app host.** Switch every product link to `appUrl()` once `app.cuberhub.me` is live
    (app shell step 9). Until then `appUrl()` returns the same host, so this can be merged early. *(takes effect when `NEXT_PUBLIC_APP_URL` is set)*
12. ✅ Docs: `docs/brand.md` (rename, wordmark), `docs/architecture.md` (marketing routes), `docs/roadmap.md`.

## Tests

**Unit:** `RevealText` renders the full string for assistive tech; reduced motion disables animation;
waitlist email validation and duplicate handling; roadmap data shape.

**E2E:**

- `/` builds as static and loads with JavaScript disabled showing the hero text and buttons.
- No Space or touch capture until **Try it** is clicked; Space after scrolling away doesn't start the demo.
- All product links point to the app host when `NEXT_PUBLIC_APP_URL` is set.
- Waitlist: submit, success message, duplicate submit still says success, nothing readable with the anon key.
- With `prefers-reduced-motion: reduce` emulated, no element has a running animation.
- Theme switch in "Make it yours" changes the page and persists to the app (shared cookie).
- `grep` check in CI: no visible "CubeHub" left in `src/` outside storage keys and comments.

## Open questions

1. Which hero headline? (Three options above.)
2. Discord server: does one exist yet? If not, drop the link until it does.
3. Contribute strip: link to GitHub (public repo?) or a contact form?
4. Waitlist email sending: which provider (Resend or Brevo, already on the todo list)? The list can be
   collected before sending is set up.
