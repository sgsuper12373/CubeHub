-- Social layer v1 (docs/roadmap.md → Social layer).
--
-- 1. `user_follows` (already in the baseline, unused until now) gains a
--    status: following a private profile makes a `pending` request the owner
--    approves. Accepted followers can see a private profile.
-- 2. `user_blocks`: a block removes follows both ways and hides each profile
--    from the other.
-- 3. `profile_visible(p_user)` learns about follows and blocks, so every
--    privacy check built on it (stats, PB timeline, achievements, setups)
--    follows along. `personal_bests` read and `profiles` read use it too.
-- 4. `profile_reports`: insert-only for users, read by admins.
-- 5. Rate limits (follows per hour, reports per day) from `social_rate_events`,
--    which only triggers write, so unfollowing doesn't reset the count.
-- 6. Notifications for follows, requests and accepted requests, written by
--    triggers.
-- 7. RPCs for counts, the Friends leaderboard, friends' recent PBs, search
--    and suggestions, and the caller's block list.
--
-- Follower lists: a row is readable when you're on either side, or when it's
-- accepted and either end's profile is visible to you. A private cuber's own
-- lists are locked in the app; they can still appear in a public cuber's list
-- (name and photo only, which `profiles` shows anyway).

-- ── 1. Follows ─────────────────────────────────────────────────────────────
alter table public.user_follows
  add column if not exists status text not null default 'accepted'
    check (status in ('pending', 'accepted')),
  add column if not exists responded_at timestamptz;

create index if not exists idx_follows_following_status
  on public.user_follows (following_id, status);
create index if not exists idx_follows_follower_status
  on public.user_follows (follower_id, status);

-- ── 2. Blocks ──────────────────────────────────────────────────────────────
create table if not exists public.user_blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
create index if not exists idx_blocks_blocked on public.user_blocks (blocked_id);
alter table public.user_blocks enable row level security;

drop policy if exists blocks_read on public.user_blocks;
create policy blocks_read on public.user_blocks
  for select using ((select auth.uid()) = blocker_id);
drop policy if exists blocks_insert on public.user_blocks;
create policy blocks_insert on public.user_blocks
  for insert with check ((select auth.uid()) = blocker_id);
drop policy if exists blocks_delete on public.user_blocks;
create policy blocks_delete on public.user_blocks
  for delete using ((select auth.uid()) = blocker_id);

create or replace function public.is_blocked_between(p_a uuid, p_b uuid)
returns boolean
language sql
stable
security definer
set search_path to ''
as $$
  select p_a is not null and p_b is not null and exists (
    select 1 from public.user_blocks b
    where (b.blocker_id = p_a and b.blocked_id = p_b)
       or (b.blocker_id = p_b and b.blocked_id = p_a)
  );
$$;

-- ── 3. The privacy check, now with follows and blocks ──────────────────────
create or replace function public.profile_visible(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path to ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = p_user
      and (
        p.id = (select auth.uid())
        or (
          not public.is_blocked_between((select auth.uid()), p.id)
          and (
            p.is_public
            or exists (
              select 1 from public.user_follows f
              where f.follower_id = (select auth.uid())
                and f.following_id = p.id
                and f.status = 'accepted'
            )
          )
        )
      )
  );
$$;

drop policy if exists pbs_read on public.personal_bests;
create policy pbs_read on public.personal_bests
  for select using (public.profile_visible(user_id));

-- Name and photo stay readable to everyone, except between blocked users.
drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles
  for select using (not public.is_blocked_between((select auth.uid()), id));

-- ── 1b. Follow rules ───────────────────────────────────────────────────────
drop policy if exists follows_read on public.user_follows;
create policy follows_read on public.user_follows
  for select using (
    (select auth.uid()) in (follower_id, following_id)
    or (
      status = 'accepted'
      and (public.profile_visible(following_id) or public.profile_visible(follower_id))
    )
  );

drop policy if exists follows_insert on public.user_follows;
create policy follows_insert on public.user_follows
  for insert with check ((select auth.uid()) = follower_id);

-- Only the followed cuber, and only to accept a pending request.
drop policy if exists follows_accept on public.user_follows;
create policy follows_accept on public.user_follows
  for update
  using ((select auth.uid()) = following_id and status = 'pending')
  with check ((select auth.uid()) = following_id and status = 'accepted');

-- Unfollow / cancel a request (follower), or decline / remove a follower (followed).
drop policy if exists follows_delete on public.user_follows;
create policy follows_delete on public.user_follows
  for delete using ((select auth.uid()) in (follower_id, following_id));

-- Clients may change only the status; responded_at is set by the trigger.
revoke update on public.user_follows from anon, authenticated;
grant update (status) on public.user_follows to authenticated;

