import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, shadow } from "../../design";
import { requestPermissionIfNeeded } from "../notifications/permission";
import type {
  OnboardingMedicationDraft,
  OnboardingPetDraft,
} from "./types";

interface PreviewDoseScreenProps {
  pet: OnboardingPetDraft;
  medication: OnboardingMedicationDraft;
  onFinish: () => void;
}

/**
 * Preview next dose + ask for reminder permission before Today.
 */
export function PreviewDoseScreen({
  pet,
  medication,
  onFinish,
}: PreviewDoseScreenProps) {
  const insets = useSafeAreaInsets();
  const earliest = [...medication.times].sort()[0] ?? "08:00";

  const finish = async () => {
    try {
      await requestPermissionIfNeeded();
    } catch {
      // Permission failures should not block finishing onboarding.
    }
    onFinish();
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 24 }]}>
      <View style={styles.center}>
        <View style={styles.dot} />
        <Text style={styles.eyebrow}>YOU'RE ALL SET</Text>
        <Text style={styles.title}>
          {pet.name} is ready for {medication.name}.
        </Text>
        <Text style={styles.copy}>
          At {earliest} you can confirm the dose on Today with one tap. If you
          allow notifications, PawPair can also remind you on this device.
        </Text>
      </View>

      <View style={styles.previewCard}>
        <View style={styles.previewRow}>
          <Text style={styles.previewTime}>{earliest}</Text>
          <View style={styles.previewDivider} />
          <View style={styles.flex}>
            <Text style={styles.previewName}>{medication.name}</Text>
            <Text style={styles.previewMeta}>
              {medication.dosageText} · {medication.supplyUnit}
            </Text>
          </View>
          <View style={styles.previewCheck}>
            <Ionicons color={colors.white} name="checkmark" size={16} />
          </View>
        </View>
      </View>

      <View style={styles.cta}>
        <Pressable onPress={() => void finish()} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Enable reminders & open Today</Text>
          <Ionicons color={colors.white} name="arrow-forward" size={18} />
        </Pressable>
        <Pressable onPress={onFinish} style={styles.secondaryButton}>
          <Text style={styles.secondaryText}>Skip reminders for now</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center", marginTop: 32, paddingHorizontal: 8 },
  container: {
    backgroundColor: colors.background,
    flex: 1,
    paddingHorizontal: 24,
  },
  copy: {
    color: colors.muted,
    fontFamily: "Nunito_600SemiBold",
    fontSize: 14,
    lineHeight: 22,
    marginTop: 12,
    textAlign: "center",
  },
  cta: { marginBottom: 24, marginTop: 32 },
  dot: {
    backgroundColor: colors.coral,
    borderRadius: 6,
    height: 12,
    marginBottom: 18,
    width: 12,
  },
  eyebrow: {
    color: colors.sky,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 10,
    letterSpacing: 1.6,
  },
  flex: { flex: 1 },
  previewCard: {
    backgroundColor: colors.paper,
    borderRadius: 24,
    marginTop: 28,
    padding: 16,
    ...shadow.card,
  },
  previewCheck: {
    alignItems: "center",
    backgroundColor: colors.sage,
    borderRadius: 14,
    height: 28,
    justifyContent: "center",
    width: 28,
  },
  previewDivider: {
    backgroundColor: colors.skySoft,
    height: 36,
    marginHorizontal: 12,
    width: 2,
  },
  previewMeta: {
    color: colors.muted,
    fontFamily: "Nunito_600SemiBold",
    fontSize: 12,
    marginTop: 2,
  },
  previewName: {
    color: colors.ink,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 15,
  },
  previewRow: { alignItems: "center", flexDirection: "row" },
  previewTime: {
    color: colors.sky,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 16,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: colors.coral,
    borderRadius: 999,
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
    minHeight: 56,
    paddingHorizontal: 18,
    ...shadow.fab,
  },
  primaryButtonText: {
    color: colors.white,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 14,
  },
  secondaryButton: {
    alignItems: "center",
    marginTop: 12,
    minHeight: 44,
    paddingVertical: 10,
  },
  secondaryText: {
    color: colors.muted,
    fontFamily: "Nunito_700Bold",
    fontSize: 13,
  },
  title: {
    color: colors.ink,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 26,
    letterSpacing: -0.4,
    marginTop: 8,
    textAlign: "center",
  },
});
