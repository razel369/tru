import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { __setSessionForTests } from "./auth";
import {
  __resetHouseholdStateForTests,
  acceptInvite,
  createHousehold,
  createInvite,
  findInvite,
  listHouseholdsForUser,
  listMembers,
  revokeMember,
} from "./service";
import type { AuthSession } from "./types";

const session: AuthSession = {
  user: {
    id: "u-1",
    displayName: "Maya",
    accentColor: "#EF7B63",
    createdAtUtc: "2026-07-10T00:00:00.000Z",
    archivedAtUtc: null,
  },
  token: "local-u-1",
  expiresAtUtc: "2026-07-11T00:00:00.000Z",
};

beforeEach(() => {
  __setSessionForTests(session);
});
afterEach(() => {
  __setSessionForTests(null);
  __resetHouseholdStateForTests();
});

describe("household service", () => {
  it("creates a household and adds the owner as a member", () => {
    const household = createHousehold("Cohen household");
    expect(household.ownerUserId).toBe("u-1");
    const members = listMembers(household.id);
    expect(members).toHaveLength(1);
    expect(members[0]?.role).toBe("owner");
  });

  it("creates and accepts an invite, adding the accepter as a member", () => {
    const household = createHousehold("Cohen household");
    const invite = createInvite(household.id, "caregiver");
    expect(invite.token.length).toBeGreaterThan(0);

    __setSessionForTests({
      ...session,
      user: { ...session.user, id: "u-2", displayName: "Alex" },
      token: "local-u-2",
    });
    const member = acceptInvite(invite.token);
    expect(member).not.toBeNull();
    expect(member?.userId).toBe("u-2");
    expect(member?.role).toBe("caregiver");
    const fetched = findInvite(invite.token);
    expect(fetched?.consumedAtUtc).not.toBeNull();
  });

  it("rejects an unknown invite", () => {
    expect(acceptInvite("nope")).toBeNull();
  });

  it("revokes a caregiver but refuses to revoke the owner", () => {
    const household = createHousehold("Cohen household");
    __setSessionForTests({
      ...session,
      user: { ...session.user, id: "u-2" },
      token: "local-u-2",
    });
    const invite = createInvite(household.id, "caregiver");
    acceptInvite(invite.token);
    const revoked = revokeMember(household.id, "u-2");
    expect(revoked).not.toBeNull();
    expect(revoked?.removedAtUtc).not.toBeNull();

    const ownerRevoke = revokeMember(household.id, "u-1");
    expect(ownerRevoke).toBeNull();
  });

  it("lists the user's active households", () => {
    const h1 = createHousehold("Cohen");
    const h2 = createHousehold("Backup");
    expect(listHouseholdsForUser().map((h) => h.id).sort()).toEqual(
      [h1.id, h2.id].sort(),
    );
  });
});
