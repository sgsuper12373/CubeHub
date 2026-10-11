-- Test for 20261016000000_profile_setup.sql: main cube per event, method,
-- and the timer-only Ao12 level.
--
-- SAFE TO RUN ON PRODUCTION. Everything happens inside a transaction that ends
-- in ROLLBACK. It creates two throwaway users and acts as them the way
-- PostgREST does. Run in the Supabase dashboard SQL editor; expect every row
-- to be PASS.

begin;

-- This is the TEST. Its migration must be applied first.
do $$
begin
  if to_regclass('public.user_setups') is null then
    raise exception 'Apply supabase/migrations/20261016000000_profile_setup.sql first, then run this test.';
  end if;
end;
$$;

create temp table results (step text, expected text, actual text, verdict text)
on commit drop;
grant all on results to anon, authenticated;

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data) values
  ('a0000000-0000-4000-8000-00000000000a', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'setup-test-a@example.com', '{}'),
  ('b0000000-0000-4000-8000-00000000000b', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'setup-test-b@example.com', '{}');

-- ── 1. B manages B's own setup ────────────────────────────────────────────
set local role authenticated;
select set_config('request.jwt.claim.sub', 'b0000000-0000-4000-8000-00000000000b', true);
insert into public.user_setups (user_id, puzzle_type, cube_name) values
  ('b0000000-0000-4000-8000-00000000000b', '333', 'GAN 12'),
  ('b0000000-0000-4000-8000-00000000000b', '222', 'MGC 2x2');
update public.user_setups set cube_name = 'GAN 12 Maglev'
  where user_id = 'b0000000-0000-4000-8000-00000000000b' and puzzle_type = '333';
delete from public.user_setups
  where user_id = 'b0000000-0000-4000-8000-00000000000b' and puzzle_type = '222';
insert into results
select 'the owner can add, change and remove', '333:GAN 12 Maglev',
       (select string_agg(puzzle_type || ':' || cube_name, ',') from public.user_setups
        where user_id = 'b0000000-0000-4000-8000-00000000000b'), null;
reset role;

-- ── 2. A can read it but not change it ────────────────────────────────────
set local role authenticated;
select set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-00000000000a', true);
insert into results
select 'another user sees it while B is public', 'GAN 12 Maglev',
       (select cube_name from public.user_setups where user_id = 'b0000000-0000-4000-8000-00000000000b'), null;
update public.user_setups set cube_name = 'hacked' where user_id = 'b0000000-0000-4000-8000-00000000000b';
delete from public.user_setups where user_id = 'b0000000-0000-4000-8000-00000000000b';
do $$
begin
  begin
    insert into public.user_setups (user_id, puzzle_type, cube_name)
    values ('b0000000-0000-4000-8000-00000000000b', 'pyra', 'planted');
    insert into results values ('another user cannot add to it', 'refused', 'accepted', null);
  exception when insufficient_privilege then
    insert into results values ('another user cannot add to it', 'refused', 'refused', null);
  end;
end;
$$;
reset role;
insert into results
select 'another user''s update and delete change nothing', 'GAN 12 Maglev',
       (select string_agg(cube_name, ',') from public.user_setups
        where user_id = 'b0000000-0000-4000-8000-00000000000b'), null;

-- ── 3. Private hides it ───────────────────────────────────────────────────
update public.profiles set is_public = false where id = 'b0000000-0000-4000-8000-00000000000b';
set local role authenticated;
select set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-00000000000a', true);
insert into results
select 'hidden once B is private', '0',
       (select count(*)::text from public.user_setups where user_id = 'b0000000-0000-4000-8000-00000000000b'), null;
reset role;
update public.profiles set is_public = true where id = 'b0000000-0000-4000-8000-00000000000b';

-- ── 4. Method and learning line ───────────────────────────────────────────
update public.profiles set main_method = 'roux', learning_now = 'CMLL'
  where id = 'b0000000-0000-4000-8000-00000000000b';
insert into results
select 'a valid method and learning line are saved', 'roux|CMLL',
       (select main_method || '|' || learning_now from public.profiles where id = 'b0000000-0000-4000-8000-00000000000b'), null;
do $$
begin
  begin
    update public.profiles set main_method = 'blindfolded-magic' where id = 'b0000000-0000-4000-8000-00000000000b';
    insert into results values ('an unknown method is refused', 'refused', 'accepted', null);
  exception when check_violation then
    insert into results values ('an unknown method is refused', 'refused', 'refused', null);
  end;
  begin
    update public.profiles set learning_now = repeat('x', 81) where id = 'b0000000-0000-4000-8000-00000000000b';
    insert into results values ('a learning line over 80 characters is refused', 'refused', 'accepted', null);
  exception when check_violation then
    insert into results values ('a learning line over 80 characters is refused', 'refused', 'refused', null);
  end;
end;
$$;

-- ── 5. Level: the timer-only Ao12 ─────────────────────────────────────────
-- Twelve timed solves of 18.00 (Ao12 = 18.00) and a typed 9.00 in the same
-- session, which must not pull the level down.
insert into public.sessions (id, user_id, puzzle_type, name) values
  ('b0000000-5e55-4000-8000-000000000001', 'b0000000-0000-4000-8000-00000000000b', '333', 'B');
insert into public.solves (user_id, session_id, puzzle_type, time_ms, scramble, source, created_at)
select 'b0000000-0000-4000-8000-00000000000b', 'b0000000-5e55-4000-8000-000000000001', '333',
       18000, 'R', 'web', now() - (i || ' minutes')::interval
from generate_series(1, 12) i;
insert into public.solves (user_id, session_id, puzzle_type, time_ms, scramble, source, created_at)
values ('b0000000-0000-4000-8000-00000000000b', 'b0000000-5e55-4000-8000-000000000001', '333', 9000, 'R', 'manual', now());

set local role anon;
select set_config('request.jwt.claim.sub', '', true);
insert into results
select 'level is the timer-only Ao12, ignoring the typed 9.00', '{"333": 18000}',
       (public.get_profile_stats('b0000000-0000-4000-8000-00000000000b')->'levels')::text, null;
insert into results
select 'the rest of the stats are unchanged (13 solves)', '13',
       public.get_profile_stats('b0000000-0000-4000-8000-00000000000b')->>'total_solves', null;
insert into results
select 'no Ao12 yet means no level', '{}',
       (public.get_profile_stats('a0000000-0000-4000-8000-00000000000a')->'levels')::text, null;
reset role;

update results
set verdict = case when expected = actual then 'PASS' else 'FAIL' end
where verdict is null;

select step, expected, actual, verdict from results;

rollback;
