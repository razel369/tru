import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

import { assets, colors, shadow } from "../../design";
import { createBreedAssetKey, resolvePetVisual } from "../pet-visuals";
import type { Pet } from "../../types";

import { careCompletionPercent, formatCareTime } from "./engine";
import { getCategoryMeta } from "./meta";
import { careTaskSummary } from "./task-details";
import type { ScheduledCare } from "./types";
import { AnimatedPetHero } from "./AnimatedPetHero";

function PetSuccessBurst({ token }: { token: number }) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!token) return;
    progress.stopAnimation();
    progress.setValue(0);
    Animated.sequence([
      Animated.timing(progress, {
        duration: 520,
        easing: Easing.out(Easing.cubic),
        toValue: 1,
        useNativeDriver: Platform.OS !== "web",
      }),
      Animated.timing(progress, {
        duration: 420,
        easing: Easing.in(Easing.quad),
        toValue: 2,
        useNativeDriver: Platform.OS !== "web",
      }),
    ]).start();
  }, [progress, token]);

  if (!token) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.burst,
        {
          opacity: progress.interpolate({
            inputRange: [0, 0.18, 1, 1.55, 2],
            outputRange: [0, 1, 1, 0.72, 0],
          }),
          transform: [
            {
              translateY: progress.interpolate({
                inputRange: [0, 2],
                outputRange: [10, -34],
              }),
            },
            {
              scale: progress.interpolate({
                inputRange: [0, 0.55, 2],
                outputRange: [0.72, 1.05, 0.88],
              }),
            },
          ],
        },
      ]}
    >
      <View style={[styles.burstIcon, styles.burstLeft]}>
        <Ionicons color={colors.coral} name="heart" size={15} />
      </View>
      <View style={[styles.burstIcon, styles.burstCenter]}>
        <Ionicons color={colors.navy} name="sparkles" size={16} />
      </View>
      <View style={[styles.burstIcon, styles.burstRight]}>
        <Ionicons color={colors.sage} name="paw" size={15} />
      </View>
    </Animated.View>
  );
}

