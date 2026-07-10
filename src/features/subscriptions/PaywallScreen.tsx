import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppHeader } from "../../components/AppHeader";
import { colors } from "../../design";
import { PLUS_BENEFITS } from "./types";
import { purchasePlus, restorePurchases } from "./storekit";

interface PaywallScreenProps {
  onClose: () => void;
  onSubscribed: () => void;
}

/**
 * docs/AAA-HANDOFF.md §9 paywall requirements:
 * - Clear terms and renewal copy
 * - Restore purchases must be visible
 * - Never block access to previously entered health records
 * - Test StoreKit sandbox purchase, restore, expiration, billing
 *   retry, refund, offline entitlement cache, Family Sharing
 *
 * The screen surfaces the benefits list, a Subscribe CTA, and
 * a Restore button at the bottom. The text is intentionally
 * plain and avoids urgency language.
 */
export function PaywallScreen({ onClose, onSubscribed }: PaywallScreenProps) {
  const insets = useSafeAreaInsets();
  const [working, setWorking] = useState(false);

  const onSubscribe = async () => {
    setWorking(true);
    const result = await purchasePlus();
    setWorking(false);
    if (result.ok) onSubscribed();
    else
      Alert.alert(
        "Purchase did not complete",
        result.reason === "user-cancelled"
          ? "No charge was made."
          : "Please try again or contact support@rmalk.co.il.",
      );
  };

  const onRestore = async () => {
    setWorking(true);
    const result = await restorePurchases();
    setWorking(false);
    if (result.ok) onSubscribed();
    else
      Alert.alert(
        "Restore did not find a purchase",
        "We could not find a PawPair Plus purchase on this Apple ID.",
      );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 14 }]}>
      <AppHeader
        actionIcon="close-outline"
        eyebrow="PAWPAIR PLUS"
        onAction={onClose}
        title="Subscription"
      />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: 100 + insets.bottom },
        ]}
      >
        <Text style={styles.title}>
          Care works better together.
        </Text>
        <Text style={styles.body}>
          PawPair Plus unlocks caregiver sync, reports, and
          full history. The core dose confirmation stays free
          forever.
        </Text>
        <View style={styles.benefits}>
          {PLUS_BENEFITS.map((b) => (
            <View key={b.title} style={styles.benefitRow}>
              <Ionicons color={colors.sage} name="checkmark" size={16} />
              <View style={styles.benefitText}>
                <Text style={styles.benefitTitle}>{b.title}</Text>
                <Text style={styles.benefitBody}>{b.body}</Text>
              </View>
            </View>
          ))}
        </View>
        <Text style={styles.terms}>
          Subscription auto-renews monthly until cancelled in
          Settings. Cancel any time. Your previously entered
          records remain available even if the subscription
          expires.
        </Text>
        <Pressable
          disabled={working}
          onPress={onSubscribe}
          style={[styles.cta, working && styles.ctaDisabled]}
        >
          <Text style={styles.ctaText}>
            {working ? "Working…" : "Subscribe — ₪29.90 / month"}
          </Text>
        </Pressable>
        <Pressable
          disabled={working}
          onPress={onRestore}
          style={styles.restore}
        >
          <Text style={styles.restoreText}>Restore purchases</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  benefitBody: {
    color: colors.muted,
    fontFamily: "Manrope_400Regular",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 2,
  },
  benefitRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },
  benefitText: { flex: 1 },
  benefitTitle: {
    color: colors.ink,
    fontFamily: "Manrope_700Bold",
    fontSize: 13,
  },
  benefits: { marginTop: 12 },
  body: {
    color: colors.muted,
    fontFamily: "Manrope_400Regular",
    fontSize: 13,
    lineHeight: 20,
    marginTop: 12,
  },
  container: { backgroundColor: colors.background, flex: 1 },
  content: { paddingHorizontal: 18, paddingTop: 8 },
  cta: {
    alignItems: "center",
    backgroundColor: colors.coral,
    borderRadius: 18,
    marginTop: 24,
    minHeight: 56,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  ctaDisabled: { opacity: 0.6 },
  ctaText: {
    color: colors.white,
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 14,
  },
  restore: {
    alignItems: "center",
    marginTop: 8,
    minHeight: 44,
    paddingVertical: 10,
  },
  restoreText: {
    color: colors.coral,
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 13,
  },
  terms: {
    color: colors.muted,
    fontFamily: "Manrope_400Regular",
    fontSize: 11,
    lineHeight: 16,
    marginTop: 16,
  },
  title: {
    color: colors.ink,
    fontFamily: "Fraunces_700Bold",
    fontSize: 28,
    lineHeight: 34,
    marginTop: 12,
  },
});
