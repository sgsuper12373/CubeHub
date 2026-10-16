-- Clubs v1 (docs/clubs.md).
--
-- The baseline's `clubs`, `club_members` and `club_join_requests` are reused,
-- but every access rule is rewritten: the baseline let anyone insert themselves
-- into any club as `owner`, admins couldn't see join requests, members
-- couldn't be removed, and `club_members_read` queried its own table (a
-- recursive policy).
--
--  1. `clubs` gains type, tags and a reserved post policy, plus name/slug rules.
--  2. Helpers: `club_role_of`, `club_visible_to_me`, `can_see_club_post`.
--  3. Membership changes only through SECURITY DEFINER RPCs: create, join,
--     request / approve / decline, leave, remove / ban / unban, roles,
--     ownership transfer, invite links.
--  4. New tables: bans, invites, posts, reactions, comments, reports.
--  5. RLS: a private club's members, posts, reactions and comments are visible
--     to its members only; blocked pairs don't see each other's posts or
--     comments. The `clubs` row itself is public (private clubs still appear
--     in search).
--  6. Limits through `social_rate_events`: posts 10/day, comments 60/hour,
--     join requests 20/hour, reports 10/day (shared with profile reports).
--     Caps: 3 owned clubs, 20 memberships, 3 pinned posts per club.
--  7. Notifications: join request (owner + admins), request approved,
--     comment on your post (max one per post per hour), post pinned.
--  8. `get_club_activity`: solves per member this week (Mon–Sun, IST),
--     counts only, never times.
--
-- Needs 20261019000000_solve_sanity.sql (`solves.excluded`) and
-- 20261020000000_club_enums.sql applied first.

-- ── 1. Clubs ───────────────────────────────────────────────────────────────
alter table public.clubs
  add column if not exists type text not null default 'online'
    check (type in ('school', 'college', 'city', 'online')),
  add column if not exists tags text[] not null default '{}'
    check (
      cardinality(tags) <= 3
      and tags <@ array['333', '222', 'big_cubes', 'one_handed', 'blindfolded',
                        'beginners', 'speedsolving', 'methods', 'casual']::text[]
    ),
  -- Reserved: who may post. v1 always allows every member.
  add column if not exists post_policy text not null default 'members'
    check (post_policy in ('members', 'admins'));

alter table public.clubs
  drop constraint if exists clubs_name_length,
  add constraint clubs_name_length check (char_length(btrim(name)) between 3 and 40),
  drop constraint if exists clubs_slug_length,
  add constraint clubs_slug_length check (char_length(slug) between 3 and 40),
  drop constraint if exists clubs_slug_reserved,
  add constraint clubs_slug_reserved check (slug not in ('new', 'manage', 'invite', 'join')),
  drop constraint if exists clubs_description_length,
  add constraint clubs_description_length
    check (description is null or char_length(description) <= 300);

