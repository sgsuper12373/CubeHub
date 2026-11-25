-- Home's saved card layout (docs/home-plan.md → Customising Home).
--
-- Applied to the live project 2026-11-25 (supabase db push).
--
-- `{ "hidden": [...], "shown": [...], "order": [...] }`; null means "use the
-- default". Unknown card ids are ignored by the app, so removing a card later
-- never breaks anyone's Home.
--
-- No new policy: `settings_all` (owner, all commands) already covers every
-- column of user_settings. Adding a nullable column with no default is a
-- metadata-only change; the check validates existing rows, which are all null.

alter table public.user_settings
  add column if not exists home_layout jsonb;

alter table public.user_settings
  drop constraint if exists user_settings_home_layout_shape;

alter table public.user_settings
  add constraint user_settings_home_layout_shape check (
    home_layout is null
    or (jsonb_typeof(home_layout) = 'object' and pg_column_size(home_layout) <= 4096)
  );

comment on column public.user_settings.home_layout is
  'Home card layout: {"hidden": [card ids], "shown": [card ids], "order": [card ids]}. Null = default.';
