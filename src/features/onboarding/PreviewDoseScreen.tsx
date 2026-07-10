import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors } from "../../design";
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
 * Stage 4, step 5: preview the next scheduled dose.
 *
 * Per docs/AAA-HANDOFF.md §8: "Preview the next scheduled dose."
 * For v1 this is the earliest of the entered times. Stage 5 will
 * compute this from the recurrence engine.
 */
export function PreviewDoseScreen({
  pet,
  medication,
  onFinish,
}: PreviewDoseScreenProps) {
  const insets = useSafeAreaInsets();
  const earliest = [...medication.times].sort()[0] ?? "08:00";

  return (
    <View style={[styles.container, { paddingTop: insets.top + 24 }]}>
      <View style={styles.center}>
        <View style={styles.dot} />
        <Text style={styles.eyebrow}>YOU'RE ALL SET</Text>
        <Text style={styles.title}>
          {pet.name} is ready for {medication.name}.
        </Text>
        <Text style={styles.copy}>
          At {earliest} PawPair will surface a calm, one-tap
          confirmation. You can also open the app and log it from
          the Today screen.
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
        <Pressable onPress={onFinish} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Open Today</Text>
          <Ionicons color={colors.white} name="arrow-forward" size={18} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center", marginTop: 32, paddingHorizontal: 24 },
  container: { backgroundColor: colors.background, flex: 1, paddingHorizontal: 24 },
  copy: {
    color: colors.muted,
    fontFamily: "Manrope_400Regular",
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
    color: colors.muted,
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 10,
    letterSpacing: 1.6,
  },
  flex: { flex: 1 },
  previewCard: {
    backgroundColor: colors.paper,
    borderColor: colors.line,
    borderRadius: 20,
    marginHorizontal: 16,
    marginTop: 32,
    padding: 16,
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
    backgroundColor: colors.line,
    height: 36,
    marginHorizontal: 12,
    width: 1,
  },
  previewMeta: {
    color: colors.muted,
    fontFamily: "Manrope_600SemiBold",
    fontSize: 11,
    marginTop: 2,
  },
  previewName: {
    color: colors.ink,
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 14,
  },
  previewRow: {
    alignItems: "center",
    flexDirection: "row",
  },
  previewTime: {
    color: colors.ink,
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 18,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: colors.coral,
    borderRadius: 18,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 56,
    paddingHorizontal: 18,
  },
  primaryButtonText: {
    color: colors.white,
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 14,
  },
  title: {
    color: colors.ink,
    fontFamily: "Fraunces_700Bold",
    fontSize: 28,
    lineHeight: 34,
    marginTop: 12,
    textAlign: "center",
  },
});
