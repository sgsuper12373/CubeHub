-- The daily scramble (docs/home-plan.md → card 2): one 3x3 scramble a day,
-- the same for everyone, one attempt each, a leaderboard.
--
-- NOT APPLIED. Written on 2026-11-25 as a file only. To go live:
--   1. supabase db push
--   2. supabase db query --linked -f supabase/tests/daily_scramble_test.sql   (every row PASS; rolls back)
--   3. load the scrambles: supabase db query --linked -f supabase/DataSeeds/20261125000000_daily_scrambles.sql
--      (60 days; `node scripts/generate-daily-scrambles.mjs` writes the next batch)
-- Until then the Home card renders nothing and /timer?daily=… says the daily
-- isn't available.
--
-- Days are IST dates (Asia/Kolkata): a new scramble at midnight IST.
-- Scrambles are pre-generated (random-state, cubing.js, the timer's own
-- scrambler) rather than made on the first request: cubing.js runs in the
-- browser here, and a server-side copy would be a second bundling path.

create or replace function public.ist_today()
returns date
language sql
stable
set search_path = ''
as $$
  select (now() at time zone 'Asia/Kolkata')::date;
$$;

create table if not exists public.daily_scrambles (
  day        date primary key,
  puzzle     public.puzzle_type not null default '333',
  scramble   text not null check (char_length(scramble) between 1 and 500),
  created_at timestamptz not null default now()
);

create table if not exists public.daily_results (
  day          date not null references public.daily_scrambles(day) on delete cascade,
  user_id      uuid not null references public.profiles(id) on delete cascade,
  -- Raw time; null for a DNF.
  time_ms      integer check (time_ms is null or time_ms > 0),
  penalty      text not null default 'none' check (penalty in ('none', 'plus2', 'dnf')),
  -- What the leaderboard ranks: the time with +2 applied, null for a DNF.
  effective_ms integer generated always as (
    case penalty when 'none' then time_ms when 'plus2' then time_ms + 2000 end
  ) stored,
  created_at   timestamptz not null default now(),
  primary key (day, user_id),
  constraint daily_results_dnf_has_no_time check ((penalty = 'dnf') = (time_ms is null))
);

create index if not exists daily_results_rank
  on public.daily_results (day, effective_ms, created_at)
  where effective_ms is not null;
create index if not exists daily_results_user on public.daily_results (user_id);

alter table public.daily_scrambles enable row level security;
alter table public.daily_results enable row level security;

-- Anyone can read both: the scramble, and the day's results for the board.
drop policy if exists daily_scrambles_read on public.daily_scrambles;
create policy daily_scrambles_read on public.daily_scrambles for select using (true);
drop policy if exists daily_results_read on public.daily_results;
create policy daily_results_read on public.daily_results for select using (true);

-- No insert, update or delete from clients: results go in through
-- submit_daily_result() only, once per cuber per day (the primary key).
revoke insert, update, delete on public.daily_scrambles from anon, authenticated;
revoke insert, update, delete on public.daily_results from anon, authenticated;
grant select on public.daily_scrambles, public.daily_results to anon, authenticated;

-- Posts the signed-in cuber's attempt. Returns true when it was recorded,
-- false when they already had a result that day (the first one stands).
-- Today's or yesterday's daily only, so an attempt finished just before
-- midnight IST can still post. A time under the mis-stop floor
-- (misstop_limit_ms, 2.00 s for 3x3) or over an hour is refused.
create or replace function public.submit_daily_result(p_day date, p_time_ms integer, p_penalty text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user   uuid := (select auth.uid());
  v_puzzle public.puzzle_type;
  v_rows   integer;
begin
  if v_user is null then
    raise exception 'sign in to post a daily result' using errcode = '42501';
  end if;
  if p_day is null or p_day > public.ist_today() or p_day < public.ist_today() - 1 then
    raise exception 'that daily is closed' using errcode = '22023';
  end if;
  select puzzle into v_puzzle from public.daily_scrambles where day = p_day;
  if not found then
    raise exception 'no daily scramble that day' using errcode = '22023';
  end if;
  if p_penalty is null or p_penalty not in ('none', 'plus2', 'dnf') then
    raise exception 'bad penalty' using errcode = '22023';
  end if;
  if p_penalty <> 'dnf' and (
       p_time_ms is null
       or p_time_ms < public.misstop_limit_ms(v_puzzle)
       or p_time_ms > 3600000) then
    raise exception 'implausible time' using errcode = '22023';
  end if;

  insert into public.daily_results (day, user_id, time_ms, penalty)
  values (p_day, v_user, case when p_penalty = 'dnf' then null else p_time_ms end, p_penalty)
  on conflict (day, user_id) do nothing;
  get diagnostics v_rows = row_count;
  return v_rows = 1;
end;
$$;

revoke all on function public.submit_daily_result(date, integer, text) from public, anon;
grant execute on function public.submit_daily_result(date, integer, text) to authenticated;
grant execute on function public.ist_today() to anon, authenticated;

comment on table public.daily_scrambles is 'One scramble per IST day (docs/home-plan.md card 2). Loaded from supabase/DataSeeds.';
comment on table public.daily_results is 'One attempt per cuber per daily. Insert only through submit_daily_result().';
