import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "../../design";

interface DoseActionsSheetProps {
  visible: boolean;
  onNote: () => void;
  onReschedule: () => void;
  onSkipReason: () => void;
  onCorrect: () => void;
  onCancel: () => void;
}

/**
 * Per docs/AAA-HANDOFF.md §8 the Today timeline supports
 * long-press overflow: notes, reschedule, skip reason, and
 * correction. Each opens a follow-up surface (text input,
 * time picker, reason picker, picker of past event). The
 * host wires those follow-ups; this component is the menu.
 */
export function DoseActionsSheet({
  visible,
  onNote,
  onReschedule,
  onSkipReason,
  onCorrect,
  onCancel,
}: DoseActionsSheetProps) {
  if (!visible) return null;
  return (
    <View style={styles.backdrop}>
      <Pressable onPress={onCancel} style={styles.dismiss} />
      <View style={styles.sheet}>
        <Text style={styles.sheetTitle}>Dose options</Text>
        <Pressable onPress={onNote} style={styles.row}>
          <Ionicons color={colors.ink} name="create-outline" size={18} />
          <Text style={styles.rowText}>Add note</Text>
        </Pressable>
        <Pressable onPress={onReschedule} style={styles.row}>
          <Ionicons color={colors.ink} name="time-outline" size={18} />
          <Text style={styles.rowText}>Reschedule</Text>
        </Pressable>
        <Pressable onPress={onSkipReason} style={styles.row}>
          <Ionicons color={colors.muted} name="remove-circle-outline" size={18} />
          <Text style={styles.rowText}>Skip with reason</Text>
        </Pressable>
        <Pressable onPress={onCorrect} style={styles.row}>
          <Ionicons color={colors.ink} name="swap-horizontal-outline" size={18} />
          <Text style={styles.rowText}>Correct a past entry</Text>
        </Pressable>
        <Pressable onPress={onCancel} style={styles.cancelRow}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: "rgba(0,0,0,0.32)",
    flex: 1,
    justifyContent: "flex-end",
  },
  cancelRow: {
    alignItems: "center",
    backgroundColor: colors.paper,
    borderColor: colors.line,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 8,
    paddingVertical: 14,
  },
  cancelText: {
    color: colors.muted,
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 13,
  },
  dismiss: { flex: 1 },
  row: {
    alignItems: "center",
    backgroundColor: colors.paper,
    borderColor: colors.line,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowText: {
    color: colors.ink,
    fontFamily: "Manrope_700Bold",
    fontSize: 14,
  },
  sheet: { padding: 18, paddingBottom: 32 },
  sheetTitle: {
    color: colors.muted,
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 10,
    letterSpacing: 1.2,
    marginBottom: 12,
    textAlign: "center",
  },
});
