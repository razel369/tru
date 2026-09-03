import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import { colors, shadow } from "../../design";

import type { CareInsightSummary } from "./care-insights";

function metricValue(value: number | null, suffix = "") {
  return value === null ? "--" : `${value}${suffix}`;
}

export function CareInsightsCard({
  summary,
}: {
  summary: CareInsightSummary;
}) {
  return (
    <View
      accessibilityLabel={`Seven day care completion ${metricValue(summary.adherence, " percent")}`}
      style={styles.card}
    >
      <View style={styles.heading}>
        <View style={styles.headingIcon}>
          <Ionicons color={colors.navy} name="analytics-outline" size={19} />
        </View>
        <View style={styles.flex}>
          <Text style={styles.eyebrow}>7-DAY CARE RHYTHM</Text>
          <Text style={styles.title}>Care insights</Text>
        </View>
        <View style={styles.score}>
          <Text style={styles.scoreValue}>
            {metricValue(summary.adherence, "%")}
          </Text>
          <Text style={styles.scoreLabel}>complete</Text>
        </View>
      </View>

      <View style={styles.chart}>
        {summary.days.map((day) => {
          const value = day.adherence ?? 0;
          const color =
            day.adherence === null
              ? colors.line
              : value === 100
                ? colors.sage
                : value >= 70
                  ? colors.sky
                  : colors.coral;
          return (
            <View key={day.date} style={styles.dayColumn}>
              <View style={[styles.barTrack, day.isToday && styles.barTrackToday]}>
                <View
                  style={[
                    styles.bar,
                    {
                      backgroundColor: color,
                      height: day.adherence === null ? 4 : Math.max(6, Math.round(value * 0.38)),
                    },
                  ]}
                />
              </View>
              <Text style={[styles.dayLabel, day.isToday && styles.dayLabelToday]}>
                {day.label}
              </Text>
            </View>
          );
        })}
      </View>

      <View style={styles.metrics}>
        <View style={styles.metric}>
          <Ionicons color={colors.sage} name="flame-outline" size={16} />
          <Text style={styles.metricValue}>{summary.streak}</Text>
          <Text style={styles.metricLabel}>day streak</Text>
        </View>
        <View style={styles.metricDivider} />
        <View style={styles.metric}>
          <Ionicons color={colors.sky} name="walk-outline" size={16} />
          <Text style={styles.metricValue}>{summary.activityMinutes}</Text>
          <Text style={styles.metricLabel}>active min</Text>
        </View>
        <View style={styles.metricDivider} />
        <View style={styles.metric}>
          <Ionicons color={colors.coral} name="medical-outline" size={16} />
          <Text style={styles.metricValue}>
            {metricValue(summary.medicationAdherence, "%")}
          </Text>
          <Text style={styles.metricLabel}>medication</Text>
        </View>
      </View>

      {summary.attentionCount > 0 ? (
        <View style={styles.attention}>
          <Ionicons color={colors.coral} name="alert-circle-outline" size={15} />
          <Text style={styles.attentionText}>
            {summary.attentionCount} care {summary.attentionCount === 1 ? "moment needs" : "moments need"} review
          </Text>
        </View>
      ) : summary.planned > 0 ? (
        <View style={styles.steady}>
          <Ionicons color={colors.sage} name="checkmark-circle-outline" size={15} />
          <Text style={styles.steadyText}>Everything due is accounted for</Text>
        </View>
      ) : (
        <Text style={styles.empty}>Complete care moments to build a useful trend.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  attention: { alignItems: "center", backgroundColor: colors.coralSoft, borderRadius: 14, flexDirection: "row", gap: 6, marginTop: 12, paddingHorizontal: 10, paddingVertical: 8 },
  attentionText: { color: colors.danger, flex: 1, fontFamily: "Nunito_700Bold", fontSize: 9 },
  bar: { borderRadius: 5, width: 9 },
  barTrack: { alignItems: "center", backgroundColor: colors.background, borderRadius: 8, height: 42, justifyContent: "flex-end", overflow: "hidden", paddingBottom: 2, width: 17 },
  barTrackToday: { borderColor: colors.navy, borderWidth: 1 },
  card: { backgroundColor: colors.paper, borderColor: "rgba(34,48,67,0.07)", borderRadius: 25, borderWidth: 1, marginHorizontal: 18, marginTop: 16, padding: 14, ...shadow.subtle },
  chart: { alignItems: "flex-end", flexDirection: "row", justifyContent: "space-between", marginTop: 13, paddingHorizontal: 5 },
  dayColumn: { alignItems: "center", gap: 4 },
  dayLabel: { color: colors.muted, fontFamily: "Nunito_700Bold", fontSize: 8 },
  dayLabelToday: { color: colors.navy, fontFamily: "Nunito_800ExtraBold" },
  empty: { color: colors.muted, fontFamily: "Nunito_600SemiBold", fontSize: 9, marginTop: 11, textAlign: "center" },
  eyebrow: { color: colors.navy, fontFamily: "Nunito_800ExtraBold", fontSize: 8, letterSpacing: 0.9 },
  flex: { flex: 1 },
  heading: { alignItems: "center", flexDirection: "row", gap: 9 },
  headingIcon: { alignItems: "center", backgroundColor: colors.skySoft, borderRadius: 17, height: 36, justifyContent: "center", width: 36 },
  metric: { alignItems: "center", flex: 1 },
  metricDivider: { backgroundColor: colors.line, height: 32, width: 1 },
  metricLabel: { color: colors.muted, fontFamily: "Nunito_700Bold", fontSize: 8, marginTop: 1 },
  metrics: { alignItems: "center", backgroundColor: colors.background, borderRadius: 17, flexDirection: "row", marginTop: 12, paddingVertical: 9 },
  metricValue: { color: colors.ink, fontFamily: "Nunito_800ExtraBold", fontSize: 14, marginTop: 2 },
  score: { alignItems: "center", backgroundColor: colors.sageSoft, borderRadius: 16, minWidth: 54, paddingHorizontal: 8, paddingVertical: 7 },
  scoreLabel: { color: colors.sage, fontFamily: "Nunito_700Bold", fontSize: 7 },
  scoreValue: { color: colors.sage, fontFamily: "Nunito_800ExtraBold", fontSize: 15 },
  steady: { alignItems: "center", backgroundColor: colors.sageSoft, borderRadius: 14, flexDirection: "row", gap: 6, marginTop: 12, paddingHorizontal: 10, paddingVertical: 8 },
  steadyText: { color: colors.sage, flex: 1, fontFamily: "Nunito_700Bold", fontSize: 9 },
  title: { color: colors.ink, fontFamily: "Fredoka_600SemiBold", fontSize: 18, lineHeight: 21 },
});
