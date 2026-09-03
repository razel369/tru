import { Platform } from "react-native";
import Purchases, {
  INTRO_ELIGIBILITY_STATUS,
  LOG_LEVEL,
  type CustomerInfo,
  type PurchasesPackage,
} from "react-native-purchases";

import type { PurchaseResult } from "./storekit";
import type { SubscriptionEntitlement } from "./types";
import {
  PREMIUM_ANNUAL_PRODUCT_ID,
  PREMIUM_MONTHLY_PRODUCT_ID,
  PREMIUM_OFFERING_ID,
  REVENUECAT_ENTITLEMENT_ID,
} from "./types";

declare const process: {
  env: Record<string, string | undefined>;
};

export type PremiumPackage = {
  available: boolean;
  equivalentMonthly: string | null;
  id: string;
  period: "annual" | "monthly";
  price: number;
  priceString: string;
  productId: string;
  savingsPercent: number | null;
  trialDays: number;
};

const FALLBACK_PACKAGES: readonly PremiumPackage[] = [
  {
    available: false,
    equivalentMonthly: null,
    id: "preview-annual",
    period: "annual",
    price: 0,
    priceString: "Unavailable",
    productId: PREMIUM_ANNUAL_PRODUCT_ID,
    savingsPercent: null,
    trialDays: 0,
  },
  {
    available: false,
    equivalentMonthly: null,
    id: "preview-monthly",
    period: "monthly",
    price: 0,
    priceString: "Unavailable",
    productId: PREMIUM_MONTHLY_PRODUCT_ID,
    savingsPercent: null,
    trialDays: 0,
  },
];

let configured = false;
let configuring: Promise<boolean> | null = null;

function apiKeyForPlatform() {
  if (Platform.OS === "ios") {
    return process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY;
  }
  if (Platform.OS === "android") {
    return process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY;
  }
  if (Platform.OS === "web") {
    return process.env.EXPO_PUBLIC_REVENUECAT_WEB_API_KEY;
  }
  return undefined;
}

async function ensureConfigured() {
  if (configured) return true;
  if (configuring) return configuring;

  configuring = Promise.resolve().then(() => {
    const apiKey = apiKeyForPlatform()?.trim();
    if (!apiKey) return false;
    Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.DEBUG : LOG_LEVEL.WARN);
    Purchases.configure({
      apiKey,
      automaticDeviceIdentifierCollectionEnabled: false,
      diagnosticsEnabled: false,
    });
    configured = true;
    return true;
  });

  try {
    return await configuring;
  } finally {
    configuring = null;
  }
}

function freeEntitlement(hasBeenPlus = false): SubscriptionEntitlement {
  return {
    tier: "free",
    productId: "",
    expiresAtUtc: null,
    hasBeenPlus,
  };
}

function entitlementFromCustomerInfo(
  customerInfo: CustomerInfo,
): SubscriptionEntitlement {
  const entitlementId =
    process.env.EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID?.trim() ||
    REVENUECAT_ENTITLEMENT_ID;
  const active = customerInfo.entitlements.active[entitlementId];
  const historical = customerInfo.entitlements.all[entitlementId];
  if (!active) return freeEntitlement(Boolean(historical));

  return {
    tier: "plus",
    productId: active.productIdentifier,
    expiresAtUtc: active.expirationDate ?? null,
    hasBeenPlus: true,
  };
}

function productShape(pkg: PurchasesPackage) {
  return pkg.product as unknown as {
    currencyCode?: string;
    identifier: string;
    introPrice?: {
      periodNumberOfUnits?: number;
      periodUnit?: string;
      price?: number;
    } | null;
    price: number;
    priceString: string;
    subscriptionPeriod?: string | null;
  };
}

function packagePeriod(pkg: PurchasesPackage): "annual" | "monthly" | null {
  const packageType = String(pkg.packageType).toLowerCase();
  const period = productShape(pkg).subscriptionPeriod?.toUpperCase() ?? "";
  if (packageType.includes("annual") || period.includes("Y")) return "annual";
  if (packageType.includes("month") || period.includes("M")) return "monthly";
  return null;
}

function introTrialDays(pkg: PurchasesPackage) {
  const intro = productShape(pkg).introPrice;
  if (!intro || intro.price !== 0) return 0;
  const units = Math.max(0, Number(intro.periodNumberOfUnits ?? 0));
  const unit = String(intro.periodUnit ?? "").toLowerCase();
  if (unit.includes("day")) return units;
  if (unit.includes("week")) return units * 7;
  if (unit.includes("month")) return units * 30;
  return 0;
}

async function eligibleTrialProductIds(packages: PurchasesPackage[]) {
  const eligible = new Set<string>();
  if (Platform.OS !== "ios") return eligible;

  const productIds = packages.map((pkg) => productShape(pkg).identifier);
  if (productIds.length === 0) return eligible;

  try {
    const results =
      await Purchases.checkTrialOrIntroductoryPriceEligibility(productIds);
    for (const productId of productIds) {
      if (
        results[productId]?.status ===
        INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_ELIGIBLE
      ) {
        eligible.add(productId);
      }
    }
  } catch {
    // The App Store purchase sheet remains authoritative. If eligibility cannot
    // be verified, do not advertise a trial on the custom paywall.
  }

  return eligible;
}

