-- Daily scramble (20261125000100_daily_scramble.sql). Run after applying the
-- migration (`supabase db query --linked -f supabase/tests/daily_scramble_test.sql`
-- or the SQL editor); every notice should say PASS. Rolls back.
begin;

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data) values
  ('d1a00000-0000-4000-8000-0000000000d1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'daily-a@example.com', '{}'),
  ('d2b00000-0000-4000-8000-0000000000d2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'daily-b@example.com', '{}');

-- Yesterday, today and tomorrow (IST), so the window can be checked. Days
-- that already exist (seeded) keep their scramble.
insert into public.daily_scrambles (day, scramble) values
  (public.ist_today() - 2, 'R U R'' U'''),
  (public.ist_today() - 1, 'R U R'' U'''),
  (public.ist_today(),     'F R U R'' U'' F'''),
  (public.ist_today() + 1, 'L U L'' U''')
on conflict (day) do nothing;

do $$
begin
  raise notice 'ist_today is the date in Asia/Kolkata: %',
    case when public.ist_today() = (now() at time zone 'Asia/Kolkata')::date then 'PASS' else 'FAIL' end;
end $$;

-- ── As A ──
set local role authenticated;
select set_config('request.jwt.claim.sub', 'd1a00000-0000-4000-8000-0000000000d1', true);

do $$
begin
  raise notice 'first post is recorded: %',
    case when public.submit_daily_result(public.ist_today(), 12345, 'none') then 'PASS' else 'FAIL' end;
  raise notice 'a second post the same day is ignored: %',
    case when not public.submit_daily_result(public.ist_today(), 9000, 'none') then 'PASS' else 'FAIL' end;
  raise notice 'the first result stands: %',
    case when (select time_ms from public.daily_results
               where day = public.ist_today() and user_id = 'd1a00000-0000-4000-8000-0000000000d1') = 12345
         then 'PASS' else 'FAIL' end;
  raise notice 'yesterday can still post (just before midnight): %',
    case when public.submit_daily_result(public.ist_today() - 1, 20000, 'plus2') then 'PASS' else 'FAIL' end;
  raise notice '+2 is ranked with the penalty applied: %',
    case when (select effective_ms from public.daily_results
               where day = public.ist_today() - 1 and user_id = 'd1a00000-0000-4000-8000-0000000000d1') = 22000
         then 'PASS' else 'FAIL' end;
end $$;

do $$
begin
  perform public.submit_daily_result(public.ist_today() - 2, 12000, 'none');
  raise notice 'two days ago is closed: FAIL';
exception when sqlstate '22023' then
  raise notice 'two days ago is closed: PASS';
end $$;

do $$
begin
  perform public.submit_daily_result(public.ist_today() + 1, 12000, 'none');
  raise notice 'tomorrow is not open yet: FAIL';
exception when sqlstate '22023' then
  raise notice 'tomorrow is not open yet: PASS';
end $$;

do $$
begin
  insert into public.daily_results (day, user_id, time_ms) values (public.ist_today(), 'd2b00000-0000-4000-8000-0000000000d2', 5000);
  raise notice 'no direct insert from clients: FAIL';
exception when insufficient_privilege then
  raise notice 'no direct insert from clients: PASS';
end $$;

do $$
declare n int;
begin
  update public.daily_results set time_ms = 1000 where user_id = 'd1a00000-0000-4000-8000-0000000000d1';
  get diagnostics n = row_count;
  raise notice 'no updates from clients: FAIL (% rows)', n;
exception when insufficient_privilege then
  raise notice 'no updates from clients: PASS';
end $$;

-- ── As B ──
select set_config('request.jwt.claim.sub', 'd2b00000-0000-4000-8000-0000000000d2', true);

do $$
begin
  perform public.submit_daily_result(public.ist_today(), 1500, 'none');
  raise notice 'a time under the mis-stop floor is refused: FAIL';
exception when sqlstate '22023' then
  raise notice 'a time under the mis-stop floor is refused: PASS';
end $$;

do $$
declare v_posted boolean;
begin
  -- Two statements: in one expression Postgres may run the sub-select first.
  v_posted := public.submit_daily_result(public.ist_today(), 15000, 'dnf');
  raise notice 'a DNF posts with no time: %',
    case when v_posted
          and (select time_ms is null and effective_ms is null from public.daily_results
               where day = public.ist_today() and user_id = 'd2b00000-0000-4000-8000-0000000000d2')
         then 'PASS' else 'FAIL' end;
end $$;

-- ── Anon ──
reset role;
set local role anon;
select set_config('request.jwt.claim.sub', '', true);

do $$
begin
  raise notice 'anon reads the scramble and the results: %',
    case when (select count(*) from public.daily_scrambles where day = public.ist_today()) = 1
          and (select count(*) from public.daily_results where day = public.ist_today()) >= 2
         then 'PASS' else 'FAIL' end;
end $$;

do $$
begin
  perform public.submit_daily_result(public.ist_today(), 12000, 'none');
  raise notice 'anon cannot post: FAIL';
exception when insufficient_privilege then
  raise notice 'anon cannot post: PASS';
end $$;

reset role;
rollback;
