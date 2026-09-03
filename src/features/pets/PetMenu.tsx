import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "../../design";

interface PetMenuProps {
  visible: boolean;
  onEdit: () => void;
  onArchive: () => void;
  onCancel: () => void;
}

/**
 * Pet action menu. Mirrors MedicationMenu. Per docs/AAA-HANDOFF.md
 * §8 the archive path is the only removal route so the pet's
 * dose history is never silently discarded.
 */
export function PetMenu({
  visible,
  onEdit,
  onArchive,
  onCancel,
}: PetMenuProps) {
  if (!visible) return null;
  return (
    <View style={styles.backdrop}>
      <Pressable onPress={onCancel} style={styles.dismiss} />
      <View style={styles.sheet}>
        <Text style={styles.sheetTitle}>Pet</Text>
        <Pressable onPress={onEdit} style={styles.row}>
          <Ionicons color={colors.ink} name="create-outline" size={18} />
          <Text style={styles.rowText}>Edit</Text>
        </Pressable>
        <Pressable onPress={onArchive} style={styles.row}>
          <Ionicons color={colors.danger} name="archive-outline" size={18} />
          <Text style={[styles.rowText, styles.rowTextDanger]}>Archive</Text>
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
    fontFamily: "Manrope_800ExtraBold",
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
    shadowColor: "#2A3A4A",
    shadowOffset: { height: 6, width: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
  },
  rowText: {
    color: colors.ink,
    fontFamily: "Manrope_700Bold",
    fontSize: 14,
  },
  rowTextDanger: { color: colors.danger },
  sheet: { padding: 18, paddingBottom: 32 },
  sheetTitle: {
    color: colors.sky,
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 10,
    letterSpacing: 1.2,
    marginBottom: 12,
    textAlign: "center",
  },
});