export function HomeCareScreen({
  pets,
  activePetId,
  schedule,
  now,
  topInset,
  bottomInset,
  onActivePetChange,
  onComplete,
  onSkip,
  onOpenLog,
  onOpenAdd,
  scrollToTopSignal,
}: {
  pets: Pet[];
  activePetId: string | null;
  schedule: ScheduledCare[];
  now: Date;
  topInset: number;
  bottomInset: number;
  onActivePetChange: (petId: string) => void;
  onComplete: (item: ScheduledCare) => void;
  onSkip: (item: ScheduledCare) => void;
  onOpenLog: (item: ScheduledCare) => void;
  onOpenAdd: () => void;
  scrollToTopSignal: number;
}) {
  const [petReactionToken, setPetReactionToken] = useState(0);
  const listRef = useRef<FlatList<ScheduledCare>>(null);
  const { height: viewportHeight } = useWindowDimensions();
  const compactViewport = viewportHeight < 720;
  useEffect(() => {
    listRef.current?.scrollToOffset({ animated: false, offset: 0 });
  }, [scrollToTopSignal]);
  const activePet = pets.find((pet) => pet.id === activePetId) ?? pets[0];
  if (!activePet) return null;
  const fallbackPet = activePet.avatar === "luna" ? assets.luna : assets.milo;
  const visual = resolvePetVisual(activePet, fallbackPet, assets.heroScene);
  const completion = careCompletionPercent(schedule);
  const next = schedule.find(
    (item) => item.status === "due" || item.status === "upcoming",
  );
  const openMoments = schedule.filter(
    (item) => item.status !== "done" && item.status !== "skipped",
  );
  const summaryTitle =
    completion === 100
      ? "Care plan complete"
      : next
        ? "Next up"
        : openMoments.length > 0
          ? "Still on today's list"
          : "Ready for today";
  const summaryBody =
    completion === 100
      ? "Everything planned for today is handled."
      : next
        ? formatCareTime(next.scheduledTime) + "  " + next.task.title
        : openMoments.length > 0
          ? `${openMoments.length} care ${openMoments.length === 1 ? "moment is" : "moments are"} still open.`
          : "Add a care moment whenever you are ready.";
  const hour = now.getHours();
  const dayGreeting =
    hour < 5 ? "Hello" : hour < 12 ? "Morning" : hour < 17 ? "Afternoon" : hour < 22 ? "Evening" : "Hello";
  const trimmedPetName = activePet.name.trim();
  const greetingPetName =
    trimmedPetName.length > 18 ? trimmedPetName.split(/\s+/)[0] : trimmedPetName;
  const greetingText = `${dayGreeting}, ${greetingPetName}`;

  return (
    <View style={styles.screen}>
      <FlatList
        bounces
        contentContainerStyle={{ paddingBottom: 28 }}
        data={schedule}
        keyExtractor={(item) => item.id}
        ref={listRef}
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Ionicons color={colors.sage} name="checkmark-circle" size={30} />
            <View style={styles.flex}>
              <Text style={styles.emptyTitle}>Nothing scheduled yet</Text>
              <Text style={styles.emptyBody}>
                Add meals, walks, grooming, medication or appointments.
              </Text>
            </View>
            <Pressable
              accessibilityLabel="Add a care moment"
              accessibilityRole="button"
              onPress={onOpenAdd}
              style={styles.smallAdd}
            >
              <Ionicons color={colors.white} name="add" size={20} />
            </Pressable>
          </View>
        }
        ListHeaderComponent={
          <View style={styles.heroHeader}>
            <View
              style={[
                styles.heroStage,
                compactViewport && styles.heroStageCompact,
                { paddingTop: topInset + 14 },
              ]}
            >
              <AnimatedPetHero
                layout={visual.layout}
                petKey={
                  visual.assetKey ??
                  createBreedAssetKey(activePet.species, activePet.breed)
                }
                petName={activePet.name}
                visualProfile={visual.profile}
                petSource={visual.petSource}
                reactionToken={petReactionToken}
                sceneContainsPet={visual.sceneContainsPet || visual.isFallback}
                sceneSource={visual.sceneSource ?? assets.heroScene}
              />
              <PetSuccessBurst token={petReactionToken} />
              <View style={styles.topRow}>
                <View style={styles.greetingCopy}>
                  <Text style={styles.eyebrow}>TODAY'S CARE</Text>
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.greeting,
                      activePet.name.trim().length > 10
                        ? styles.greetingLongest
                        : activePet.name.trim().length > 7
                          ? styles.greetingLong
                          : null,
                    ]}
                  >
                    {greetingText}
                  </Text>
                </View>
                <Pressable
                  accessibilityLabel="Add care item"
                  accessibilityRole="button"
                  onPress={onOpenAdd}
                  style={styles.headerAdd}
                >
                  <Ionicons color={colors.ink} name="add" size={23} />
                </Pressable>
              </View>
              <ScrollView
                contentContainerStyle={styles.petRow}
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.petScroller}
              >
                {pets.map((pet) => (
                  <Pressable
                    accessibilityLabel={`Show ${pet.name}`}
                    accessibilityRole="button"
                    accessibilityState={{ selected: pet.id === activePet.id }}
                    key={pet.id}
                    onPress={() => onActivePetChange(pet.id)}
                    style={[
                      styles.petChip,
                      pet.id === activePet.id && styles.petChipActive,
                    ]}
                  >
                    <View style={[styles.petDot, { backgroundColor: pet.color }]} />
                    <Text
                      ellipsizeMode="tail"
                      numberOfLines={1}
                      style={[
                        styles.petChipText,
                        pet.id === activePet.id && styles.petChipTextActive,
                      ]}
                    >
                      {pet.name}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
            <View style={styles.homeSheet}>
              <View
                style={[
                  styles.daySummary,
                  compactViewport && styles.daySummaryCompact,
                ]}
              >
              <View
                style={[
                  styles.progressBadge,
                  compactViewport && styles.progressBadgeCompact,
                ]}
              >
                <Text
                  style={[
                    styles.progressValue,
                    compactViewport && styles.progressValueCompact,
                  ]}
                >
                  {completion}%
                </Text>
                <Text style={styles.progressLabel}>complete</Text>
              </View>
              <View style={styles.summaryCopy}>
                <Text
                  style={[
                    styles.summaryTitle,
                    compactViewport && styles.summaryTitleCompact,
                  ]}
                >
                  {summaryTitle}
                </Text>
                <Text
                  numberOfLines={compactViewport ? 1 : undefined}
                  style={[
                    styles.summaryBody,
                    compactViewport && styles.summaryBodyCompact,
                  ]}
                >
                  {summaryBody}
                </Text>
              </View>
              </View>
              <View style={styles.sectionRow}>
                <Text style={styles.sectionTitle}>Care plan</Text>
                <Text style={styles.sectionCount}>{schedule.length} moments</Text>
              </View>
            </View>
          </View>
        }
        renderItem={({ item }) => {
          const meta = getCategoryMeta(item.task.category);
          const taskSummary = careTaskSummary(item.task);
          const resolved = item.status === "done" || item.status === "skipped";
          return (
            <View style={[styles.taskCard, resolved && styles.taskCardResolved]}>
              <View style={[styles.taskIcon, { backgroundColor: meta.softColor }]}>
                <Ionicons
                  color={meta.color}
                  name={meta.icon as keyof typeof Ionicons.glyphMap}
                  size={22}
                />
              </View>
              <View style={styles.flex}>
                <View style={styles.taskTitleRow}>
                  <Text style={styles.taskTitle}>{item.task.title}</Text>
                  <Text style={styles.taskTime}>
                    {formatCareTime(item.scheduledTime)}
                  </Text>
                </View>
                <Text numberOfLines={1} style={styles.taskBody}>
                  {taskSummary || meta.label}
                </Text>
                {item.log && (
                  <Text style={styles.loggedBy}>
                    {item.status === "done" ? "Done" : "Skipped"} by{" "}
                    {item.log.completedBy}
                  </Text>
                )}
              </View>
              {resolved ? (
                <Pressable
                  accessibilityLabel={`Review ${item.task.title} care log`}
                  accessibilityRole="button"
                  onPress={() => onOpenLog(item)}
                  style={styles.doneButton}
                >
                  <Ionicons
                    color={item.status === "done" ? colors.sage : colors.muted}
                    name={item.status === "done" ? "checkmark" : "remove"}
                    size={20}
                  />
                </Pressable>
              ) : (
                <View style={styles.taskActions}>
                  <Pressable
                    accessibilityLabel={"Skip " + item.task.title}
                    accessibilityRole="button"
                    onPress={() => onSkip(item)}
                    style={styles.skipButton}
                  >
                    <Ionicons color={colors.muted} name="remove" size={18} />
                  </Pressable>
                  <Pressable
                    accessibilityLabel={"Complete " + item.task.title}
                    accessibilityRole="button"
                    onPress={() => {
                      setPetReactionToken((token) => token + 1);
                      onComplete(item);
                    }}
                    style={styles.completeButton}
                  >
                    <Ionicons color={colors.white} name="checkmark" size={20} />
                  </Pressable>
                </View>
              )}
            </View>
          );
        }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  burst: {
    height: 145,
    left: 56,
    position: "absolute",
    right: 56,
    top: 62,
    zIndex: 5,
  },
  burstCenter: {
    left: "50%",
    marginLeft: -17,
    top: 0,
  },
  burstIcon: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.90)",
    borderColor: "rgba(255,255,255,0.94)",
    borderRadius: 18,
    borderWidth: 1,
    height: 34,
    justifyContent: "center",
    position: "absolute",
    width: 34,
    ...shadow.card,
  },
  burstLeft: { left: 0, top: 68 },
  burstRight: { right: 0, top: 54 },
  completeButton: {
    alignItems: "center",
    backgroundColor: colors.sage,
    borderRadius: 19,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  daySummary: {
    alignItems: "center",
    backgroundColor: "rgba(255,252,247,0.94)",
    borderRadius: 26,
    flexDirection: "row",
    padding: 14,
    ...shadow.card,
  },
  daySummaryCompact: { borderRadius: 22, padding: 8 },
  doneButton: {
    alignItems: "center",
    backgroundColor: colors.sageSoft,
    borderRadius: 18,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  emptyBody: {
    color: colors.muted,
    fontFamily: "Nunito_600SemiBold",
    fontSize: 12,
    lineHeight: 17,
  },
  emptyCard: {
    alignItems: "center",
    backgroundColor: colors.paper,
    borderRadius: 24,
    flexDirection: "row",
    gap: 12,
    marginHorizontal: 16,
    padding: 16,
    ...shadow.subtle,
  },
  emptyTitle: {
    color: colors.ink,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 15,
  },
  eyebrow: {
    color: colors.navy,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 10,
    letterSpacing: 1.3,
  },
  flex: { flex: 1 },
  greeting: {
    color: colors.ink,
    flexShrink: 1,
    fontFamily: "Fredoka_600SemiBold",
    fontSize: 30,
    lineHeight: 36,
  },
  greetingCopy: {
    backgroundColor: "rgba(255,252,247,0.82)",
    borderColor: "rgba(255,255,255,0.72)",
    borderRadius: 20,
    borderWidth: 1,
    flex: 1,
    maxWidth: "82%",
    minWidth: 0,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  greetingLong: {
    fontSize: 24,
    lineHeight: 29,
  },
  greetingLongest: {
    fontSize: 21,
    lineHeight: 26,
  },
  headerAdd: {
    alignItems: "center",
    backgroundColor: "rgba(255,252,247,0.9)",
    borderRadius: 20,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  heroHeader: {
    position: "relative",
  },
  heroStage: {
    minHeight: 560,
    overflow: "hidden",
    paddingHorizontal: 18,
    position: "relative",
  },
  heroStageCompact: {
    minHeight: 516,
  },
  homeSheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    marginTop: -28,
    paddingHorizontal: 18,
    paddingTop: 18,
    position: "relative",
    zIndex: 10,
  },
  loggedBy: {
    color: colors.sage,
    fontFamily: "Nunito_700Bold",
    fontSize: 10,
    marginTop: 3,
  },
  petChip: {
    alignItems: "center",
    backgroundColor: "rgba(255,252,247,0.76)",
    borderRadius: 18,
    flexDirection: "row",
    gap: 6,
    height: 44,
    maxWidth: 180,
    minHeight: 44,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  petChipActive: { backgroundColor: colors.ink },
  petChipText: {
    color: colors.ink,
    flexShrink: 1,
    fontFamily: "Nunito_700Bold",
    fontSize: 12,
  },
  petChipTextActive: { color: colors.white },
  petDot: { borderRadius: 4, height: 8, width: 8 },
  petRow: { flexDirection: "row", gap: 8, marginTop: 10 },
  progressBadge: {
    alignItems: "center",
    backgroundColor: colors.sageSoft,
    borderRadius: 20,
    height: 64,
    justifyContent: "center",
    width: 64,
  },
  progressBadgeCompact: {
    borderRadius: 16,
    height: 44,
    width: 54,
  },
  progressLabel: {
    color: colors.sage,
    fontFamily: "Nunito_700Bold",
    fontSize: 9,
  },
  progressValue: {
    color: colors.sage,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 19,
  },
  progressValueCompact: { fontSize: 16 },
  screen: { backgroundColor: colors.background, flex: 1 },
  petScroller: { flexGrow: 0, height: 48, maxHeight: 48 },
  sectionCount: {
    color: colors.muted,
    fontFamily: "Nunito_700Bold",
    fontSize: 12,
  },
  sectionRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 18,
  },
  sectionTitle: {
    color: colors.ink,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 18,
  },
  skipButton: {
    alignItems: "center",
    backgroundColor: colors.line,
    borderRadius: 17,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  smallAdd: {
    alignItems: "center",
    backgroundColor: colors.coral,
    borderRadius: 18,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  summaryBody: {
    color: colors.muted,
    fontFamily: "Nunito_600SemiBold",
    fontSize: 12,
    marginTop: 2,
  },
  summaryBodyCompact: { fontSize: 10, marginTop: 0 },
  summaryCopy: { flex: 1, marginLeft: 12 },
  summaryTitle: {
    color: colors.ink,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 15,
  },
  summaryTitleCompact: { fontSize: 13 },
  taskActions: { alignItems: "center", flexDirection: "row", gap: 7 },
  taskBody: {
    color: colors.muted,
    fontFamily: "Nunito_600SemiBold",
    fontSize: 11,
    marginTop: 2,
  },
  taskCard: {
    alignItems: "center",
    backgroundColor: colors.paper,
    borderRadius: 23,
    flexDirection: "row",
    gap: 11,
    marginBottom: 10,
    marginHorizontal: 16,
    padding: 13,
    ...shadow.subtle,
  },
  taskCardResolved: { opacity: 0.76 },
  taskIcon: {
    alignItems: "center",
    borderRadius: 20,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  taskTime: {
    color: colors.muted,
    fontFamily: "Nunito_700Bold",
    fontSize: 10,
  },
  taskTitle: {
    color: colors.ink,
    flex: 1,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 14,
  },
  taskTitleRow: { flexDirection: "row", gap: 8 },
  topRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
});
