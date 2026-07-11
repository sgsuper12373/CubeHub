# CubeHub

All-in-one speedcubing platform for the Indian cubing community — timer & stats, tutorials, ranked real-time matches, and cube buying guidance.

## Stack

- [Next.js](https://nextjs.org) (App Router) + React
- [Supabase](https://supabase.com) (Postgres, Auth, Realtime, Storage)
- Tailwind CSS + [shadcn/ui](https://ui.shadcn.com)

## Getting started

1. Copy `.env.local` and fill in your Supabase project's URL and anon key (Project Settings → API).
2. Install dependencies: `npm install`
3. Run the dev server: `npm run dev`
4. Open [http://localhost:3000](http://localhost:3000).

Database schema lives in `../project_plan/schema.sql`; the project brief is in `../project_plan/cubehub-agent-brief.md`.
