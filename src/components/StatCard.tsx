import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import { colors } from "../design";

interface StatCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}

/**
 * Compact metric card used on the Insights screen.
 * Extracted verbatim from App.tsx in stage 2.
 */
export function StatCard({ icon, label, value }: StatCardProps) {
  return (
    <View style={styles.statCard}>
      <View style={styles.statIcon}>
        <Ionicons name={icon} size={17} color={colors.sage} />
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
    borderColor: colors.line,
    borderRadius: 22,
    borderWidth: 1,
    flex: 1,
    paddingVertical: 16,
  },
  statIcon: {
    alignItems: "center",
    backgroundColor: colors.sageSoft,
    borderRadius: 12,
    height: 32,
    justifyContent: "center",
    marginBottom: 6,
    width: 32,
  },
  statLabel: {
    color: colors.muted,
    fontFamily: "Manrope_600SemiBold",
    fontSize: 9,
    marginTop: 2,
  },
  statValue: {
    color: colors.ink,
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 20,
  },
});
