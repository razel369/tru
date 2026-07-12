/**
 * Local-first launch paywall — no fake purchases.
 * Explains free limits and that Plus is coming later.
 */
import { Ionicons } from "@expo/vector-icons";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppHeader } from "../../components/AppHeader";
import { colors, shadow } from "../../design";
import { FREE_TIER_LIMITS, PLUS_BENEFITS } from "./types";

interface PaywallScreenProps {
  onClose: () => void;
}

export function PaywallScreen({ onClose }: PaywallScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + 14 }]}>
      <AppHeader
        actionIcon="close-outline"
        eyebrow="PAWPAIR PLUS"
        onAction={onClose}
        title="Coming soon"
      />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: 40 + insets.bottom },
        ]}
      >
        <Text style={styles.title}>
          Your free plan is ready for launch.
        </Text>
        <Text style={styles.copy}>
          This release is local-first on one device. You can track{" "}
          {FREE_TIER_LIMITS.maxPets} pet and up to{" "}
          {FREE_TIER_LIMITS.maxActiveMedications} active medications, with dose
          confirmation that stays trustworthy offline.
        </Text>

        <View style={styles.card}>
          <Text style={styles.cardKicker}>INCLUDED NOW</Text>
          <Text style={styles.cardLine}>• Today dose confirmation</Text>
          <Text style={styles.cardLine}>• Local reminders (when allowed)</Text>
          <Text style={styles.cardLine}>• Export and delete on this device</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardKicker}>COMING WITH PLUS</Text>
          {PLUS_BENEFITS.slice(0, 4).map((benefit) => (
            <Text key={benefit.title} style={styles.cardLine}>
              • {benefit.title}
            </Text>
          ))}
        </View>

        <View style={styles.notice}>
          <Ionicons color={colors.sky} name="information-circle" size={20} />
          <Text style={styles.noticeText}>
            Purchases are not available yet. We will not charge you or unlock a
            demo subscription.
          </Text>
        </View>

        <Pressable onPress={onClose} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Back to care</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.paper,
    borderRadius: 24,
    marginBottom: 14,
    padding: 18,
    ...shadow.card,
  },
  cardKicker: {
    color: colors.sky,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 10,
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  cardLine: {
    color: colors.ink,
    fontFamily: "Nunito_600SemiBold",
    fontSize: 14,
    lineHeight: 22,
  },
  container: { backgroundColor: colors.background, flex: 1 },
  content: { paddingHorizontal: 18, paddingTop: 8 },
  copy: {
    color: colors.muted,
    fontFamily: "Nunito_600SemiBold",
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 18,
    marginTop: 8,
  },
  notice: {
    alignItems: "flex-start",
    backgroundColor: colors.skySoft,
    borderRadius: 20,
    flexDirection: "row",
    gap: 10,
    marginBottom: 18,
    padding: 14,
  },
  noticeText: {
    color: colors.ink,
    flex: 1,
    fontFamily: "Nunito_600SemiBold",
    fontSize: 13,
    lineHeight: 19,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: colors.coral,
    borderRadius: 999,
    minHeight: 54,
    justifyContent: "center",
    ...shadow.fab,
  },
  primaryButtonText: {
    color: colors.white,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 15,
  },
  title: {
    color: colors.ink,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 26,
    letterSpacing: -0.4,
  },
});
