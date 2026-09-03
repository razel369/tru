import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { colors, shadow } from "../../design";

import type { CareInsightSummary } from "./care-insights";
import { CareInsightsCard } from "./CareInsightsCard";
import { careDateKey, formatCareTime } from "./engine";
import { getCategoryMeta } from "./meta";
import { MedicationSupplyCard } from "./MedicationSupplyCard";
import type { MedicationSupplyStatus } from "./medication-supply";
import type { UpcomingAppointment } from "./appointments";
import { UpcomingAppointmentsCard } from "./UpcomingAppointmentsCard";
import { careTaskSummary } from "./task-details";
import type { CareTask, ScheduledCare } from "./types";

const HISTORY_DAYS = 14;
const FUTURE_DAYS = 45;
const DAY_ITEM_LENGTH = 60;

function calendarDays(selectedDate: Date): Date[] {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const start = new Date(today);
  start.setDate(start.getDate() - HISTORY_DAYS);
  const end = new Date(today);
  end.setDate(end.getDate() + FUTURE_DAYS);
  if (selectedDate < start) {
    start.setTime(selectedDate.getTime());
    start.setDate(start.getDate() - 7);
  }
  if (selectedDate > end) {
    end.setTime(selectedDate.getTime());
    end.setDate(end.getDate() + 7);
  }
  const dayCount = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
  return Array.from({ length: dayCount }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}

export function PlanScreen({
  focusTaskId,
  selectedDate,
  schedule,
  topInset,
  bottomInset,
  onDateChange,
  onAdd,
  onComplete,
  onSkip,
  onOpenLog,
  onEditTask,
  onFocusTaskHandled,
  onRemoveTask,
  insights,
  medicationSupplies,
  upcomingAppointments,
}: {
  focusTaskId?: string | null;
  selectedDate: Date;
  schedule: ScheduledCare[];
  topInset: number;
  bottomInset: number;
  onDateChange: (date: Date) => void;
  onAdd: () => void;
  onComplete: (item: ScheduledCare) => void;
  onSkip: (item: ScheduledCare) => void;
  onOpenLog: (item: ScheduledCare) => void;
  onEditTask: (task: CareTask) => void;
  onFocusTaskHandled?: () => void;
  onRemoveTask: (task: CareTask) => void;
  insights: CareInsightSummary;
  medicationSupplies: MedicationSupplyStatus[];
  upcomingAppointments: UpcomingAppointment[];
}) {
  const days = useMemo(() => calendarDays(selectedDate), [selectedDate]);
  const selectedDayIndex = Math.max(
    0,
    days.findIndex((day) => careDateKey(day) === careDateKey(selectedDate)),
  );
  const [petFilter, setPetFilter] = useState<string | null>(null);
  const [listRef, setListRef] = useState<FlatList<ScheduledCare> | null>(null);
  const schedulePets = useMemo(
    () =>
      Array.from(
        new Map(schedule.map((item) => [item.pet.id, item.pet])).values(),
      ),
    [schedule],
  );
  useEffect(() => {
    if (!focusTaskId) return;
    const focusedSchedule = petFilter
      ? schedule.filter((item) => item.pet.id === petFilter)
      : schedule;
    const index = focusedSchedule.findIndex(
      (item) => item.task.id === focusTaskId,
    );
    if (index < 0) {
      if (petFilter !== null) {
        setPetFilter(null);
      } else {
        onFocusTaskHandled?.();
      }
      return;
    }

    const frame = requestAnimationFrame(() => {
      listRef?.scrollToIndex({ animated: true, index, viewPosition: 0.45 });
    });
    const timeout = setTimeout(() => onFocusTaskHandled?.(), 2400);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timeout);
    };
  }, [focusTaskId, listRef, onFocusTaskHandled, petFilter, schedule]);
  useEffect(() => {
    if (petFilter && !schedulePets.some((pet) => pet.id === petFilter)) {
      setPetFilter(null);
    }
  }, [petFilter, schedulePets]);
  const visibleSchedule = petFilter
    ? schedule.filter((item) => item.pet.id === petFilter)
    : schedule;
  const selectedDayKey = careDateKey(selectedDate);
  const todayKey = careDateKey(new Date());
  const futureDay = selectedDayKey > todayKey;
  const nextMomentId =
    selectedDayKey === todayKey
      ? visibleSchedule.find(
        (item) => item.status !== "done" && item.status !== "skipped",
        )?.id
      : undefined;
  const rhythmLabel =
    selectedDayKey === todayKey
      ? "TODAY'S RHYTHM"
      : futureDay
        ? "PLANNED RHYTHM"
        : "CARE HISTORY";

  return (
    <View style={[styles.screen, { paddingTop: topInset }]}>
      <FlatList
        contentContainerStyle={{ paddingBottom: bottomInset + 126 }}
        data={visibleSchedule}
        ref={setListRef}
        onScrollToIndexFailed={({ averageItemLength, index }) => {
          listRef?.scrollToOffset({
            animated: true,
            offset: Math.max(0, averageItemLength * index),
          });
        }}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Ionicons color={colors.sage} name="leaf-outline" size={26} />
            </View>
            <Text style={styles.emptyTitle}>A clear day</Text>
            <Text style={styles.emptyBody}>No care moments are planned here yet.</Text>
            <Pressable
              accessibilityLabel="Add a care moment"
              accessibilityRole="button"
              onPress={onAdd}
              style={styles.primaryButton}
            >
              <Ionicons color={colors.white} name="add" size={17} />
              <Text style={styles.primaryButtonText}>Add care</Text>
            </Pressable>
          </View>
        }
        ListHeaderComponent={
          <>
            <View style={styles.header}>
              <View>
                <Text style={styles.eyebrow}>CARE CALENDAR</Text>
                <Text style={styles.title}>Plan</Text>
              </View>
              <Pressable
                accessibilityLabel="Add care moment"
                accessibilityRole="button"
                onPress={onAdd}
                style={styles.addButton}
              >
                <Ionicons color={colors.white} name="add" size={24} />
              </Pressable>
            </View>

            <FlatList
              contentContainerStyle={styles.days}
              data={days}
              getItemLayout={(_, index) => ({
                index,
                length: DAY_ITEM_LENGTH,
                offset: DAY_ITEM_LENGTH * index,
              })}
              horizontal
              initialScrollIndex={selectedDayIndex}
              keyExtractor={careDateKey}
              renderItem={({ item }) => {
                const selected = careDateKey(item) === careDateKey(selectedDate);
                return (
                  <Pressable
                    accessibilityLabel={item.toLocaleDateString("en", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                    })}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => {
                      onDateChange(item);
                    }}
                    style={[styles.day, selected && styles.daySelected]}
                  >
                    <Text
                      style={[styles.dayName, selected && styles.dayTextSelected]}
                    >
                      {item.toLocaleDateString("en", { weekday: "short" })}
                    </Text>
                    <Text
                      style={[styles.dayNumber, selected && styles.dayTextSelected]}
                    >
                      {item.getDate()}
                    </Text>
                  </Pressable>
                );
              }}
              showsHorizontalScrollIndicator={false}
            />

            {schedulePets.length > 1 && (
              <View style={styles.filters}>
                <Text style={styles.filterLabel}>SHOW</Text>
                <View style={styles.filterRow}>
                  <Pressable
                    accessibilityLabel="Show care for all pets"
                    accessibilityRole="button"
                    accessibilityState={{ selected: petFilter === null }}
                    onPress={() => {
                      setPetFilter(null);
                    }}
                    style={[styles.filter, petFilter === null && styles.filterSelected]}
                  >
                    <Ionicons
                      color={petFilter === null ? colors.white : colors.sage}
                      name="people-outline"
                      size={15}
                    />
                    <Text style={[styles.filterText, petFilter === null && styles.filterTextSelected]}>All</Text>
                  </Pressable>
                  {schedulePets.map((pet) => {
                    const selected = pet.id === petFilter;
                    return (
                      <Pressable
                        accessibilityLabel={`Show care for ${pet.name}`}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        key={pet.id}
                        onPress={() => {
                          setPetFilter(pet.id);
                        }}
                        style={[styles.filter, selected && styles.filterSelected]}
                      >
                        <View style={[styles.filterDot, { backgroundColor: pet.color }]} />
                        <Text numberOfLines={1} style={[styles.filterText, selected && styles.filterTextSelected]}>{pet.name}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}

            <CareInsightsCard summary={insights} />
            <MedicationSupplyCard
              onEdit={onEditTask}
              supplies={medicationSupplies}
            />
            <UpcomingAppointmentsCard
              appointments={upcomingAppointments}
              onEdit={onEditTask}
            />

            <View style={styles.listHeading}>
              <View>
                <Text style={styles.listEyebrow}>{rhythmLabel}</Text>
                <Text style={styles.listTitle}>
                  {selectedDate.toLocaleDateString("en", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })}
                </Text>
              </View>
              <View style={styles.countPill}>
                <Text style={styles.listCount}>{visibleSchedule.length} moments</Text>
              </View>
            </View>
          </>
        }
        renderItem={({ item }) => {
          const meta = getCategoryMeta(item.task.category);
          const taskSummary = careTaskSummary(item.task);
          const resolved = item.status === "done" || item.status === "skipped";
          const upNext = item.id === nextMomentId;

          return (
            <View
              accessibilityLabel={
                item.task.id === focusTaskId
                  ? `${item.task.title}, opened from reminder`
                  : undefined
              }
              style={[
                styles.task,
                item.task.id === focusTaskId && styles.taskFocused,
              ]}
            >
              <View style={styles.timeColumn}>
                <Text style={styles.time}>{formatCareTime(item.scheduledTime)}</Text>
                <View style={[styles.timeDot, { borderColor: meta.color }]}>
                  <View style={[styles.timeDotCore, { backgroundColor: meta.color }]} />
                </View>
              </View>

              <View
                style={[
                  styles.taskContent,
                  upNext && { borderColor: meta.color },
                  resolved && styles.taskResolved,
                ]}
              >
                <View style={[styles.accent, { backgroundColor: meta.color }]} />
                {upNext && !resolved && (
                  <Text style={[styles.upNext, { color: meta.color }]}>UP NEXT</Text>
                )}
                <View style={styles.taskTop}>
                  <View style={[styles.icon, { backgroundColor: meta.softColor }]}>
                    <Ionicons
                      color={meta.color}
                      name={meta.icon as keyof typeof Ionicons.glyphMap}
                      size={19}
                    />
                  </View>
                  <View style={styles.flex}>
                    <Text style={styles.taskTitle}>{item.task.title}</Text>
                    <Text style={styles.taskMeta}>
                      {item.pet.name} / {meta.label}
                    </Text>
                    {taskSummary ? (
                      <Text numberOfLines={2} style={styles.taskDetails}>
                        {taskSummary}
                      </Text>
                    ) : null}
                  </View>
                  <View style={styles.taskTools}>
                    <Pressable
                      accessibilityLabel={`Edit ${item.task.title} for ${item.pet.name}`}
                      accessibilityRole="button"
                      hitSlop={8}
                      onPress={() => onEditTask(item.task)}
                      style={styles.tool}
                    >
                      <Ionicons color={colors.navy} name="create-outline" size={15} />
                    </Pressable>
                    <Pressable
                      accessibilityLabel={`Remove ${item.task.title} for ${item.pet.name}`}
                      accessibilityRole="button"
                      hitSlop={8}
                      onPress={() => onRemoveTask(item.task)}
                      style={styles.tool}
                    >
                      <Ionicons color={colors.danger} name="trash-outline" size={15} />
                    </Pressable>
                  </View>
                </View>

                {resolved ? (
                  <Pressable
                    accessibilityLabel={`Review ${item.task.title} care log`}
                    accessibilityRole="button"
                    onPress={() => onOpenLog(item)}
                    style={styles.resolved}
                  >
                    <Ionicons
                      color={item.status === "done" ? colors.sage : colors.muted}
                      name={
                        item.status === "done"
                          ? "checkmark-circle"
                          : "remove-circle"
                      }
                      size={18}
                    />
                    <Text style={styles.resolvedText}>
                      {item.status === "done" ? "Completed" : "Skipped"} / Details
                    </Text>
                  </Pressable>
                ) : futureDay ? (
                  <View style={styles.scheduled}>
                    <Ionicons
                      color={colors.navy}
                      name="calendar-outline"
                      size={16}
                    />
                    <Text style={styles.scheduledText}>Scheduled</Text>
                  </View>
                ) : (
                  <View style={styles.actions}>
                    <Pressable accessibilityLabel={`Skip ${item.task.title} for ${item.pet.name}`} accessibilityRole="button" onPress={() => onSkip(item)} style={styles.secondary}>
                      <Ionicons color={colors.muted} name="play-skip-forward-outline" size={15} />
                      <Text style={styles.secondaryText}>Skip</Text>
                    </Pressable>
                    <Pressable accessibilityLabel={`Complete ${item.task.title} for ${item.pet.name}`} accessibilityRole="button" onPress={() => onComplete(item)} style={styles.complete}>
                      <Ionicons color={colors.white} name="checkmark" size={17} />
                      <Text style={styles.completeText}>Done</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            </View>
          );
        }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  taskFocused: { borderColor: colors.sage, borderRadius: 24, borderWidth: 1.5, shadowColor: colors.sage, shadowOpacity: 0.16, shadowRadius: 13 },
  accent: {
    borderRadius: 3,
    bottom: 14,
    left: 0,
    position: "absolute",
    top: 14,
    width: 3,
  },
  actions: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "flex-end",
    marginTop: 11,
  },
  addButton: {
    alignItems: "center",
    backgroundColor: colors.coral,
    borderRadius: 21,
    height: 44,
    justifyContent: "center",
    width: 44,
    ...shadow.subtle,
  },
  complete: {
    alignItems: "center",
    backgroundColor: colors.sage,
    borderRadius: 15,
    flex: 1,
    flexDirection: "row",
    gap: 5,
    justifyContent: "center",
    maxWidth: 126,
    minHeight: 44,
    paddingVertical: 9,
  },
  completeText: {
    color: colors.white,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 12,
  },
  countPill: {
    backgroundColor: colors.sageSoft,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  day: {
    alignItems: "center",
    backgroundColor: colors.paper,
    borderColor: "rgba(34,48,67,0.05)",
    borderRadius: 21,
    borderWidth: 1,
    gap: 2,
    height: 64,
    justifyContent: "center",
    width: 52,
  },
  dayName: {
    color: colors.muted,
    fontFamily: "Nunito_700Bold",
    fontSize: 9,
    textTransform: "uppercase",
  },
  dayNumber: {
    color: colors.ink,
    fontFamily: "Fredoka_600SemiBold",
    fontSize: 18,
  },
  daySelected: { backgroundColor: colors.ink, borderColor: colors.ink, ...shadow.subtle },
  dayTextSelected: { color: colors.white },
  days: { gap: 8, paddingHorizontal: 18 },
  empty: {
    alignItems: "center",
    backgroundColor: colors.paper,
    borderRadius: 26,
    margin: 18,
    padding: 26,
  },
  emptyBody: {
    color: colors.muted,
    fontFamily: "Nunito_600SemiBold",
    fontSize: 13,
    marginTop: 4,
  },
  emptyIcon: {
    alignItems: "center",
    backgroundColor: colors.sageSoft,
    borderRadius: 24,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  emptyTitle: {
    color: colors.ink,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 18,
    marginTop: 10,
  },
  eyebrow: {
    color: colors.navy,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 10,
    letterSpacing: 1.3,
  },
  flex: { flex: 1 },
  filter: {
    alignItems: "center",
    backgroundColor: colors.paper,
    borderColor: colors.line,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
    minHeight: 44,
    minWidth: 64,
    paddingHorizontal: 13,
  },
  filterDot: { borderRadius: 4, height: 8, width: 8 },
  filterLabel: {
    color: colors.navy,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 8,
    letterSpacing: 0.9,
  },
  filterRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  filterSelected: { backgroundColor: colors.ink, borderColor: colors.ink },
  filterText: {
    color: colors.ink,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 11,
    maxWidth: 96,
  },
  filterTextSelected: { color: colors.white },
  filters: { gap: 7, paddingHorizontal: 18, paddingTop: 14 },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: 15,
    paddingHorizontal: 18,
    paddingTop: 15,
  },
  icon: {
    alignItems: "center",
    borderRadius: 18,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  listCount: {
    color: colors.sage,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 10,
  },
  listEyebrow: {
    color: colors.navy,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 8,
    letterSpacing: 0.9,
  },
  listHeading: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: 13,
    paddingHorizontal: 18,
    paddingTop: 18,
  },
  listTitle: {
    color: colors.ink,
    fontFamily: "Fredoka_600SemiBold",
    fontSize: 17,
    marginTop: 2,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: colors.coral,
    borderRadius: 18,
    flexDirection: "row",
    gap: 6,
    marginTop: 16,
    minHeight: 44,
    paddingHorizontal: 18,
    paddingVertical: 11,
  },
  primaryButtonText: {
    color: colors.white,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 13,
  },
  resolved: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: colors.sageSoft,
    borderRadius: 15,
    flexDirection: "row",
    gap: 6,
    marginTop: 11,
    minHeight: 44,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  resolvedText: {
    color: colors.sage,
    fontFamily: "Nunito_700Bold",
    fontSize: 11,
  },
  screen: { backgroundColor: colors.background, flex: 1 },
  scheduled: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: colors.skySoft,
    borderRadius: 15,
    flexDirection: "row",
    gap: 6,
    marginTop: 11,
    minHeight: 44,
    paddingHorizontal: 11,
  },
  scheduledText: {
    color: colors.navy,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 11,
  },
  secondary: {
    alignItems: "center",
    backgroundColor: colors.background,
    borderColor: colors.line,
    borderRadius: 15,
    borderWidth: 1,
    flexDirection: "row",
    gap: 5,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  secondaryText: {
    color: colors.muted,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 11,
  },
  task: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
    marginHorizontal: 18,
  },
  taskContent: {
    backgroundColor: colors.paper,
    borderColor: "rgba(34,48,67,0.07)",
    borderRadius: 22,
    borderWidth: 1,
    flex: 1,
    overflow: "hidden",
    padding: 13,
    paddingLeft: 16,
    ...shadow.subtle,
  },
  taskDetails: {
    color: colors.ink,
    fontFamily: "Nunito_600SemiBold",
    fontSize: 10,
    lineHeight: 14,
    marginTop: 5,
  },
  taskMeta: {
    color: colors.muted,
    fontFamily: "Nunito_600SemiBold",
    fontSize: 11,
    marginTop: 1,
  },
  taskResolved: { opacity: 0.72 },
  taskTitle: {
    color: colors.ink,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 14,
  },
  taskTop: { alignItems: "center", flexDirection: "row", gap: 10 },
  taskTools: { flexDirection: "row", gap: 4 },
  time: {
    color: colors.ink,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 10,
    textAlign: "center",
  },
  timeColumn: { alignItems: "center", paddingTop: 12, width: 54 },
  timeDot: {
    alignItems: "center",
    backgroundColor: colors.background,
    borderRadius: 7,
    borderWidth: 1,
    height: 14,
    justifyContent: "center",
    marginTop: 7,
    width: 14,
  },
  timeDotCore: { borderRadius: 3, height: 6, width: 6 },
  title: {
    color: colors.ink,
    fontFamily: "Fredoka_600SemiBold",
    fontSize: 32,
  },
  tool: {
    alignItems: "center",
    backgroundColor: colors.background,
    borderRadius: 14,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  upNext: {
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 8,
    letterSpacing: 0.9,
    marginBottom: 7,
  },
});