-- Names are unique ignoring case (the baseline's `unique` is case-sensitive).
create unique index if not exists uq_clubs_name_lower on public.clubs (lower(name));
create index if not exists idx_clubs_type on public.clubs (type);
create index if not exists idx_clubs_tags on public.clubs using gin (tags);
create index if not exists idx_club_members_club_role on public.club_members (club_id, role);

-- ── 4. New tables ──────────────────────────────────────────────────────────
create table if not exists public.club_bans (
  club_id    uuid not null references public.clubs(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  banned_by  uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (club_id, user_id)
);

create table if not exists public.club_invites (
  id         uuid primary key default gen_random_uuid(),
  club_id    uuid not null references public.clubs(id) on delete cascade,
  -- 64 hex characters from two random UUIDs: unguessable, URL-safe.
  token      text not null unique
             default replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''),
  created_by uuid references public.profiles(id) on delete set null,
  expires_at timestamptz,
  max_uses   integer check (max_uses is null or max_uses > 0),
  uses       integer not null default 0 check (uses >= 0),
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_club_invites_club on public.club_invites (club_id, created_at desc);

create table if not exists public.club_posts (
  id         uuid primary key default gen_random_uuid(),
  club_id    uuid not null references public.clubs(id) on delete cascade,
  author_id  uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  kind       text not null check (kind in ('text', 'alg', 'video')),
  -- The post text for `text`, the optional caption for `alg` and `video`.
  body       text,
  alg        text,
  puzzle     public.puzzle_type,
  setup      text,
  video_url  text,
  pinned_at  timestamptz,
  pinned_by  uuid references public.profiles(id) on delete set null,
  edited_at  timestamptz,
  created_at timestamptz not null default now(),
  constraint club_posts_text check (
    kind <> 'text' or (
      body is not null and char_length(btrim(body)) between 1 and 1000
      and alg is null and puzzle is null and setup is null and video_url is null
    )
  ),
  constraint club_posts_alg check (
    kind <> 'alg' or (
      alg is not null and char_length(alg) between 1 and 200
      -- Face, slice, wide and rotation turns with 2 / ' modifiers. The app
      -- validates with cubing.js too; this keeps junk out of the table.
      and alg ~ '^[\s()]*([RLUDFBrludfbMESxyz]w?(2''|''2|[23''])?[\s()]*)+$'
      and puzzle in ('333', '222')
      and (setup is null or char_length(setup) <= 200)
      and (body is null or char_length(body) <= 500)
      and video_url is null
    )
  ),
  constraint club_posts_video check (
    kind <> 'video' or (
      video_url is not null and char_length(video_url) <= 300
      and video_url ~* '^https://((www|m)\.)?(youtube\.com/(watch\?v=|shorts/|live/)|youtu\.be/|instagram\.com/(p|reels?|tv)/)[A-Za-z0-9_?=&/.%-]+$'
      and (body is null or char_length(body) <= 500)
      and alg is null and puzzle is null and setup is null
    )
  )
);
create index if not exists idx_club_posts_feed on public.club_posts (club_id, created_at desc);
create index if not exists idx_club_posts_pinned on public.club_posts (club_id) where pinned_at is not null;
create index if not exists idx_club_posts_author on public.club_posts (author_id, created_at desc);

create table if not exists public.club_post_reactions (
  post_id    uuid not null references public.club_posts(id) on delete cascade,
  user_id    uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  reaction   text not null check (reaction in ('fire', 'clap', 'mind_blown')),
  created_at timestamptz not null default now(),
  primary key (post_id, user_id, reaction)
);
create index if not exists idx_club_reactions_user on public.club_post_reactions (user_id);

create table if not exists public.club_post_comments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.club_posts(id) on delete cascade,
  author_id  uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  body       text not null check (char_length(btrim(body)) between 1 and 500),
  created_at timestamptz not null default now()
);
create index if not exists idx_club_comments_post on public.club_post_comments (post_id, created_at);
create index if not exists idx_club_comments_author on public.club_post_comments (author_id);

-- One row per report. `club_id` is always set (filled from the post or
-- comment); `post_id` / `comment_id` say what exactly was reported.
create table if not exists public.club_reports (
  id          uuid primary key default gen_random_uuid(),
  reporter_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  club_id     uuid references public.clubs(id) on delete cascade,
  post_id     uuid references public.club_posts(id) on delete cascade,
  comment_id  uuid references public.club_post_comments(id) on delete cascade,
  reason      text not null
                check (reason in ('spam', 'harassment', 'inappropriate', 'impersonation', 'other')),
  note        text check (note is null or char_length(note) <= 500),
  status      text not null default 'open' check (status in ('open', 'reviewed', 'dismissed')),
  created_at  timestamptz not null default now(),
  check (club_id is not null or post_id is not null or comment_id is not null)
);
create index if not exists idx_club_reports_status on public.club_reports (status, created_at desc);

alter table public.club_bans           enable row level security;
alter table public.club_invites        enable row level security;
alter table public.club_posts          enable row level security;
alter table public.club_post_reactions enable row level security;
alter table public.club_post_comments  enable row level security;
alter table public.club_reports        enable row level security;

-- Rate-limit kinds for clubs.
alter table public.social_rate_events drop constraint if exists social_rate_events_kind_check;
alter table public.social_rate_events add constraint social_rate_events_kind_check
  check (kind in ('follow', 'report', 'club_post', 'club_comment', 'club_join_request'));

-- ── 2. Helpers ─────────────────────────────────────────────────────────────

-- A user's role in a club, or null. Definer, so policies on `club_members`
-- can use it without recursing into their own table.
create or replace function public.club_role_of(p_club uuid, p_user uuid)
returns public.club_role
language sql
stable
security definer
set search_path to ''
as $$
  select m.role from public.club_members m
  where m.club_id = p_club and m.user_id = p_user;
$$;

-- Members, posts and activity of this club: public, or I'm in it (or the
-- platform admin).
create or replace function public.club_visible_to_me(p_club uuid)
returns boolean
language sql
stable
security definer
set search_path to ''
as $$
  select exists (
    select 1 from public.clubs c
    where c.id = p_club
      and (
        c.is_public
        or exists (select 1 from public.club_members m
                   where m.club_id = c.id and m.user_id = (select auth.uid()))
        or public.is_admin()
      )
  );
$$;

-- A post I may see: its club is visible to me and its author hasn't blocked
-- me (or been blocked by me).
create or replace function public.can_see_club_post(p_post uuid)
returns boolean
language sql
stable
security definer
set search_path to ''
as $$
  select exists (
    select 1 from public.club_posts p
    where p.id = p_post
      and public.club_visible_to_me(p.club_id)
      and not public.is_blocked_between((select auth.uid()), p.author_id)
  );
$$;

-- The club a post belongs to, if I'm a member of it (for writes).
create or replace function public.club_member_of_post(p_post uuid)
returns boolean
language sql
stable
security definer
set search_path to ''
as $$
  select exists (
    select 1 from public.club_posts p
    join public.club_members m on m.club_id = p.club_id and m.user_id = (select auth.uid())
    where p.id = p_post
  );
$$;

-- The auto-made handle from the signup trigger (`user_` + 12 hex). Creating a
-- club needs a chosen username.
create or replace function public.has_chosen_username(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path to ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = p_user and p.username !~* '^user_[0-9a-f]{12}$'
  );
$$;

-- ── 5. RLS ─────────────────────────────────────────────────────────────────

-- clubs: every row is readable (search shows private clubs too); only the
-- owner edits settings; the owner or the platform admin deletes. Creation is
-- `create_club()` only.
drop policy if exists clubs_read on public.clubs;
create policy clubs_read on public.clubs
  for select using (true);
drop policy if exists clubs_insert on public.clubs;
drop policy if exists clubs_update on public.clubs;
create policy clubs_update on public.clubs
  for update
  using (public.club_role_of(id, (select auth.uid())) = 'owner')
  with check (public.club_role_of(id, (select auth.uid())) = 'owner');
