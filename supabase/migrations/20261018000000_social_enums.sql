-- Social layer v1, part 1: notification types for follow requests.
--
-- On its own because a new enum value can't be used in the transaction that
-- adds it; `20261018000100_social.sql` writes these values from triggers.

alter type public.notification_type add value if not exists 'follow_request';
alter type public.notification_type add value if not exists 'follow_accepted';