-- ── 5. Rate limits ─────────────────────────────────────────────────────────
create table if not exists public.social_rate_events (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  kind       text not null check (kind in ('follow', 'report')),
  created_at timestamptz not null default now()
);
create index if not exists idx_rate_events_user_kind
  on public.social_rate_events (user_id, kind, created_at desc);
-- No policies: only the SECURITY DEFINER triggers below read or write it.
alter table public.social_rate_events enable row level security;

create or replace function public.before_follow_insert()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_public boolean;
begin
  if public.is_blocked_between(new.follower_id, new.following_id) then
    raise exception 'You can''t follow this cuber.' using errcode = 'P0001', hint = 'blocked';
  end if;

  if (select count(*) from public.social_rate_events e
      where e.user_id = new.follower_id and e.kind = 'follow'
        and e.created_at > now() - interval '1 hour') >= 50 then
    raise exception 'Too many follows in the last hour. Try again later.'
      using errcode = 'P0001', hint = 'rate_limited';
  end if;

  insert into public.social_rate_events (user_id, kind) values (new.follower_id, 'follow');

  select p.is_public into v_public from public.profiles p where p.id = new.following_id;
  new.status       := case when v_public then 'accepted' else 'pending' end;
  new.created_at   := now();
  new.responded_at := null;
  return new;
end;
$$;

drop trigger if exists before_follow_insert on public.user_follows;
create trigger before_follow_insert
  before insert on public.user_follows
  for each row execute function public.before_follow_insert();

create or replace function public.before_follow_update()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
begin
  if old.status = 'pending' and new.status = 'accepted' then
    new.responded_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists before_follow_update on public.user_follows;
create trigger before_follow_update
  before update on public.user_follows
  for each row execute function public.before_follow_update();

-- ── 6. Notifications ───────────────────────────────────────────────────────
create index if not exists idx_notif_actor on public.notifications ((data ->> 'actor_id'));

create or replace function public.notify_follow_change()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
begin
  if tg_op = 'INSERT' then
    -- One notification per actor and kind: re-following replaces the old one.
    delete from public.notifications n
    where n.user_id = new.following_id
      and n.type in ('follow', 'follow_request')
      and n.data ->> 'actor_id' = new.follower_id::text;

    insert into public.notifications (user_id, type, title, data)
    values (
      new.following_id,
      case when new.status = 'pending' then 'follow_request' else 'follow' end::public.notification_type,
      case when new.status = 'pending' then 'Follow request' else 'New follower' end,
      jsonb_build_object('actor_id', new.follower_id)
    );
  elsif tg_op = 'UPDATE' then
    if old.status = 'pending' and new.status = 'accepted' then
      -- The request is handled: it stops showing as one.
      delete from public.notifications n
      where n.user_id = new.following_id
        and n.type = 'follow_request'
        and n.data ->> 'actor_id' = new.follower_id::text;

      insert into public.notifications (user_id, type, title, data)
      values (new.follower_id, 'follow_accepted', 'Request accepted',
              jsonb_build_object('actor_id', new.following_id));
    end if;
  elsif tg_op = 'DELETE' then
    if old.status = 'pending' then
      delete from public.notifications n
      where n.user_id = old.following_id
        and n.type = 'follow_request'
        and n.data ->> 'actor_id' = old.follower_id::text;
    end if;
  end if;
  return null;
end;
$$;

drop trigger if exists notify_follow_change on public.user_follows;
create trigger notify_follow_change
  after insert or update or delete on public.user_follows
  for each row execute function public.notify_follow_change();

-- Going public: every pending request is accepted (and notified).
create or replace function public.accept_pending_on_public()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
begin
  if new.is_public and not old.is_public then
    update public.user_follows f
    set status = 'accepted'
    where f.following_id = new.id and f.status = 'pending';
  end if;
  return null;
end;
$$;

drop trigger if exists accept_pending_on_public on public.profiles;
create trigger accept_pending_on_public
  after update of is_public on public.profiles
  for each row execute function public.accept_pending_on_public();

-- A block removes follows and requests both ways, and the notifications between them.
create or replace function public.after_block_insert()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
begin
  delete from public.user_follows f
  where (f.follower_id = new.blocker_id and f.following_id = new.blocked_id)
     or (f.follower_id = new.blocked_id and f.following_id = new.blocker_id);

  delete from public.notifications n
  where (n.user_id = new.blocker_id and n.data ->> 'actor_id' = new.blocked_id::text)
     or (n.user_id = new.blocked_id and n.data ->> 'actor_id' = new.blocker_id::text);
  return null;
end;
$$;

drop trigger if exists after_block_insert on public.user_blocks;
create trigger after_block_insert
  after insert on public.user_blocks
  for each row execute function public.after_block_insert();

