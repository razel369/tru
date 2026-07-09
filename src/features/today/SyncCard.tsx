import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import { colors } from "../../design";

/**
 * Two-caregiver sync illustration row shown under the Today timeline.
 * Extracted verbatim from App.tsx in stage 2.
 *
 * Note: this is presentational-only at the prototype stage. The "Alex can
 * see every dose" copy anticipates the household sync model described in
 * docs/AAA-HANDOFF.md §5 but does not perform any sync by itself.
 */
export function SyncCard() {
  return (
    <View style={styles.syncCard}>
      <View style={styles.syncIllustration}>
        <View style={[styles.personBubble, styles.personBubbleFirst]}>
          <Text style={styles.personText}>M</Text>
        </View>
        <View style={[styles.personBubble, styles.personBubbleSecond]}>
          <Text style={styles.personText}>A</Text>
        </View>
        <View style={styles.syncBadge}>
          <Ionicons name="sync" size={13} color={colors.sage} />
        </View>
      </View>
      <View style={styles.flex}>
        <Text style={styles.syncTitle}>Everyone stays in sync</Text>
        <Text style={styles.syncCopy}>
          Alex can see every dose you log, instantly.
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.muted} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  personBubble: {
    alignItems: "center",
    borderColor: colors.paper,
    borderRadius: 17,
    borderWidth: 2,
    height: 34,
    justifyContent: "center",
    position: "absolute",
    width: 34,
  },
  personBubbleFirst: { backgroundColor: colors.coral, left: 2 },
  personBubbleSecond: { backgroundColor: colors.sage, left: 26 },
  personText: { color: colors.white, fontSize: 11, fontWeight: "900" },
  syncBadge: {
    alignItems: "center",
    backgroundColor: colors.paper,
    borderRadius: 11,
    bottom: -4,
    height: 22,
    justifyContent: "center",
    position: "absolute",
    right: -4,
    width: 22,
  },
  syncCard: {
    alignItems: "center",
    backgroundColor: colors.paper,
    borderColor: colors.line,
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: "row",
    gap: 14,
    marginTop: 12,
    padding: 16,
  },
  syncCopy: {
    color: colors.muted,
    fontFamily: "Manrope_400Regular",
    fontSize: 11,
    marginTop: 3,
  },
  syncIllustration: {
    height: 38,
    position: "relative",
    width: 50,
  },
  syncTitle: {
    color: colors.ink,
    fontFamily: "Manrope_700Bold",
    fontSize: 13,
  },
});
