import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { assets, colors, shadow } from "../../design";
import type { Pet } from "../../types";
import { trackAnalyticsEvent } from "../analytics/service";
import { resolvePetMotionPackForProfile } from "../pet-motion";
import { createBreedAssetKey, resolvePetVisual } from "../pet-visuals";
import { purchasePlus, restorePurchases } from "./storekit";
import {
  loadPremiumPackages,
  previewPremiumPackages,
  type PremiumPackage,
} from "./revenuecat";
import type {
  PremiumEntryPoint,
  SubscriptionEntitlement,
} from "./types";

type PremiumPaywallScreenProps = {
  entryPoint: PremiumEntryPoint;
  onActivated: (entitlement: SubscriptionEntitlement) => void;
  onClose: () => void;
  onOpenPrivacy: () => void;
  onOpenTerms: () => void;
  packagesOverride?: readonly PremiumPackage[];
  pet?: Pet;
};

const BENEFITS = [
  {
    body: "Unlimited companions, each with a routine shaped around them.",
    icon: "paw-outline" as const,
    title: "The whole family, cared for",
  },
  {
    body: "A complete health timeline, documents and patterns ready when the vet asks.",
    icon: "fitness-outline" as const,
    title: "Their health story stays clear",
  },
  {
      body: "Care handoffs keep routines clear when someone else steps in.",
    icon: "shield-checkmark-outline" as const,
    title: "Protected when care changes hands",
  },
];

const INITIAL_PREMIUM_PACKAGES = previewPremiumPackages();

function heroCopy(entryPoint: PremiumEntryPoint, petName: string) {
  if (entryPoint === "onboarding") {
    return {
      body: `Keep ${petName}'s complete care story, every companion and every caregiver in one protected place.`,
      title: `${petName}'s care world is ready to grow.`,
    };
  }
  if (entryPoint === "second-pet") {
    return {
      body: "Give every companion their own rhythm without splitting care across notes and reminders.",
      title: "One calm place for the whole family.",
    };
  }
  if (entryPoint === "care-handoff") {
    return {
      body: `Share ${petName}'s routine with the next caregiver without the last-minute explanation scramble.`,
      title: "Care stays clear when you are away.",
    };
  }
  if (entryPoint === "first-care") {
    return {
      body: "Keep the routine growing into a complete, protected history you can trust every day.",
      title: `${petName}'s care is already taking shape.`,
    };
  }
  return {
    body: "More context, fewer loose ends, and every companion in one thoughtful care world.",
    title: `${petName}'s whole care world, protected.`,
  };
}

function presentationForPet(pet?: Pet) {
  if (!pet) return assets.luna;
  const fallback = pet.avatar === "luna" ? assets.luna : assets.milo;
  const visual = resolvePetVisual(pet, fallback, assets.heroScene);
  const motionKey =
    visual.assetKey ?? createBreedAssetKey(pet.species, pet.breed);
  return (
    resolvePetMotionPackForProfile(motionKey, visual.profile)?.states.idle ??
    visual.petSource
  );
}

function failureMessage(reason: string) {
  if (reason === "user-cancelled") return null;
  if (reason === "network") {
    return "The App Store could not be reached. Check your connection and try again.";
  }
  if (reason === "pending") {
    return "The purchase is still pending with the App Store. Premium will open after approval.";
  }
  return Platform.OS === "web"
    ? "RevenueCat is not connected in this browser preview. No charge was attempted."
    : "This purchase could not be completed. Please try again or restore an existing purchase.";
}

