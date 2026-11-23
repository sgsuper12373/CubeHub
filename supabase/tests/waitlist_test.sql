-- Waitlist (20261124000100_waitlist.sql). Run in the SQL editor after
-- applying the migration; every notice should say PASS. Rolls back.
begin;

do $$
begin
  perform public.join_waitlist('  Test.User+cuber@Example.COM ', 'landing-roadmap');
  raise notice 'join adds a lower-cased address: %',
    case when exists (select 1 from public.waitlist where email = 'test.user+cuber@example.com') then 'PASS' else 'FAIL' end;

  perform public.join_waitlist('test.user+cuber@example.com', 'roadmap-page');
  raise notice 'a duplicate is ignored silently: %',
    case when (select count(*) from public.waitlist where email = 'test.user+cuber@example.com') = 1 then 'PASS' else 'FAIL' end;
end $$;

do $$
begin
  perform public.join_waitlist('not an email', 'landing-roadmap');
  raise notice 'a bad address is refused: FAIL';
exception when sqlstate '22023' then
  raise notice 'a bad address is refused: PASS';
end $$;

set local role anon;

do $$
begin
  perform public.join_waitlist('anon.signup@example.com', 'landing-roadmap');
  raise notice 'anon can sign up through the function: PASS';
exception when others then
  raise notice 'anon can sign up through the function: FAIL (%)', sqlerrm;
end $$;

do $$
begin
  perform count(*) from public.waitlist;
  raise notice 'anon cannot read the list: FAIL';
exception when insufficient_privilege then
  raise notice 'anon cannot read the list: PASS';
end $$;

do $$
begin
  insert into public.waitlist (email) values ('direct@example.com');
  raise notice 'anon cannot insert directly: FAIL';
exception when insufficient_privilege then
  raise notice 'anon cannot insert directly: PASS';
end $$;

reset role;
rollback;
