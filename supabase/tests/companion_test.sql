-- Cubby's settings column (20261126000000_companion.sql). Run in the SQL
-- editor after applying the migration; every notice should say PASS. Rolls back.
begin;

-- A throwaway user (profiles and user_settings rows come from the signup trigger).
insert into auth.users (id, email, raw_user_meta_data)
values ('c0bb1e00-0000-4000-8000-000000000001', 'cubby-test@example.com', '{}');

do $$
declare
  uid constant uuid := 'c0bb1e00-0000-4000-8000-000000000001';
begin
  raise notice 'the column exists and starts null: %',
    case when exists (select 1 from public.user_settings where user_id = uid and companion is null) then 'PASS' else 'FAIL' end;

  update public.user_settings
     set companion = '{"settings": {"mode": "quiet", "name": "Kubo"}, "tours": {"timer": {"seen": 1, "skipped": false, "offered": false}}}'
   where user_id = uid;
  raise notice 'an object is stored: %',
    case when (select companion #>> '{settings,name}' from public.user_settings where user_id = uid) = 'Kubo' then 'PASS' else 'FAIL' end;
end $$;

do $$
begin
  update public.user_settings set companion = '"just a string"' where user_id = 'c0bb1e00-0000-4000-8000-000000000001';
  raise notice 'a non-object is refused: FAIL';
exception when check_violation then
  raise notice 'a non-object is refused: PASS';
end $$;

do $$
begin
  update public.user_settings
     set companion = jsonb_build_object('settings', jsonb_build_object('name', (select string_agg(md5(i::text), '') from generate_series(1, 300) i)))
   where user_id = 'c0bb1e00-0000-4000-8000-000000000001';
  raise notice 'a record over 8 KB is refused: FAIL';
exception when check_violation then
  raise notice 'a record over 8 KB is refused: PASS';
end $$;

-- Another signed-in user can't read or write it (settings_all is owner-only).
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "c0bb1e00-0000-4000-8000-000000000002", "role": "authenticated"}', true);
select set_config('request.jwt.claim.sub', 'c0bb1e00-0000-4000-8000-000000000002', true);

do $$
begin
  raise notice 'another user cannot see it: %',
    case when not exists (select 1 from public.user_settings where user_id = 'c0bb1e00-0000-4000-8000-000000000001') then 'PASS' else 'FAIL' end;
  update public.user_settings set companion = '{}' where user_id = 'c0bb1e00-0000-4000-8000-000000000001';
  raise notice 'another user cannot change it: %',
    case when (select count(*) from public.user_settings) = 0 then 'PASS' else 'FAIL' end;
end $$;

-- The owner can.
select set_config('request.jwt.claims', '{"sub": "c0bb1e00-0000-4000-8000-000000000001", "role": "authenticated"}', true);
select set_config('request.jwt.claim.sub', 'c0bb1e00-0000-4000-8000-000000000001', true);

do $$
begin
  update public.user_settings set companion = '{"settings": {"mode": "off"}}' where user_id = 'c0bb1e00-0000-4000-8000-000000000001';
  raise notice 'the owner can save it: %',
    case when (select companion #>> '{settings,mode}' from public.user_settings where user_id = 'c0bb1e00-0000-4000-8000-000000000001') = 'off' then 'PASS' else 'FAIL' end;
end $$;

rollback;
