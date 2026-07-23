import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSupabaseClient: vi.fn(),
  setAnalyticsConsent: vi.fn(),
}));

vi.mock("../../data/cloud/supabase", () => ({
  getSupabaseClient: mocks.getSupabaseClient,
}));

vi.mock("../analytics/service", () => ({
  setAnalyticsConsent: mocks.setAnalyticsConsent,
}));

import { deletePawPairCloudAccount } from "./delete-account";

function cloudClient() {
  return {
    auth: {
      getSession: vi.fn(),
      signOut: vi.fn(),
    },
    functions: {
      invoke: vi.fn(),
    },
  };
}

describe("deletePawPairCloudAccount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.setAnalyticsConsent.mockResolvedValue(false);
  });

  it("clears local analytics identity when Supabase is unavailable", async () => {
    mocks.getSupabaseClient.mockReturnValue(null);

    await expect(deletePawPairCloudAccount()).resolves.toEqual({
      cloudAccountDeleted: false,
    });
    expect(mocks.setAnalyticsConsent).toHaveBeenCalledWith(false);
  });

  it("finishes locally when no anonymous cloud session exists", async () => {
    const client = cloudClient();
    client.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });
    mocks.getSupabaseClient.mockReturnValue(client);

    await expect(deletePawPairCloudAccount()).resolves.toEqual({
      cloudAccountDeleted: false,
    });
    expect(client.functions.invoke).not.toHaveBeenCalled();
  });

  it("does not claim deletion when the cloud session cannot be verified", async () => {
    const client = cloudClient();
    client.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: new Error("offline"),
    });
    mocks.getSupabaseClient.mockReturnValue(client);

    await expect(deletePawPairCloudAccount()).rejects.toThrow(
      "could not verify the cloud account",
    );
  });

  it("deletes the authenticated account through the protected Edge Function", async () => {
    const client = cloudClient();
    client.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: "user-1" } } },
      error: null,
    });
    client.functions.invoke.mockResolvedValue({
      data: { deleted: true },
      error: null,
    });
    client.auth.signOut.mockResolvedValue({ error: null });
    mocks.getSupabaseClient.mockReturnValue(client);

    await expect(deletePawPairCloudAccount()).resolves.toEqual({
      cloudAccountDeleted: true,
    });
    expect(client.functions.invoke).toHaveBeenCalledWith("delete-account", {
      body: { confirmation: "DELETE" },
    });
    expect(client.auth.signOut).toHaveBeenCalledWith({ scope: "local" });
  });

  it("keeps local care data when the server refuses account deletion", async () => {
    const client = cloudClient();
    client.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: "user-1" } } },
      error: null,
    });
    client.functions.invoke.mockResolvedValue({
      data: null,
      error: new Error("server error"),
    });
    mocks.getSupabaseClient.mockReturnValue(client);

    await expect(deletePawPairCloudAccount()).rejects.toThrow(
      "could not delete the cloud account",
    );
    expect(client.auth.signOut).not.toHaveBeenCalled();
  });
});
