import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useEffect, useRef, useState } from "react";
import type { ImageSourcePropType } from "react-native";
import {
  Animated,
  Easing,
  Image,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { AmbientStickers } from "../../components/AmbientStickers";
import { HeartBurst } from "../../components/HeartBurst";
import { PressScale } from "../../components/PressScale";
import { assets, colors, shadow } from "../../design";
import { formatTime } from "../../schedule";
import type { ScheduledDose } from "../../types";
import { usePrefersReducedMotion } from "../accessibility/motion";

interface TodayHeroProps {
  schedule: ScheduledDose[];
  topInset: number;
  petImage: ImageSourcePropType;
  petName: string;
  petBreed: string;
  companionImage?: ImageSourcePropType;
  roomImage?: ImageSourcePropType;
  heroScene?: ImageSourcePropType;
  onMenu?: () => void;
  onLog: (dose: ScheduledDose, status: "given" | "skipped") => void;
}

const PENDING_STATUSES = new Set(["due", "upcoming", "missed"]);

/**
 * Personalized daily-care room. The room, pet portrait, engraved name tag,
 * and care controls are separate layers so the selected pet always owns the
 * scene. Medication remains the trust anchor while food, walks, and the next
 * care moment broaden PawPair into shared daily care.
 */
export function TodayHero({
  schedule,
  topInset,
  petImage,
  petName,
  petBreed,
  companionImage,
  roomImage,
  heroScene,
  onMenu,
  onLog,
}: TodayHeroProps) {
  const reduceMotion = usePrefersReducedMotion();
  const [burstKey, setBurstKey] = useState(0);
  const [foodDone, setFoodDone] = useState(false);
  const [walkDone, setWalkDone] = useState(false);
  const [optimisticGivenIds, setOptimisticGivenIds] = useState<string[]>([]);

  const remainingDoses = schedule.filter(
    (dose) =>
      PENDING_STATUSES.has(dose.status) &&
      !optimisticGivenIds.includes(dose.id),
  );
  const nextDose = remainingDoses[0];
  const allMedicationDone = schedule.length > 0 && remainingDoses.length === 0;
  const medicationComplete =
    allMedicationDone || schedule.some((dose) => dose.status === "given");
  const completedCount =
    Number(medicationComplete) + Number(foodDone) + Number(walkDone);

  const sceneSource = roomImage ?? heroScene ?? companionImage ?? petImage;
  const enterOpacity = useRef(new Animated.Value(0)).current;
  const enterY = useRef(new Animated.Value(18)).current;
  const roomScale = useRef(new Animated.Value(1)).current;
  const petFloat = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setFoodDone(false);
    setWalkDone(false);
    setOptimisticGivenIds([]);
  }, [petName]);

  useEffect(() => {
    setOptimisticGivenIds((ids) =>
      ids.filter((id) =>
        schedule.some(
          (dose) => dose.id === id && PENDING_STATUSES.has(dose.status),
        ),
      ),
    );
  }, [schedule]);

  useEffect(() => {
    if (reduceMotion) {
      enterOpacity.setValue(1);
      enterY.setValue(0);
      return;
    }

    const useNativeDriver = Platform.OS !== "web";
    const entrance = Animated.parallel([
      Animated.timing(enterOpacity, {
        toValue: 1,
        duration: 460,
        easing: Easing.out(Easing.cubic),
        useNativeDriver,
      }),
      Animated.timing(enterY, {
        toValue: 0,
        duration: 520,
        easing: Easing.out(Easing.cubic),
        useNativeDriver,
      }),
    ]);
    const roomMotion = Animated.loop(
      Animated.sequence([
        Animated.timing(roomScale, {
          toValue: 1.035,
          duration: 9000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver,
        }),
        Animated.timing(roomScale, {
          toValue: 1,
          duration: 9000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver,
        }),
      ]),
    );
    const petMotion = Animated.loop(
      Animated.sequence([
        Animated.timing(petFloat, {
          toValue: -6,
          duration: 2200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver,
        }),
        Animated.timing(petFloat, {
          toValue: 0,
          duration: 2200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver,
        }),
      ]),
    );

    entrance.start();
    roomMotion.start();
    petMotion.start();
    return () => {
      entrance.stop();
      roomMotion.stop();
      petMotion.stop();
    };
  }, [enterOpacity, enterY, petFloat, reduceMotion, roomScale]);

  const celebrate = () => {
    setBurstKey((key) => key + 1);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const confirmDose = () => {
    if (!nextDose) return;
    setOptimisticGivenIds((ids) => [...ids, nextDose.id]);
    celebrate();
    onLog(nextDose, "given");
  };

  const toggleFood = () => {
    setFoodDone((done) => !done);
    celebrate();
  };

  const toggleWalk = () => {
    setWalkDone((done) => !done);
    celebrate();
  };

  const statusTitle =
    completedCount === 3 && allMedicationDone
      ? `${petName} is all cared for`
      : `${petName}'s care, together`;

  return (
    <View style={styles.room}>
      <Animated.Image
        accessibilityIgnoresInvertColors
        accessibilityLabel={`${petName} personalized care room`}
        resizeMode="cover"
        source={sceneSource}
        style={[
          styles.sceneBleed,
          { transform: [{ scale: roomScale }] },
        ]}
      />
      <View style={styles.roomWash} />
      <HeartBurst trigger={burstKey} />
      <AmbientStickers
        items={[
          {
            source: assets.stickers.sun,
            size: 48,
            top: topInset + 58,
            right: 8,
            rotate: "8deg",
            delay: 40,
            amplitude: 4,
          },
          {
            source: assets.stickers.plant,
            size: 52,
            bottom: 300,
            left: -4,
            rotate: "-6deg",
            delay: 180,
            amplitude: 4,
          },
        ]}
      />

      <Animated.View
        style={[
          styles.hero,
          {
            paddingTop: topInset + 4,
            opacity: enterOpacity,
            transform: [{ translateY: enterY }],
          },
        ]}
      >
        <View style={styles.topBar}>
          <PressScale
            accessibilityLabel="Open menu"
            onPress={onMenu}
            style={styles.iconPuck}
          >
            <Ionicons color={colors.ink} name="menu" size={22} />
          </PressScale>

          <View style={styles.wordmark}>
            <Text style={styles.wordPaw}>Paw</Text>
            <Text style={styles.wordPair}>Pair</Text>
            <Ionicons color={colors.coral} name="paw" size={13} />
          </View>

          <View style={styles.profilePuck}>
            <Image
              accessibilityLabel={petName}
              source={petImage}
              style={styles.profileImage}
            />
          </View>
        </View>

        <View style={styles.statusBubble}>
          <View style={styles.statusCopy}>
            <Text style={styles.eyebrow}>TODAY'S CARE</Text>
            <Text style={styles.statusTitle}>{statusTitle}</Text>
          </View>
          <View style={styles.progressPill}>
            <Text style={styles.progressText}>{completedCount}/4</Text>
          </View>
        </View>

        <Animated.View
          style={[styles.petStage, { transform: [{ translateY: petFloat }] }]}
        >
          <View style={styles.petHalo}>
            <Image
              accessibilityLabel={`${petName}, ${petBreed}`}
              source={petImage}
              style={styles.petPortrait}
            />
          </View>
          <View style={styles.nameTag}>
            <Image source={assets.stickers.bone} style={styles.nameTagImage} />
            <Text style={styles.nameTagText} numberOfLines={1}>
              {petName}
            </Text>
          </View>
          <Text style={styles.breedLabel} numberOfLines={1}>
            {petBreed}
          </Text>
        </Animated.View>

        <View style={styles.careDock}>
          <View style={styles.dockHeader}>
            <Text style={styles.dockTitle}>Care plan</Text>
            <Text style={styles.dockMeta}>Shared household</Text>
          </View>

          <View style={styles.medicationRow}>
            <View style={styles.medicationIcon}>
              <Ionicons color={colors.coral} name="medical" size={20} />
            </View>
            <View style={styles.medicationCopy}>
              <Text style={styles.actionEyebrow}>MEDICATION</Text>
              <Text style={styles.actionTitle} numberOfLines={1}>
                {nextDose?.medication.name ?? "All doses given"}
              </Text>
              <Text style={styles.actionMeta} numberOfLines={1}>
                {nextDose
                  ? `${formatTime(nextDose.scheduledTime)} - ${nextDose.medication.dosage}`
                  : "Completed for today"}
              </Text>
            </View>
            {nextDose ? (
              <PressScale
                accessibilityLabel={`Mark ${nextDose.pet.name}'s ${nextDose.medication.name} as given`}
                onPress={confirmDose}
                scaleTo={0.94}
                style={styles.giveButton}
              >
                <Ionicons color={colors.white} name="checkmark" size={18} />
                <Text style={styles.giveButtonText}>Give</Text>
              </PressScale>
            ) : (
              <View style={styles.donePuck}>
                <Ionicons color={colors.white} name="checkmark" size={20} />
              </View>
            )}
          </View>

          <View style={styles.quickRow}>
            <QuickCareCard
              accent={colors.coral}
              done={foodDone}
              icon="restaurant-outline"
              label="Food"
              meta={foodDone ? "Fed now" : "Breakfast"}
              onPress={toggleFood}
            />
            <QuickCareCard
              accent={colors.sky}
              done={walkDone}
              icon="walk-outline"
              label="Walk"
              meta={walkDone ? "Walked now" : "20 minutes"}
              onPress={toggleWalk}
            />
            <View style={styles.nextCard}>
              <View style={[styles.quickIcon, styles.nextIcon]}>
                <Ionicons
                  color={colors.lavender}
                  name="sparkles-outline"
                  size={18}
                />
              </View>
              <Text style={styles.quickLabel}>Next</Text>
              <Text style={styles.quickMeta} numberOfLines={1}>
                Brush - 7 PM
              </Text>
            </View>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

interface QuickCareCardProps {
  label: string;
  meta: string;
  icon: "restaurant-outline" | "walk-outline";
  accent: string;
  done: boolean;
  onPress: () => void;
}

function QuickCareCard({
  label,
  meta,
  icon,
  accent,
  done,
  onPress,
}: QuickCareCardProps) {
  return (
    <PressScale
      accessibilityLabel={`${done ? "Undo" : "Mark"} ${label.toLowerCase()} ${done ? "completion" : "as done"}`}
      onPress={onPress}
      scaleTo={0.95}
      style={[styles.quickCard, done && styles.quickCardDone]}
    >
      <View style={[styles.quickIcon, { backgroundColor: `${accent}24` }]}>
        <Ionicons
          color={done ? colors.sage : accent}
          name={done ? "checkmark" : icon}
          size={18}
        />
      </View>
      <Text style={styles.quickLabel}>{label}</Text>
      <Text style={styles.quickMeta} numberOfLines={1}>
        {meta}
      </Text>
    </PressScale>
  );
}

const styles = StyleSheet.create({
  actionEyebrow: {
    color: colors.coral,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 9,
    letterSpacing: 1.1,
  },
  actionMeta: {
    color: colors.muted,
    fontFamily: "Nunito_600SemiBold",
    fontSize: 11,
  },
  actionTitle: {
    color: colors.ink,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 15,
  },
  breedLabel: {
    color: colors.ink,
    fontFamily: "Nunito_700Bold",
    fontSize: 11,
    marginTop: 2,
    opacity: 0.72,
  },
  careDock: {
    backgroundColor: "rgba(255,252,247,0.97)",
    borderRadius: 30,
    padding: 14,
    width: "100%",
    zIndex: 6,
    ...shadow.card,
  },
  dockHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  dockMeta: {
    color: colors.muted,
    fontFamily: "Nunito_700Bold",
    fontSize: 10,
  },
  dockTitle: {
    color: colors.ink,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 17,
  },
  donePuck: {
    alignItems: "center",
    backgroundColor: colors.sage,
    borderRadius: 22,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  eyebrow: {
    color: colors.sky,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 9,
    letterSpacing: 1.2,
  },
  giveButton: {
    alignItems: "center",
    backgroundColor: colors.coral,
    borderRadius: 22,
    flexDirection: "row",
    gap: 4,
    height: 44,
    justifyContent: "center",
    minWidth: 76,
    paddingHorizontal: 12,
    ...shadow.subtle,
  },
  giveButtonText: {
    color: colors.white,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 13,
  },
  hero: {
    flex: 1,
    paddingBottom: 112,
    paddingHorizontal: 14,
    zIndex: 2,
  },
  iconPuck: {
    alignItems: "center",
    backgroundColor: "rgba(255,252,247,0.94)",
    borderRadius: 24,
    height: 48,
    justifyContent: "center",
    width: 48,
    ...shadow.card,
  },
  medicationCopy: {
    flex: 1,
    gap: 1,
  },
  medicationIcon: {
    alignItems: "center",
    backgroundColor: `${colors.coral}20`,
    borderRadius: 18,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  medicationRow: {
    alignItems: "center",
    backgroundColor: `${colors.coral}0F`,
    borderRadius: 22,
    flexDirection: "row",
    gap: 10,
    minHeight: 68,
    padding: 10,
  },
  nameTag: {
    alignItems: "center",
    bottom: 4,
    height: 42,
    justifyContent: "center",
    position: "absolute",
    width: 92,
    zIndex: 4,
  },
  nameTagImage: {
    height: 42,
    position: "absolute",
    resizeMode: "contain",
    width: 92,
  },
  nameTagText: {
    color: "#8B5E35",
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 12,
    maxWidth: 64,
    paddingTop: 1,
    textAlign: "center",
  },
  nextCard: {
    backgroundColor: colors.paper,
    borderRadius: 20,
    flex: 1,
    minHeight: 78,
    padding: 10,
    ...shadow.subtle,
  },
  nextIcon: {
    backgroundColor: `${colors.lavender}24`,
  },
  petHalo: {
    backgroundColor: "rgba(255,252,247,0.68)",
    borderColor: "rgba(255,255,255,0.82)",
    borderRadius: 94,
    borderWidth: 6,
    height: 188,
    overflow: "hidden",
    width: 188,
    ...shadow.fab,
  },
  petPortrait: {
    height: "100%",
    width: "100%",
  },
  petStage: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    minHeight: 190,
    paddingBottom: 18,
  },
  profileImage: {
    borderRadius: 22,
    height: 44,
    width: 44,
  },
  profilePuck: {
    borderColor: colors.paper,
    borderRadius: 25,
    borderWidth: 3,
    height: 50,
    overflow: "hidden",
    width: 50,
    ...shadow.card,
  },
  progressPill: {
    alignItems: "center",
    backgroundColor: `${colors.sage}25`,
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    minWidth: 52,
  },
  progressText: {
    color: colors.sage,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 13,
  },
  quickCard: {
    backgroundColor: colors.paper,
    borderRadius: 20,
    flex: 1,
    minHeight: 78,
    padding: 10,
    ...shadow.subtle,
  },
  quickCardDone: {
    backgroundColor: `${colors.sage}16`,
  },
  quickIcon: {
    alignItems: "center",
    borderRadius: 13,
    height: 26,
    justifyContent: "center",
    marginBottom: 4,
    width: 26,
  },
  quickLabel: {
    color: colors.ink,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 12,
  },
  quickMeta: {
    color: colors.muted,
    fontFamily: "Nunito_600SemiBold",
    fontSize: 9,
    marginTop: 1,
  },
  quickRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
  },
  room: {
    backgroundColor: colors.room,
    flex: 1,
    overflow: "hidden",
    position: "relative",
    width: "100%",
  },
  roomWash: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(255,244,227,0.13)",
  },
  sceneBleed: {
    ...StyleSheet.absoluteFill,
    height: "100%",
    width: "100%",
  },
  statusBubble: {
    alignItems: "center",
    backgroundColor: "rgba(255,252,247,0.94)",
    borderRadius: 26,
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    marginTop: 4,
    paddingHorizontal: 16,
    paddingVertical: 11,
    ...shadow.card,
  },
  statusCopy: {
    flex: 1,
  },
  statusTitle: {
    color: colors.ink,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 18,
    letterSpacing: -0.3,
  },
  topBar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
    zIndex: 5,
  },
  wordPair: {
    color: colors.coral,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 32,
    letterSpacing: -1,
  },
  wordPaw: {
    color: colors.sky,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 32,
    letterSpacing: -1,
  },
  wordmark: {
    alignItems: "center",
    flexDirection: "row",
  },
});