drop policy if exists clubs_delete on public.clubs;
create policy clubs_delete on public.clubs
  for delete using (
    public.club_role_of(id, (select auth.uid())) = 'owner' or public.is_admin()
  );

revoke insert, update on public.clubs from anon, authenticated;
grant update (name, slug, description, type, tags, is_public, post_policy) on public.clubs to authenticated;

-- club_members: readable when the club is visible; no client writes.
drop policy if exists club_members_read on public.club_members;
create policy club_members_read on public.club_members
  for select using (public.club_visible_to_me(club_id));
drop policy if exists club_members_self_insert on public.club_members;
drop policy if exists club_members_self_delete on public.club_members;
revoke insert, update, delete on public.club_members from anon, authenticated;

-- club_join_requests: the requester and the club's owner/admins read; the
-- requester cancels. Everything else is an RPC.
drop policy if exists club_req_owner on public.club_join_requests;
drop policy if exists club_req_read on public.club_join_requests;
create policy club_req_read on public.club_join_requests
  for select using (
    (select auth.uid()) = user_id
    or public.club_role_of(club_id, (select auth.uid())) in ('owner', 'admin')
  );
drop policy if exists club_req_cancel on public.club_join_requests;
create policy club_req_cancel on public.club_join_requests
  for delete using ((select auth.uid()) = user_id);
revoke insert, update on public.club_join_requests from anon, authenticated;

-- club_bans, club_invites: owner/admins read; RPCs write.
drop policy if exists club_bans_read on public.club_bans;
create policy club_bans_read on public.club_bans
  for select using (public.club_role_of(club_id, (select auth.uid())) in ('owner', 'admin'));
revoke insert, update, delete on public.club_bans from anon, authenticated;

drop policy if exists club_invites_read on public.club_invites;
create policy club_invites_read on public.club_invites
  for select using (public.club_role_of(club_id, (select auth.uid())) in ('owner', 'admin'));
revoke insert, update, delete on public.club_invites from anon, authenticated;

-- club_posts
drop policy if exists club_posts_read on public.club_posts;
create policy club_posts_read on public.club_posts
  for select using (
    public.club_visible_to_me(club_id)
    and not public.is_blocked_between((select auth.uid()), author_id)
  );
drop policy if exists club_posts_insert on public.club_posts;
create policy club_posts_insert on public.club_posts
  for insert with check (
    (select auth.uid()) = author_id
    and public.club_role_of(club_id, (select auth.uid())) is not null
  );
-- The author edits within 15 minutes; `kind`, `club_id` and pinning can't change.
drop policy if exists club_posts_edit on public.club_posts;
create policy club_posts_edit on public.club_posts
  for update
  using ((select auth.uid()) = author_id and created_at > now() - interval '15 minutes')
  with check ((select auth.uid()) = author_id and created_at > now() - interval '15 minutes');
drop policy if exists club_posts_delete on public.club_posts;
create policy club_posts_delete on public.club_posts
  for delete using (
    (select auth.uid()) = author_id
    or public.club_role_of(club_id, (select auth.uid())) in ('owner', 'admin')
    or public.is_admin()
  );
revoke update on public.club_posts from anon, authenticated;
grant update (body, alg, puzzle, setup, video_url) on public.club_posts to authenticated;

-- club_post_reactions
drop policy if exists club_reactions_read on public.club_post_reactions;
create policy club_reactions_read on public.club_post_reactions
  for select using (public.can_see_club_post(post_id));
drop policy if exists club_reactions_insert on public.club_post_reactions;
create policy club_reactions_insert on public.club_post_reactions
  for insert with check (
    (select auth.uid()) = user_id
    and public.club_member_of_post(post_id)
    and public.can_see_club_post(post_id)
  );
drop policy if exists club_reactions_delete on public.club_post_reactions;
create policy club_reactions_delete on public.club_post_reactions
  for delete using ((select auth.uid()) = user_id);
revoke update on public.club_post_reactions from anon, authenticated;

-- club_post_comments
drop policy if exists club_comments_read on public.club_post_comments;
create policy club_comments_read on public.club_post_comments
  for select using (
    public.can_see_club_post(post_id)
    and not public.is_blocked_between((select auth.uid()), author_id)
  );
drop policy if exists club_comments_insert on public.club_post_comments;
create policy club_comments_insert on public.club_post_comments
  for insert with check (
    (select auth.uid()) = author_id
    and public.club_member_of_post(post_id)
    and public.can_see_club_post(post_id)
  );
drop policy if exists club_comments_delete on public.club_post_comments;
create policy club_comments_delete on public.club_post_comments
  for delete using (
    (select auth.uid()) = author_id
    or exists (
      select 1 from public.club_posts p
      where p.id = club_post_comments.post_id
        and public.club_role_of(p.club_id, (select auth.uid())) in ('owner', 'admin')
    )
    or public.is_admin()
  );
revoke update on public.club_post_comments from anon, authenticated;

-- club_reports: insert-only for users, read by the platform admin.
drop policy if exists club_reports_insert on public.club_reports;
create policy club_reports_insert on public.club_reports
  for insert with check ((select auth.uid()) = reporter_id and status = 'open');
drop policy if exists club_reports_admin_read on public.club_reports;
create policy club_reports_admin_read on public.club_reports
  for select using (public.is_admin());
drop policy if exists club_reports_admin_update on public.club_reports;
create policy club_reports_admin_update on public.club_reports
  for update using (public.is_admin()) with check (public.is_admin());

-- ── 6. Triggers: limits, timestamps, notifications ─────────────────────────

