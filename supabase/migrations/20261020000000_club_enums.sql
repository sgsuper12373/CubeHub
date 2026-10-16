-- Clubs v1, part 1: notification types (docs/clubs.md → Notifications).
--
-- On its own because a new enum value can't be used in the transaction that
-- adds it; `20261020000100_clubs.sql` writes these values. `club_request`
-- (a join request, to the club's owner and admins) is already in the baseline.

alter type public.notification_type add value if not exists 'club_request_approved';
alter type public.notification_type add value if not exists 'club_comment';
alter type public.notification_type add value if not exists 'club_post_pinned';
