-- Aggregate counts for the landing page's RealStats slot
-- (src/components/marketing/real-stats.tsx).
--
-- Applied to the live project 2026-11-25 (supabase db push); its test passed there.
--
-- `solves` and `drill_state` are owner-only under RLS, so a total needs a
-- security-definer function. This one returns three numbers and nothing
-- else: no ids, no times, no per-user rows.
--
-- - solves:        solves not in Recently deleted
-- - cubers:        profiles (every account)
-- - cases_drilled: (cuber, algorithm) pairs with at least one drill rep
--
-- The landing page calls it at most once an hour (its revalidate), so plain
-- counts are fine; no counter table is needed at today's sizes.

create or replace function public.public_stats()
returns table (solves bigint, cubers bigint, cases_drilled bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select count(*) from public.solves s where s.deleted_at is null),
    (select count(*) from public.profiles),
    (select count(*) from public.drill_state d where d.attempt_count > 0);
$$;

revoke all on function public.public_stats() from public;
grant execute on function public.public_stats() to anon, authenticated;

comment on function public.public_stats() is
  'Landing page totals (solves, cubers, cases drilled). Aggregates only; security definer because solves and drill_state are owner-only.';