create or replace function public.before_club_post_insert()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
begin
  if (select c.post_policy from public.clubs c where c.id = new.club_id) = 'admins'
     and public.club_role_of(new.club_id, new.author_id) not in ('owner', 'admin') then
    raise exception 'Only admins can post in this club.' using errcode = 'P0001', hint = 'admins_only';
  end if;

  if (select count(*) from public.social_rate_events e
      where e.user_id = new.author_id and e.kind = 'club_post'
        and e.created_at > now() - interval '1 day') >= 10 then
    raise exception 'You''ve posted 10 times today. Try again tomorrow.'
      using errcode = 'P0001', hint = 'rate_limited';
  end if;
  insert into public.social_rate_events (user_id, kind) values (new.author_id, 'club_post');

  new.created_at := now();
  new.edited_at  := null;
  new.pinned_at  := null;
  new.pinned_by  := null;
  return new;
end;
$$;

drop trigger if exists before_club_post_insert on public.club_posts;
create trigger before_club_post_insert
  before insert on public.club_posts
  for each row execute function public.before_club_post_insert();

create or replace function public.before_club_post_update()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
begin
  if (new.body, new.alg, new.puzzle, new.setup, new.video_url)
     is distinct from (old.body, old.alg, old.puzzle, old.setup, old.video_url) then
    new.edited_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists before_club_post_update on public.club_posts;
create trigger before_club_post_update
  before update on public.club_posts
  for each row execute function public.before_club_post_update();

create or replace function public.before_club_comment_insert()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
begin
  if (select count(*) from public.social_rate_events e
      where e.user_id = new.author_id and e.kind = 'club_comment'
        and e.created_at > now() - interval '1 hour') >= 60 then
    raise exception 'Too many comments in the last hour. Try again later.'
      using errcode = 'P0001', hint = 'rate_limited';
  end if;
  insert into public.social_rate_events (user_id, kind) values (new.author_id, 'club_comment');
  new.created_at := now();
  return new;
end;
$$;

drop trigger if exists before_club_comment_insert on public.club_post_comments;
create trigger before_club_comment_insert
  before insert on public.club_post_comments
  for each row execute function public.before_club_comment_insert();

-- The post's author hears about comments, at most once per post per hour.
create or replace function public.notify_club_comment()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_post record;
begin
  select p.author_id, p.club_id, c.slug, c.name
    into v_post
  from public.club_posts p
  join public.clubs c on c.id = p.club_id
  where p.id = new.post_id;

  if v_post.author_id is null or v_post.author_id = new.author_id then
    return null;
  end if;
  if public.is_blocked_between(v_post.author_id, new.author_id) then
    return null;
  end if;
  if exists (
    select 1 from public.notifications n
    where n.user_id = v_post.author_id
      and n.type = 'club_comment'
      and n.data ->> 'post_id' = new.post_id::text
      and n.created_at > now() - interval '1 hour'
  ) then
    return null;
  end if;

  insert into public.notifications (user_id, type, title, data)
  values (v_post.author_id, 'club_comment', 'New comment',
          jsonb_build_object('actor_id', new.author_id, 'post_id', new.post_id,
                             'club_id', v_post.club_id, 'club_slug', v_post.slug,
                             'club_name', v_post.name));
  return null;
end;
$$;

drop trigger if exists notify_club_comment on public.club_post_comments;
create trigger notify_club_comment
  after insert on public.club_post_comments
  for each row execute function public.notify_club_comment();

-- Join requests: the owner and admins hear about a new one; the notifications
-- go away once it's handled or cancelled.
create or replace function public.notify_club_request()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.notifications (user_id, type, title, data)
    select m.user_id, 'club_request', 'Join request',
           jsonb_build_object('actor_id', new.user_id, 'club_id', c.id,
                              'club_slug', c.slug, 'club_name', c.name)
    from public.club_members m
    join public.clubs c on c.id = m.club_id
    where m.club_id = new.club_id and m.role in ('owner', 'admin');
  elsif tg_op = 'DELETE' then
    delete from public.notifications n
    where n.type = 'club_request'
      and n.data ->> 'club_id' = old.club_id::text
      and n.data ->> 'actor_id' = old.user_id::text;
  end if;
  return null;
end;
$$;

drop trigger if exists notify_club_request on public.club_join_requests;
create trigger notify_club_request
  after insert or delete on public.club_join_requests
  for each row execute function public.notify_club_request();

-- Reports: club_id is filled from the post or comment; the shared
-- 10-per-day limit is the profile-report trigger (`before_report_insert`).
create or replace function public.before_club_report_insert()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
begin
  if new.comment_id is not null then
    select c.post_id into new.post_id from public.club_post_comments c where c.id = new.comment_id;
  end if;
  if new.post_id is not null then
    select p.club_id into new.club_id from public.club_posts p where p.id = new.post_id;
  end if;
  if new.club_id is null then
    raise exception 'Nothing to report.' using errcode = 'P0001', hint = 'not_found';
  end if;
  return new;
end;
$$;

drop trigger if exists a_before_club_report_insert on public.club_reports;
create trigger a_before_club_report_insert
  before insert on public.club_reports
  for each row execute function public.before_club_report_insert();
-- Named to run second (triggers fire in name order).
drop trigger if exists b_before_report_insert on public.club_reports;
create trigger b_before_report_insert
  before insert on public.club_reports
  for each row execute function public.before_report_insert();

-- ── 3. RPCs ────────────────────────────────────────────────────────────────

