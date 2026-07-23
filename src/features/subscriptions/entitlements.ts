import type {
  PlusGatedAction,
  SubscriptionEntitlement,
  Tier,
} from "./types";
import { FREE_TIER_LIMITS } from "./types";

/**
 * Pure entitlement checks. The UI calls these before showing
 * a paywall. We never block the core dose confirmation flow;
 * the gate is on the surrounding actions only.
 */

export function isPlus(entitlement: SubscriptionEntitlement): boolean {
  return entitlement.tier === "plus";
}

export function canAddPet(
  entitlement: SubscriptionEntitlement,
  currentPetCount: number,
): boolean {
  if (isPlus(entitlement)) return true;
  return currentPetCount < FREE_TIER_LIMITS.maxPets;
}

export function canAddMedication(
  entitlement: SubscriptionEntitlement,
  currentMedicationCount: number,
): boolean {
  if (isPlus(entitlement)) return true;
  return currentMedicationCount < FREE_TIER_LIMITS.maxActiveMedications;
}

export function canPerform(
  entitlement: SubscriptionEntitlement,
  action: PlusGatedAction,
): boolean {
  if (isPlus(entitlement)) return true;
  // All gated actions are Plus-only; the free tier cannot
  // perform them. The core dose confirmation flow does not
  // pass through this gate.
  return false;
}

/** Returns the list of actions the user is blocked from. */
export function blockedActions(
  entitlement: SubscriptionEntitlement,
): PlusGatedAction[] {
  if (isPlus(entitlement)) return [];
  // The free tier is blocked from all gated actions; the UI
  // shows the corresponding paywall surface.
  return [
    "addPet",
    "addMedication",
    "householdSync",
    "report",
    "refillForecast",
    "backup",
  ];
}

export function defaultFreeEntitlement(): SubscriptionEntitlement {
  return {
    tier: "free",
    productId: "",
    expiresAtUtc: null,
    hasBeenPlus: false,
  };
}

/** Full-access entitlement used only by the local design-preview build. */
export function defaultPreviewEntitlement(): SubscriptionEntitlement {
  return {
    tier: "plus",
    productId: "design-preview",
    expiresAtUtc: null,
    hasBeenPlus: true,
  };
}

export function upgradeLabel(_tier: Tier): string {
  return "PawPair Plus";
}
