import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSupabaseClient: vi.fn(),
  getItem: vi.fn(),
  multiRemove: vi.fn(),
  setItem: vi.fn(),
}));

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: mocks.getItem,
    multiRemove: mocks.multiRemove,
    setItem: mocks.setItem,
  },
}));

vi.mock("react-native", () => ({
  Platform: { OS: "ios", isPad: false },
}));

vi.mock("../../data/cloud/supabase", () => ({
  getSupabaseClient: mocks.getSupabaseClient,
}));

vi.mock("../../data/database/uuid", () => ({
  uuid: () => "test-uuid",
}));

import { initializeAnalytics, setAnalyticsConsent } from "./service";

function deletionClient(error: Error | null) {
  const eq = vi.fn().mockResolvedValue({ error });
  const deleteRow = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ delete: deleteRow }));
  return { client: { from }, deleteRow, eq, from };
}

describe("setAnalyticsConsent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getItem.mockImplementation(async (key: string) =>
      key === "pawpair.analytics.installation.v1" ? "installation-1" : null,
    );
    mocks.multiRemove.mockResolvedValue(undefined);
    mocks.setItem.mockResolvedValue(undefined);
  });

  it("removes local analytics state only after cloud deletion succeeds", async () => {
    const { client, eq, from } = deletionClient(null);
    mocks.getSupabaseClient.mockReturnValue(client);

    await expect(setAnalyticsConsent(false)).resolves.toBe(false);

    expect(from).toHaveBeenCalledWith("installations");
    expect(eq).toHaveBeenCalledWith("id", "installation-1");
    expect(mocks.multiRemove).toHaveBeenCalledWith([
      "pawpair.analytics.consent.v1",
      "pawpair.analytics.installation.v1",
      "pawpair.analytics.outbox.v1",
    ]);
  });

  it("keeps the local deletion identity when cloud deletion fails", async () => {
    const { client } = deletionClient(new Error("offline"));
    mocks.getSupabaseClient.mockReturnValue(client);

    await expect(setAnalyticsConsent(false)).rejects.toThrow(
      "could not remove this analytics installation",
    );
    expect(mocks.multiRemove).not.toHaveBeenCalled();
  });

  it("clears local-only analytics state when Supabase is unavailable", async () => {
    mocks.getSupabaseClient.mockReturnValue(null);

    await expect(setAnalyticsConsent(false)).resolves.toBe(false);
    expect(mocks.multiRemove).toHaveBeenCalledTimes(1);
  });

  it("replaces a stale anonymous session before creating an installation", async () => {
    mocks.getItem.mockImplementation(async (key: string) => {
      if (key === "pawpair.analytics.consent.v1") {
        return "2026-07-23T19:00:00.000Z";
      }
      return null;
    });
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const signOut = vi.fn().mockResolvedValue({ error: null });
    const signInAnonymously = vi.fn().mockResolvedValue({
      data: {
        session: { user: { id: "replacement-user" } },
      },
      error: null,
    });
    const client = {
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: { user: { id: "stale-user" } } },
          error: null,
        }),
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: new Error("deleted"),
        }),
        signInAnonymously,
        signOut,
      },
      from: vi.fn(() => ({ upsert })),
    };
    mocks.getSupabaseClient.mockReturnValue(client);

    await expect(initializeAnalytics()).resolves.toBe(true);

    expect(signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(signInAnonymously).toHaveBeenCalledTimes(1);
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: "replacement-user" }),
      { onConflict: "id" },
    );
  });
});