-- Shared checks for anything that adds a member.
create or replace function public.assert_can_join(p_club uuid, p_user uuid)
returns void
language plpgsql
security definer
set search_path to ''
as $$
begin
  if p_user is null then
    raise exception 'Sign in first.' using errcode = 'P0001', hint = 'not_signed_in';
  end if;
  if exists (select 1 from public.club_bans b where b.club_id = p_club and b.user_id = p_user) then
    raise exception 'You can''t join this club.' using errcode = 'P0001', hint = 'banned';
  end if;
  if (select count(*) from public.club_members m where m.user_id = p_user) >= 20 then
    raise exception 'You''re in 20 clubs already. Leave one to join another.'
      using errcode = 'P0001', hint = 'club_limit';
  end if;
end;
$$;

create or replace function public.create_club(
  p_name text, p_slug text, p_description text, p_type text, p_tags text[], p_is_public boolean
)
returns text
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_me uuid := (select auth.uid());
  v_id uuid;
begin
  if v_me is null then
    raise exception 'Sign in first.' using errcode = 'P0001', hint = 'not_signed_in';
  end if;
  if not public.has_chosen_username(v_me) then
    raise exception 'Choose a username before creating a club.'
      using errcode = 'P0001', hint = 'needs_username';
  end if;
  if (select count(*) from public.club_members m where m.user_id = v_me and m.role = 'owner') >= 3 then
    raise exception 'You own 3 clubs already.' using errcode = 'P0001', hint = 'owned_limit';
  end if;
  if (select count(*) from public.club_members m where m.user_id = v_me) >= 20 then
    raise exception 'You''re in 20 clubs already. Leave one to create another.'
      using errcode = 'P0001', hint = 'club_limit';
  end if;

  begin
    insert into public.clubs (name, slug, description, type, tags, is_public, created_by)
    values (btrim(p_name), lower(btrim(p_slug)), nullif(btrim(p_description), ''),
            p_type, coalesce(p_tags, '{}'), coalesce(p_is_public, true), v_me)
    returning id into v_id;
  exception when unique_violation then
    if exists (select 1 from public.clubs c where lower(c.name) = lower(btrim(p_name))) then
      raise exception 'A club with that name already exists.' using errcode = 'P0001', hint = 'name_taken';
    end if;
    raise exception 'That address is taken.' using errcode = 'P0001', hint = 'slug_taken';
  end;

  insert into public.club_members (club_id, user_id, role) values (v_id, v_me, 'owner');
  return lower(btrim(p_slug));
end;
$$;

create or replace function public.join_club(p_club uuid)
returns void
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_me uuid := (select auth.uid());
begin
  if public.club_role_of(p_club, v_me) is not null then
    return;
  end if;
  if not exists (select 1 from public.clubs c where c.id = p_club and c.is_public) then
    raise exception 'This club is private. Ask to join instead.' using errcode = 'P0001', hint = 'private';
  end if;
  perform public.assert_can_join(p_club, v_me);
  insert into public.club_members (club_id, user_id) values (p_club, v_me);
  delete from public.club_join_requests r where r.club_id = p_club and r.user_id = v_me;
end;
$$;

create or replace function public.request_to_join(p_club uuid, p_message text default null)
returns void
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_me uuid := (select auth.uid());
begin
  if public.club_role_of(p_club, v_me) is not null then
    return;
  end if;
  if not exists (select 1 from public.clubs c where c.id = p_club) then
    raise exception 'Club not found.' using errcode = 'P0001', hint = 'not_found';
  end if;
  if exists (select 1 from public.clubs c where c.id = p_club and c.is_public) then
    raise exception 'This club is public. Join it directly.' using errcode = 'P0001', hint = 'public';
  end if;
  perform public.assert_can_join(p_club, v_me);
  if exists (select 1 from public.club_join_requests r where r.club_id = p_club and r.user_id = v_me) then
    return;
  end if;
  if char_length(coalesce(p_message, '')) > 200 then
    raise exception 'Keep the message under 200 characters.' using errcode = 'P0001', hint = 'too_long';
  end if;
  if (select count(*) from public.social_rate_events e
      where e.user_id = v_me and e.kind = 'club_join_request'
        and e.created_at > now() - interval '1 hour') >= 20 then
    raise exception 'Too many join requests in the last hour. Try again later.'
      using errcode = 'P0001', hint = 'rate_limited';
  end if;
  insert into public.social_rate_events (user_id, kind) values (v_me, 'club_join_request');

  insert into public.club_join_requests (club_id, user_id, message)
  values (p_club, v_me, nullif(btrim(p_message), ''));
end;
$$;

-- Approve or decline. The request row is deleted either way (a declined cuber
-- may ask again, within the hourly limit).
create or replace function public.respond_to_join_request(p_request uuid, p_approve boolean)
returns void
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_me  uuid := (select auth.uid());
  v_req record;
begin
  select r.id, r.club_id, r.user_id, c.slug, c.name
    into v_req
  from public.club_join_requests r
  join public.clubs c on c.id = r.club_id
  where r.id = p_request;

  if v_req.id is null then
    raise exception 'That request is gone.' using errcode = 'P0001', hint = 'not_found';
  end if;
  if public.club_role_of(v_req.club_id, v_me) not in ('owner', 'admin') or public.club_role_of(v_req.club_id, v_me) is null then
    raise exception 'Only the club''s owner and admins can do that.' using errcode = 'P0001', hint = 'forbidden';
  end if;

  if p_approve then
    perform public.assert_can_join(v_req.club_id, v_req.user_id);
    insert into public.club_members (club_id, user_id) values (v_req.club_id, v_req.user_id)
    on conflict do nothing;
    insert into public.notifications (user_id, type, title, data)
    values (v_req.user_id, 'club_request_approved', 'Request approved',
            jsonb_build_object('actor_id', v_me, 'club_id', v_req.club_id,
                               'club_slug', v_req.slug, 'club_name', v_req.name));
  end if;
  delete from public.club_join_requests r where r.id = p_request;
