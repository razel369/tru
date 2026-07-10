import { Ionicons } from "@expo/vector-icons";
import type { ImageSourcePropType } from "react-native";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { DateStrip } from "../../components/DateStrip";
import { EmptyTodayState } from "../../components/feedback/EmptyTodayState";
import { colors } from "../../design";
import type { ScheduledDose } from "../../types";

import { DoseCard } from "./DoseCard";
import { SyncCard } from "./SyncCard";
import { TodayHero } from "./TodayHero";

interface TodayScreenProps {
  schedule: ScheduledDose[];
  selectedDate: Date;
  topInset: number;
  appIcon: ImageSourcePropType;
  heroPet: ImageSourcePropType;
  onDateChange: (date: Date) => void;
  onLog: (dose: ScheduledDose, status: "given" | "skipped") => void;
  onAdd: () => void;
}

/**
 * Today screen — the home tab. Composes the navy hero, the sticky date
 * strip, the dose timeline, and a sync illustration. Extracted from
 * App.tsx in stage 2 with all original style values preserved.
 */
export function TodayScreen({
  schedule,
  selectedDate,
  topInset,
  appIcon,
  heroPet,
  onDateChange,
  onLog,
  onAdd,
}: TodayScreenProps) {
  return (
    <ScrollView
      contentContainerStyle={styles.todayContent}
      showsVerticalScrollIndicator={false}
      stickyHeaderIndices={[1]}
    >
      <TodayHero petImage={heroPet} schedule={schedule} topInset={topInset} />

      <DateStrip
        selectedDate={selectedDate}
        onDateChange={onDateChange}
      />

      <View style={styles.contentSection}>
        <View style={styles.sectionHeadingRow}>
          <View>
            <Text style={styles.sectionKicker}>CARE PLAN</Text>
            <Text style={styles.sectionTitle}>Today’s doses</Text>
          </View>
          <Pressable onPress={onAdd} style={styles.roundAddButton}>
            <Ionicons name="add" size={22} color={colors.coral} />
          </Pressable>
        </View>

        {schedule.length === 0 ? (
          <EmptyTodayState onAddMedication={onAdd} />
        ) : (
          <View style={styles.timeline}>
            {schedule.map((dose, index) => (
              <DoseCard
                dose={dose}
                isLast={index === schedule.length - 1}
                key={dose.id}
                onLog={onLog}
              />
            ))}
          </View>
        )}

        <SyncCard />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  app: { backgroundColor: colors.background, flex: 1 },
  contentSection: {
    paddingBottom: 28,
    paddingHorizontal: 18,
    paddingTop: 22,
  },
  roundAddButton: {
    alignItems: "center",
    backgroundColor: colors.paper,
    borderColor: colors.line,
    borderRadius: 15,
    borderWidth: 1,
    height: 38,
    justifyContent: "center",
    width: 38,
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
    fontSize: 24,
    marginTop: 2,
  },
  timeline: { marginTop: 4 },
  todayContent: { paddingBottom: 100 },
});
