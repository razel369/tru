import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import { colors, shadow } from "../../design";

/**
 * Soft clay sync strip under Today's dose stickers.
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
          <Ionicons color={colors.sage} name="heart" size={12} />
        </View>
      </View>
      <View style={styles.flex}>
        <Text style={styles.syncTitle}>Everyone stays in sync</Text>
        <Text style={styles.syncCopy}>
          Alex can see every dose you log, instantly.
        </Text>
      </View>
      <Ionicons color={colors.muted} name="chevron-forward" size={20} />
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
  personBubbleSecond: { backgroundColor: colors.sky, left: 26 },
  personText: {
    color: colors.white,
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 11,
  },
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
    borderRadius: 24,
    flexDirection: "row",
    gap: 14,
    marginTop: 14,
    padding: 16,
    ...shadow.card,
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
