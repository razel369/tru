import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, shadow } from "../../design";

interface DoseActionsSheetProps {
  visible: boolean;
  onNote: () => void;
  onReschedule: () => void;
  onSkipReason: () => void;
  onCorrect: () => void;
  onCancel: () => void;
}

/**
 * Today long-press overflow: notes, reschedule, skip reason, correction.
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
    borderRadius: 999,
    marginTop: 8,
    paddingVertical: 14,
  },
  cancelText: {
    color: colors.muted,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 13,
  },
  dismiss: { flex: 1 },
  row: {
    alignItems: "center",
    backgroundColor: colors.paper,
    borderRadius: 22,
    flexDirection: "row",
    gap: 12,
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    ...shadow.card,
  },
  rowText: {
    color: colors.ink,
    fontFamily: "Nunito_700Bold",
    fontSize: 14,
  },
  sheet: { padding: 18, paddingBottom: 32 },
  sheetTitle: {
    color: colors.sky,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 11,
    letterSpacing: 1.2,
    marginBottom: 12,
    textAlign: "center",
  },
});
