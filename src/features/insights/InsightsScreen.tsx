import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useMemo } from "react";
import { Image, ScrollView, StyleSheet, Text, View } from "react-native";

import { AmbientStickers } from "../../components/AmbientStickers";
import { AppHeader } from "../../components/AppHeader";
import { StatCard } from "../../components/StatCard";
import { assets, colors, shadow } from "../../design";
import { adherencePercent, buildSchedule, dateKey } from "../../schedule";
import type { DoseLog, Pet } from "../../types";

interface InsightsScreenProps {
  pets: Pet[];
  logs: DoseLog[];
  topInset: number;
  onOpenHousehold?: () => void;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

/**
 * Insights — only real logs / schedule math. No marketing theater.
 */
export function InsightsScreen({
  pets,
  logs,
  topInset,
}: InsightsScreenProps) {
  const givenCount = logs.filter((log) => log.status === "given").length;
  const lowStock = pets.flatMap((pet) =>
    pet.medications
      .filter((medication) => medication.stock <= 10)
      .map((medication) => ({ pet, medication })),
  );

  const { weekly, adherence, streak, weekLabel, hasHistory } = useMemo(() => {
    const today = startOfDay(new Date());
    const days: Date[] = [];
    for (let offset = -6; offset <= 0; offset += 1) {
      days.push(addDays(today, offset));
    }

    const weeklyPercents = days.map((day) => {
      const endOfDay = new Date(day);
      endOfDay.setHours(23, 59, 0, 0);
      const daySchedule = buildSchedule(
        pets,
        logs,
        day,
        endOfDay.getHours() * 60 + endOfDay.getMinutes(),
      );
      if (daySchedule.length === 0) return 0;
      const done = daySchedule.filter(
        (dose) => dose.status === "given" || dose.status === "skipped",
      ).length;
      if (done === 0) return 0;
      return adherencePercent(daySchedule);
    });

    const weekSchedule = days.flatMap((day) => {
      const endOfDay = new Date(day);
      endOfDay.setHours(23, 59, 0, 0);
      return buildSchedule(
        pets,
        logs,
        day,
        endOfDay.getHours() * 60 + endOfDay.getMinutes(),
      );
    });
    const weekAdherence = adherencePercent(weekSchedule);

    let run = 0;
    for (let i = weeklyPercents.length - 1; i >= 0; i -= 1) {
      const day = days[i]!;
      const endOfDay = new Date(day);
      endOfDay.setHours(23, 59, 0, 0);
      const daySchedule = buildSchedule(
        pets,
        logs,
        day,
        endOfDay.getHours() * 60 + endOfDay.getMinutes(),
      );
      const open = daySchedule.some(
        (dose) =>
          dose.status === "due" ||
          dose.status === "upcoming" ||
          dose.status === "missed",
      );
      const hadDoses = daySchedule.length > 0;
      if (!hadDoses) continue;
      if (open && i === weeklyPercents.length - 1) break;
      if (open) break;
      run += 1;
    }

    const first = days[0]!;
    const last = days[days.length - 1]!;
    const label = `${first.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    })}–${last.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    })}`;

    return {
      weekly: weeklyPercents,
      adherence: weekAdherence,
      streak: run,
      weekLabel: label,
      hasHistory: logs.length > 0 || weekSchedule.length > 0,
    };
  }, [pets, logs]);

  return (
    <ScrollView
      contentContainerStyle={[
        styles.standardContent,
        { paddingTop: topInset + 14 },
      ]}
      showsVerticalScrollIndicator={false}
      style={styles.screen}
    >
      <AppHeader accent="sun" eyebrow="CARE AT A GLANCE" title="Insights" />

      {!hasHistory ? (
        <View style={styles.emptyCard}>
          <AmbientStickers
            items={[
              {
                source: assets.stickers.plant,
                size: 48,
                top: -10,
                right: -6,
                rotate: "8deg",
              },
              {
                source: assets.stickers.paw,
                size: 36,
                bottom: -8,
                left: -10,
                rotate: "-12deg",
                delay: 120,
              },
            ]}
          />
          <Image
            accessibilityIgnoresInvertColors
            resizeMode="contain"
            source={assets.stickers.check}
            style={styles.emptyArt}
          />
          <Text style={styles.emptyTitle}>No history yet</Text>
          <Text style={styles.emptyCopy}>
            Log a few doses on Today and your adherence will show up here.
          </Text>
        </View>
      ) : (
        <>
          <LinearGradient
            colors={["#E8F2FB", "#FFF1EC"]}
            end={{ x: 1, y: 1 }}
            style={styles.insightHero}
          >
            <View style={styles.insightScoreRing}>
              <Text style={styles.insightScore}>{adherence}</Text>
              <Text style={styles.insightScoreUnit}>%</Text>
            </View>
            <View style={styles.flex}>
              <Text style={styles.insightHeroKicker}>7-DAY ADHERENCE</Text>
              <Text style={styles.insightHeroTitle}>
                {adherence >= 90
                  ? "Strong week"
                  : adherence >= 60
                    ? "Building the habit"
                    : "Room to improve"}
              </Text>
              <Text style={styles.insightHeroCopy}>
                Based on doses logged in the last 7 days.
              </Text>
            </View>
          </LinearGradient>

          <View style={styles.statsRow}>
            <StatCard
              icon="checkmark-done"
              label="Doses given"
              value={`${givenCount}`}
            />
            <StatCard icon="flame" label="Day streak" value={`${streak}`} />
            <StatCard icon="person" label="Caregivers" value="1" />
          </View>

          <View style={styles.chartPanel}>
            <View style={styles.sectionHeadingRow}>
              <View>
                <Text style={styles.sectionKicker}>DAILY COMPLETION</Text>
                <Text style={styles.sectionTitle}>This week</Text>
              </View>
              <Text style={styles.textAction}>{weekLabel}</Text>
            </View>
            <View style={styles.weekChart}>
              {weekly.map((value, index) => {
                const day = addDays(startOfDay(new Date()), index - 6);
                return (
                  <View key={dateKey(day)} style={styles.weekColumn}>
                    <View style={styles.weekBarTrack}>
                      <View
                        style={[
                          styles.weekBar,
                          {
                            height: Math.max(
                              value > 0 ? 8 : 2,
                              Math.round(value * 0.9),
                            ),
                            opacity: value > 0 ? 1 : 0.35,
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.weekDay}>
                      {day.toLocaleDateString(undefined, { weekday: "narrow" })}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        </>
      )}

      <View style={styles.sectionHeadingRow}>
        <View>
          <Text style={styles.sectionKicker}>SMART HEADS-UP</Text>
          <Text style={styles.sectionTitle}>Needs attention</Text>
        </View>
      </View>
      {lowStock.length === 0 ? (
        <View style={styles.quietCard}>
          <Text style={styles.quietText}>Stock looks fine right now.</Text>
        </View>
      ) : (
        lowStock.map(({ pet, medication }) => (
          <View
            key={`${pet.id}-${medication.id}`}
            style={styles.attentionCard}
          >
            <View style={styles.attentionIcon}>
              <Ionicons color={colors.coral} name="cube-outline" size={22} />
            </View>
            <View style={styles.flex}>
              <Text style={styles.attentionTitle}>
                {medication.name} is running low
              </Text>
              <Text style={styles.attentionCopy}>
                {pet.name} has about {medication.stock}{" "}
                {medication.stockUnit} remaining.
              </Text>
            </View>
          </View>
        ))
      )}

      <View style={styles.careTeamCard}>
        <Text style={styles.careTeamKicker}>THIS DEVICE</Text>
        <Text style={styles.careTeamTitle}>
          You’re logging doses on this phone.
        </Text>
        <Text style={styles.careTeamCopy}>
          Household sync is coming — until then, everyone should use the
          same device or share updates in person.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  attentionCard: {
    alignItems: "center",
    backgroundColor: colors.paper,
    borderRadius: 26,
    flexDirection: "row",
    gap: 12,
    marginBottom: 10,
    padding: 15,
    ...shadow.card,
  },
  attentionCopy: {
    color: colors.muted,
    fontFamily: "Nunito_600SemiBold",
    fontSize: 12,
    marginTop: 4,
  },
  attentionIcon: {
    alignItems: "center",
    backgroundColor: colors.coralSoft,
    borderRadius: 16,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  attentionTitle: {
    color: colors.ink,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 14,
  },
  careTeamCard: {
    backgroundColor: colors.sky,
    borderRadius: 30,
    marginTop: 18,
    overflow: "hidden",
    padding: 22,
    ...shadow.card,
  },
  careTeamCopy: {
    color: "rgba(255,255,255,0.85)",
    fontFamily: "Nunito_600SemiBold",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
  },
  careTeamKicker: {
    color: "rgba(255,255,255,0.78)",
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 10,
    letterSpacing: 1.2,
  },
  careTeamTitle: {
    color: colors.white,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 20,
    letterSpacing: -0.3,
    marginTop: 5,
  },
  chartPanel: {
    backgroundColor: colors.paper,
    borderRadius: 30,
    marginBottom: 24,
    padding: 18,
    ...shadow.card,
  },
  emptyCard: {
    alignItems: "center",
    backgroundColor: colors.paper,
    borderRadius: 28,
    marginBottom: 20,
    overflow: "visible",
    padding: 28,
    ...shadow.card,
  },
  emptyArt: {
    height: 72,
    width: 72,
  },
  emptyCopy: {
    color: colors.muted,
    fontFamily: "Nunito_600SemiBold",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
    textAlign: "center",
  },
  emptyTitle: {
    color: colors.ink,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 20,
    marginTop: 8,
  },
  flex: { flex: 1 },
  insightHero: {
    alignItems: "center",
    borderRadius: 30,
    flexDirection: "row",
    gap: 15,
    marginBottom: 14,
    overflow: "hidden",
    padding: 20,
    ...shadow.card,
  },
  insightHeroCopy: {
    color: colors.muted,
    fontFamily: "Nunito_600SemiBold",
    fontSize: 12,
    marginTop: 5,
  },
  insightHeroKicker: {
    color: colors.sky,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 10,
    letterSpacing: 1,
  },
  insightHeroTitle: {
    color: colors.ink,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 22,
    letterSpacing: -0.3,
    marginTop: 4,
  },
  insightScore: {
    color: colors.ink,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 30,
    letterSpacing: -1.5,
  },
  insightScoreRing: {
    alignItems: "baseline",
    backgroundColor: "rgba(255,255,255,0.88)",
    borderRadius: 36,
    flexDirection: "row",
    height: 74,
    justifyContent: "center",
    paddingTop: 12,
    width: 74,
    ...shadow.subtle,
  },
  insightScoreUnit: {
    color: colors.sage,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 12,
  },
  quietCard: {
    backgroundColor: colors.paper,
    borderRadius: 22,
    marginBottom: 10,
    padding: 16,
    ...shadow.subtle,
  },
  quietText: {
    color: colors.muted,
    fontFamily: "Nunito_700Bold",
    fontSize: 13,
  },
  screen: { backgroundColor: colors.background, flex: 1 },
  sectionHeadingRow: {
    alignItems: "flex-end",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  sectionKicker: {
    color: colors.sky,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 10,
    letterSpacing: 1.4,
  },
  sectionTitle: {
    color: colors.ink,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 22,
    letterSpacing: -0.3,
    marginTop: 2,
  },
  standardContent: { paddingBottom: 110, paddingHorizontal: 18 },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
  textAction: {
    color: colors.coral,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 12,
  },
  weekBar: {
    backgroundColor: colors.sky,
    borderRadius: 8,
    width: 16,
  },
  weekBarTrack: {
    alignItems: "center",
    backgroundColor: colors.skySoft,
    borderRadius: 10,
    flex: 1,
    justifyContent: "flex-end",
    paddingVertical: 2,
    width: 24,
  },
  weekChart: {
    flexDirection: "row",
    gap: 12,
    height: 110,
    justifyContent: "space-between",
    marginTop: 6,
  },
  weekColumn: { alignItems: "center", flex: 1, gap: 6 },
  weekDay: {
    color: colors.muted,
    fontFamily: "Nunito_700Bold",
    fontSize: 11,
  },
});
