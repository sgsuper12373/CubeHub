-- Cubby, the companion: settings and tour progress per cuber
-- (docs/companion-plan.md step 8, docs/cubby-cubing-companion.md → Settings).
--
-- NOT APPLIED. A file only, written on the unattended run of 2026-11-26.
-- Apply with `supabase db push` once the founder approves; until then the app
-- keeps signed-in cubers' Cubby settings in the browser, like a guest's.
--
-- `{ "settings": {...}, "tours": { "<page>": { "seen", "skipped", "offered" } } }`;
-- null means "defaults, no tours seen". The app parses field by field and
-- ignores unknown keys, so the shape can grow without another migration.
--
-- No new policy: `settings_all` (owner, all commands) already covers every
-- column of user_settings. Adding a nullable column with no default is a
-- metadata-only change; the check validates existing rows, which are all null.

alter table public.user_settings
  add column if not exists companion jsonb;

alter table public.user_settings
  drop constraint if exists user_settings_companion_shape;

alter table public.user_settings
  add constraint user_settings_companion_shape check (
    companion is null
    or (jsonb_typeof(companion) = 'object' and pg_column_size(companion) <= 8192)
  );

comment on column public.user_settings.companion is
  'Cubby: {"settings": {...}, "tours": {page: {seen, skipped, offered}}}. Null = defaults.';
