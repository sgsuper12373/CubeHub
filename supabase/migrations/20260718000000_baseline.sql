-- Baseline schema for CubeHub, generated 2026-07-18 by introspecting the live
-- Supabase project (public schema only; auth/storage/realtime system schemas
-- are managed by Supabase and excluded).
--
-- The live database already matches this state — do NOT apply it there. It
-- exists so a fresh environment can be stood up and so future migrations have
-- a tracked starting point. The live project has no migration history recorded;
-- if linking it with the Supabase CLI, first run:
--   supabase migration repair --status applied 20260718000000

create extension if not exists pg_trgm with schema extensions;

-- ============================================================== enum types ==

create type public.puzzle_type as enum
  ('333','222','444','555','666','777','mega','pyra','sq1','clock','skewb',
   '333bf','333oh','444bf','555bf','333mbf');
create type public.penalty_type as enum ('none','plus2','dnf');
create type public.scramble_type as enum ('random_state','random_moves','custom','imported');
create type public.inspection_type as enum ('none','wca_15s','custom');
create type public.difficulty_level as enum ('beginner','intermediate','advanced','expert');
create type public.match_format as enum ('bo1','bo3','bo5');
create type public.match_outcome as enum ('win','loss','draw','abandoned');
create type public.match_status as enum ('pending','in_progress','completed','cancelled');
create type public.club_role as enum ('member','moderator','admin','owner');
create type public.notification_type as enum
  ('match_invite','match_result','club_invite','club_request',
   'achievement_unlocked','pb_broken','follow','system');
create type public.sub_status as enum ('active','trialing','past_due','canceled','expired');

-- ================================================================ identity ==

create table public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  username      text not null check (char_length(username) >= 3 and char_length(username) <= 24
                                     and username ~ '^[A-Za-z0-9_]+$'),
  display_name  text check (display_name is null or char_length(display_name) <= 60),
  avatar_url    text,
  bio           text check (bio is null or char_length(bio) <= 500),
  country       text default 'IN' check (char_length(country) = 2),
  wca_id        text unique,
  is_verified   boolean not null default false,
  premium_until timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create unique index uq_profiles_username_lower on public.profiles (lower(username));
create index idx_profiles_country on public.profiles (country);
create index idx_profiles_wca_id on public.profiles (wca_id) where wca_id is not null;

create table public.user_settings (
  user_id                 uuid primary key references public.profiles(id) on delete cascade,
  default_puzzle          public.puzzle_type not null default '333',
  inspection_type         public.inspection_type not null default 'wca_15s',
  custom_inspection_secs  integer not null default 15
                          check (custom_inspection_secs >= 1 and custom_inspection_secs <= 60),
  hide_time_while_solving boolean not null default false,
  timer_trigger           text not null default 'spacebar'
                          check (timer_trigger in ('spacebar','stackmat','touch')),
  theme                   text not null default 'dark',
  language                text not null default 'en',
  show_scramble_preview   boolean not null default true,
  notify_match_invites    boolean not null default true,
  notify_achievements     boolean not null default true,
  notify_pb               boolean not null default true,
  updated_at              timestamptz not null default now()
);

create table public.subscriptions (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references public.profiles(id) on delete cascade,
  provider             text not null,
  provider_sub_id      text,
  status               public.sub_status not null default 'active',
  current_period_end   timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index idx_subscriptions_user on public.subscriptions (user_id);

create table public.user_follows (
  follower_id  uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);
create index idx_follows_following on public.user_follows (following_id);

create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  type       public.notification_type not null,
  title      text not null,
  body       text,
  data       jsonb not null default '{}'::jsonb,
  is_read    boolean not null default false,
  created_at timestamptz not null default now()
);
create index idx_notif_user_created on public.notifications (user_id, created_at desc);
create index idx_notif_user_unread on public.notifications (user_id) where is_read = false;

-- =================================================================== timer ==

create table public.sessions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  puzzle_type public.puzzle_type not null default '333',
  name        text not null default 'Session' check (char_length(name) <= 60),
  is_active   boolean not null default false,
  order_index integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (id, user_id)
);
create index idx_sessions_user_puzzle on public.sessions (user_id, puzzle_type);
create unique index uq_one_active_session on public.sessions (user_id, puzzle_type) where is_active;