-- ── 4. Reports ─────────────────────────────────────────────────────────────
create table if not exists public.profile_reports (
  id          uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reported_id uuid not null references public.profiles(id) on delete cascade,
  reason      text not null
                check (reason in ('spam', 'harassment', 'inappropriate', 'impersonation', 'other')),
  note        text check (note is null or char_length(note) <= 500),
  status      text not null default 'open' check (status in ('open', 'reviewed', 'dismissed')),
  created_at  timestamptz not null default now(),
  check (reporter_id <> reported_id)
);
create index if not exists idx_reports_status on public.profile_reports (status, created_at desc);
alter table public.profile_reports enable row level security;

drop policy if exists reports_insert on public.profile_reports;
create policy reports_insert on public.profile_reports
  for insert with check ((select auth.uid()) = reporter_id and status = 'open');
drop policy if exists reports_admin_read on public.profile_reports;
create policy reports_admin_read on public.profile_reports
  for select using (public.is_admin());
drop policy if exists reports_admin_update on public.profile_reports;
create policy reports_admin_update on public.profile_reports
  for update using (public.is_admin()) with check (public.is_admin());

create or replace function public.before_report_insert()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
begin
  if (select count(*) from public.social_rate_events e
      where e.user_id = new.reporter_id and e.kind = 'report'
        and e.created_at > now() - interval '1 day') >= 10 then
    raise exception 'Too many reports today. Try again tomorrow.'
      using errcode = 'P0001', hint = 'rate_limited';
  end if;
  insert into public.social_rate_events (user_id, kind) values (new.reporter_id, 'report');
  new.created_at := now();
  return new;
end;
$$;

drop trigger if exists before_report_insert on public.profile_reports;
create trigger before_report_insert
  before insert on public.profile_reports
  for each row execute function public.before_report_insert();

-- ── 7. RPCs ────────────────────────────────────────────────────────────────

