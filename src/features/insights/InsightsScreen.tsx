import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { AppHeader } from "../../components/AppHeader";
import { StatCard } from "../../components/StatCard";
import { colors } from "../../design";
import type { DoseLog, Pet } from "../../types";

interface InsightsScreenProps {
  pets: Pet[];
  logs: DoseLog[];
  topInset: number;
}

/**
 * Insights screen — adherence ring, stats row, weekly chart, low-stock
 * attention cards, and the caregiver team panel. Extracted verbatim
 * from App.tsx in stage 2. The data here is a mix of computed and
 * hard-coded for the prototype; production adherence and chart values
 * will be derived from `logs` and `pets` in stage 7.
 */
export function InsightsScreen({
  pets,
  logs,
  topInset,
}: InsightsScreenProps) {
  const weekly = [100, 86, 100, 100, 72, 100, 94];
  const lowStock = pets.flatMap((pet) =>
    pet.medications
      .filter((medication) => medication.stock <= 10)
      .map((medication) => ({ pet, medication })),
  );

  return (
    <ScrollView
      contentContainerStyle={[
        styles.standardContent,
        { paddingTop: topInset + 14 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <AppHeader
        actionIcon="share-outline"
        eyebrow="CARE AT A GLANCE"
        title="Insights"
      />

      <LinearGradient
        colors={["#E4EEE9", "#F6EBD2"]}
        end={{ x: 1, y: 1 }}
        style={styles.insightHero}
      >
        <View style={styles.insightScoreRing}>
          <Text style={styles.insightScore}>94</Text>
          <Text style={styles.insightScoreUnit}>%</Text>
        </View>
        <View style={styles.flex}>
          <Text style={styles.insightHeroKicker}>7-DAY ADHERENCE</Text>
          <Text style={styles.insightHeroTitle}>Beautiful consistency</Text>
          <Text style={styles.insightHeroCopy}>
            That’s 6% better than last week.
          </Text>
        </View>
        <Ionicons
          color={colors.coral}
          name="sparkles"
          size={18}
          style={styles.sparkleIcon}
        />
      </LinearGradient>

      <View style={styles.statsRow}>
        <StatCard
          icon="checkmark-done"
          label="Doses given"
          value={`${Math.max(18, logs.filter((log) => log.status === "given").length)}`}
        />
        <StatCard icon="flame" label="Day streak" value="12" />
        <StatCard icon="people" label="Caregivers" value="2" />
      </View>

      <View style={styles.chartPanel}>
        <View style={styles.sectionHeadingRow}>
          <View>
            <Text style={styles.sectionKicker}>DAILY COMPLETION</Text>
            <Text style={styles.sectionTitle}>Daily completion</Text>
          </View>
          <Text style={styles.textAction}>Jul 6–12</Text>
        </View>
        <View style={styles.weekChart}>
          {weekly.map((value, index) => (
            <View key={`${value}-${index}`} style={styles.weekColumn}>
              <View style={styles.weekBarTrack}>
                <View style={[styles.weekBar, { height: `${value}%` }]} />
              </View>
              <Text style={styles.weekDay}>
                {["M", "T", "W", "T", "F", "S", "S"][index]}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.sectionHeadingRow}>
        <View>
          <Text style={styles.sectionKicker}>SMART HEADS-UP</Text>
          <Text style={styles.sectionTitle}>Needs attention</Text>
        </View>
      </View>
      {lowStock.map(({ pet, medication }) => (
        <View key={`${pet.id}-${medication.id}`} style={styles.attentionCard}>
          <View style={styles.attentionIcon}>
            <Ionicons color={colors.coral} name="cube-outline" size={22} />
          </View>
          <View style={styles.flex}>
            <Text style={styles.attentionTitle}>
              {medication.name} is running low
            </Text>
            <Text style={styles.attentionCopy}>
              {pet.name} has about {medication.stock} doses remaining.
            </Text>
          </View>
          <Pressable style={styles.refillButton}>
            <Text style={styles.refillText}>Refill</Text>
          </Pressable>
        </View>
      ))}

      <View style={styles.careTeamCard}>
        <View style={styles.careTeamTop}>
          <View>
            <Text style={styles.careTeamKicker}>PAWPAIR FAMILY</Text>
            <Text style={styles.careTeamTitle}>Care works better together.</Text>
          </View>
          <Ionicons color={colors.butter} name="heart-circle" size={38} />
        </View>
        <View style={styles.caregiverRow}>
          <View style={styles.caregiverAvatar}>
            <Text style={styles.caregiverInitial}>M</Text>
          </View>
          <View style={[styles.caregiverAvatar, styles.caregiverSecond]}>
            <Text style={styles.caregiverInitial}>A</Text>
          </View>
          <Pressable style={styles.inviteButton}>
            <Ionicons color={colors.white} name="add" size={17} />
            <Text style={styles.inviteText}>Invite caregiver</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  attentionCard: {
    alignItems: "center",
    backgroundColor: colors.paper,
    borderColor: colors.line,
    borderRadius: 19,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    marginBottom: 10,
    padding: 15,
  },
  attentionCopy: {
    color: colors.muted,
    fontFamily: "Manrope_400Regular",
    fontSize: 11,
    marginTop: 4,
  },
  attentionIcon: {
    alignItems: "center",
    backgroundColor: colors.coralSoft,
    borderRadius: 14,
    height: 46,
    justifyContent: "center",
    width: 46,
  },
  attentionTitle: {
    color: colors.ink,
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 13,
  },
  caregiverAvatar: {
    alignItems: "center",
    backgroundColor: colors.coral,
    borderColor: colors.navy,
    borderRadius: 17,
    borderWidth: 2,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  caregiverInitial: { color: colors.white, fontSize: 12, fontWeight: "900" },
  caregiverRow: {
    alignItems: "center",
    flexDirection: "row",
    marginTop: 20,
  },
  caregiverSecond: { backgroundColor: colors.sage, marginLeft: -8 },
  careTeamCard: {
    backgroundColor: colors.navy,
    borderRadius: 23,
    marginTop: 18,
    overflow: "hidden",
    padding: 20,
  },
  careTeamKicker: {
    color: "#A9C9C0",
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 9,
    letterSpacing: 1.2,
  },
  careTeamTitle: {
    color: colors.white,
    fontFamily: "Fraunces_700Bold",
    fontSize: 20,
    marginTop: 5,
  },
  careTeamTop: { flexDirection: "row", justifyContent: "space-between" },
  chartPanel: {
    backgroundColor: colors.paper,
    borderColor: colors.line,
    borderRadius: 23,
    borderWidth: 1,
    marginBottom: 24,
    padding: 18,
  },
  flex: { flex: 1 },
  insightHero: {
    alignItems: "center",
    borderRadius: 24,
    flexDirection: "row",
    gap: 15,
    marginBottom: 12,
    overflow: "hidden",
    padding: 20,
    position: "relative",
  },
  insightHeroCopy: {
    color: colors.muted,
    fontFamily: "Manrope_400Regular",
    fontSize: 11,
    marginTop: 5,
  },
  insightHeroKicker: {
    color: colors.sage,
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 8,
    letterSpacing: 1,
  },
  insightHeroTitle: {
    color: colors.ink,
    fontFamily: "Fraunces_700Bold",
    fontSize: 20,
    marginTop: 4,
  },
  insightScore: {
    color: colors.ink,
    fontSize: 30,
    fontWeight: "900",
    letterSpacing: -1.5,
  },
  insightScoreRing: {
    alignItems: "baseline",
    backgroundColor: "rgba(255,255,255,0.75)",
    borderColor: colors.white,
    borderRadius: 35,
    borderWidth: 5,
    flexDirection: "row",
    height: 70,
    justifyContent: "center",
    paddingTop: 11,
    width: 70,
  },
  insightScoreUnit: { color: colors.sage, fontSize: 11, fontWeight: "900" },
  inviteButton: {
    alignItems: "center",
    backgroundColor: colors.coral,
    borderRadius: 13,
    flexDirection: "row",
    gap: 6,
    marginLeft: "auto",
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  inviteText: { color: colors.white, fontSize: 10, fontWeight: "800" },
  refillButton: {
    alignItems: "center",
    backgroundColor: colors.coralSoft,
    borderRadius: 11,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  refillText: {
    color: colors.coral,
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 10,
  },
  sectionHeadingRow: {
    alignItems: "flex-end",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  sectionKicker: {
    color: colors.muted,
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 9,
    letterSpacing: 1.4,
  },
  sectionTitle: {
    color: colors.ink,
    fontFamily: "Fraunces_700Bold",
    fontSize: 22,
    marginTop: 2,
  },
  sparkleIcon: { position: "absolute", right: 18, top: 18 },
  standardContent: { paddingBottom: 110, paddingHorizontal: 18 },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
  textAction: {
    color: colors.coral,
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 11,
  },
  weekBar: {
    backgroundColor: colors.coral,
    borderRadius: 4,
    width: 14,
  },
  weekBarTrack: {
    alignItems: "center",
    backgroundColor: "rgba(231,226,217,0.4)",
    borderRadius: 5,
    flex: 1,
    justifyContent: "flex-end",
    paddingVertical: 2,
    width: 22,
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
    fontFamily: "Manrope_700Bold",
    fontSize: 10,
  },
});
