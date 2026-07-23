import AsyncStorage from "@react-native-async-storage/async-storage";

import type { SubscriptionEntitlement } from "./types";
import { PLUS_PRODUCT_ID } from "./types";

const ENTITLEMENT_CACHE_KEY = "pawpair.subscription.entitlement.v1";

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
  async purchase(productId): Promise<PurchaseResult> {
    const revenueCat = await import("./revenuecat");
    return revenueCat.purchaseRevenueCatProduct(productId);
  },
  async restore(): Promise<PurchaseResult> {
    const revenueCat = await import("./revenuecat");
    return revenueCat.restoreRevenueCatPurchases();
  },
  async currentEntitlement(): Promise<SubscriptionEntitlement> {
    const revenueCat = await import("./revenuecat");
    return revenueCat.currentRevenueCatEntitlement();
  },
};

let current: SubscriptionEntitlement = {
  tier: "free",
  productId: "",
  expiresAtUtc: null,
  hasBeenPlus: false,
};

function isSubscriptionEntitlement(
  value: unknown,
): value is SubscriptionEntitlement {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<SubscriptionEntitlement>;
  return (
    (candidate.tier === "free" || candidate.tier === "plus") &&
    typeof candidate.productId === "string" &&
    (candidate.expiresAtUtc === null ||
      typeof candidate.expiresAtUtc === "string") &&
    typeof candidate.hasBeenPlus === "boolean"
  );
}

async function readCachedEntitlement() {
  try {
    const raw = await AsyncStorage.getItem(ENTITLEMENT_CACHE_KEY);
    if (!raw) return null;
    const cached = JSON.parse(raw) as unknown;
    if (!isSubscriptionEntitlement(cached)) return null;
    if (
      cached.tier === "plus" &&
      cached.expiresAtUtc &&
      Date.parse(cached.expiresAtUtc) <= Date.now()
    ) {
      return {
        expiresAtUtc: null,
        hasBeenPlus: true,
        productId: "",
        tier: "free",
      } satisfies SubscriptionEntitlement;
    }
    return cached;
  } catch {
    return null;
  }
}

async function persistEntitlement(entitlement: SubscriptionEntitlement) {
  await AsyncStorage.setItem(
    ENTITLEMENT_CACHE_KEY,
    JSON.stringify(entitlement),
  ).catch(() => undefined);
}

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
  try {
    current = await backend.currentEntitlement();
    await persistEntitlement(current);
  } catch {
    const cached = await readCachedEntitlement();
    if (cached) current = cached;
  }
  return current;
}

export async function purchasePlus(
  productId = PLUS_PRODUCT_ID,
): Promise<PurchaseResult> {
  const result = await backend.purchase(productId);
  if (result.ok) {
    current = result.entitlement;
    await persistEntitlement(current);
  }
  return result;
}

export async function restorePurchases(): Promise<PurchaseResult> {
  const result = await backend.restore();
  if (result.ok) {
    current = result.entitlement;
    await persistEntitlement(current);
  }
  return result;
}

export function __setEntitlementForTests(next: SubscriptionEntitlement): void {
  current = next;
}