end;
$$;

create or replace function public.leave_club(p_club uuid)
returns void
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_me uuid := (select auth.uid());
begin
  if public.club_role_of(p_club, v_me) = 'owner' then
    raise exception 'Transfer ownership before leaving.' using errcode = 'P0001', hint = 'owner';
  end if;
  delete from public.club_members m where m.club_id = p_club and m.user_id = v_me;
end;
$$;

-- Owner removes anyone but themselves; admins remove members only.
-- `p_ban` also stops them coming back (requests and invite links).
create or replace function public.remove_club_member(p_club uuid, p_user uuid, p_ban boolean default false)
returns void
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_me     uuid := (select auth.uid());
  v_mine   public.club_role := public.club_role_of(p_club, v_me);
  v_theirs public.club_role := public.club_role_of(p_club, p_user);
begin
  if v_mine is null or v_mine not in ('owner', 'admin') then
    raise exception 'Only the club''s owner and admins can do that.' using errcode = 'P0001', hint = 'forbidden';
  end if;
  if p_user = v_me then
    raise exception 'Use Leave to leave the club.' using errcode = 'P0001', hint = 'self';
  end if;
  if v_theirs = 'owner' or (v_theirs = 'admin' and v_mine <> 'owner') then
    raise exception 'Only the owner can remove an admin.' using errcode = 'P0001', hint = 'forbidden';
  end if;

  delete from public.club_members m where m.club_id = p_club and m.user_id = p_user;
  if p_ban then
    insert into public.club_bans (club_id, user_id, banned_by) values (p_club, p_user, v_me)
    on conflict do nothing;
    delete from public.club_join_requests r where r.club_id = p_club and r.user_id = p_user;
  end if;
end;
$$;

create or replace function public.unban_club_member(p_club uuid, p_user uuid)
returns void
language plpgsql
security definer
set search_path to ''
as $$
begin
  if public.club_role_of(p_club, (select auth.uid())) is null
     or public.club_role_of(p_club, (select auth.uid())) not in ('owner', 'admin') then
    raise exception 'Only the club''s owner and admins can do that.' using errcode = 'P0001', hint = 'forbidden';
  end if;
  delete from public.club_bans b where b.club_id = p_club and b.user_id = p_user;
end;
$$;

-- Owner only: make a member an admin, or an admin a member.
create or replace function public.set_club_member_role(p_club uuid, p_user uuid, p_role public.club_role)
returns void
language plpgsql
security definer
set search_path to ''
as $$
begin
  if public.club_role_of(p_club, (select auth.uid())) is distinct from 'owner' then
    raise exception 'Only the owner can change roles.' using errcode = 'P0001', hint = 'forbidden';
  end if;
  if p_role not in ('admin', 'member') then
    raise exception 'Use Transfer ownership to change the owner.' using errcode = 'P0001', hint = 'bad_role';
  end if;
  if public.club_role_of(p_club, p_user) is null or public.club_role_of(p_club, p_user) = 'owner' then
    raise exception 'That cuber isn''t a member.' using errcode = 'P0001', hint = 'not_member';
  end if;
  update public.club_members m set role = p_role where m.club_id = p_club and m.user_id = p_user;
end;
$$;

-- The current owner becomes an admin.
create or replace function public.transfer_club_ownership(p_club uuid, p_user uuid)
returns void
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_me uuid := (select auth.uid());
begin
  if public.club_role_of(p_club, v_me) is distinct from 'owner' then
    raise exception 'Only the owner can transfer the club.' using errcode = 'P0001', hint = 'forbidden';
  end if;
  if p_user = v_me or public.club_role_of(p_club, p_user) is null then
    raise exception 'Pick another member of the club.' using errcode = 'P0001', hint = 'not_member';
  end if;
  if (select count(*) from public.club_members m where m.user_id = p_user and m.role = 'owner') >= 3 then
    raise exception 'That cuber owns 3 clubs already.' using errcode = 'P0001', hint = 'owned_limit';
  end if;
  update public.club_members m set role = 'admin' where m.club_id = p_club and m.user_id = v_me;
  update public.club_members m set role = 'owner' where m.club_id = p_club and m.user_id = p_user;
end;
$$;

-- Invite links. p_days: 1, 7, 30, or null for never.
create or replace function public.create_club_invite(p_club uuid, p_days integer default 7, p_max_uses integer default null)
returns text
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_token text;
begin
  if public.club_role_of(p_club, (select auth.uid())) is null
     or public.club_role_of(p_club, (select auth.uid())) not in ('owner', 'admin') then
    raise exception 'Only the club''s owner and admins can make invite links.' using errcode = 'P0001', hint = 'forbidden';
  end if;
  if p_days is not null and p_days not in (1, 7, 30) then
    raise exception 'Invite links last 1, 7 or 30 days, or never expire.' using errcode = 'P0001', hint = 'bad_expiry';
  end if;
  insert into public.club_invites (club_id, created_by, expires_at, max_uses)
  values (p_club, (select auth.uid()),
          case when p_days is null then null else now() + make_interval(days => p_days) end,
          p_max_uses)
  returning token into v_token;
  return v_token;