create table public.solves (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.profiles(id) on delete cascade,
  session_id        uuid not null,
  puzzle_type       public.puzzle_type not null default '333',
  time_ms           integer not null check (time_ms > 0),
  penalty           public.penalty_type not null default 'none',
  effective_time_ms integer generated always as (
    case penalty
      when 'dnf'   then null::integer
      when 'plus2' then time_ms + 2000
      else time_ms
    end
  ) stored,
  scramble          text not null,
  scramble_type     public.scramble_type not null default 'random_state',
  notes             text check (notes is null or char_length(notes) <= 1000),
  source            text not null default 'web'
                    check (source in ('web','mobile','import','stackmat')),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint solves_session_id_user_id_fkey
    foreign key (session_id, user_id) references public.sessions (id, user_id) on delete cascade
);
create index idx_solves_user_created on public.solves (user_id, created_at desc);
create index idx_solves_user_puzzle on public.solves (user_id, puzzle_type, created_at desc);
create index idx_solves_session_created on public.solves (session_id, created_at desc);
create index idx_solves_leaderboard on public.solves (puzzle_type, effective_time_ms)
  where penalty <> 'dnf';

create table public.personal_bests (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  puzzle_type public.puzzle_type not null default '333',
  category    text not null check (category in ('single','ao5','ao12','ao50','ao100','mean3')),
  time_ms     integer not null check (time_ms > 0),
  solve_id    uuid references public.solves(id) on delete set null,
  achieved_at timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, puzzle_type, category)
);
create index idx_pbs_user_puzzle on public.personal_bests (user_id, puzzle_type);
create index idx_pbs_leaderboard on public.personal_bests (puzzle_type, category, time_ms);

-- =================================================================== learn ==

create table public.algorithm_cases (
  id            uuid primary key default gen_random_uuid(),
  puzzle_type   public.puzzle_type not null default '333',
  subset        text not null,
  case_number   integer,
  name          text,
  description   text,
  cube_state    text not null,
  thumbnail_url text,
  created_at    timestamptz not null default now(),
  unique (puzzle_type, subset, case_number)
);
create index idx_alg_cases_subset on public.algorithm_cases (puzzle_type, subset);

create table public.algorithms (
  id           uuid primary key default gen_random_uuid(),
  case_id      uuid not null references public.algorithm_cases(id) on delete cascade,
  moves        text not null,
  move_count   integer generated always as (
    case
      when btrim(moves) = '' then 0
      else cardinality(regexp_split_to_array(btrim(moves), '\s+'))
    end
  ) stored,
  label        text,
  is_main      boolean not null default false,
  submitted_by uuid references public.profiles(id) on delete set null,
  is_approved  boolean not null default false,
  upvotes      integer not null default 0,
  created_at   timestamptz not null default now()
);
create index idx_algorithms_case on public.algorithms (case_id);
create unique index uq_one_main_alg_per_case on public.algorithms (case_id) where is_main;
create index idx_algorithms_search on public.algorithms using gin (moves extensions.gin_trgm_ops);

create table public.user_algorithm_bookmarks (
  user_id      uuid not null references public.profiles(id) on delete cascade,
  algorithm_id uuid not null references public.algorithms(id) on delete cascade,
  learned      boolean not null default false,
  created_at   timestamptz not null default now(),
  primary key (user_id, algorithm_id)
);

