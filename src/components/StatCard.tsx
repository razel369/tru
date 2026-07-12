import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import { colors, shadow } from "../design";

interface StatCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}

/** Compact clay metric card for Insights. */
export function StatCard({ icon, label, value }: StatCardProps) {
  return (
    <View style={styles.statCard}>
      <View style={styles.statIcon}>
        <Ionicons color={colors.sky} name={icon} size={17} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  statCard: {
    alignItems: "center",
    backgroundColor: colors.paper,
    borderRadius: 26,
    flex: 1,
    paddingVertical: 16,
    ...shadow.card,
  },
  statIcon: {
    alignItems: "center",
    backgroundColor: colors.skySoft,
    borderRadius: 14,
    height: 34,
    justifyContent: "center",
    marginBottom: 6,
    width: 34,
  },
  statLabel: {
    color: colors.muted,
    fontFamily: "Nunito_600SemiBold",
    fontSize: 10,
    marginTop: 2,
  },
  statValue: {
    color: colors.ink,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 22,
  },
});
