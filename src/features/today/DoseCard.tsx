import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";

import { PressScale } from "../../components/PressScale";
import { colors, shadow } from "../../design";
import { usePrefersReducedMotion } from "../accessibility/motion";
import { formatTime } from "../../schedule";
import type { ScheduledDose } from "../../types";

interface DoseCardProps {
  dose: ScheduledDose;
  isLast: boolean;
  onLog: (dose: ScheduledDose, status: "given" | "skipped") => void;
  index?: number;
}

const ACCENT = [colors.sky, colors.coral, colors.lavender, colors.sage] as const;

/**
 * Clay dose sticker — soft floating card with caregiver chip,
 * time, med name, and a round confirm puck.
 */
export function DoseCard({ dose, onLog, index = 0 }: DoseCardProps) {
  const reduceMotion = usePrefersReducedMotion();
  const complete = dose.status === "given";
  const skipped = dose.status === "skipped";
  const accent = ACCENT[index % ACCENT.length];
  const caregiver =
    dose.log?.completedBy?.slice(0, 2).toUpperCase() ??
    dose.pet.name.slice(0, 2).toUpperCase();

  const enter = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;

  useEffect(() => {
    if (reduceMotion) {
      enter.setValue(1);
      return;
    }
    Animated.timing(enter, {
      toValue: 1,
      duration: 320,
      delay: index * 60,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [enter, index, reduceMotion]);

  return (
    <Animated.View
      style={[
        styles.card,
        complete && styles.cardComplete,
        skipped && styles.cardSkipped,
        {
          opacity: enter,
          transform: [
            {
              translateY: enter.interpolate({
                inputRange: [0, 1],
                outputRange: [12, 0],
              }),
            },
          ],
        },
      ]}
    >
      <View style={[styles.avatar, { backgroundColor: `${accent}33` }]}>
        <Text style={[styles.avatarText, { color: accent }]}>{caregiver}</Text>
      </View>

      <View style={styles.body}>
        <View style={styles.timeRow}>
          <Ionicons color={colors.muted} name="time-outline" size={14} />
          <Text style={styles.time}>{formatTime(dose.scheduledTime)}</Text>
        </View>
        <Text
          style={[styles.medName, complete && styles.mutedText]}
          numberOfLines={1}
        >
          {dose.medication.name}
        </Text>
        <Text style={styles.details} numberOfLines={1}>
          {dose.medication.dosage}
          {dose.pet.name ? ` · ${dose.pet.name}` : ""}
        </Text>
      </View>

      {complete ? (
        <View style={[styles.checkPuck, { backgroundColor: colors.sage }]}>
          <Ionicons color={colors.white} name="checkmark" size={20} />
        </View>
      ) : skipped ? (
        <View style={[styles.checkPuck, { backgroundColor: colors.muted }]}>
          <Ionicons color={colors.white} name="remove" size={18} />
        </View>
      ) : (
        <PressScale
          accessibilityLabel={`Mark ${dose.medication.name} as given`}
          onPress={() => onLog(dose, "given")}
          scaleTo={0.9}
          style={[styles.checkPuck, { backgroundColor: accent }]}
        >
          <Ionicons color={colors.white} name="checkmark" size={20} />
        </PressScale>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: "center",
    borderRadius: 16,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  avatarText: {
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 12,
  },
  body: {
    flex: 1,
    gap: 2,
  },
  card: {
    alignItems: "center",
    backgroundColor: colors.paper,
    borderRadius: 24,
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    ...shadow.card,
  },
  cardComplete: {
    opacity: 0.72,
  },
  cardSkipped: {
    opacity: 0.55,
  },
  checkPuck: {
    alignItems: "center",
    borderRadius: 18,
    height: 40,
    justifyContent: "center",
    width: 40,
    ...shadow.subtle,
  },
  details: {
    color: colors.muted,
    fontFamily: "Nunito_600SemiBold",
    fontSize: 11,
  },
  medName: {
    color: colors.ink,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 15,
  },
  mutedText: {
    color: colors.muted,
  },
  time: {
    color: colors.muted,
    fontFamily: "Nunito_700Bold",
    fontSize: 12,
  },
  timeRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
  },
});
