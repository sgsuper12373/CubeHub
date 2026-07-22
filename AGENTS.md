<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

# CubeHub — AI Agent Brief

## What is CubeHub?

CubeHub is a speedcubing platform being built for the Indian cubing community, with plans to expand globally. The goal is to be a single destination that replaces the need to use multiple scattered websites for timers, tutorials, cube buying, and competition.

The platform is India-first — this means INR pricing, Indian seller integrations, regional leaderboards, and content that feels native to the Indian cubing community rather than a localised version of a Western product.

---

## What the platform does

CubeHub has five core sections:

**Timer & Stats** — A solve timer with session management, personal bests, and stats graphs. This is the most-used feature and the heart of the platform. It should be fast, accurate, and work before anything else on the page.

**Tutorials (Learn tab)** — Step-by-step guides for solving cubes, with 3D cube visualisation per algorithm case and multiple algorithms per case. Covers beginner through advanced methods. Starts with 3x3 and 2x2, designed to support more puzzles later.

**Competitive tab** — Players race each other in real time on the same scramble, with an ELO-based skill ranking system. Also includes bot opponents at varying skill levels so users can practice without needing another person online — similar to how chess.com implements bots.

**Buy Cubes tab** — Cube recommendations based on the user's skill level, stats from the platform, and their budget. India-focused, with affiliate integrations with Indian cube retailers. AI-assisted recommendations are a future goal.

**User Profiles** — Public profile pages showing solve stats, graphs, achievements, and competitive rank. An achievement/badge system encourages engagement.

---

## Who is the user?

The primary users are Indian cubers at all levels — from someone learning their first solve, to intermediate cubers working on CFOP and OLL/PLL algorithms, to competitive speedcubers who want ranked matches and detailed stats. Secondary users are people looking to buy a cube and wanting an unbiased recommendation.

---

## Design philosophy

- Clean, modern, fast. Dark mode first.
- The timer must be usable within seconds of landing on the page — zero friction.
- Mobile-friendly throughout, since many cubers practice with a phone on the desk.
- Everything in one place — the value is consolidation and quality, not novelty.

---

## How it is being built

The platform is a web application with a React-based frontend, a PostgreSQL database, and a backend that handles auth, real-time features, and API logic. The tech stack may evolve — ask the founder for the current choices if implementation details matter for a task.

The build is phased: foundation and auth first, then the timer, then tutorials, then the shop, then the competitive system. The competitive tab comes last because it needs an existing user base to be useful.

The project is being built by a small team (currently solo), so solutions should be maintainable and avoid unnecessary complexity.

---

## Your job as an AI assistant

Help the founder build CubeHub by writing code, designing systems, reviewing decisions, and solving problems as they come up. When a task is given, work within the current phase and the current tech stack. If something seems like it conflicts with the project's direction, flag it clearly and suggest an alternative.

Ask about current implementation details when they matter. Do not assume the stack, schema, or feature scope from this document alone — those evolve. This brief tells you the goal and the spirit of the project. The founder will give you the specifics for each task.



<!-- END:nextjs-agent-rules -->
