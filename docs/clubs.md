# Clubs (v1 requirements)

Status: **requirements and defaults agreed 2026-10-14 (brainstorming session); built 2026-10-17** (all six
steps), merged to `main` and live (checked 2026-10-19). Migrations `20261020000000`, `20261020000100` and `20261020000200` are on the
live project. See "As built" at the end for where things live and what changed during the build. Tournaments come after the beta;
clubs are built before it.

Groups of cubers (a school, a college, a city, an online crew) with a member list, weekly
activity and a feed of posts. There's **no time leaderboard**, for the same reason the Friends
leaderboard was removed: anyone can fake a time by tapping. A club leaderboard comes back with
solve verification.

## Decided by the founder

| Topic | Decision |
|---|---|
| Classification | One **type** + up to 3 **tags**, both from fixed lists |
| Who creates | Any signed-in cuber with a username; **max 3 owned clubs** each |
| Visibility | **Public** (join instantly), **private** (request, approved by owner/admin), and **invite links** for either |
| Club page | Members with roles, activity this week, posts (announcements are pinned posts) |
| Posts | **Text, algorithm, video link.** Any member can post |
| Engagement | **Reactions and comments** |
| Media | No uploads in v1. Video stays on YouTube/Instagram (link preview, plays on tap). Image uploads are a possible v2, once beta usage shows they're worth the storage |
| Location | None in v1 |

## Details (proposed by Claude, approved by the founder 2026-10-14)

### Club

- **Name:** 3–40 characters, unique ignoring case. **Slug:** made from the name, editable,
  `a-z0-9-`, 3–40 characters, unique; reserved words (`new`, `manage`, `invite`, `join`) are
  refused.
- **Description:** up to 300 characters.
- **No club picture in v1.** A coloured initial badge, like profile avatars without a photo.
  This keeps v1 free of storage.
- **Types:** School · College · City · Online.
- **Tags (pick up to 3):** 3x3 · 2x2 · Big cubes · One-handed · Blindfolded · Beginners ·
  Speedsolving · Methods · Casual.
- **Roles:** owner (exactly one), admin, member. The database's `club_role` also has
  `moderator`, which goes unused in v1.
  - The owner promotes or demotes admins, edits settings, transfers ownership and deletes the
    club (by typing its name to confirm). The owner can't leave without transferring first.
  - Admins approve or decline requests, remove and ban members, delete any post or comment,
    pin and unpin posts, and make invite links.
  - Members post, comment, react and leave.
- **Ban:** removes the member and stops them rejoining, whether through a request or an
  invite link. Admins can unban.

### Joining

- **Public club:** Join is instant.
- **Private club:**
  - The club still appears in search with its name, type, tags, description and member count.
  - Members, posts and activity are hidden from non-members.
  - "Request to join" takes an optional message of up to 200 characters.
- **Invite link:** made by the owner or an admin as `/clubs/join/<token>`.
  - It lasts 7 days by default (1 day, 7 days, 30 days or never), with an optional maximum
    number of uses. It can be revoked.
  - It joins the club directly, even a private one. Banned users can't use it.
- **Limits:** each cuber can join at most 20 clubs and send 20 join requests per hour.
- **The join dialog says that members see your weekly solve count.** Joining a club is how a
  cuber agrees to share it, including cubers with private profiles.

### Club page sections

- **Header:** name, type, tags, member count and the Join / Request / Leave button.
- **Posts** (default tab): pinned posts first, then newest first.
- **Members:** grouped by role, with follow buttons.
- **Activity:** each member's solves this week (Monday to Sunday, IST) and the club total. It
  counts practice, not speed.

### Posts

- **Text:** up to 1000 characters, line breaks kept, links not clickable (cuts down on spam).
- **Algorithm:**
  - Fields: puzzle (3x3 or 2x2), the algorithm (up to 200 characters, rejected if it isn't
    valid notation), an optional setup or case, and an optional caption (up to 500 characters).
  - Shown in the existing 3D cube player.
- **Video link:** a YouTube (`youtube.com`, `youtu.be`) or Instagram (`instagram.com`) URL
  with an optional caption.
  - YouTube shows its thumbnail and loads the player only on tap.
  - Instagram shows a link card.
  - All other sites are refused.
- **Editing:** the author edits within 15 minutes, and the post shows "edited". The author or
  an admin can delete it.
- **Pinning:** admins pin up to 3 posts as announcements.
- **Rate limit:** 10 posts per cuber per day, across all clubs.

### Reactions and comments

- **Reactions:** 🔥 👏 🤯 on posts only. One of each per cuber per post, shown with counts.
- **Comments:**
  - One level, with no replies to comments. Up to 500 characters, plain text.
  - The author deletes their own comment; admins delete any comment.
  - Limit: 60 comments per cuber per hour.
- **Blocks:** blocked cubers don't see each other's posts or comments. Both can still be in the
  same club, for example a school club.

### Moderation and safety

- **Reports:** report a club, a post or a comment, using the same reasons as profile reports.
  Limit: 10 per day.
  - Reports go to the platform admin (`is_admin()`), who can read them in the Supabase
    dashboard for now. The admin report queue comes later.
- **The platform admin can delete any club, post or comment.**
- **No member chat or DMs.** Posts and comments are the only text that members write.

### Notifications

New notification types:
- To admins: a join request arrives.
- To the requester: the request is approved.
- To the author: someone comments on their post (at most one notification per post per hour).
- To members: a post is pinned.

No notification for reactions or new posts; they would be too noisy.

