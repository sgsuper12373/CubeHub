# Stats page v2: plan

Written 2026-10-19 from a review of `/stats`. Five steps, one commit each, in order of value for
effort. Tick them off here as they ship; details of what was built go in `implementationlog.md`.

## Decisions (founder, 2026-10-19)

- **"Now" strip averages are rolling across sessions**: current Ao12 is the last 12 counted
  solves of the event, whatever session they're in. It answers "what's my level now". PBs stay
  per session (database rule, unchanged).
- **The sub-X goal is stored on the device** (localStorage, per event), defaulting to the next
  barrier below the current Ao12. No migration; syncing it is a later option.
- **All five steps**, in order.
- **Comparing two sessions** starts as side-by-side numbers. Overlaid trend lines come later.

## Where it starts

- Charts (`src/components/stats/chart/`: trend, histogram, heatmap) are hand-built SVG, no chart
  library.
- `stats-screen.tsx` loads up to 5,000 slim solve metrics (no scramble or notes) and filters
  out excluded solves before any chart sees them.
- Trimmed-average maths and copy-average text exist already (`lib/timer/stats.ts`,
  `lib/timer/share-text.ts`).

## Steps

### 1. Structure and polish (done 2026-10-19)
- [x] One onboarding panel for an empty event ("Time 5 solves to unlock your stats", links to
      the timer and csTimer import) instead of a "need more solves" message per card.
- [x] Import/export moves to a "⋯" menu next to the title.
- [x] Sticky filter row; a "This session" range (the timer's active session).
- [x] Event pills with a solve count each (from `v_user_puzzle_summary`; local storage counts
      for guests) and a small puzzle glyph, instead of the native dropdown.

### 2. "Now" strip and interactive PB tiles (done 2026-10-19)
- [x] A row above the PBs: current Ao5, Ao12, Ao100 (rolling, across sessions), each with the
      change against 30 days ago; solves and time spent solving in the range. PBs move second.
- [x] PB tiles open the solves behind them: times with trimmed ones in brackets, scrambles,
      date, **Copy**. Needs a repo read of full solves by id.
- [x] "Next solve needs" per tile, as csTimer: a time, **N/A** (no time can), or **∞** (any
      non-DNF time will). Averages are per session, so against the latest session. Pure
      function with unit tests.

### 3. Trend chart (done 2026-10-19)
- [x] Clicking a point opens the solve detail (penalties, notes, Counts for records); the page
      refetches after a change. Makes the mis-stop flow reachable from Stats.
- [x] Stars on PBs; flagged mis-stops as hollow points (the chart gets excluded solves too).
- [x] "By solve / by date" x-axis toggle.
- [x] Drag to zoom on a range, with a reset.

### 4. Sessions table
- [ ] Replaces the session dropdown: sortable rows with name, date, solves, mean, best, best
      Ao5, best Ao12. Click a row to filter the page; tick two to compare side by side.
- Built from the loaded solves (up to 5,000); very old sessions would need their own query.

### 5. Sub-X and the smaller cards
- [ ] Sub-X goal line on the trend chart and histogram; a card with the sub-X rate over time
      ("62% of solves sub-25 this month, up from 41%").
- [ ] Histogram: mean, median and PB markers; "faster than X% of your solves" on hover.
- [ ] Consistency: keep the band label, add a small σ trend, formula in a tooltip.
- [ ] Heatmap: current streak, longest streak, solves this week (computed client-side, so
      guests get it); "your fastest Ao12s are between 9 and 11 pm".
