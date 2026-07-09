import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import type { ImageSourcePropType } from "react-native";
import { Image, StyleSheet, Text, View } from "react-native";

import { colors } from "../../design";
import { formatTime } from "../../schedule";
import type { ScheduledDose } from "../../types";

interface TodayHeroProps {
  schedule: ScheduledDose[];
  topInset: number;
  petImage: ImageSourcePropType;
}

/**
 * Navy gradient hero on the Today screen with the greeting, progress
 * bar, and the next-due pill. Extracted verbatim from App.tsx in stage 2.
 */
export function TodayHero({ schedule, topInset, petImage }: TodayHeroProps) {
  const given = schedule.filter((dose) => dose.status === "given").length;
  const progress = schedule.length ? given / schedule.length : 0;
  const nextDose = schedule.find(
    (dose) => dose.status === "due" || dose.status === "upcoming",
  );
  const missedDose = schedule.find((dose) => dose.status === "missed");
  const highlightedDose = nextDose ?? missedDose;
  const needsAttention = missedDose !== undefined;

  return (
    <LinearGradient
      colors={["#20394C", "#2D5362"]}
      end={{ x: 1, y: 1 }}
      style={[styles.hero, { paddingTop: topInset + 12 }]}
    >
      <View style={styles.heroHeader}>
        <View style={styles.wordmarkRow}>
          <Image source={petImage} style={styles.logoImage} />
          <Text style={styles.wordmark}>PawPair</Text>
        </View>
        <View style={styles.profileButton}>
          <Text style={styles.profileInitial}>M</Text>
          <View style={styles.onlineDot} />
        </View>
      </View>

      <View style={styles.heroCopy}>
        <Text style={styles.heroEyebrow}>GOOD EVENING, MAYA</Text>
        <Text style={styles.heroTitle}>
          {needsAttention
            ? "A dose needs\nyour attention."
            : "Milo’s care is\nright on track."}
        </Text>
        <Text style={styles.heroSubtitle}>
          {given} of {schedule.length} doses complete today
        </Text>
        {highlightedDose && (
          <View style={styles.nextDosePill}>
            <View
              style={[
                styles.nextDoseDot,
                {
                  backgroundColor: needsAttention
                    ? colors.coral
                    : highlightedDose.medication.color,
                },
              ]}
            />
            <Text style={styles.nextDoseText}>
              {needsAttention ? "Due earlier" : "Next"} ·{" "}
              {highlightedDose.medication.name} at{" "}
              {formatTime(highlightedDose.scheduledTime)}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.heroPet}>
        <View style={styles.heroPetHalo} />
        <View style={styles.heroPetCircle}>
          <Image
            accessibilityLabel="Portrait of Milo"
            source={petImage}
            style={styles.heroPetImage}
          />
        </View>
        <View style={styles.heroHeart}>
          <Ionicons name="heart" size={14} color={colors.coral} />
        </View>
      </View>

      <View style={styles.progressRow}>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${Math.max(8, progress * 100)}%` },
            ]}
          />
        </View>
        <Text style={styles.progressText}>{Math.round(progress * 100)}%</Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  hero: {
    minHeight: 326,
    overflow: "hidden",
    paddingBottom: 20,
    paddingHorizontal: 20,
    position: "relative",
  },
  heroCopy: { marginTop: 30, zIndex: 2 },
  heroEyebrow: {
    color: "#B5D6CD",
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 9,
    letterSpacing: 1.4,
  },
  heroHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  heroHeart: {
    alignItems: "center",
    backgroundColor: colors.paper,
    borderRadius: 17,
    bottom: 7,
    height: 32,
    justifyContent: "center",
    position: "absolute",
    right: 3,
    shadowColor: "#000",
    shadowOffset: { height: 3, width: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    width: 32,
  },
  heroPet: {
    bottom: 54,
    height: 150,
    position: "absolute",
    right: 10,
    width: 150,
  },
  heroPetCircle: {
    alignItems: "center",
    backgroundColor: colors.butter,
    borderColor: "rgba(255,255,255,0.7)",
    borderRadius: 58,
    borderWidth: 3,
    bottom: 8,
    elevation: 4,
    height: 116,
    justifyContent: "center",
    overflow: "hidden",
    position: "absolute",
    right: 10,
    shadowColor: "#071923",
    shadowOffset: { height: 8, width: 0 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
    transform: [{ rotate: "3deg" }],
    width: 116,
  },
  heroPetHalo: {
    borderColor: "rgba(255,255,255,0.13)",
    borderRadius: 70,
    borderWidth: 20,
    height: 140,
    position: "absolute",
    right: 0,
    top: 0,
    width: 140,
  },
  heroPetImage: {
    height: "100%",
    transform: [{ rotate: "-3deg" }, { scale: 1.08 }],
    width: "100%",
  },
  heroSubtitle: {
    color: "rgba(255,255,255,0.72)",
    fontFamily: "Manrope_600SemiBold",
    fontSize: 11,
    marginTop: 11,
  },
  heroTitle: {
    color: colors.white,
    fontFamily: "Fraunces_700Bold",
    fontSize: 34,
    letterSpacing: -0.8,
    lineHeight: 38,
    marginTop: 8,
  },
  logoImage: {
    borderColor: "rgba(255,255,255,0.22)",
    borderRadius: 11,
    borderWidth: 1,
    height: 34,
    transform: [{ rotate: "-4deg" }],
    width: 34,
  },
  nextDoseDot: {
    borderRadius: 4,
    height: 7,
    width: 7,
  },
  nextDosePill: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.11)",
    borderColor: "rgba(255,255,255,0.13)",
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    gap: 7,
    marginTop: 14,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  nextDoseText: {
    color: "rgba(255,255,255,0.88)",
    fontFamily: "Manrope_700Bold",
    fontSize: 9,
  },
  onlineDot: {
    backgroundColor: "#83D0A8",
    borderColor: colors.navy,
    borderRadius: 5,
    borderWidth: 2,
    bottom: -1,
    height: 10,
    position: "absolute",
    right: -1,
    width: 10,
  },
  profileButton: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  profileInitial: {
    color: colors.white,
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 13,
  },
  progressFill: {
    backgroundColor: colors.butter,
    borderRadius: 4,
    height: 6,
  },
  progressRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
  },
  progressText: {
    color: colors.white,
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 11,
  },
  progressTrack: {
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: 4,
    flex: 1,
    height: 6,
  },
  wordmark: {
    color: colors.white,
    fontFamily: "Fraunces_700Bold",
    fontSize: 22,
  },
  wordmarkRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 9,
  },
});
