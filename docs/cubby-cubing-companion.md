# CubeHub Companion — Initial Spec

> Repo copy of the Claude Doc (https://claude.ai/artifact/1e2w7i3NCzJm1Vm9SFSUho), taken 2026-11-26.
> The Claude Doc stays the source of truth; `docs/companion-plan.md` is the build plan.

2026-11-23 · Sumit Garad

## Summary

CubeHub gets a small animated mascot, named Cubby, that lives on every page, gives a guided tour of that page, reacts to what the cuber does, and later grows into an AI coach. Version 1 is fully scripted: no LLM calls, no backend cost, just a character, a tour engine and per-page content files.

The companion is meant to fix one problem: the site feels functional but flat. A character with reactions gives the product a personality, teaches the many hidden features (sessions, inspection, fonts, drill variants) and makes progress feel celebrated.

Goals
- Every page explains itself on first visit, in under 60 seconds, without a docs page.
- The site feels alive and premium: one consistent character, smooth motion, theme-aware colours.
- One reusable system (character + tour engine + content files) so adding a page means adding a JSON file, not code.
- An architecture that can later swap scripted lines for AI-generated insights and smart-cube solve feedback without a rewrite.

Non-goals for v1
- No free-form chat or LLM calls.
- No voice or lip sync.
- No solve analysis; that waits for Bluetooth cube support.
- No companion on the timer while a solve is running, except the blind-mode animation described below.

## Inspiration and what to borrow

The best companions are not decoration: they react to the learner's live state, and the animation is driven by a state machine the app feeds inputs to. That is the pattern to copy.

| Product | What it does | What CubeHub borrows |
| --- | --- | --- |
| Brilliant — Koji | Animated tutor with no mouth; reacts to how the learner is doing (wave, nod, a flip after a perfect lesson). One Rive rig runs on iOS, Android and web. Speaking is shown by a variable tied to audio volume. | Full-body character that emotes with eyes, mouth and body together. Reactions tied to live page state. One animation file reused everywhere. A celebratory "flip" moment for PBs. |
| Duolingo — Duo and cast | Characters run on Rive state machines; lip sync is triggered from audio timing data. | State-machine-driven animation (inputs like isThinking, celebrate, concerned) instead of hand-coded CSS sequences. |
| takeUforward — TUFY | AI learning companion used while studying, coding and following a roadmap; described by users as a Socratic tutor that guides with questions rather than answers. Credit-based (10,000 credits on the Basic plan). | Coach that nudges rather than solves for you. Platform context (your stats, your current page) is what makes it useful. Plan credits from day one. |

Two lessons from TUFY's launch shape the AI phase. Striver credited platform context for its usefulness and micro-optimisations for keeping cost down. Users in the same thread complained that new users get too few credits and most tokens go to context. So CubeHub should precompute compact stat summaries server-side and send those, not raw solve lists.

I could not see TUFY's in-app visuals (they sit behind login), so the visual direction below draws mainly on Koji and Duo.

## Character concept

Cubby is a small, rounded 3x3 cube with a full face on its front (eyes, eyebrows and a mouth) plus small arms and legs, so it can show emotion with its whole body. Its body is a cube, so every cubing action (thinking, scrambling, solving) can be shown by turning its own layers.

Personality: a calm, slightly nerdy practice buddy. Encouraging but honest, never sarcastic or guilt-tripping (Duo's guilt humour works for language streaks but would feel cheap next to a serious timer). Speaks in short lines, uses cubing slang correctly (PB, Ao5, F2L, LL skip), celebrates small wins.

Name options: Cubby is final. Players can rename their own companion in Settings, and tours, greetings and reactions then use that name. Options that were considered:
- Cubby — friendly, obvious, easy to say.
- Kubo — short, works as a brand word, no obvious clash.
- Twisty — playful, describes the motion.
- Hubbie / Hubby — ties to CubeHub, but reads oddly in English; not recommended.

Check any pick against existing cubing brands before committing, and avoid anything close to the Rubik's trademark.

Visual rules for a premium look
- Flat vector, no gradients or glossy 3D render; thin consistent outline; matches the isometric wireframe logo.
- Sticker colours come from theme tokens, so Cubby recolours with the site theme the same way the CH logo does (Slate theme: teal and white faces).
- Eyes and mouth work together, as with TUFY's full-body mascot: eyes blink, squint, widen and sparkle; the mouth smiles, grins, gasps, pouts and bites its lip in focus. Small micro-expressions are the goal — a smirk at a lucky LL skip, a nervous gulp before a BLD attempt, a proud grin at a PB. Talking uses simple mouth flaps, not full lip sync.
- Motion is short and eased (150–400 ms for reactions), with a slow idle "breathing" loop. Nothing bounces forever.
- Speech appears in a glassy card beside Cubby, typed out quickly (about 30 ms per character, skippable on click), using the site's UI font, not a comic font.
- Two sizes: a 56 px docked avatar and a 120–160 px "stage" size for tours, greetings and blind-mode solving.

Future cosmetic idea: unlockable sticker skins (carbon fibre, stickerless, half-bright) and accessories earned through achievements — this links Cubby to the profile and achievements system.

## Core behaviours

Five behaviours make up v1. Each one is driven by the same character component and the same content files.

### 1. The dock
- Cubby sits in a fixed slot on every page, defined per page in a layout config (default: bottom-right; timer page: beside the settings icon so it never overlaps the time or scramble). On mobile Cubby is a floating icon that the user can tap to open it.
- Click opens a small menu: Tour this page, What's new, Tips, Mute Cubby. Later: Ask Cubby.
- Keyboard: ? opens the menu, Esc closes any tour or bubble. Shortcuts are ignored while the timer is running.
- A small dot on the avatar signals unseen content (a new feature tour, a weekly recap), never a red badge count.

### 2. Page tours
- Auto-start on the first visit to each page (tracked per page, not once per site), after a 1-second delay so the page settles first.
- Each step dims the page, cuts a rounded spotlight around the target element, and moves Cubby next to it with a speech card: title, one or two sentences, step dots, Back / Next / Skip tour.
- Interactive steps wait for the real action instead of a Next click: "Press space to start the timer", "Pick 3x3 from the puzzle menu", "Drag a layer on the virtual cube". This is what makes it feel like Brilliant, not a slideshow.
- Tours are versioned. When a page's tour gets new steps, returning users see a short What's new tour with only those steps, not the full tour again.
- A skipped or closed tour is remembered; Cubby offers it once more from the dock dot, then stays quiet.

### 3. Page greetings
- On page entry Cubby plays a short animation and shows a one-line bubble that fades after about 4 seconds: "Welcome to Learn. Want to start with PLL?" with one or two action chips.
- Lines are picked from a pool per page with conditions: first visit, returning after 7+ days, time of day, current streak, last thing done on that page.
- Frequency cap: at most one greeting per page per session, and none if the user opened that page in the last 10 minutes.

### 4. Reactions

Cubby reacts to app events with short animations and, rarely, a line:
- New PB single or average → celebration (layer spin + confetti in theme colours) and "New PB! 12.84 — that's 0.6 off your old one."
- DNF or +2 → a small wince, no line.
- Drill case marked mastered → thumbs up.
- 60+ minutes of continuous solving → one gentle "stretch your hands?" suggestion per day.
- Errors (failed save, offline) → a concerned look beside the toast, so errors feel less cold.

During a normal (non-blind) solve Cubby is hidden or frozen, so it never distracts. Reactions play only after the timer stops.

### 5. Blind-mode solving

When the timer is in BLD mode and running, Cubby moves to stage size in a corner and performs the solve:
- Memo phase — Cubby holds a tiny cube, eyes scanning, with letter-pair bubbles drifting by.
- Execution phase — a blindfold slides on and Cubby turns the cube in a steady loop. BLD mode is not built yet; it is planned with a memo split the user can turn on in preferences. With the split on, Cubby switches phase on that keypress; with it off, Cubby stays in execution after a short memo pose.
- Finish — blindfold off; success gets a celebration, DNF gets a shrug and "BLD is brutal. Next one."

A setting lets BLD solvers turn this off if it distracts them.

## Page-by-page script

Each page gets a tour of 5–8 steps, a greeting pool and one or two page-specific reactions. Steps marked (i) are interactive and wait for the real action. Exact steps get finalised against the built UI.

| Page | Tour steps | Greeting examples | Page reactions |
| --- | --- | --- | --- |
| Timer | Puzzle selector (i) · sessions: create, switch, rename · scramble bar and copy · start/stop with space (i) · penalties (+2, DNF) and delete · clear session · stats panel (Ao5, Ao12) · settings: inspection, font size, layout, background | "Ready for a session? Your Ao12 is 14.9 — let's beat it." / "Back after a week. Warm up with 5 solves?" | PB celebration · mis-stop flagged → explains how to mark it real · BLD solving animation |
| Drill Lab | What a case is · pick a set (PLL, OLL) · choose algorithm variants per case · start a drill and time a case (i) · the case table and sorting · mastery colours | "3 cases are your slowest. Drill them first?" | Case mastered → thumbs up · a variant beats your main alg → "Switch your main alg?" |
| Learn | Methods overview · categories (PLL, OLL, F2L) · an algorithm card: notation, animation, variants · "Add to drill" (i) · progress markers | "Welcome to Learn. Start with PLL? It gives the biggest jump for most cubers." | Finishing a category → celebration + "Drill it now?" |
| Playground | Rotate the view (i) · turn a layer (i) · notation input · scramble and reset · keyboard controls | "Try typing R U R' U' six times." | Solved state reached → small cheer |
| Stats | Session vs all-time · trend graph · averages and distribution · filters and export | "Your average dropped 1.2 s this month." | New milestone (sub-20, sub-15) → badge reveal |
| Profile | Public profile · PB showcase · achievements · edit and privacy | "Add your main cube so friends can see your setup." | Achievement unlocked → Cubby presents the badge |
| Social (friends, clubs, feed) | Follow someone · clubs · feed posts | "2 friends set PBs this week." | First follow → wave |
| Settings and themes | Themes · fonts · per-page backgrounds · Cubby's own settings | "Pick a theme — I'll change colour with it." | Theme change → Cubby re-stickers itself |

Compete and tournaments stay hidden until those pages ship; their tours get written then.

First-visit onboarding (a separate, site-level flow) reuses the same engine: Cubby asks 3–4 questions on the first ever visit — main event, current average, preferred method, inspection on or off — and applies timer font size, layout and inspection settings from the answers. This covers the first-time setup walkthrough already planned for CubeHub.

## More feature ideas

The strongest additions make Cubby useful during practice, not just during onboarding. Most can ship without AI by using simple rules over the user's own stats.

| Idea | What it does | Phase |
| --- | --- | --- |
| Inspection coach | During 15 s inspection Cubby raises a hand at 8 s and 12 s, mirroring WCA judge calls. Optional. | v1 |
| Empty states and 404 | Cubby fills every empty screen ("No solves yet — press space to start") and a scrambled, lost Cubby on the 404 page. | v1 |
| Cubby loader | Cubby turning its own layers replaces spinners on slow loads. | v1 |
| Easter eggs | Click Cubby five times and it scrambles and solves itself; a hidden sticker skin for finding it. | v1 |
| Rule-based insights | Simple rules on stats before any AI: "Ao12 under 20 but only 9 PLLs learned → learn full PLL", "your +2 rate is 8% → slow down the last move". | v1.5 |
| Weekly recap card | Every Monday Cubby presents a short report: solves, best Ao5, most improved drill case, consistency. | v1.5 |
| Goal roadmap | Pick a target (sub-30, sub-20, sub-15) and Cubby shows a checklist of skills for it, ticking items off from real data. | v1.5 |
| Daily plan and streaks | A small "today" card (e.g. 25 solves + 10 min drill). Streak shown on Cubby (sleepy when inactive) with no guilt messaging. | v1.5 |
| Warm-up routine | Cubby leads a 3-minute warm-up: finger-trick drill, 5 solves, one weak case. | v1.5 |
| Recognition quizzes | Brilliant-style quizzes in Learn: "Which PLL is this?" with Cubby reacting to right and wrong answers. | v1.5 |
| PB share card | One click makes an image of the PB with Cubby celebrating, sized for Instagram stories; free marketing for CubeHub. | v1.5 |
| Skins and accessories | Sticker skins and items unlocked by achievements; visible to friends on profiles. | v2 |
| Friends' Cubbies | In social and PvP rooms each player's Cubby shows their skin; in races Cubby counts down and referees. | v2 |
| Ask Cubby | Free-text questions answered by AI with the user's stats as context. | v3 |
| Solve review | Smart-cube solves analysed (cross moves, F2L pauses, recognition time) and explained by Cubby. | v4 |
| Cube advisor | In the shop, Cubby recommends cubes from budget and solve style. | v4 |

## Animation system

Cubby's animation is a state machine with Idle at the centre: the app sets a few named inputs, and the character file decides how to blend between poses. This is the same pattern Duolingo and Brilliant use with Rive.

Held states last as long as their input is on; one-shot reactions play once and fall back to Idle. The BLD sequence is the only multi-step path.

Inputs the app sends

| Input | Type | Set by |
| --- | --- | --- |
| mood | enum: idle, happy, concerned, sleepy | Content line or rule result |
| isTalking | boolean | Speech card open |
| pointAt | direction: left, right, up, down | Tour step position |
| isThinking | boolean | Loading or waiting for AI |
| wave, celebrate, wince, thumbsUp | trigger | App events (page entry, PB, DNF, mastery) |
| bldPhase | enum: off, memo, execute, finish | Timer in BLD mode |
| theme | colour tokens | Current site theme |

Tooling choice
- v1: SVG + Framer Motion, with a small typed state machine (a reducer or XState). Built in-house: there is no budget to hire an animator yet. It themes easily with CSS variables and covers eyes, mouth, blinks, layer turns and simple poses.
- Plug-in renderer. Pages and the Director never talk to the SVG code directly. They call a small CubbyRenderer interface: setInput(name, value), fire(trigger) and onEvent(cb). v1 ships an SvgCubbyRenderer; later a RiveCubbyRenderer wraps a .riv file with the same input names. Swapping is one config line, and the two can run side by side behind a flag for testing.
- Later: Rive, once there is budget for an animator. Rive gives smoother rigged motion and runs one file on web and mobile, as Brilliant does with Koji. Keep the input names above identical so swapping the renderer does not touch app code.
- Avoid Lottie for the character: it plays fixed timelines, so blending between states driven by live inputs gets awkward. It is fine for one-off effects like confetti.

## Technical architecture

One CompanionProvider mounted in the root layout owns everything; pages only add data-tour attributes and a content file. New line sources (rules, AI, solve review) plug into the Director later without touching the UI.

The Director is the single gatekeeper: it receives candidate lines from content files and events, checks the quiet rules and the user's settings, and sends at most one thing to the screen at a time.

Content model — one file per page, checked into the repo so copy changes are a normal PR:

```json
{
  "page": "timer",
  "tourVersion": 3,
  "tour": [
    {
      "id": "puzzle",
      "target": "puzzle-select",
      "title": "Pick your puzzle",
      "body": "Switch between 3x3, 2x2, OH and more. Try picking one.",
      "mood": "happy",
      "waitFor": "puzzle:changed",
      "since": 1
    }
  ],
  "greetings": [
    { "when": "firstVisit", "line": "Welcome to the timer! Want a quick tour?" },
    { "when": "daysAway>=7", "line": "Back after a week. Warm up with 5 solves?" }
  ],
  "reactions": {
    "pb": ["New PB! {time} — {delta} off your old one."]
  }
}
```

since records the tour version in which a step was added, which is how What's new tours pick only new steps. target matches a data-tour="puzzle-select" attribute on the element.

Build notes
- Events go through a tiny typed event bus (companion.emit('pb', { time, delta })), so the timer code never imports companion UI.
- The overlay renders in a portal, recomputes the spotlight on resize and scroll, and skips a step if its target is missing (for example, a feature hidden on mobile).
- Tour progress is saved as { page: lastSeenVersion }: in localStorage for guests, merged into the user record on sign-up.
- Cubby's code and art load lazily after the page is interactive, so the timer's first paint is never slower.

## Later: AI companion and smart-cube feedback

The rule for every later phase: numbers are computed by code, the AI only phrases and prioritises them. That keeps advice accurate and token costs low.

### v3 — AI coach
- A nightly or on-demand job builds a compact cuber profile per user: recent averages and trend, consistency, penalty rate, slowest drill cases, learned algorithm sets, goal. Target: under about 400 tokens.
- The companion asks the model for a reply in a fixed JSON shape: { mood, line, actions[] }. mood picks the animation; actions become buttons ("Drill these 3 cases", "Open PLL").
- Use cases: timer page summary ("How am I doing lately?"), what to focus on next, explaining a stat, free-text questions about technique.
- Cost controls: cache the daily summary, cap free users at a few questions a day, larger limits for premium. Never send raw solve lists.
- Tone stays Cubby's: short, honest, coach-like, and it asks a question back when the user is stuck rather than dumping an essay (TUFY's Socratic idea).

### v4 — Smart-cube solve review
- A Bluetooth cube streams timestamped moves during the solve.
- A separate analysis step (an existing reconstruction tool or our own) splits the solve into phases: cross, each F2L pair, OLL, PLL, and records move counts, pauses and recognition time.
- Cubby turns that into two or three findings, for example: "Cross took 11 moves, your average is 8", "1.6 s pause before the third pair — lookahead", "You used the long alg for this OLL; try the 9-move one".
- Findings link back to the Drill Lab and Learn pages, so feedback always ends in a practice action.
- Leaderboards can trust smart-cube solves, as already decided, and Cubby can flag suspicious solves for review.

The companion component does not change between v1 and v4: only the source of its lines changes from content files to rules to the AI service.

## Anti-annoyance rules, settings and accessibility

A companion that interrupts a speedcuber mid-session gets muted forever, so restraint is a feature. Clippy is the cautionary tale.

Hard rules
- Never animate, speak or show a bubble while the timer is running or during inspection (except the opt-in inspection coach and BLD animation).
- At most one unprompted bubble per page per session; greetings auto-dismiss in about 4 seconds.
- Never cover the timer, scramble, or any focused input. Tours pause if the user starts typing elsewhere.
- No guilt, no fake urgency, no streak shaming.
- Every tour is skippable at every step, and "Skip" is never smaller than "Next".

Settings (in a Cubby section of Settings and in the dock menu)

| Setting | Options | Default |
| --- | --- | --- |
| Companion | On / Quiet (tours and reactions only on request) / Off | On |
| Companion name | Any name the player types (with a reset to default) | Cubby |
| Auto tours on first visit | On / Off | On |
| Reactions | All / PBs only / Off | All |
| Inspection coach | On / Off | Off |
| BLD solving animation | On / Off | On |
| Motion | Full / Reduced | Follows the system setting |
| Reset tours | Button | — |

Accessibility
- Respect prefers-reduced-motion: reactions become a static pose change, confetti is dropped.
- Speech cards are real DOM text with aria-live="polite", so screen readers announce them; the animation itself is aria-hidden.
- Tours are fully keyboard-driven (arrows, Enter, Esc) with visible focus on the spotlighted element.
- Text in speech cards meets WCAG AA contrast in every theme; this is checked as part of each new theme.

## Roadmap, metrics and open questions

Ship v1 (scripted Cubby on the Timer, Learn, Drill Lab and Playground pages) with the January beta; everything after it is earned by v1's numbers.

Only v1 is tied to a date; later phases move when their gate is met, not on a calendar.

Success metrics (initial targets, to revisit after the beta)

| Metric | Why it matters | Initial target |
| --- | --- | --- |
| Tour completion rate per page | Tours that are too long or boring show up here first | 60%+ |
| Drop-off by tour step | Finds the one step that loses people | No step loses more than 15% |
| Feature discovery in week 1 | Share of new users who create a second session, change a setting, or start a drill | Up versus pre-Cubby baseline |
| Companion mute rate | The annoyance alarm | Under 10% |
| Day-7 return rate of new users | Whether the warmer feel actually keeps people | Up versus pre-Cubby baseline |
| PB share cards created | Organic reach | Tracked from v1.5 |

The baselines need basic event tracking on the current site before Cubby launches, otherwise there is nothing to compare against.

Open questions
- Final name: Cubby (decided; players can rename it in Settings)
- Animation: built in-house with SVG + Framer Motion for v1, behind the plug-in renderer interface so a Rive file can replace it later.
- BLD mode: not built yet; planned with a memo split the user turns on in preferences. Cubby switches from memo to execution on that split.
- Mobile: Cubby becomes a floating icon.
- Tour progress for guests: localStorage only, then merged into the account on sign-up
- AI phase pricing: deferred to a later version; not needed for v1.
- Beta tours: Timer, Learn, Drill Lab and Playground.

## Sources
- Brilliant builds its math and coding tutor Koji with Rive — Rive blog
- Duolingo: world character visemes — Duolingo blog
- Explore ZENKAI: takeUforward's latest rollout — takeUforward
- TUF+ pricing — takeUforward
- Striver on TUFY usage and costs — X
- Tufnut, a Socratic tutor inspired by TUFY — GitHub
