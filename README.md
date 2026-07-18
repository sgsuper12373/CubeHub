# CubeHub

All-in-one speedcubing platform for the Indian cubing community — timer & stats, tutorials, ranked real-time matches, and cube buying guidance.

## Stack

- [Next.js](https://nextjs.org) 16 (App Router) + React 19
- [Supabase](https://supabase.com) (Postgres, Auth, Realtime, Storage)
- Tailwind CSS v4 + [shadcn/ui](https://ui.shadcn.com) `base-nova` on [Base UI](https://base-ui.com)

## Getting started

1. `cp .env.example .env.local` and fill in your Supabase project's URL and anon key (Project Settings → API).
2. Install dependencies: `npm install`
3. Run the dev server: `npm run dev`
4. Open [http://localhost:3000](http://localhost:3000).

## Documentation

| | |
|---|---|
| [`docs/architecture.md`](docs/architecture.md) | Routes, auth flow, conventions, Next 16 gotchas — **start here** |
| [`docs/access-control.md`](docs/access-control.md) | Who can read what. Read before adding gated or paid content |
| [`docs/database.md`](docs/database.md) | Schema reference and known gaps |
| [`docs/roadmap.md`](docs/roadmap.md) | What's built, what's next |
| [`docs/decisions.md`](docs/decisions.md) | Choices already made, and why |

Note `AGENTS.md`: this is Next.js 16, which has breaking changes against most training data and documentation online. Check `node_modules/next/dist/docs/` before writing Next code.