function PlanCard({
  active,
  onPress,
  plan,
}: {
  active: boolean;
  onPress: () => void;
  plan: PremiumPackage;
}) {
  const annual = plan.period === "annual";
  return (
    <Pressable
      accessibilityLabel={`${annual ? "Annual" : "Monthly"} Premium plan, ${plan.available ? plan.priceString : "currently unavailable"}`}
      accessibilityRole="radio"
      accessibilityState={{ checked: active, disabled: !plan.available }}
      disabled={!plan.available}
      onPress={onPress}
      style={({ pressed }) => [
        styles.plan,
        active && styles.planActive,
        !plan.available && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.planTop}>
        <View style={styles.radioOuter}>
          {active ? <View style={styles.radioInner} /> : null}
        </View>
        <View style={styles.planCopy}>
          <View style={styles.planTitleRow}>
            <Text style={styles.planTitle}>{annual ? "Annual" : "Monthly"}</Text>
            {plan.available && annual && plan.trialDays > 0 ? (
              <View style={styles.trialBadge}>
                <Text style={styles.trialBadgeText}>{plan.trialDays} DAYS FREE</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.planDetail}>
            {!plan.available
              ? "Waiting for verified App Store pricing"
              : annual
              ? plan.equivalentMonthly ?? "Best long-term value"
              : "Flexible monthly access"}
          </Text>
        </View>
        <View style={styles.priceColumn}>
          <Text style={styles.price}>
            {plan.available ? plan.priceString : "Unavailable"}
          </Text>
          {plan.available ? (
            <Text style={styles.pricePeriod}>/ {annual ? "year" : "month"}</Text>
          ) : null}
        </View>
      </View>
      {plan.available && annual && plan.savingsPercent ? (
        <Text style={styles.savings}>Save {plan.savingsPercent}% vs monthly</Text>
      ) : null}
    </Pressable>
  );
}

export function PremiumPaywallScreen({
  entryPoint,
  onActivated,
  onClose,
  onOpenPrivacy,
  onOpenTerms,
  packagesOverride,
  pet,
}: PremiumPaywallScreenProps) {
  const insets = useSafeAreaInsets();
  const [plans, setPlans] = useState<PremiumPackage[]>(() =>
    (packagesOverride ?? INITIAL_PREMIUM_PACKAGES).map((plan) => ({ ...plan })),
  );
  const [selectedId, setSelectedId] = useState(
    (packagesOverride ?? INITIAL_PREMIUM_PACKAGES)[0]?.id ?? "",
  );
  const [busy, setBusy] = useState<"purchase" | "restore" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const heroMotion = useRef(new Animated.Value(0)).current;
  const petName = pet?.name?.trim() || "Your companion";
  const copy = heroCopy(entryPoint, petName);
  const source = useMemo(() => presentationForPet(pet), [pet]);

  useEffect(() => {
    let active = true;
    if (!packagesOverride) {
      void loadPremiumPackages().then((next) => {
        if (!active) return;
        setPlans(next);
        const preferred =
          next.find((plan) => plan.period === "annual") ?? next[0];
        setSelectedId(preferred?.id ?? "");
      });
    }
    Animated.spring(heroMotion, {
      damping: 18,
      mass: 0.8,
      stiffness: 120,
      toValue: 1,
      useNativeDriver: Platform.OS !== "web",
    }).start();
    return () => {
      active = false;
    };
  }, [heroMotion, packagesOverride]);

  useEffect(() => {
    void trackAnalyticsEvent("paywall_viewed", {
      entry_point: entryPoint,
    });
  }, [entryPoint]);

  const selected =
    plans.find((plan) => plan.id === selectedId) ?? plans[0];
  const purchaseAvailable = Boolean(selected?.available);
  const reminderDay = Math.max(1, (selected?.trialDays ?? 0) - 2);
  const annual = selected?.period === "annual";
  const statusMessage =
    message ??
    (!purchaseAvailable
      ? "Premium plans are temporarily unavailable. Purchases stay disabled until verified App Store pricing loads."
      : null);

  const purchase = async () => {
    if (busy || !selected?.available) return;
    void trackAnalyticsEvent("purchase_started", {
      entry_point: entryPoint,
      period: selected.period,
    });
    setBusy("purchase");
    setMessage(null);
    const result = await purchasePlus(selected.productId);
    setBusy(null);
    if (result.ok) {
      void trackAnalyticsEvent("purchase_completed", {
        entry_point: entryPoint,
        period: selected.period,
      });
      onActivated(result.entitlement);
      return;
    }
    void trackAnalyticsEvent("purchase_failed", {
      entry_point: entryPoint,
      period: selected.period,
      reason: result.reason,
    });
    setMessage(failureMessage(result.reason));
  };

  const restore = async () => {
    if (busy) return;
    setBusy("restore");
    setMessage(null);
    const result = await restorePurchases();
    setBusy(null);
    if (result.ok) {
      void trackAnalyticsEvent("restore_completed", {
        entry_point: entryPoint,
      });
      onActivated(result.entitlement);
      return;
    }
    setMessage(
      result.reason === "network"
        ? failureMessage(result.reason)
        : "No active PawPair Premium purchase was found for this App Store account.",
    );
  };

  return (
    <View style={styles.screen}>
      <LinearGradient
        colors={["#F4E8D8", "#FBF7F0", "#F2F5ED"]}
        end={{ x: 0.8, y: 1 }}
        start={{ x: 0.1, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
      <ScrollView
        bounces={false}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(24, insets.bottom + 18) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
          <View style={styles.brandPill}>
            <Ionicons color={colors.sage} name="sparkles" size={14} />
            <Text style={styles.brandPillText}>PAWPAIR PREMIUM</Text>
          </View>
          <Pressable
            accessibilityLabel="Close Premium offer"
            accessibilityRole="button"
            disabled={Boolean(busy)}
            onPress={onClose}
            style={({ pressed }) => [
              styles.close,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons color={colors.navy} name="close" size={22} />
          </Pressable>
        </View>

        <View style={styles.hero}>
          <View style={[styles.heroGlow, styles.nonInteractive]} />
          <View style={[styles.petShadow, styles.nonInteractive]} />
          <View style={[styles.petContactShadow, styles.nonInteractive]} />
          <Animated.Image
            accessibilityIgnoresInvertColors
            resizeMode="contain"
            source={source}
            style={[
              styles.pet,
              {
                opacity: heroMotion,
                transform: [
                  {
                    translateY: heroMotion.interpolate({
                      inputRange: [0, 1],
                      outputRange: [12, 0],
                    }),
                  },
                  {
                    scale: heroMotion.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.97, 1],
                    }),
                  },
                ],
              },
            ]}
          />
        </View>

        <Text style={styles.title}>{copy.title}</Text>
        <Text style={styles.subtitle}>{copy.body}</Text>

        <View style={styles.benefits}>
          {BENEFITS.map((benefit) => (
            <View key={benefit.title} style={styles.benefit}>
              <View style={styles.benefitIcon}>
                <Ionicons color={colors.sage} name={benefit.icon} size={20} />
              </View>
              <View style={styles.benefitCopy}>
                <Text style={styles.benefitTitle}>{benefit.title}</Text>
                <Text style={styles.benefitBody}>{benefit.body}</Text>
              </View>
            </View>
          ))}
        </View>

        <View accessibilityRole="radiogroup" style={styles.plans}>
          {plans.map((plan) => (
            <PlanCard
              active={plan.id === selected?.id}
              key={plan.id}
              onPress={() => {
                setSelectedId(plan.id);
                setMessage(null);
                void trackAnalyticsEvent("plan_selected", {
                  available: plan.available,
                  entry_point: entryPoint,
                  period: plan.period,
                });
              }}
              plan={plan}
            />
          ))}
        </View>

        {selected && selected.trialDays > 0 ? (
          <View style={styles.timeline}>
            <Text style={styles.timelineLabel}>YOUR TRIAL, CLEARLY</Text>
            <View style={styles.timelineRow}>
              <View style={styles.timelineStep}>
                <View style={styles.timelineDotActive} />
                <Text style={styles.timelineWhen}>Today</Text>
                <Text style={styles.timelineWhat}>Premium opens</Text>
              </View>
              <View style={styles.timelineLine} />
              <View style={styles.timelineStep}>
                <View style={styles.timelineDot} />
                <Text style={styles.timelineWhen}>Day {reminderDay}</Text>
                <Text style={styles.timelineWhat}>Gentle reminder</Text>
              </View>
              <View style={styles.timelineLine} />
              <View style={styles.timelineStep}>
                <View style={styles.timelineDot} />
                <Text style={styles.timelineWhen}>Day {selected.trialDays}</Text>
                <Text style={styles.timelineWhat}>{selected.priceString} / year</Text>
              </View>
            </View>
          </View>
        ) : null}

        {statusMessage ? (
          <View accessibilityLiveRegion="polite" style={styles.message}>
            <Ionicons color={colors.navy} name="information-circle" size={18} />
            <Text style={styles.messageText}>{statusMessage}</Text>
          </View>
        ) : null}

        <Pressable
          accessibilityRole="button"
          disabled={Boolean(busy) || !purchaseAvailable}
          onPress={() => void purchase()}
          style={({ pressed }) => [
            styles.cta,
            (busy || !purchaseAvailable) && styles.disabled,
            pressed && !busy && purchaseAvailable && styles.pressed,
          ]}
        >
          {busy === "purchase" ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <>
              <Text style={styles.ctaText}>
                {!selected?.available
                  ? "Plans temporarily unavailable"
                  : selected.trialDays > 0
                  ? `Start ${selected.trialDays}-day free trial`
                  : `Continue with ${annual ? "annual" : "monthly"}`}
              </Text>
              <Ionicons color={colors.white} name="arrow-forward" size={18} />
            </>
          )}
        </Pressable>

        <Text style={styles.disclosure}>
          {selected?.available
            ? `${
                selected.trialDays > 0
                  ? `${selected.trialDays} days free, then ${selected.priceString} per year.`
                  : `${selected.priceString} per ${annual ? "year" : "month"}.`
              } Auto-renews until cancelled in App Store settings.`
            : "No purchase can be started until the App Store returns a verified plan and localized price."}
        </Text>

        <View style={styles.footerLinks}>
          <Pressable
            accessibilityRole="button"
            disabled={Boolean(busy)}
            onPress={() => void restore()}
            style={styles.footerButton}
          >
            <Text style={styles.footerLink}>
              {busy === "restore" ? "Restoring..." : "Restore purchases"}
            </Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={onOpenTerms} style={styles.footerButton}>
            <Text style={styles.footerLink}>Terms</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={onOpenPrivacy} style={styles.footerButton}>
            <Text style={styles.footerLink}>Privacy</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  benefit: { alignItems: "center", flexDirection: "row", gap: 11 },
  benefitBody: { color: colors.muted, fontFamily: "Nunito_600SemiBold", fontSize: 10.5, lineHeight: 15 },
  benefitCopy: { flex: 1 },
  benefitIcon: { alignItems: "center", backgroundColor: colors.sageSoft, borderRadius: 16, height: 42, justifyContent: "center", width: 42 },
  benefitTitle: { color: colors.ink, fontFamily: "Nunito_800ExtraBold", fontSize: 12.5 },
  benefits: { gap: 13, marginTop: 20 },
  brandPill: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.72)", borderColor: "rgba(72,145,132,0.22)", borderRadius: 999, borderWidth: 1, flexDirection: "row", gap: 6, minHeight: 34, paddingHorizontal: 12 },
  brandPillText: { color: colors.sage, fontFamily: "Nunito_800ExtraBold", fontSize: 9, letterSpacing: 1 },
  close: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.76)", borderColor: colors.line, borderRadius: 22, borderWidth: 1, height: 44, justifyContent: "center", width: 44 },
  content: { paddingHorizontal: 20 },
  cta: { alignItems: "center", backgroundColor: colors.sage, borderRadius: 19, flexDirection: "row", gap: 8, justifyContent: "center", marginTop: 14, minHeight: 56, ...shadow.card },
  ctaText: { color: colors.white, fontFamily: "Nunito_800ExtraBold", fontSize: 15 },
  disabled: { opacity: 0.58 },
  disclosure: { color: colors.muted, fontFamily: "Nunito_600SemiBold", fontSize: 9.5, lineHeight: 14, marginHorizontal: 8, marginTop: 10, textAlign: "center" },
  footerButton: { alignItems: "center", justifyContent: "center", minHeight: 44, paddingHorizontal: 7 },
  footerLink: { color: colors.navy, fontFamily: "Nunito_800ExtraBold", fontSize: 10.5 },
  footerLinks: { alignItems: "center", flexDirection: "row", justifyContent: "center", marginTop: 4 },
  hero: { alignItems: "center", height: 190, justifyContent: "flex-end", marginTop: 4, overflow: "hidden", position: "relative" },
  heroGlow: { backgroundColor: "rgba(255,255,255,0.55)", borderRadius: 120, height: 230, position: "absolute", top: 2, width: 230 },
  message: { alignItems: "flex-start", backgroundColor: colors.skySoft, borderRadius: 15, flexDirection: "row", gap: 8, marginTop: 12, padding: 11 },
  messageText: { color: colors.navy, flex: 1, fontFamily: "Nunito_700Bold", fontSize: 10.5, lineHeight: 15 },
  pet: { bottom: 4, height: 188, position: "absolute", width: 238 },
  nonInteractive: { pointerEvents: "none" },
  petContactShadow: { backgroundColor: "rgba(57,49,42,0.17)", borderRadius: 999, bottom: 11, height: 4, position: "absolute", width: 72 },
  petShadow: { backgroundColor: "rgba(57,49,42,0.07)", borderRadius: 999, bottom: 6, height: 11, position: "absolute", transform: [{ scaleX: 1.08 }], width: 112 },
  plan: { backgroundColor: "rgba(255,255,255,0.76)", borderColor: colors.line, borderRadius: 18, borderWidth: 1, minHeight: 78, padding: 13 },
  planActive: { backgroundColor: colors.paper, borderColor: colors.sage, borderWidth: 2, ...shadow.subtle },
  planCopy: { flex: 1 },
  planDetail: { color: colors.muted, fontFamily: "Nunito_700Bold", fontSize: 9.5, marginTop: 3 },
  planTitle: { color: colors.ink, fontFamily: "Nunito_800ExtraBold", fontSize: 14 },
  planTitleRow: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: 6 },
  planTop: { alignItems: "center", flexDirection: "row", gap: 9 },
  plans: { gap: 9, marginTop: 19 },
  pressed: { opacity: 0.84, transform: [{ scale: 0.985 }] },
  price: { color: colors.ink, fontFamily: "Nunito_800ExtraBold", fontSize: 17 },
  priceColumn: { alignItems: "flex-end" },
  pricePeriod: { color: colors.muted, fontFamily: "Nunito_700Bold", fontSize: 9 },
  radioInner: { backgroundColor: colors.sage, borderRadius: 5, height: 10, width: 10 },
  radioOuter: { alignItems: "center", borderColor: colors.sage, borderRadius: 10, borderWidth: 2, height: 20, justifyContent: "center", width: 20 },
  savings: { color: colors.sage, fontFamily: "Nunito_800ExtraBold", fontSize: 9.5, marginLeft: 29, marginTop: 7 },
  screen: { backgroundColor: colors.background, flex: 1 },
  subtitle: { alignSelf: "center", color: colors.muted, fontFamily: "Nunito_600SemiBold", fontSize: 12.5, lineHeight: 18, marginTop: 7, maxWidth: 340, textAlign: "center" },
  timeline: { backgroundColor: "rgba(255,255,255,0.72)", borderRadius: 18, marginTop: 12, paddingHorizontal: 13, paddingVertical: 12 },
  timelineDot: { backgroundColor: colors.paper, borderColor: colors.sage, borderRadius: 5, borderWidth: 2, height: 10, width: 10 },
  timelineDotActive: { backgroundColor: colors.sage, borderRadius: 5, height: 10, width: 10 },
  timelineLabel: { color: colors.navy, fontFamily: "Nunito_800ExtraBold", fontSize: 8, letterSpacing: 0.9, marginBottom: 10 },
  timelineLine: { backgroundColor: colors.line, flex: 0.7, height: 1, marginTop: 5 },
  timelineRow: { alignItems: "flex-start", flexDirection: "row" },
  timelineStep: { alignItems: "center", flex: 1 },
  timelineWhat: { color: colors.muted, fontFamily: "Nunito_700Bold", fontSize: 7.5, marginTop: 1, textAlign: "center" },
  timelineWhen: { color: colors.ink, fontFamily: "Nunito_800ExtraBold", fontSize: 9, marginTop: 5 },
  title: { alignSelf: "center", color: colors.ink, fontFamily: "Fredoka_600SemiBold", fontSize: 28, lineHeight: 32, maxWidth: 350, textAlign: "center" },
  topBar: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  trialBadge: { backgroundColor: colors.sageSoft, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 4 },
  trialBadgeText: { color: colors.sage, fontFamily: "Nunito_800ExtraBold", fontSize: 7.5, letterSpacing: 0.45 },
});
