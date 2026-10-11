-- Test for 20261013000000_profile_edit.sql: privacy and the WCA ID format.
-- (Avatar storage has its own test: avatars_storage_test.sql.)
--
-- SAFE TO RUN ON PRODUCTION. Everything happens inside a transaction that ends
-- in ROLLBACK. It creates two throwaway users and acts as them the way
-- PostgREST does. Run in the Supabase dashboard SQL editor; expect every row
-- to be PASS.

begin;

-- This is the TEST. Its migration must be applied first.
do $$
begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'is_public') then
    raise exception 'Apply supabase/migrations/20261013000000_profile_edit.sql first, then run this test.';
  end if;
end;
$$;

create temp table results (step text, expected text, actual text, verdict text)
on commit drop;
grant all on results to anon, authenticated;

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data) values
  ('a0000000-0000-4000-8000-00000000000a', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'edit-test-a@example.com', '{}'),
  ('b0000000-0000-4000-8000-00000000000b', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'edit-test-b@example.com', '{}');

insert into public.sessions (id, user_id, puzzle_type, name) values
  ('b0000000-5e55-4000-8000-000000000001', 'b0000000-0000-4000-8000-00000000000b', 'pyra', 'B');
-- Two Pyraminx solves give B a single PB (via the triggers).
insert into public.solves (user_id, session_id, puzzle_type, time_ms, scramble, created_at) values
  ('b0000000-0000-4000-8000-00000000000b', 'b0000000-5e55-4000-8000-000000000001', 'pyra', 5000, 'R', now() - interval '1 minute'),
  ('b0000000-0000-4000-8000-00000000000b', 'b0000000-5e55-4000-8000-000000000001', 'pyra', 4000, 'R', now());

insert into results
select 'profiles are public by default', 'true',
       (select is_public::text from public.profiles where id = 'b0000000-0000-4000-8000-00000000000b'), null;

-- ── As A, B public ────────────────────────────────────────────────────────
set local role authenticated;
select set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-00000000000a', true);
insert into results
select 'public: A sees B''s PBs', '1',
       (select count(*)::text from public.personal_bests
        where user_id = 'b0000000-0000-4000-8000-00000000000b' and category = 'single'), null;
insert into results
select 'public: A sees B''s stats', '2',
       public.get_profile_stats('b0000000-0000-4000-8000-00000000000b')->>'total_solves', null;
reset role;

update public.profiles set is_public = false where id = 'b0000000-0000-4000-8000-00000000000b';

-- ── As A, B private ───────────────────────────────────────────────────────
set local role authenticated;
select set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-00000000000a', true);
insert into results
select 'private: A sees none of B''s PBs', '0',
       (select count(*)::text from public.personal_bests
        where user_id = 'b0000000-0000-4000-8000-00000000000b'), null;
insert into results
select 'private: stats say private and carry no numbers', 'true|',
       concat_ws('|',
         public.get_profile_stats('b0000000-0000-4000-8000-00000000000b')->>'private',
         coalesce(public.get_profile_stats('b0000000-0000-4000-8000-00000000000b')->>'total_solves', '')), null;
insert into results
select 'private: the name is still readable', '1',
       (select count(*)::text from public.profiles where id = 'b0000000-0000-4000-8000-00000000000b'), null;
reset role;

-- ── As anon, B private ────────────────────────────────────────────────────
set local role anon;
select set_config('request.jwt.claim.sub', '', true);
insert into results
select 'private: signed-out visitors see no PBs', '0',
       (select count(*)::text from public.personal_bests
        where user_id = 'b0000000-0000-4000-8000-00000000000b'), null;
reset role;

-- ── As B (the owner), B private ───────────────────────────────────────────
set local role authenticated;
select set_config('request.jwt.claim.sub', 'b0000000-0000-4000-8000-00000000000b', true);
insert into results
select 'private: the owner still sees their PBs', '1',
       (select count(*)::text from public.personal_bests
        where user_id = 'b0000000-0000-4000-8000-00000000000b' and category = 'single'), null;
insert into results
select 'private: the owner still sees their stats', '2',
       public.get_profile_stats('b0000000-0000-4000-8000-00000000000b')->>'total_solves', null;

-- WCA ID format, written as the owner.
do $$
begin
  begin
    update public.profiles set wca_id = 'not-a-wca-id' where id = 'b0000000-0000-4000-8000-00000000000b';
    insert into results values ('a malformed WCA ID is refused', 'refused', 'accepted', null);
  exception when check_violation then
    insert into results values ('a malformed WCA ID is refused', 'refused', 'refused', null);
  end;
end;
$$;
update public.profiles set wca_id = '2019TEST01' where id = 'b0000000-0000-4000-8000-00000000000b';
insert into results
select 'a well-formed WCA ID is saved', '2019TEST01',
       (select wca_id from public.profiles where id = 'b0000000-0000-4000-8000-00000000000b'), null;

reset role;

update results
set verdict = case when expected = actual then 'PASS' else 'FAIL' end
where verdict is null;

select step, expected, actual, verdict from results;

rollback;
