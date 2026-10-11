-- Test for 20261013000100_avatars_storage.sql: each user may write avatars
-- only into their own folder.
--
-- SAFE TO RUN ON PRODUCTION. Everything happens inside a transaction that ends
-- in ROLLBACK. Run in the Supabase dashboard SQL editor; expect every row to
-- be PASS.

begin;

-- This is the TEST. Its migration must be applied first.
do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'storage' and policyname = 'avatars_insert_own') then
    raise exception 'Apply supabase/migrations/20261013000100_avatars_storage.sql first, then run this test.';
  end if;
end;
$$;

create temp table results (step text, expected text, actual text, verdict text)
on commit drop;
grant all on results to anon, authenticated;

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data) values
  ('a0000000-0000-4000-8000-00000000000a', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'avatar-test-a@example.com', '{}'),
  ('b0000000-0000-4000-8000-00000000000b', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'avatar-test-b@example.com', '{}');

-- As B.
set local role authenticated;
select set_config('request.jwt.claim.sub', 'b0000000-0000-4000-8000-00000000000b', true);

-- Avatars: B may write in B's folder only.
insert into storage.objects (bucket_id, name, owner)
values ('avatars', 'b0000000-0000-4000-8000-00000000000b/1.webp', 'b0000000-0000-4000-8000-00000000000b');
insert into results
select 'avatar: the owner can upload to their folder', '1',
       (select count(*)::text from storage.objects
        where bucket_id = 'avatars' and name like 'b0000000-0000-4000-8000-00000000000b/%'), null;
do $$
begin
  begin
    insert into storage.objects (bucket_id, name, owner)
    values ('avatars', 'a0000000-0000-4000-8000-00000000000a/evil.webp', 'b0000000-0000-4000-8000-00000000000b');
    insert into results values ('avatar: writing into someone else''s folder is refused', 'refused', 'accepted', null);
  exception when insufficient_privilege then
    insert into results values ('avatar: writing into someone else''s folder is refused', 'refused', 'refused', null);
  end;
end;
$$;
reset role;

-- A cannot delete B's avatar.
set local role authenticated;
select set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-00000000000a', true);
delete from storage.objects where bucket_id = 'avatars' and name like 'b0000000-0000-4000-8000-00000000000b/%';
reset role;
insert into results
select 'avatar: another user cannot delete it', '1',
       (select count(*)::text from storage.objects
        where bucket_id = 'avatars' and name like 'b0000000-0000-4000-8000-00000000000b/%'), null;


update results
set verdict = case when expected = actual then 'PASS' else 'FAIL' end
where verdict is null;

select step, expected, actual, verdict from results;

rollback;