### Where it lives

- `/clubs`: your clubs, a search box (name), filters for type and tags, and Create.
- `/clubs/new`: create a club, at most 3 owned.
- `/clubs/[slug]`: the club page (Posts, Members, Activity).
- `/clubs/[slug]/manage`: owner and admins only. Settings, requests, members (roles, remove,
  ban, unban), invite links, delete.
- `/clubs/join/[token]`: an invite link landing page.
- **Navigation:** Clubs is its **own section in the desktop navbar** (founder, 2026-10-14),
  `match` covering `/clubs/*`. The phone bar stays at five tabs (Timer, Stats, Learn, Drill,
  Profile): phones reach Clubs from a Clubs tab in `/people` and the Clubs row on profiles.
  Revisit after the beta if phone users can't find it.
- **Profile:** a "Clubs" row with the public clubs the cuber is in. Private clubs show only to
  their members.

## Database plan

The tables from the baseline (`clubs`, `club_members`, `club_join_requests`) are reused, but
their access rules are rewritten. The baseline lets anyone insert themselves into any club as
`owner`, admins can't see join requests, and members can't be removed.

- **`clubs`:** add `type`, `tags text[]` (checked against the fixed list, at most 3) and
  `post_policy` (reserved). `country` stays; `avatar_url`/`banner_url` stay unused.
- **`club_members`:**
  - Joins go only through definer RPCs: `join_club`, `request_to_join`, `use_invite`,
    `approve_request`.
  - Roles change only through `set_member_role` and `transfer_ownership`.
- **New tables:**
  - `club_bans`
  - `club_invites (token, expires_at, max_uses, uses, revoked_at)`
  - `club_posts (kind text|alg|video, body, alg, puzzle, setup, video_url, pinned_at, edited_at)`
  - `club_post_reactions`
  - `club_post_comments`
  - `club_reports`
- **RLS:** a `club_visible_to_me(club)` helper (public, or I'm a member), used the same way as
  `profile_visible`. Posts, comments and reactions are readable only by members of private
  clubs, and blocked pairs are filtered out.
- **Activity:** an RPC that counts `solves` per member for the current IST week. It returns
  counts only, never times.
- **Limits:** triggers that share `social_rate_events` with follows.
- **SQL test:** `supabase/tests/clubs_test.sql` in the usual style (transaction, rolled back).

## Estimate

About the size of two social-v1 builds. With Claude writing the code, that's roughly **two
working sessions** (about 4–6 hours of active build time). The founder's time comes on top:
pushing the migration, answering questions and testing by hand. Social v1 went the same way:
the code was quick, and most of the waiting was on migrations and test accounts.

| Part | Share |
|---|---|
| Database + SQL test | ~30% (the riskiest part: RLS for private clubs, roles, bans, blocks) |
| Server code | ~15% |
| Pages: clubs, manage, posts, reactions, comments | ~40% |
| e2e, docs, deploy check | ~15% |

Build order, a commit per step:

1. Database
2. Clubs, joining and manage
3. Posts
4. Reactions and comments
5. Invite links
6. Notifications, navbar and docs

## Later (not v1)

- Image uploads (compressed, capped per day)
- A club leaderboard (after solve verification)
- Club vs club and school leagues
- Club pictures and banners
- Location (state and city)
- Tournaments (after the beta)

## As built (2026-10-17)

### Where things live

| Part | Files |
|---|---|
| Database | `supabase/migrations/20261020000000_club_enums.sql`, `20261020000100_clubs.sql`, `20261020000200_club_member_count_definer.sql`; test `supabase/tests/clubs_test.sql` (95 checks) |
| Rules shared by forms and server | `src/lib/clubs/types.ts` (clubs, invites), `src/lib/clubs/posts.ts` (posts, reactions, comments, video links) |
| Reads | `src/lib/clubs/dal.ts` |
| Writes | `src/lib/clubs/actions.ts` (every action revalidates; callers don't `router.refresh()`) |
| Pages | `src/app/(app)/clubs/`: `page.tsx`, `new/`, `[slug]/`, `[slug]/manage/`, `join/[token]/` |
| Components | `src/components/clubs/` |
| Elsewhere | Desktop nav item (`src/lib/navigation.ts`), People → Clubs tab, profile Clubs row, club notification kinds (`src/lib/notifications/`) |
| Tests | `tests/unit/clubs.test.ts`, `tests/unit/club-posts.test.ts`, `tests/e2e/clubs.spec.ts` |

### Decisions and changes during the build

- **Reports** have no build step of their own in the plan above. They shipped with step 4: a
  club (⋯ in the header), a post or a comment, all through the shared `ReportDialog`.
- **Blocked cubers on the manage page** show as "A cuber you've blocked" (unlinked) so their
  requests, memberships and bans can still be handled. Public lists hide them.
- **The invite page checks membership before the link's state.** `get_club_invite` checks
  revoked/expired/used up first, so whoever used a single-use link would read "used up".
- **Member count trigger** runs as definer (`20261020000200`): deleting a club cascades to
  `club_members`, and the old invoker trigger couldn't update the column-limited `clubs`.
- **Notifications** name the club as it's called now (looked up by `club_id`) and drop out
  once the club is deleted. A join request links to the manage page; the rest to the club.

### Testing notes

- Signed-in e2e: run with `--workers=1` locally (social and clubs share the two accounts).
- The posts test makes 3 posts per run (testbot1 one, testbot2 two) against the 10-a-day
  limit, so about 5 runs a day.