create table public.tutorial_series (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,
  title         text not null,
  description   text,
  puzzle_type   public.puzzle_type not null default '333',
  difficulty    public.difficulty_level not null default 'beginner',
  thumbnail_url text,
  order_index   integer not null default 0,
  is_published  boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index idx_tut_series_slug on public.tutorial_series (slug);

create table public.tutorial_steps (
  id           uuid primary key default gen_random_uuid(),
  series_id    uuid not null references public.tutorial_series(id) on delete cascade,
  title        text not null,
  content_md   text,
  order_index  integer not null default 0,
  cube_state   text,
  is_published boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (series_id, order_index)
);
create index idx_tut_steps_series on public.tutorial_steps (series_id, order_index);

create table public.user_tutorial_progress (
  user_id      uuid not null references public.profiles(id) on delete cascade,
  step_id      uuid not null references public.tutorial_steps(id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (user_id, step_id)
);
create index idx_tut_progress_user on public.user_tutorial_progress (user_id);

-- ================================================================= compete ==

create table public.matches (
  id                 uuid primary key default gen_random_uuid(),
  puzzle_type        public.puzzle_type not null default '333',
  format             public.match_format not null default 'bo3',
  status             public.match_status not null default 'pending',
  player1_id         uuid not null references public.profiles(id) on delete cascade,
  player2_id         uuid references public.profiles(id) on delete set null,
  is_vs_bot          boolean not null default false,
  bot_difficulty     text check (bot_difficulty in ('easy','medium','hard','expert')),
  player1_elo_before integer,
  player2_elo_before integer,
  player1_elo_after  integer,
  player2_elo_after  integer,
  winner_id          uuid references public.profiles(id) on delete set null,
  player1_score      integer not null default 0,
  player2_score      integer not null default 0,
  started_at         timestamptz,
  completed_at       timestamptz,
  created_at         timestamptz not null default now(),
  check (player2_id is not null or is_vs_bot)
);
create index idx_matches_p1 on public.matches (player1_id);
create index idx_matches_p2 on public.matches (player2_id);
create index idx_matches_open on public.matches (status)
  where status in ('pending','in_progress');

create table public.match_games (
  id               uuid primary key default gen_random_uuid(),
  match_id         uuid not null references public.matches(id) on delete cascade,
  game_number      integer not null,
  scramble         text not null,
  player1_solve_id uuid references public.solves(id) on delete set null,
  player2_solve_id uuid references public.solves(id) on delete set null,
  player1_time_ms  integer,
  player2_time_ms  integer,
  player1_penalty  public.penalty_type not null default 'none',
  player2_penalty  public.penalty_type not null default 'none',
  winner_id        uuid references public.profiles(id) on delete set null,
  created_at       timestamptz not null default now(),
  unique (match_id, game_number)
);

create table public.elo_ratings (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  puzzle_type     public.puzzle_type not null default '333',
  rating          integer not null default 1000,
  peak_rating     integer not null default 1000,
  total_matches   integer not null default 0,
  wins            integer not null default 0,
  losses          integer not null default 0,
  draws           integer not null default 0,
  win_streak      integer not null default 0,
  best_win_streak integer not null default 0,
  updated_at      timestamptz not null default now(),
  unique (user_id, puzzle_type)
);
create index idx_elo_leaderboard on public.elo_ratings (puzzle_type, rating desc);

create table public.elo_history (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  puzzle_type   public.puzzle_type not null default '333',
  match_id      uuid references public.matches(id) on delete set null,
  rating_before integer not null,
  rating_after  integer not null,
  delta         integer generated always as (rating_after - rating_before) stored,
  outcome       public.match_outcome not null,
  recorded_at   timestamptz not null default now()
);
create index idx_elo_history_user on public.elo_history (user_id, recorded_at desc);

-- ================================================================== social ==

create table public.clubs (
  id           uuid primary key default gen_random_uuid(),
  name         text not null unique,
  slug         text not null unique check (slug ~ '^[a-z0-9-]+$'),
  description  text,
  avatar_url   text,
  banner_url   text,
  country      text default 'IN' check (char_length(country) = 2),
  is_public    boolean not null default true,
  member_count integer not null default 0,
  created_by   uuid not null references public.profiles(id) on delete restrict,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index idx_clubs_country on public.clubs (country);

create table public.club_members (
  club_id   uuid not null references public.clubs(id) on delete cascade,
  user_id   uuid not null references public.profiles(id) on delete cascade,
  role      public.club_role not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (club_id, user_id)
);
create index idx_club_members_user on public.club_members (user_id);

create table public.club_join_requests (
  id          uuid primary key default gen_random_uuid(),
  club_id     uuid not null references public.clubs(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  message     text,
  status      text not null default 'pending'
              check (status in ('pending','approved','rejected')),
  reviewed_by uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  reviewed_at timestamptz,
  unique (club_id, user_id)
);

-- ======================================================== commerce & meta ==

create table public.products (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  brand         text,
  puzzle_type   public.puzzle_type,
  affiliate_url text,
  image_url     text,
  price_inr     numeric check (price_inr is null or price_inr >= 0),
  is_active     boolean not null default false,
  created_at    timestamptz not null default now()
);

create table public.achievements (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique,
  title           text not null,
  description     text not null,
  icon_url        text,
  category        text not null check (category in ('timer','competitive','social','tutorial')),
  condition_type  text not null,
  condition_value jsonb not null default '{}'::jsonb,
  is_hidden       boolean not null default false,
  created_at      timestamptz not null default now()
);

create table public.user_achievements (
  user_id        uuid not null references public.profiles(id) on delete cascade,
  achievement_id uuid not null references public.achievements(id) on delete cascade,
  unlocked_at    timestamptz not null default now(),
  primary key (user_id, achievement_id)
);
create index idx_user_achievements_user on public.user_achievements (user_id);

-- =================================================================== views ==

create view public.v_session_solves with (security_invoker = on) as
select id,
       user_id,
       session_id,
       puzzle_type,
       time_ms,
       penalty,
       effective_time_ms,
       scramble,
       scramble_type,
       notes,
       source,
       created_at,
       updated_at,
       row_number() over (partition by session_id order by created_at) as solve_no,
       round(avg(effective_time_ms) over (partition by session_id order by created_at
             rows between 4 preceding and current row))::integer as rolling_mean5_ms
from public.solves;

create view public.v_user_puzzle_summary with (security_invoker = on) as
select user_id,
       puzzle_type,
       count(*) as total_solves,
       count(*) filter (where penalty = 'dnf') as dnf_count,
       min(effective_time_ms) as best_single_ms,
       round(avg(effective_time_ms))::integer as mean_ms,
       max(created_at) as last_solved_at
from public.solves
group by user_id, puzzle_type;

-- ================================================== functions and triggers ==

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
begin
  insert into public.profiles (id, username, display_name, avatar_url)
  values (
    new.id,
    'user_' || left(replace(new.id::text, '-', ''), 12),
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(coalesce(new.email, ''), '@', 1)
    ),
    new.raw_user_meta_data->>'avatar_url'
  );
  insert into public.user_settings (user_id) values (new.id);
  return new;
end;
$$;

create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.maintain_single_pb()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
begin
  if new.penalty = 'dnf' or new.effective_time_ms is null then
    return new;
  end if;

  insert into public.personal_bests (user_id, puzzle_type, category, time_ms, solve_id, achieved_at)
  values (new.user_id, new.puzzle_type, 'single', new.effective_time_ms, new.id, now())
  on conflict (user_id, puzzle_type, category) do update
    set time_ms     = excluded.time_ms,
        solve_id    = excluded.solve_id,
        achieved_at = excluded.achieved_at,
        updated_at  = now()
    where excluded.time_ms < public.personal_bests.time_ms;

  return new;
end;
$$;

create trigger trg_solves_single_pb
  after insert on public.solves
  for each row execute function public.maintain_single_pb();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path to ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_profiles_updated       before update on public.profiles        for each row execute function public.set_updated_at();
create trigger trg_user_settings_updated  before update on public.user_settings   for each row execute function public.set_updated_at();
create trigger trg_subscriptions_updated  before update on public.subscriptions   for each row execute function public.set_updated_at();
create trigger trg_sessions_updated       before update on public.sessions        for each row execute function public.set_updated_at();
create trigger trg_solves_updated         before update on public.solves          for each row execute function public.set_updated_at();
create trigger trg_pbs_updated            before update on public.personal_bests  for each row execute function public.set_updated_at();
create trigger trg_tut_series_updated     before update on public.tutorial_series for each row execute function public.set_updated_at();
create trigger trg_tut_steps_updated      before update on public.tutorial_steps  for each row execute function public.set_updated_at();
create trigger trg_clubs_updated          before update on public.clubs           for each row execute function public.set_updated_at();

create or replace function public.update_club_member_count()
returns trigger
language plpgsql
set search_path to ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.clubs set member_count = member_count + 1 where id = new.club_id;
  elsif tg_op = 'DELETE' then
    update public.clubs set member_count = member_count - 1 where id = old.club_id;
  end if;
  return null;
end;
$$;

create trigger trg_club_member_count
  after insert or delete on public.club_members
  for each row execute function public.update_club_member_count();

create or replace function public.is_premium(p profiles)
returns boolean
language sql
stable
set search_path to ''
as $$
  select p.premium_until is not null and p.premium_until > now();
$$;

-- Secure-by-default: enable RLS on any table created in public from now on.
create or replace function public.rls_auto_enable()
returns event_trigger
language plpgsql
security definer
set search_path to 'pg_catalog'
as $$
declare
  cmd record;
begin
  for cmd in
    select *
    from pg_event_trigger_ddl_commands()
    where command_tag in ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      and object_type in ('table','partitioned table')
  loop
     if cmd.schema_name is not null and cmd.schema_name in ('public') and cmd.schema_name not in ('pg_catalog','information_schema') and cmd.schema_name not like 'pg_toast%' and cmd.schema_name not like 'pg_temp%' then
      begin
        execute format('alter table if exists %s enable row level security', cmd.object_identity);
        raise log 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      exception
        when others then
          raise log 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      end;
     else
        raise log 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     end if;
  end loop;
end;
$$;

create event trigger ensure_rls
  on ddl_command_end
  when tag in ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
  execute function public.rls_auto_enable();

-- ===================================================================== RLS ==
-- The event trigger above was created after the tables, so enable explicitly.

alter table public.profiles                 enable row level security;
alter table public.user_settings            enable row level security;
alter table public.subscriptions            enable row level security;
alter table public.user_follows             enable row level security;
alter table public.notifications            enable row level security;
alter table public.sessions                 enable row level security;
alter table public.solves                   enable row level security;
alter table public.personal_bests           enable row level security;
alter table public.algorithm_cases          enable row level security;
alter table public.algorithms               enable row level security;
alter table public.user_algorithm_bookmarks enable row level security;
alter table public.tutorial_series          enable row level security;
alter table public.tutorial_steps           enable row level security;
alter table public.user_tutorial_progress   enable row level security;
alter table public.matches                  enable row level security;
alter table public.match_games              enable row level security;
alter table public.elo_ratings              enable row level security;
alter table public.elo_history              enable row level security;
alter table public.clubs                    enable row level security;
alter table public.club_members             enable row level security;
alter table public.club_join_requests       enable row level security;
alter table public.products                 enable row level security;
alter table public.achievements             enable row level security;
alter table public.user_achievements        enable row level security;

-- identity
create policy profiles_read on public.profiles
  for select using (true);
create policy profiles_update on public.profiles
  for update using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy settings_all on public.user_settings
  for all using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy subs_read on public.subscriptions
  for select using ((select auth.uid()) = user_id);

create policy follows_read on public.user_follows
  for select using (true);
create policy follows_insert on public.user_follows
  for insert with check ((select auth.uid()) = follower_id);
create policy follows_delete on public.user_follows
  for delete using ((select auth.uid()) = follower_id);

create policy notif_read on public.notifications
  for select using ((select auth.uid()) = user_id);
create policy notif_update on public.notifications
  for update using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy notif_delete on public.notifications
  for delete using ((select auth.uid()) = user_id);

-- timer
create policy sessions_all on public.sessions
  for all using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy solves_all on public.solves
  for all using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy pbs_read on public.personal_bests
  for select using (true);

-- learn
create policy alg_cases_read on public.algorithm_cases
  for select using (true);

create policy algorithms_read on public.algorithms
  for select using (is_approved);

create policy alg_bookmarks_all on public.user_algorithm_bookmarks
  for all using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy tut_series_read on public.tutorial_series
  for select using (is_published);

create policy tut_steps_read on public.tutorial_steps
  for select using (is_published);

create policy tut_progress_all on public.user_tutorial_progress
  for all using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- compete
create policy matches_read on public.matches
  for select using ((select auth.uid()) = player1_id or (select auth.uid()) = player2_id);

create policy match_games_read on public.match_games
  for select using (exists (
    select 1 from public.matches m
    where m.id = match_games.match_id
      and ((select auth.uid()) = m.player1_id or (select auth.uid()) = m.player2_id)
  ));

create policy elo_read on public.elo_ratings
  for select using (true);

create policy elo_hist_read on public.elo_history
  for select using (true);

-- social
create policy clubs_read on public.clubs
  for select using (is_public or exists (
    select 1 from public.club_members cm
    where cm.club_id = clubs.id and cm.user_id = (select auth.uid())
  ));
create policy clubs_insert on public.clubs
  for insert with check ((select auth.uid()) = created_by);
create policy clubs_update on public.clubs
  for update using (exists (
    select 1 from public.club_members cm
    where cm.club_id = clubs.id
      and cm.user_id = (select auth.uid())
      and cm.role in ('owner','admin')
  ));

create policy club_members_read on public.club_members
  for select using (exists (
    select 1 from public.clubs c
    where c.id = club_members.club_id
      and (c.is_public or exists (
        select 1 from public.club_members cm2
        where cm2.club_id = c.id and cm2.user_id = (select auth.uid())
      ))
  ));
create policy club_members_self_insert on public.club_members
  for insert with check ((select auth.uid()) = user_id);
create policy club_members_self_delete on public.club_members
  for delete using ((select auth.uid()) = user_id);

create policy club_req_owner on public.club_join_requests
  for all using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- commerce & meta
create policy products_read on public.products
  for select using (is_active);

create policy achievements_read on public.achievements
  for select using (true);

create policy user_ach_read on public.user_achievements
  for select using (true);
