-- The roadmap waitlist (docs/landing-plan.md → Roadmap and sign-up).
--
-- Applied to the live project 2026-11-25 (supabase db push).
--
-- Nobody reads this table through the API: RLS is on with no policies, and
-- anon/authenticated hold no table privileges. Sign-ups go through the
-- security-definer `join_waitlist()` function, which can only insert, and
-- ignores a duplicate address silently.
--
-- `email` is stored trimmed and lower-cased (by the function and the server
-- action) under a plain unique constraint. The plan suggested citext; storing
-- one canonical form gives the same uniqueness without an extension.

create table if not exists public.waitlist (
  id         bigint generated always as identity primary key,
  email      text not null unique
             check (char_length(email) between 3 and 254 and email = lower(email) and email !~ '\s'),
  source     text not null default 'landing-roadmap' check (char_length(source) <= 40),
  created_at timestamptz not null default now()
);

alter table public.waitlist enable row level security;
revoke all on table public.waitlist from anon, authenticated;

create or replace function public.join_waitlist(p_email text, p_source text default 'landing-roadmap')
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(trim(p_email));
begin
  if v_email is null or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]{2,}$' or char_length(v_email) > 254 then
    raise exception 'invalid email' using errcode = '22023';
  end if;
  insert into public.waitlist (email, source)
  values (v_email, coalesce(nullif(left(trim(p_source), 40), ''), 'landing-roadmap'))
  on conflict (email) do nothing;
end;
$$;

revoke all on function public.join_waitlist(text, text) from public;
grant execute on function public.join_waitlist(text, text) to anon, authenticated;

comment on table public.waitlist is 'Roadmap "Notify me" sign-ups. No API read access; insert via join_waitlist().';
