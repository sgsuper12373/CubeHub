-- add disable_mouse_click setting to user_settings
alter table public.user_settings add column disable_mouse_click boolean not null default false;
