import type { SubscriptionEntitlement } from "./types";
import { PLUS_PRODUCT_ID } from "./types";

/**
 * PawPair — StoreKit 2 wrapper.
 *
 * docs/AAA-HANDOFF.md §9: "Use StoreKit 2 through RevenueCat or
 * an equally maintained abstraction."
 *
 * Stage 9 ships the in-memory state machine. The real
 * implementation (expo-iap, react-native-iap, or RevenueCat)
 * lands in stage 9-final and keeps the same surface so the
 * host code is portable.
 *
 * Sandbox rules we honor (per docs/AAA-HANDOFF.md §9):
 * - Restore purchases must be visible.
 * - Test StoreKit sandbox purchase, restore, expiration,
 *   billing retry, refund, offline entitlement cache, and
 *   Family Sharing policy.
 */

export type PurchaseResult =
  | { ok: true; entitlement: SubscriptionEntitlement }
  | { ok: false; reason: "user-cancelled" | "network" | "pending" | "unknown" };

export type StoreKitBackend = {
  purchase(productId: string): Promise<PurchaseResult>;
  restore(): Promise<PurchaseResult>;
  currentEntitlement(): Promise<SubscriptionEntitlement>;
};

let backend: StoreKitBackend = {
  async purchase(): Promise<PurchaseResult> {
    return { ok: false, reason: "unknown" };
  },
  async restore(): Promise<PurchaseResult> {
    return { ok: false, reason: "unknown" };
  },
  async currentEntitlement(): Promise<SubscriptionEntitlement> {
    return {
      tier: "free",
      productId: "",
      expiresAtUtc: null,
      hasBeenPlus: false,
    };
  },
};

let current: SubscriptionEntitlement = {
  tier: "free",
  productId: "",
  expiresAtUtc: null,
  hasBeenPlus: false,
};

export function __setStoreKitBackend(next: StoreKitBackend): void {
  backend = next;
}

export function __resetStoreKitForTests(): void {
  current = {
    tier: "free",
    productId: "",
    expiresAtUtc: null,
    hasBeenPlus: false,
  };
}

export function getEntitlement(): SubscriptionEntitlement {
  return current;
}

export async function refreshEntitlement(): Promise<SubscriptionEntitlement> {
  current = await backend.currentEntitlement();
  return current;
}

export async function purchasePlus(): Promise<PurchaseResult> {
  const result = await backend.purchase(PLUS_PRODUCT_ID);
  if (result.ok) {
    current = result.entitlement;
  }
  return result;
}

export async function restorePurchases(): Promise<PurchaseResult> {
  const result = await backend.restore();
  if (result.ok) {
    current = result.entitlement;
  }
  return result;
}

export function __setEntitlementForTests(next: SubscriptionEntitlement): void {
  current = next;
}
