import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "../../design";

interface EmptyTodayStateProps {
  onAddMedication: () => void;
}

/**
 * Per docs/AAA-HANDOFF.md §8: "Empty-day state with useful next
 * action." Shown when the day has no scheduled doses. The CTA
 * is the same color as the FAB so the action is discoverable.
 */
export function EmptyTodayState({ onAddMedication }: EmptyTodayStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <Ionicons color={colors.sage} name="checkmark-circle" size={48} />
      </View>
      <Text style={styles.title}>All done for today.</Text>
      <Text style={styles.body}>
        Every dose is logged. If you have a new medication, you
        can add it now and it will appear on the next reminder
        time.
      </Text>
      <Pressable onPress={onAddMedication} style={styles.cta}>
        <Ionicons color={colors.white} name="add" size={18} />
        <Text style={styles.ctaText}>Add medication</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    color: colors.muted,
    fontFamily: "Manrope_400Regular",
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
    paddingHorizontal: 32,
    textAlign: "center",
  },
  container: {
    alignItems: "center",
    paddingHorizontal: 32,
    paddingTop: 24,
    paddingBottom: 32,
  },
  cta: {
    alignItems: "center",
    backgroundColor: colors.coral,
    borderRadius: 18,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    marginTop: 20,
    minHeight: 48,
    paddingHorizontal: 20,
  },
  ctaText: {
    color: colors.white,
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 13,
  },
  iconWrap: {
    alignItems: "center",
    backgroundColor: colors.sageSoft,
    borderRadius: 36,
    height: 72,
    justifyContent: "center",
    width: 72,
  },
  title: {
    color: colors.ink,
    fontFamily: "Fraunces_700Bold",
    fontSize: 22,
    marginTop: 14,
  },
});
