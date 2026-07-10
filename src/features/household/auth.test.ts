import { afterEach, describe, expect, it } from "vitest";

import {
  __setAuthBackend,
  __setSessionForTests,
  currentSession,
  currentUser,
  signIn,
  signOut,
} from "./auth";

describe("auth service (stub)", () => {
  afterEach(() => {
    __setSessionForTests(null);
  });

  it("signs in with the dev provider by default", async () => {
    const session = await signIn();
    expect(session.user.displayName).toBe("Dev User");
    expect(currentSession()).toEqual(session);
    expect(currentUser()?.id).toBe(session.user.id);
  });

  it("signs in with the apple provider when requested", async () => {
    const session = await signIn("apple");
    expect(session.user.displayName).toBe("Maya Cohen");
  });

  it("clears the session on signOut", async () => {
    await signIn();
    expect(currentSession()).not.toBeNull();
    await signOut();
    expect(currentSession()).toBeNull();
  });

  it("honors a swapped backend", async () => {
    __setAuthBackend({
      async signIn() {
        return {
          user: {
            id: "u-42",
            displayName: "Backend Test",
            accentColor: "#000000",
            createdAtUtc: "2026-07-10T00:00:00.000Z",
            archivedAtUtc: null,
          },
          token: "backend-token",
          expiresAtUtc: "2026-07-11T00:00:00.000Z",
        };
      },
      async signOut() {},
      async refresh(token) {
        return {
          user: {
            id: "u-42",
            displayName: "Backend Test",
            accentColor: "#000000",
            createdAtUtc: "2026-07-10T00:00:00.000Z",
            archivedAtUtc: null,
          },
          token,
          expiresAtUtc: "2026-07-11T00:00:00.000Z",
        };
      },
    });
    const session = await signIn();
    expect(session.user.displayName).toBe("Backend Test");
  });
});