function localizedMonthlyEquivalent(pkg: PurchasesPackage) {
  const product = productShape(pkg);
  if (!product.currencyCode) return null;
  try {
    const amount = new Intl.NumberFormat(undefined, {
      currency: product.currencyCode,
      maximumFractionDigits: 2,
      style: "currency",
    }).format(product.price / 12);
    return `${amount} / month`;
  } catch {
    return null;
  }
}

async function availablePackages() {
  const ready = await ensureConfigured();
  if (!ready) return [];
  const offerings = await Purchases.getOfferings();
  return offerings.current?.availablePackages ?? [];
}

export function previewPremiumPackages() {
  return FALLBACK_PACKAGES.map((pkg) => ({ ...pkg }));
}

/**
 * Deterministic packages for native App Store review screenshots only.
 * These values mirror the current U.S. App Store Connect configuration and
 * are reachable exclusively through the simulator-only screenshot bridge.
 */
export function appStoreReviewPremiumPackages(): PremiumPackage[] {
  return [
    {
      available: true,
      equivalentMonthly: "$3.33 / month",
      id: "app-store-review-annual",
      period: "annual",
      price: 39.99,
      priceString: "$39.99",
      productId: PREMIUM_ANNUAL_PRODUCT_ID,
      savingsPercent: 52,
      trialDays: 7,
    },
    {
      available: true,
      equivalentMonthly: null,
      id: "app-store-review-monthly",
      period: "monthly",
      price: 6.99,
      priceString: "$6.99",
      productId: PREMIUM_MONTHLY_PRODUCT_ID,
      savingsPercent: null,
      trialDays: 0,
    },
  ];
}

export async function loadPremiumPackages(): Promise<PremiumPackage[]> {
  try {
    const nativePackages = await availablePackages();
    const monthlyNative = nativePackages.find(
      (pkg) => packagePeriod(pkg) === "monthly",
    );
    const annualNative = nativePackages.find(
      (pkg) => packagePeriod(pkg) === "annual",
    );
    if (!annualNative && !monthlyNative) return previewPremiumPackages();

    const eligibleTrialProducts =
      await eligibleTrialProductIds(nativePackages);
    void Purchases.trackCustomPaywallImpression({
      offeringId: PREMIUM_OFFERING_ID,
    }).catch(() => undefined);

    const monthlyPrice = monthlyNative ? productShape(monthlyNative).price : 0;
    return [annualNative, monthlyNative]
      .filter((pkg): pkg is PurchasesPackage => Boolean(pkg))
      .map((pkg) => {
        const product = productShape(pkg);
        const period = packagePeriod(pkg) ?? "monthly";
        const savingsPercent =
          period === "annual" && monthlyPrice > 0
            ? Math.max(
                0,
                Math.round((1 - product.price / (monthlyPrice * 12)) * 100),
              )
            : null;
        return {
          available: true,
          equivalentMonthly:
            period === "annual" ? localizedMonthlyEquivalent(pkg) : null,
          id: pkg.identifier,
          period,
          price: product.price,
          priceString: product.priceString,
          productId: product.identifier,
          savingsPercent,
          trialDays: eligibleTrialProducts.has(product.identifier)
            ? introTrialDays(pkg)
            : 0,
        };
      })
      .sort((first) => (first.period === "annual" ? -1 : 1));
  } catch {
    return previewPremiumPackages();
  }
}

function purchaseFailure(error: unknown): PurchaseResult {
  const details = error as {
    code?: string | number;
    message?: string;
    userCancelled?: boolean;
  };
  if (details.userCancelled) return { ok: false, reason: "user-cancelled" };
  const text = `${details.code ?? ""} ${details.message ?? ""}`.toLowerCase();
  if (text.includes("network") || text.includes("offline")) {
    return { ok: false, reason: "network" };
  }
  if (text.includes("pending")) return { ok: false, reason: "pending" };
  return { ok: false, reason: "unknown" };
}

export async function currentRevenueCatEntitlement() {
  if (!(await ensureConfigured())) return freeEntitlement();
  return entitlementFromCustomerInfo(await Purchases.getCustomerInfo());
}

export async function purchaseRevenueCatProduct(
  productId: string,
): Promise<PurchaseResult> {
  try {
    const packages = await availablePackages();
    if (!configured) return { ok: false, reason: "unknown" };
    const selected = packages.find(
      (pkg) => productShape(pkg).identifier === productId,
    );
    if (!selected) return { ok: false, reason: "unknown" };
    const result = await Purchases.purchasePackage(selected);
    const entitlement = entitlementFromCustomerInfo(result.customerInfo);
    return entitlement.tier === "plus"
      ? { ok: true, entitlement }
      : { ok: false, reason: "pending" };
  } catch (error) {
    return purchaseFailure(error);
  }
}

export async function restoreRevenueCatPurchases(): Promise<PurchaseResult> {
  try {
    if (!(await ensureConfigured())) return { ok: false, reason: "unknown" };
    const entitlement = entitlementFromCustomerInfo(
      await Purchases.restorePurchases(),
    );
    return entitlement.tier === "plus"
      ? { ok: true, entitlement }
      : { ok: false, reason: "unknown" };
  } catch (error) {
    return purchaseFailure(error);
  }
}
