import { afterEach, describe, expect, it } from "vitest";

import {
  __resetStoreKitForTests,
  __setEntitlementForTests,
  __setStoreKitBackend,
  getEntitlement,
  purchasePlus,
  refreshEntitlement,
  restorePurchases,
} from "./storekit";
import type { StoreKitBackend, PurchaseResult } from "./storekit";
import type { SubscriptionEntitlement } from "./types";

const plus: SubscriptionEntitlement = {
  tier: "plus",
  productId: "app.pawpair.plus.monthly",
  expiresAtUtc: "2026-08-10T00:00:00.000Z",
  hasBeenPlus: true,
};

function makeBackend(opts: {
  purchase?: StoreKitBackend["purchase"];
  restore?: StoreKitBackend["restore"];
  current?: StoreKitBackend["currentEntitlement"];
}): StoreKitBackend {
  return {
    async purchase(id) {
      if (opts.purchase) return opts.purchase(id);
      return { ok: true, entitlement: plus };
    },
    async restore() {
      if (opts.restore) return opts.restore();
      return { ok: true, entitlement: plus };
    },
    async currentEntitlement() {
      if (opts.current) return opts.current();
      return plus;
    },
  };
}

afterEach(() => {
  __resetStoreKitForTests();
});

describe("storekit wrapper", () => {
  it("starts on the free tier", () => {
    expect(getEntitlement().tier).toBe("free");
  });

  it("purchasePlus upgrades the in-memory entitlement on success", async () => {
    __setStoreKitBackend(makeBackend({}));
    const result = (await purchasePlus()) as Extract<
      PurchaseResult,
      { ok: true }
    >;
    expect(result.ok).toBe(true);
    expect(getEntitlement().tier).toBe("plus");
  });

  it("does not upgrade on a failed purchase", async () => {
    __setStoreKitBackend(
      makeBackend({
        purchase: async () => ({ ok: false, reason: "user-cancelled" }),
      }),
    );
    const result = await purchasePlus();
    expect(result.ok).toBe(false);
    expect(getEntitlement().tier).toBe("free");
  });

  it("restorePurchases picks up an existing entitlement", async () => {
    __setStoreKitBackend(
      makeBackend({
        restore: async () => ({ ok: true, entitlement: plus }),
      }),
    );
    const result = (await restorePurchases()) as Extract<
      PurchaseResult,
      { ok: true }
    >;
    expect(result.ok).toBe(true);
    expect(getEntitlement().tier).toBe("plus");
  });

  it("refreshEntitlement returns the latest from the backend", async () => {
    __setStoreKitBackend(makeBackend({}));
    const next = await refreshEntitlement();
    expect(next.tier).toBe("plus");
  });

  it("honors a __setEntitlementForTests override", () => {
    __setEntitlementForTests(plus);
    expect(getEntitlement().tier).toBe("plus");
  });
});
