-- 3x3 BLD memo times and limits (20261126000100_bld_memo.sql). Run in the SQL
-- editor after applying the migration; every notice should say PASS. Rolls back.
begin;

insert into auth.users (id, email, raw_user_meta_data)
values ('b1d00000-0000-4000-8000-00000000000a', 'bld-test@example.com', '{}');

insert into public.sessions (id, user_id, puzzle_type, name)
values ('b1d00000-5e55-4000-8000-000000000001', 'b1d00000-0000-4000-8000-00000000000a', '333bf', 'BLD');

do $$
declare
  uid constant uuid := 'b1d00000-0000-4000-8000-00000000000a';
  sid constant uuid := 'b1d00000-5e55-4000-8000-000000000001';
begin
  insert into public.solves (id, user_id, session_id, puzzle_type, time_ms, scramble)
  values ('b1d00000-0001-4000-8000-000000000001', uid, sid, '333bf', 61000, 'R U');
  raise notice 'a solve without a memo split has a null memo: %',
    case when (select memo_ms from public.solves where id = 'b1d00000-0001-4000-8000-000000000001') is null then 'PASS' else 'FAIL' end;

  insert into public.solves (id, user_id, session_id, puzzle_type, time_ms, scramble, memo_ms)
  values ('b1d00000-0001-4000-8000-000000000002', uid, sid, '333bf', 64000, 'R U', 23410);
  raise notice 'a memo shorter than the solve is stored: %',
    case when (select memo_ms from public.solves where id = 'b1d00000-0001-4000-8000-000000000002') = 23410 then 'PASS' else 'FAIL' end;
end $$;

do $$
begin
  insert into public.solves (id, user_id, session_id, puzzle_type, time_ms, scramble, memo_ms)
  values ('b1d00000-0001-4000-8000-000000000003', 'b1d00000-0000-4000-8000-00000000000a', 'b1d00000-5e55-4000-8000-000000000001', '333bf', 30000, 'R', 30000);
  raise notice 'a memo as long as the solve is refused: FAIL';
exception when check_violation then
  raise notice 'a memo as long as the solve is refused: PASS';
end $$;

do $$
begin
  insert into public.solves (id, user_id, session_id, puzzle_type, time_ms, scramble, memo_ms)
  values ('b1d00000-0001-4000-8000-000000000004', 'b1d00000-0000-4000-8000-00000000000a', 'b1d00000-5e55-4000-8000-000000000001', '333bf', 30000, 'R', 0);
  raise notice 'a zero memo is refused: FAIL';
exception when check_violation then
  raise notice 'a zero memo is refused: PASS';
end $$;

do $$
begin
  raise notice 'BLD limits (misfire 10 s, mis-stop 8 s): %',
    case when public.misfire_limit_ms('333bf') = 10000 and public.misstop_limit_ms('333bf') = 8000 then 'PASS' else 'FAIL' end;
  raise notice 'other events unchanged: %',
    case when public.misfire_limit_ms('333') = 3000 and public.misstop_limit_ms('333') = 2000
          and public.misfire_limit_ms('333oh') = 5000 and public.misstop_limit_ms('clock') = 1200
          and public.misfire_limit_ms('444bf') = 1000 then 'PASS' else 'FAIL' end;
end $$;

rollback;
