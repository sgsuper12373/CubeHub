import { describe, expect, it } from "vitest";

import {
  notificationHref,
  notificationText,
  timeAgo,
  toKind,
} from "@/lib/notifications/types";
import { compareTimes, sharedEventOrder, tally } from "@/lib/social/compare";
import {
  countLabel,
  followButtonState,
  isFriend,
  isReportReason,
  toFollowSummary,
} from "@/lib/social/types";

describe("follow button state", () => {
  const signedIn = { signedIn: true, isOwner: false };

  it("hides on your own profile and asks guests to sign in", () => {
    expect(followButtonState(null, { signedIn: true, isOwner: true })).toBe("hidden");
    expect(followButtonState(null, { signedIn: false, isOwner: false })).toBe("sign-in");
  });

  it("follows the relationship", () => {
    expect(followButtonState({ iFollow: "none", followsMe: false }, signedIn)).toBe("follow");
    expect(followButtonState({ iFollow: "none", followsMe: true }, signedIn)).toBe("follow-back");
    expect(followButtonState({ iFollow: "pending", followsMe: true }, signedIn)).toBe("requested");
    expect(followButtonState({ iFollow: "accepted", followsMe: false }, signedIn)).toBe("following");
    // A missing summary (RPC failed) still offers to follow rather than nothing.
    expect(followButtonState(null, signedIn)).toBe("follow");
  });

  it("friends are mutual, accepted follows only", () => {
    expect(isFriend({ iFollow: "accepted", followsMe: true })).toBe(true);
    expect(isFriend({ iFollow: "pending", followsMe: true })).toBe(false);
    expect(isFriend({ iFollow: "accepted", followsMe: false })).toBe(false);
    expect(isFriend(null)).toBe(false);
  });
});

describe("follow summary parsing", () => {
  it("reads the RPC's JSON", () => {
    expect(
      toFollowSummary({ followers: 3, following: 1, i_follow: "pending", follows_me: true, blocked_by_me: false }),
    ).toEqual({ followers: 3, following: 1, iFollow: "pending", followsMe: true, blockedByMe: false });
  });

  it("is null when blocked, and defensive about junk", () => {
    expect(toFollowSummary(null)).toBeNull();
    expect(toFollowSummary({ i_follow: "weird" })).toEqual({
      followers: 0,
      following: 0,
      iFollow: "none",
      followsMe: false,
      blockedByMe: false,
    });
  });

  it("labels counts", () => {
    expect(countLabel(1, "follower", "followers")).toBe("1 follower");
    expect(countLabel(1204, "follower", "followers")).toBe("1,204 followers");
  });

  it("knows the report reasons", () => {
    expect(isReportReason("spam")).toBe(true);
    expect(isReportReason("dislike")).toBe(false);
  });
});

describe("head to head", () => {
  it("picks the faster side and the gap", () => {
    expect(compareTimes(9000, 9500)).toEqual({ mine: 9000, theirs: 9500, faster: "me", gapMs: 500 });
    expect(compareTimes(12000, 9500).faster).toBe("them");
    expect(compareTimes(9000, 9000)).toMatchObject({ faster: "tie", gapMs: 0 });
    expect(compareTimes(null, 9000)).toMatchObject({ faster: null, gapMs: null });
    // The gap is between the times as shown: 0.15 − 0.02 = 0.13, not 0.129.
    expect(compareTimes(153, 24)).toMatchObject({ faster: "them", gapMs: 130 });
    // Times that read the same are a tie.
    expect(compareTimes(9001, 9009)).toMatchObject({ faster: "tie", gapMs: 0 });
  });

  it("tallies only decided cells", () => {
    const cells = [compareTimes(1000, 2000), compareTimes(3000, 2000), compareTimes(5000, 5000), compareTimes(null, 1000), compareTimes(1000, 4000)];
    expect(tally(cells)).toEqual({ me: 2, them: 1 });
  });

  it("keeps registry order over either side's events", () => {
    expect(sharedEventOrder(["333", "222", "444"], [{ puzzleType: "444" }], [{ puzzleType: "333" }])).toEqual([
      "333",
      "444",
    ]);
  });
});

describe("notifications", () => {
  const actor = { username: "riya", displayName: "Riya", avatarUrl: null };

  it("words each kind", () => {
    expect(notificationText({ kind: "follow", title: "" })).toBe("started following you");
    expect(notificationText({ kind: "follow_request", title: "" })).toBe("asked to follow you");
    expect(notificationText({ kind: "follow_accepted", title: "" })).toBe("accepted your follow request");
    expect(notificationText({ kind: toKind("system"), title: "Welcome" })).toBe("Welcome");
  });

  it("links requests to the inbox and the rest to the actor", () => {
    expect(notificationHref({ kind: "follow_request", actor })).toBe("/people?tab=requests");
    expect(notificationHref({ kind: "follow", actor })).toBe("/profile/riya");
    expect(notificationHref({ kind: "other", actor: null })).toBe("/people");
  });

  it("says how long ago", () => {
    const now = Date.parse("2026-10-14T12:00:00Z");
    expect(timeAgo("2026-10-14T11:59:30Z", now)).toBe("now");
    expect(timeAgo("2026-10-14T11:55:00Z", now)).toBe("5m");
    expect(timeAgo("2026-10-14T09:00:00Z", now)).toBe("3h");
    expect(timeAgo("2026-10-12T12:00:00Z", now)).toBe("2d");
    expect(timeAgo("2026-09-01T12:00:00Z", now)).toMatch(/^1 Sept?$/);
  });
});