end;
$$;

create or replace function public.revoke_club_invite(p_invite uuid)
returns void
language plpgsql
security definer
set search_path to ''
as $$
begin
  update public.club_invites i
  set revoked_at = coalesce(i.revoked_at, now())
  where i.id = p_invite
    and public.club_role_of(i.club_id, (select auth.uid())) in ('owner', 'admin');
  if not found then
    raise exception 'Invite link not found.' using errcode = 'P0001', hint = 'not_found';
  end if;
end;
$$;

-- The invite landing page: which club, and whether the link still works for
-- the caller. Readable signed out (the page then asks them to sign in).
create or replace function public.get_club_invite(p_token text)
returns table (
  club_id uuid, slug text, name text, type text, tags text[], description text,
  member_count integer, is_public boolean, status text
)
language sql
stable
security definer
set search_path to ''
as $$
  select c.id, c.slug, c.name, c.type, c.tags, c.description, c.member_count, c.is_public,
         case
           when i.revoked_at is not null then 'revoked'
           when i.expires_at is not null and i.expires_at <= now() then 'expired'
           when i.max_uses is not null and i.uses >= i.max_uses then 'used_up'
           when exists (select 1 from public.club_members m
                        where m.club_id = c.id and m.user_id = (select auth.uid())) then 'member'
           when exists (select 1 from public.club_bans b
                        where b.club_id = c.id and b.user_id = (select auth.uid())) then 'banned'
           else 'valid'
         end
  from public.club_invites i
  join public.clubs c on c.id = i.club_id
  where i.token = p_token;
$$;

-- Joins through an invite link, even a private club. Returns the club's slug.
create or replace function public.use_club_invite(p_token text)
returns text
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_me  uuid := (select auth.uid());
  v_inv record;
begin
  select i.id, i.club_id, i.expires_at, i.max_uses, i.uses, i.revoked_at, c.slug
    into v_inv
  from public.club_invites i
  join public.clubs c on c.id = i.club_id
  where i.token = p_token
  for update of i;

  if v_inv.id is null then
    raise exception 'This invite link doesn''t exist.' using errcode = 'P0001', hint = 'not_found';
  end if;
  if public.club_role_of(v_inv.club_id, v_me) is not null then
    return v_inv.slug;
  end if;
  if v_inv.revoked_at is not null
     or (v_inv.expires_at is not null and v_inv.expires_at <= now())
     or (v_inv.max_uses is not null and v_inv.uses >= v_inv.max_uses) then
    raise exception 'This invite link has expired.' using errcode = 'P0001', hint = 'expired';
  end if;
  perform public.assert_can_join(v_inv.club_id, v_me);

  insert into public.club_members (club_id, user_id) values (v_inv.club_id, v_me);
  update public.club_invites i set uses = i.uses + 1 where i.id = v_inv.id;
  delete from public.club_join_requests r where r.club_id = v_inv.club_id and r.user_id = v_me;
  return v_inv.slug;
end;
$$;

-- Owner/admins pin (max 3 per club) or unpin. Pinning tells every other member.
create or replace function public.set_club_post_pinned(p_post uuid, p_pinned boolean)
returns void
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_me   uuid := (select auth.uid());
  v_post record;
begin
  select p.id, p.club_id, p.pinned_at, c.slug, c.name
    into v_post
  from public.club_posts p
  join public.clubs c on c.id = p.club_id
  where p.id = p_post
  for update of p;

  if v_post.id is null then
    raise exception 'Post not found.' using errcode = 'P0001', hint = 'not_found';
  end if;
  if public.club_role_of(v_post.club_id, v_me) is null
     or public.club_role_of(v_post.club_id, v_me) not in ('owner', 'admin') then
    raise exception 'Only the club''s owner and admins can pin posts.' using errcode = 'P0001', hint = 'forbidden';
  end if;

  if not p_pinned then
    update public.club_posts p set pinned_at = null, pinned_by = null where p.id = p_post;
    return;
  end if;
  if v_post.pinned_at is not null then
    return;
  end if;
  if (select count(*) from public.club_posts p
      where p.club_id = v_post.club_id and p.pinned_at is not null) >= 3 then
    raise exception 'Unpin a post first: a club can pin 3.' using errcode = 'P0001', hint = 'pin_limit';
  end if;

  update public.club_posts p set pinned_at = now(), pinned_by = v_me where p.id = p_post;

  insert into public.notifications (user_id, type, title, data)
  select m.user_id, 'club_post_pinned', 'New announcement',
         jsonb_build_object('actor_id', v_me, 'post_id', p_post, 'club_id', v_post.club_id,
                            'club_slug', v_post.slug, 'club_name', v_post.name)
  from public.club_members m
  where m.club_id = v_post.club_id and m.user_id <> v_me;
end;
$$;

-- Solves per member this week (Monday 00:00 to now, IST). Counts only.
create or replace function public.get_club_activity(p_club uuid)
returns table (
  user_id uuid, username text, display_name text, avatar_url text,
  role public.club_role, solves_this_week integer
)
language sql
stable
security definer
set search_path to ''
as $$
  with week as (
    select (date_trunc('week', now() at time zone 'Asia/Kolkata')) at time zone 'Asia/Kolkata' as starts
  )
  select p.id, p.username, p.display_name, p.avatar_url, m.role,
         (select count(*)::integer from public.solves s, week
          where s.user_id = m.user_id
            and s.created_at >= week.starts
            and s.deleted_at is null
            and not s.excluded)
  from public.club_members m
  join public.profiles p on p.id = m.user_id
  where m.club_id = p_club
    and public.club_visible_to_me(p_club)
    and not public.is_blocked_between((select auth.uid()), m.user_id)
  order by 6 desc, p.username;
