import { Ionicons } from "@expo/vector-icons";
import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors, shadow } from "../../design";

import type { HealthRecord } from "./types";
import { buildWeightTrend, formatWeightTrendNumber } from "./weight-trend";

export function WeightTrendCard({ records }: { records: HealthRecord[] }) {
  const trend = useMemo(() => buildWeightTrend(records), [records]);
  if (!trend) return null;

  const deltaLabel =
    trend.delta === 0
      ? "No net change"
      : `${trend.delta > 0 ? "+" : ""}${formatWeightTrendNumber(trend.delta)} ${trend.unit}`;

  return (
    <View
      accessibilityLabel={trend.accessibleSummary}
      accessible
      style={styles.card}
    >
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={styles.icon}>
            <Ionicons color={colors.sky} name="analytics-outline" size={17} />
          </View>
          <View>
            <Text style={styles.eyebrow}>WEIGHT SIGNAL</Text>
            <Text style={styles.title}>Weight trend</Text>
          </View>
        </View>
        <View style={styles.latestBlock}>
          <Text style={styles.latestValue}>
            {formatWeightTrendNumber(trend.latestValue)}
          </Text>
          <Text style={styles.latestUnit}>{trend.unit}</Text>
        </View>
      </View>

      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.chart}>
        {trend.points.map((point, index) => {
          const isLatest = index === trend.points.length - 1;
          return (
            <View key={point.date} style={styles.point}>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.bar,
                    { height: point.barHeight },
                    isLatest && styles.barLatest,
                  ]}
                />
              </View>
              <Text style={[styles.date, isLatest && styles.dateLatest]}>
                {point.label}
              </Text>
            </View>
          );
        })}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerLabel}>Since {trend.firstDateLabel}</Text>
        <View style={styles.deltaPill}>
          <Ionicons color={colors.navy} name="swap-vertical" size={13} />
          <Text style={styles.deltaText}>{deltaLabel}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: "rgba(91, 158, 213, 0.34)",
    borderRadius: 8,
    minHeight: 18,
    width: "100%",
  },
  barLatest: { backgroundColor: colors.sky },
  barTrack: {
    flex: 1,
    justifyContent: "flex-end",
    width: "100%",
  },
  card: {
    backgroundColor: colors.paper,
    borderColor: colors.line,
    borderRadius: 24,
    borderWidth: 1,
    marginHorizontal: 18,
    marginTop: 12,
    padding: 16,
    ...shadow.subtle,
  },
  chart: {
    alignItems: "flex-end",
    flexDirection: "row",
    gap: 7,
    height: 88,
    marginTop: 12,
  },
  date: {
    color: colors.muted,
    fontFamily: "Nunito_700Bold",
    fontSize: 8,
    marginTop: 5,
    textAlign: "center",
  },
  dateLatest: { color: colors.navy },
  deltaPill: {
    alignItems: "center",
    backgroundColor: colors.skySoft,
    borderRadius: 14,
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  deltaText: {
    color: colors.navy,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 9,
  },
  eyebrow: {
    color: colors.sky,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 8,
    letterSpacing: 1,
  },
  footer: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 11,
  },
  footerLabel: {
    color: colors.muted,
    fontFamily: "Nunito_600SemiBold",
    fontSize: 9,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  icon: {
    alignItems: "center",
    backgroundColor: colors.skySoft,
    borderRadius: 17,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  latestBlock: { alignItems: "baseline", flexDirection: "row", gap: 3 },
  latestUnit: {
    color: colors.muted,
    fontFamily: "Nunito_700Bold",
    fontSize: 10,
  },
  latestValue: {
    color: colors.ink,
    fontFamily: "Fredoka_600SemiBold",
    fontSize: 24,
  },
  point: { flex: 1, height: "100%", justifyContent: "flex-end" },
  title: {
    color: colors.ink,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 14,
    marginTop: 1,
  },
  titleRow: { alignItems: "center", flexDirection: "row", gap: 9 },
});
