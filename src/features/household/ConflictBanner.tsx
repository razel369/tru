import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "../../design";
import type { DoseConflict } from "./types";

interface ConflictBannerProps {
  conflict: DoseConflict;
  onCancel: () => void;
  onKeepMine: () => void;
}

/**
 * docs/AAA-HANDOFF.md §5: "The second receives a designed
 * conflict screen showing who logged the dose and when. The
 * user may cancel their pending action or intentionally add a
 * correction; the app must never overwrite silently."
 */
export function ConflictBanner({
  conflict,
  onCancel,
  onKeepMine,
}: ConflictBannerProps) {
  const when = new Date(conflict.firstEvent.completedAtUtc);
  const whenText = when.toLocaleString();
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons color={colors.coral} name="alert-circle" size={18} />
        <Text style={styles.title}>Already logged</Text>
      </View>
      <Text style={styles.body}>
        {conflict.firstEvent.completedByDisplayName} already
        marked this dose {whenText}. Their entry is the source of
        truth.
      </Text>
      <View style={styles.row}>
        <Pressable onPress={onCancel} style={styles.cancelButton}>
          <Text style={styles.cancelText}>Discard mine</Text>
        </Pressable>
        <Pressable onPress={onKeepMine} style={styles.keepButton}>
          <Text style={styles.keepText}>Log as correction</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    color: colors.muted,
    fontFamily: "Manrope_400Regular",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
  },
  cancelButton: {
    alignItems: "center",
    backgroundColor: colors.paper,
    borderRadius: 999,
    flex: 1,
    paddingVertical: 10,
  },
  cancelText: {
    color: colors.ink,
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 12,
  },
  container: {
    backgroundColor: colors.coralSoft,
    borderRadius: 24,
    marginHorizontal: 18,
    marginTop: 12,
    padding: 14,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  keepButton: {
    alignItems: "center",
    backgroundColor: colors.coral,
    borderRadius: 999,
    flex: 1,
    paddingVertical: 10,
  },
  keepText: {
    color: colors.white,
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 12,
  },
  row: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  title: {
    color: colors.ink,
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 13,
  },
});