-- Counts are always shown (unless blocked); the viewer's relationship too.
create or replace function public.get_follow_summary(p_user uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path to ''
as $$
declare
  v_me uuid := (select auth.uid());
begin
  if public.is_blocked_between(v_me, p_user)
     and not exists (select 1 from public.user_blocks b where b.blocker_id = v_me and b.blocked_id = p_user) then
    return null;
  end if;

  return jsonb_build_object(
    'followers', (select count(*) from public.user_follows f
                  where f.following_id = p_user and f.status = 'accepted'),
    'following', (select count(*) from public.user_follows f
                  where f.follower_id = p_user and f.status = 'accepted'),
    'i_follow',  coalesce((select f.status from public.user_follows f
                           where f.follower_id = v_me and f.following_id = p_user), 'none'),
    'follows_me', exists (select 1 from public.user_follows f
                          where f.follower_id = p_user and f.following_id = v_me
                            and f.status = 'accepted'),
    'blocked_by_me', exists (select 1 from public.user_blocks b
                             where b.blocker_id = v_me and b.blocked_id = p_user)
  );
end;
$$;

-- You and the people you follow, by one PB.
create or replace function public.get_friends_leaderboard(p_puzzle public.puzzle_type, p_category text)
returns table (
  user_id uuid, username text, display_name text, avatar_url text,
  time_ms integer, achieved_at timestamptz, is_me boolean
)
language sql
stable
security definer
set search_path to ''
as $$
  with circle as (
    select (select auth.uid()) as id
    union
    select f.following_id from public.user_follows f
    where f.follower_id = (select auth.uid()) and f.status = 'accepted'
  )
  select p.id, p.username, p.display_name, p.avatar_url, pb.time_ms, pb.achieved_at,
         p.id = (select auth.uid())
  from circle c
  join public.profiles p on p.id = c.id
  join public.personal_bests pb
    on pb.user_id = p.id and pb.puzzle_type = p_puzzle and pb.category = p_category
  where (select auth.uid()) is not null
    and public.profile_visible(p.id)
  order by pb.time_ms, pb.achieved_at
  limit 200;
$$;

-- PBs set recently by people you follow.
create or replace function public.get_friends_recent_pbs(p_days integer default 14)
returns table (
  user_id uuid, username text, display_name text, avatar_url text,
  puzzle_type public.puzzle_type, category text, time_ms integer, achieved_at timestamptz
)
language sql
stable
security definer
set search_path to ''
as $$
  select p.id, p.username, p.display_name, p.avatar_url,
         pb.puzzle_type, pb.category, pb.time_ms, pb.achieved_at
  from public.user_follows f
  join public.profiles p on p.id = f.following_id
  join public.personal_bests pb on pb.user_id = p.id
  where f.follower_id = (select auth.uid())
    and f.status = 'accepted'
    and pb.category in ('single', 'mean3', 'ao5', 'ao12', 'ao100')
    and pb.achieved_at > now() - make_interval(days => least(greatest(p_days, 1), 90))
    and public.profile_visible(p.id)
  order by pb.achieved_at desc
  limit 30;
$$;

-- Username or display-name prefix search.
create or replace function public.search_profiles(p_query text)
returns table (
  user_id uuid, username text, display_name text, avatar_url text, is_public boolean, i_follow text
)
language sql
stable
security definer
set search_path to ''
as $$
  with q as (
    select replace(replace(replace(btrim(p_query), '\', '\\'), '%', '\%'), '_', '\_') || '%' as pattern
  )
  select p.id, p.username, p.display_name, p.avatar_url, p.is_public,
         coalesce((select f.status from public.user_follows f
                   where f.follower_id = (select auth.uid()) and f.following_id = p.id), 'none')
  from public.profiles p, q
  where (select auth.uid()) is not null
    and char_length(btrim(p_query)) >= 2
    and p.id <> (select auth.uid())
    and (p.username ilike q.pattern or p.display_name ilike q.pattern)
    and not public.is_blocked_between((select auth.uid()), p.id)
  order by (lower(p.username) = lower(btrim(p_query))) desc, p.username
  limit 20;
$$;

-- Public cubers you don't follow yet, nearest your 3x3 Ao12 (most active first
-- when you have none).
create or replace function public.suggest_profiles()
returns table (
  user_id uuid, username text, display_name text, avatar_url text, ao12_ms integer
)
language sql
stable
security definer
set search_path to ''
as $$
  with me as (
    select pb.time_ms as ao12
    from public.personal_bests pb
    where pb.user_id = (select auth.uid()) and pb.puzzle_type = '333' and pb.category = 'ao12'
  )
  select p.id, p.username, p.display_name, p.avatar_url, pb.time_ms
  from public.profiles p
  left join public.personal_bests pb
    on pb.user_id = p.id and pb.puzzle_type = '333' and pb.category = 'ao12'
  left join me on true
  where (select auth.uid()) is not null
    and p.is_public
    and p.id <> (select auth.uid())
    and not exists (select 1 from public.user_follows f
                    where f.follower_id = (select auth.uid()) and f.following_id = p.id)
    and not public.is_blocked_between((select auth.uid()), p.id)
    and exists (select 1 from public.personal_bests any_pb where any_pb.user_id = p.id)
  order by
    case when me.ao12 is not null and pb.time_ms is not null then abs(pb.time_ms - me.ao12) end nulls last,
    (select max(x.achieved_at) from public.personal_bests x where x.user_id = p.id) desc nulls last
  limit 10;
$$;

-- Blocked profiles are hidden from `profiles` reads, so the block list needs this.
create or replace function public.get_my_blocks()
returns table (user_id uuid, username text, display_name text, avatar_url text, blocked_at timestamptz)
language sql
stable
security definer
set search_path to ''
as $$
  select p.id, p.username, p.display_name, p.avatar_url, b.created_at
  from public.user_blocks b
  join public.profiles p on p.id = b.blocked_id
  where b.blocker_id = (select auth.uid())
  order by b.created_at desc;
$$;

-- ── Grants ─────────────────────────────────────────────────────────────────
revoke all on function public.is_blocked_between(uuid, uuid)                  from public;
revoke all on function public.get_follow_summary(uuid)                        from public;
revoke all on function public.get_friends_leaderboard(public.puzzle_type, text) from public;
revoke all on function public.get_friends_recent_pbs(integer)                 from public;
revoke all on function public.search_profiles(text)                           from public;
revoke all on function public.suggest_profiles()                              from public;
revoke all on function public.get_my_blocks()                                 from public;

grant execute on function public.is_blocked_between(uuid, uuid)               to anon, authenticated;
grant execute on function public.get_follow_summary(uuid)                     to anon, authenticated;
grant execute on function public.get_friends_leaderboard(public.puzzle_type, text) to authenticated;
grant execute on function public.get_friends_recent_pbs(integer)              to authenticated;
grant execute on function public.search_profiles(text)                        to authenticated;
grant execute on function public.suggest_profiles()                           to authenticated;
grant execute on function public.get_my_blocks()                              to authenticated;

-- Trigger functions: not part of the API.
revoke all on function public.before_follow_insert()      from public, anon, authenticated;
revoke all on function public.before_follow_update()      from public, anon, authenticated;
revoke all on function public.notify_follow_change()      from public, anon, authenticated;
revoke all on function public.accept_pending_on_public()  from public, anon, authenticated;
revoke all on function public.after_block_insert()        from public, anon, authenticated;
revoke all on function public.before_report_insert()      from public, anon, authenticated;
