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

import { setAnalyticsConsent } from "./service";

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
});