$$;

-- The Clubs row on a profile: public clubs, plus private ones I'm also in.
create or replace function public.get_profile_clubs(p_user uuid)
returns table (
  club_id uuid, slug text, name text, type text, is_public boolean,
  member_count integer, role public.club_role
)
language sql
stable
security definer
set search_path to ''
as $$
  select c.id, c.slug, c.name, c.type, c.is_public, c.member_count, m.role
  from public.club_members m
  join public.clubs c on c.id = m.club_id
  where m.user_id = p_user
    and not public.is_blocked_between((select auth.uid()), p_user)
    and (
      c.is_public
      or exists (select 1 from public.club_members me
                 where me.club_id = c.id and me.user_id = (select auth.uid()))
    )
  order by (m.role = 'owner') desc, c.member_count desc, c.name;
$$;

-- ── Grants ─────────────────────────────────────────────────────────────────
-- Supabase grants EXECUTE on new functions to anon and authenticated
-- directly, so revoking from `public` alone isn't enough: revoke from all
-- three, then grant back exactly what each role needs.
revoke all on function public.club_role_of(uuid, uuid)              from public, anon, authenticated;
revoke all on function public.club_visible_to_me(uuid)              from public, anon, authenticated;
revoke all on function public.can_see_club_post(uuid)               from public, anon, authenticated;
revoke all on function public.club_member_of_post(uuid)             from public, anon, authenticated;
revoke all on function public.has_chosen_username(uuid)             from public, anon, authenticated;
revoke all on function public.assert_can_join(uuid, uuid)           from public, anon, authenticated;
revoke all on function public.create_club(text, text, text, text, text[], boolean) from public, anon, authenticated;
revoke all on function public.join_club(uuid)                       from public, anon, authenticated;
revoke all on function public.request_to_join(uuid, text)           from public, anon, authenticated;
revoke all on function public.respond_to_join_request(uuid, boolean) from public, anon, authenticated;
revoke all on function public.leave_club(uuid)                      from public, anon, authenticated;
revoke all on function public.remove_club_member(uuid, uuid, boolean) from public, anon, authenticated;
revoke all on function public.unban_club_member(uuid, uuid)         from public, anon, authenticated;
revoke all on function public.set_club_member_role(uuid, uuid, public.club_role) from public, anon, authenticated;
revoke all on function public.transfer_club_ownership(uuid, uuid)   from public, anon, authenticated;
revoke all on function public.create_club_invite(uuid, integer, integer) from public, anon, authenticated;
revoke all on function public.revoke_club_invite(uuid)              from public, anon, authenticated;
revoke all on function public.get_club_invite(text)                 from public, anon, authenticated;
revoke all on function public.use_club_invite(text)                 from public, anon, authenticated;
revoke all on function public.set_club_post_pinned(uuid, boolean)   from public, anon, authenticated;
revoke all on function public.get_club_activity(uuid)               from public, anon, authenticated;
revoke all on function public.get_profile_clubs(uuid)               from public, anon, authenticated;

-- Used inside RLS policies, so both roles need them.
grant execute on function public.club_role_of(uuid, uuid)           to anon, authenticated;
grant execute on function public.club_visible_to_me(uuid)           to anon, authenticated;
grant execute on function public.can_see_club_post(uuid)            to anon, authenticated;
grant execute on function public.club_member_of_post(uuid)          to authenticated;
grant execute on function public.has_chosen_username(uuid)          to authenticated;

grant execute on function public.create_club(text, text, text, text, text[], boolean) to authenticated;
grant execute on function public.join_club(uuid)                    to authenticated;
grant execute on function public.request_to_join(uuid, text)        to authenticated;
grant execute on function public.respond_to_join_request(uuid, boolean) to authenticated;
grant execute on function public.leave_club(uuid)                   to authenticated;
grant execute on function public.remove_club_member(uuid, uuid, boolean) to authenticated;
grant execute on function public.unban_club_member(uuid, uuid)      to authenticated;
grant execute on function public.set_club_member_role(uuid, uuid, public.club_role) to authenticated;
grant execute on function public.transfer_club_ownership(uuid, uuid) to authenticated;
grant execute on function public.create_club_invite(uuid, integer, integer) to authenticated;
grant execute on function public.revoke_club_invite(uuid)           to authenticated;
grant execute on function public.get_club_invite(text)              to anon, authenticated;
grant execute on function public.use_club_invite(text)              to authenticated;
grant execute on function public.set_club_post_pinned(uuid, boolean) to authenticated;
grant execute on function public.get_club_activity(uuid)            to anon, authenticated;
grant execute on function public.get_profile_clubs(uuid)            to anon, authenticated;

-- Trigger functions: not part of the API.
revoke all on function public.before_club_post_insert()    from public, anon, authenticated;
revoke all on function public.before_club_post_update()    from public, anon, authenticated;
revoke all on function public.before_club_comment_insert() from public, anon, authenticated;
revoke all on function public.notify_club_comment()        from public, anon, authenticated;
revoke all on function public.notify_club_request()        from public, anon, authenticated;
revoke all on function public.before_club_report_insert()  from public, anon, authenticated;
