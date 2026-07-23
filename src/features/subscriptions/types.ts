/**
 * PawPair — subscription types and entitlement rules.
 *
 * docs/AAA-HANDOFF.md §9:
 * - Free: one pet, two active medications, 30 days of history.
 * - PawPair Plus: unlimited pets and medications, household
 *   caregiver sync, full history, advanced schedules, reports,
 *   backup and restore, refill forecasting.
 * - "The core dose confirmation experience must remain
 *    trustworthy when free."
 * - "Never block access to previously entered health records
 *    after a subscription expires."
 *
 * The rules live here as pure data; the gate that enforces
 * them in the UI is a separate module.
 */

export type Tier = "free" | "plus";

export interface SubscriptionEntitlement {
  tier: Tier;
  /** Apple/RevenueCat product id that grants this tier. */
  productId: string;
  /** When the current entitlement expires; null for free. */
  expiresAtUtc: string | null;
  /** True if the user has been a Plus subscriber at any point. */
  hasBeenPlus: boolean;
}

export interface FreeTierLimits {
  maxPets: number;
  maxActiveMedications: number;
  historyDays: number;
}

export const FREE_TIER_LIMITS: FreeTierLimits = {
  maxPets: 1,
  maxActiveMedications: 2,
  historyDays: 30,
};

export const REVENUECAT_ENTITLEMENT_ID = "premium";
export const PREMIUM_OFFERING_ID = "default";
export const PREMIUM_ANNUAL_PRODUCT_ID =
  "app.pawpair.medtracker.premium.annual";
export const PREMIUM_MONTHLY_PRODUCT_ID =
  "app.pawpair.medtracker.premium.monthly";
export const PLUS_PRODUCT_ID = PREMIUM_ANNUAL_PRODUCT_ID;

export type PremiumEntryPoint =
  | "pets"
  | "second-pet"
  | "care-handoff"
  | "first-care"
  | "onboarding";

export interface PaywallBenefit {
  title: string;
  body: string;
  /** Plus-only flag. */
  plusOnly: boolean;
}

export const PLUS_BENEFITS: PaywallBenefit[] = [
  {
    title: "Unlimited pets and medications",
    body: "Add every pet in your home and every medication they take.",
    plusOnly: true,
  },
  {
    title: "Caregiver sync",
    body: "Everyone in your household sees the same answer in real time.",
    plusOnly: true,
  },
  {
    title: "Full dose history",
    body: "Vet-ready reports and refill forecasting for as long as you use PawPair.",
    plusOnly: true,
  },
  {
    title: "Backup and restore",
    body: "Move to a new device without losing a single entry.",
    plusOnly: true,
  },
];

/**
 * The free tier always gives the user access to the core dose
 * confirmation flow, even when they have hit a Plus-only
 * limit. This block list enumerates the actions that require
 * Plus. The UI consults it before showing a paywall.
 */
export type PlusGatedAction =
  | "addPet"
  | "addMedication"
  | "householdSync"
  | "report"
  | "refillForecast"
  | "backup";

export const PLUS_GATED_ACTIONS: PlusGatedAction[] = [
  "addPet",
  "addMedication",
  "householdSync",
  "report",
  "refillForecast",
  "backup",
];
