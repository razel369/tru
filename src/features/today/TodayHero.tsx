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

import { HeartBurst } from "../../components/HeartBurst";
import { AmbientStickers } from "../../components/AmbientStickers";
import { PressScale } from "../../components/PressScale";
import { assets, colors, shadow } from "../../design";
import { usePrefersReducedMotion } from "../accessibility/motion";
import { formatTime } from "../../schedule";
import type { ScheduledDose } from "../../types";

interface TodayHeroProps {
  schedule: ScheduledDose[];
  topInset: number;
  petImage: ImageSourcePropType;
  companionImage?: ImageSourcePropType;
  roomImage?: ImageSourcePropType;
  heroScene?: ImageSourcePropType;
  /** Real pet for the next dose — not the brand mascot. */
  petName: string;
  nextDose?: ScheduledDose;
  onMenu?: () => void;
  onConfirmNext?: () => void;
  canConfirm?: boolean;
  onLog: (dose: ScheduledDose, status: "given" | "skipped") => void;
}

const ACCENT = [colors.sky, colors.coral, colors.lavender] as const;

const FLOAT_SLOTS = [
  { top: 0, left: -10, rotate: "-9deg" },
  { top: 204, left: -12, rotate: "6deg" },
  { top: 96, right: -12, rotate: "9deg" },
] as const;

/**
 * Full-bleed companion scene. Product logic: name the real pet and
 * the exact next dose — Buddy is brand atmosphere only.
 *
 * Motion: entrance stagger + ambient breathe/float/pulse so the
 * screen feels like a living room, not a static poster.
 */
export function TodayHero({
  schedule,
  topInset,
  petImage,
  companionImage,
  roomImage,
  heroScene,
  petName,
  nextDose,
  onMenu,
  onConfirmNext,
  canConfirm = false,
  onLog,
}: TodayHeroProps) {
  const reduceMotion = usePrefersReducedMotion();
  const [burstKey, setBurstKey] = useState(0);
  const remainingDoses = schedule.filter(
    (dose) =>
      dose.status === "due" ||
      dose.status === "upcoming" ||
      dose.status === "missed",
  );
  const needsAttention = schedule.some((dose) => dose.status === "missed");
  const allDone = schedule.length > 0 && remainingDoses.length === 0;

  let bubbleLead = "Add a pet";
  let bubbleAccent = "to begin";
  if (needsAttention && nextDose) {
    bubbleLead = `${nextDose.pet.name} still`;
    bubbleAccent = "needs you";
  } else if (allDone) {
    bubbleLead = "All set for";
    bubbleAccent = "tonight!";
  } else if (nextDose) {
    bubbleLead = `${nextDose.pet.name} ·`;
    bubbleAccent = formatTime(nextDose.scheduledTime);
  }

  const floating =
    remainingDoses.length > 0
      ? remainingDoses.slice(0, 3)
      : schedule.filter((dose) => dose.status === "given").slice(0, 3);

  const sceneSource = heroScene ?? roomImage ?? companionImage ?? petImage;
  const ctaLabel = nextDose
    ? `Mark ${nextDose.pet.name} · ${nextDose.medication.name} · ${formatTime(nextDose.scheduledTime)}`
    : "Mark as given";

  const sceneScale = useRef(new Animated.Value(1)).current;
  const enterOpacity = useRef(new Animated.Value(0)).current;
  const enterY = useRef(new Animated.Value(18)).current;
  const bubbleY = useRef(new Animated.Value(0)).current;
  const heartScale = useRef(new Animated.Value(1)).current;
  const ctaScale = useRef(new Animated.Value(1)).current;
  const ctaGlow = useRef(new Animated.Value(0.88)).current;
  const pawWiggle = useRef(new Animated.Value(0)).current;
  const stickerYs = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;
  const stickerEnters = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;

  const celebrateGiven = (dose: ScheduledDose) => {
    setBurstKey((key) => key + 1);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onLog(dose, "given");
  };

  const confirmNext = () => {
    if (!onConfirmNext) return;
    setBurstKey((key) => key + 1);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onConfirmNext();
  };

  useEffect(() => {
    if (reduceMotion) {
      enterOpacity.setValue(1);
      enterY.setValue(0);
      stickerEnters.forEach((v) => v.setValue(1));
      return;
    }

    const useNativeDriver = Platform.OS !== "web";

    const entrance = Animated.parallel([
      Animated.timing(enterOpacity, {
        toValue: 1,
        duration: 520,
        easing: Easing.out(Easing.cubic),
        useNativeDriver,
      }),
      Animated.timing(enterY, {
        toValue: 0,
        duration: 560,
        easing: Easing.out(Easing.cubic),
        useNativeDriver,
      }),
      Animated.stagger(
        110,
        stickerEnters.map((value) =>
          Animated.spring(value, {
            toValue: 1,
            friction: 7,
            tension: 80,
            useNativeDriver,
          }),
        ),
      ),
    ]);
    entrance.start();

    const loop = (
      value: Animated.Value,
      to: number,
      duration: number,
      from = 0,
    ) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(value, {
            toValue: to,
            duration,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver,
          }),
          Animated.timing(value, {
            toValue: from,
            duration,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver,
          }),
        ]),
      );

    // Slow ken-burns on the room — ambient, not flashy.
    const scene = loop(sceneScale, 1.045, 9000, 1);
    const bubble = loop(bubbleY, -8, 2400);
    const heart = loop(heartScale, 1.18, 900);
    const cta = loop(ctaScale, 1.04, 1700);
    const glow = loop(ctaGlow, 1, 1700, 0.88);
    const paw = Animated.loop(
      Animated.sequence([
        Animated.delay(2800),
        Animated.timing(pawWiggle, {
          toValue: 1,
          duration: 120,
          easing: Easing.out(Easing.quad),
          useNativeDriver,
        }),
        Animated.timing(pawWiggle, {
          toValue: -1,
          duration: 120,
          useNativeDriver,
        }),
        Animated.timing(pawWiggle, {
          toValue: 0.6,
          duration: 100,
          useNativeDriver,
        }),
        Animated.timing(pawWiggle, {
          toValue: 0,
          duration: 100,
          useNativeDriver,
        }),
      ]),
    );
    const stickers = stickerYs.map((value, index) =>
      loop(value, index % 2 === 0 ? -8 : 8, 1900 + index * 320),
    );

    scene.start();
    bubble.start();
    heart.start();
    cta.start();
    glow.start();
    paw.start();
    stickers.forEach((anim) => anim.start());

    return () => {
      entrance.stop();
      scene.stop();
      bubble.stop();
      heart.stop();
      cta.stop();
      glow.stop();
      paw.stop();
      stickers.forEach((anim) => anim.stop());
    };
  }, [
    reduceMotion,
    sceneScale,
    enterOpacity,
    enterY,
    bubbleY,
    heartScale,
    ctaScale,
    ctaGlow,
    pawWiggle,
    stickerYs,
    stickerEnters,
  ]);

  return (
    <View style={styles.room}>
      <Animated.Image
        accessibilityIgnoresInvertColors
        accessibilityLabel={`${petName} care scene`}
        resizeMode="cover"
        source={sceneSource}
        style={[
          styles.sceneBleed,
          { transform: [{ scale: sceneScale }] },
        ]}
      />
      <HeartBurst trigger={burstKey} />
      <AmbientStickers
        items={[
          {
            source: assets.stickers.sun,
            size: 52,
            top: topInset + 58,
            right: 6,
            rotate: "8deg",
            delay: 40,
            amplitude: 4,
          },
          {
            source: assets.stickers.plant,
            size: 58,
            bottom: 132,
            left: -6,
            rotate: "-6deg",
            delay: 180,
            amplitude: 5,
          },
          {
            source: assets.stickers.ball,
            size: 40,
            bottom: 168,
            right: 10,
            rotate: "14deg",
            delay: 260,
            amplitude: 7,
          },
          {
            source: assets.stickers.pill,
            size: 36,
            top: topInset + 120,
            left: 4,
            rotate: "-18deg",
            delay: 120,
            amplitude: 5,
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
            <Animated.View
              style={[
                styles.pawDot,
                {
                  transform: [
                    {
                      rotate: pawWiggle.interpolate({
                        inputRange: [-1, 0, 1],
                        outputRange: ["-18deg", "0deg", "18deg"],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Ionicons color={colors.coral} name="paw" size={13} />
            </Animated.View>
          </View>

          <View style={styles.profilePuck}>
            <Image
              accessibilityLabel={petName}
              source={petImage}
              style={styles.profileImage}
            />
          </View>
        </View>

        <View style={styles.scene}>
          <Animated.View
            style={[
              styles.speechWrap,
              { transform: [{ translateY: bubbleY }] },
            ]}
          >
            <Animated.View
              style={[
                styles.heartFloat,
                { transform: [{ scale: heartScale }] },
              ]}
            >
              <Ionicons color={colors.coral} name="heart" size={13} />
            </Animated.View>
            <View style={styles.speechBubble}>
              <Text style={styles.speechText}>
                {bubbleLead}{" "}
                <Text style={styles.speechAccent}>{bubbleAccent}</Text>
              </Text>
              {nextDose && !allDone ? (
                <Text style={styles.speechSub} numberOfLines={1}>
                  {nextDose.medication.name} · {nextDose.medication.dosage}
                </Text>
              ) : null}
            </View>
          </Animated.View>

          <View style={styles.companionStage}>
            {floating.map((dose, index) => {
              const slot = FLOAT_SLOTS[index] ?? FLOAT_SLOTS[0]!;
              const accent = ACCENT[index % ACCENT.length] ?? colors.sky;
              const floatY = stickerYs[index] ?? stickerYs[0]!;
              const enter = stickerEnters[index] ?? stickerEnters[0]!;
              return (
                <FloatingDoseSticker
                  accent={accent}
                  dose={dose}
                  enter={enter}
                  floatY={floatY}
                  key={dose.id}
                  onCelebrate={celebrateGiven}
                  reduceMotion={reduceMotion}
                  slot={slot}
                />
              );
            })}
          </View>

          {canConfirm && onConfirmNext && nextDose ? (
            <Animated.View
              style={{
                opacity: ctaGlow,
                transform: [{ scale: ctaScale }],
                zIndex: 8,
              }}
            >
              <PressScale
                accessibilityLabel={ctaLabel}
                onPress={confirmNext}
                scaleTo={0.96}
                style={styles.giveCta}
              >
                <Ionicons color={colors.white} name="checkmark" size={20} />
                <Text style={styles.giveCtaText} numberOfLines={2}>
                  {ctaLabel}
                </Text>
              </PressScale>
            </Animated.View>
          ) : null}
        </View>
      </Animated.View>
    </View>
  );
}

interface FloatingDoseStickerProps {
  dose: ScheduledDose;
  accent: string;
  floatY: Animated.Value;
  enter: Animated.Value;
  onCelebrate: (dose: ScheduledDose) => void;
  reduceMotion: boolean;
  slot: (typeof FLOAT_SLOTS)[number];
}

function FloatingDoseSticker({
  dose,
  accent,
  floatY,
  enter,
  onCelebrate,
  reduceMotion,
  slot,
}: FloatingDoseStickerProps) {
  const complete = dose.status === "given";
  const skipped = dose.status === "skipped";
  const caregiver = dose.log?.completedBy?.slice(0, 2).toUpperCase();
  const popOpacity = useRef(new Animated.Value(1)).current;
  const popScale = useRef(new Animated.Value(1)).current;
  const heartPop = useRef(new Animated.Value(0)).current;
  const busy = useRef(false);

  const markGiven = () => {
    if (busy.current) return;
    busy.current = true;

    if (reduceMotion) {
      onCelebrate(dose);
      return;
    }

    Animated.parallel([
      Animated.timing(popScale, {
        toValue: 1.12,
        duration: 220,
        easing: Easing.out(Easing.back(1.6)),
        useNativeDriver: true,
      }),
      Animated.timing(heartPop, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(popOpacity, {
        toValue: 0,
        duration: 320,
        delay: 120,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) onCelebrate(dose);
      else busy.current = false;
    });
  };

  return (
    <Animated.View
      style={[
        styles.sticker,
        {
          top: slot.top,
          ...("left" in slot ? { left: slot.left } : { right: slot.right }),
          opacity: Animated.multiply(enter, popOpacity),
          transform: [
            { rotate: slot.rotate },
            { translateY: floatY },
            {
              scale: Animated.multiply(
                enter.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.82, 1],
                }),
                popScale,
              ),
            },
          ],
        },
        complete && styles.stickerDone,
      ]}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          styles.stickerHeart,
          {
            opacity: heartPop,
            transform: [
              {
                scale: heartPop.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.4, 1.35],
                }),
              },
              {
                translateY: heartPop.interpolate({
                  inputRange: [0, 1],
                  outputRange: [8, -18],
                }),
              },
            ],
          },
        ]}
      >
        <Ionicons color={colors.coral} name="heart" size={22} />
      </Animated.View>
      <View style={styles.stickerTop}>
        <View style={[styles.avatar, { backgroundColor: `${accent}30` }]}>
          <Text style={[styles.avatarText, { color: accent }]}>
            {caregiver ?? dose.pet.name.slice(0, 1).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.petChip} numberOfLines={1}>
          {dose.pet.name}
        </Text>
      </View>
      <View style={styles.timeRow}>
        <Ionicons color={colors.muted} name="time-outline" size={12} />
        <Text style={styles.time}>{formatTime(dose.scheduledTime)}</Text>
      </View>
      <Text style={styles.medName} numberOfLines={1}>
        {dose.medication.name}
      </Text>
      <Text style={styles.details} numberOfLines={1}>
        {dose.medication.dosage}
      </Text>
      {complete || skipped ? (
        <View
          style={[
            styles.checkPuck,
            { backgroundColor: complete ? accent : colors.muted },
          ]}
        >
          <Ionicons
            color={colors.white}
            name={complete ? "checkmark" : "remove"}
            size={16}
          />
        </View>
      ) : (
        <PressScale
          accessibilityLabel={`Mark ${dose.pet.name}'s ${dose.medication.name} as given`}
          onPress={markGiven}
          scaleTo={0.88}
          style={[styles.checkPuck, { backgroundColor: accent }]}
        >
          <Ionicons color={colors.white} name="checkmark" size={16} />
        </PressScale>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: "center",
    borderRadius: 13,
    height: 28,
    justifyContent: "center",
    width: 28,
  },
  avatarText: {
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 10,
  },
  checkPuck: {
    alignItems: "center",
    alignSelf: "flex-end",
    borderRadius: 15,
    height: 30,
    justifyContent: "center",
    marginTop: 8,
    width: 30,
    ...shadow.subtle,
  },
  companionStage: {
    flex: 1,
    minHeight: 260,
    position: "relative",
    width: "100%",
  },
  details: {
    color: colors.muted,
    fontFamily: "Nunito_600SemiBold",
    fontSize: 11,
    marginTop: 1,
  },
  giveCta: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: colors.coral,
    borderRadius: 999,
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
    marginBottom: 24,
    marginTop: 12,
    maxWidth: "100%",
    minHeight: 62,
    paddingHorizontal: 22,
    paddingVertical: 12,
    ...shadow.fab,
  },
  giveCtaText: {
    color: colors.white,
    flexShrink: 1,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 15,
    letterSpacing: -0.2,
    textAlign: "center",
  },
  heartFloat: {
    alignItems: "center",
    backgroundColor: colors.paper,
    borderRadius: 14,
    height: 28,
    justifyContent: "center",
    marginBottom: -8,
    width: 28,
    zIndex: 5,
    ...shadow.card,
  },
  hero: {
    backgroundColor: "transparent",
    flex: 1,
    overflow: "hidden",
    paddingBottom: 108,
    paddingHorizontal: 14,
    zIndex: 1,
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
  medName: {
    color: colors.ink,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 13,
    marginTop: 2,
  },
  pawDot: {
    marginLeft: -2,
    marginTop: -14,
  },
  petChip: {
    color: colors.muted,
    flex: 1,
    fontFamily: "Nunito_700Bold",
    fontSize: 11,
    marginLeft: 6,
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
  room: {
    backgroundColor: "#C9B59A",
    flex: 1,
    overflow: "hidden",
    position: "relative",
    width: "100%",
  },
  scene: {
    alignItems: "center",
    flex: 1,
    justifyContent: "space-between",
    minHeight: 520,
  },
  sceneBleed: {
    ...StyleSheet.absoluteFill,
    height: "100%",
    width: "100%",
  },
  speechAccent: {
    color: colors.coral,
    fontFamily: "Nunito_800ExtraBold",
  },
  speechBubble: {
    backgroundColor: "rgba(255,252,247,0.97)",
    borderRadius: 34,
    maxWidth: "100%",
    paddingHorizontal: 24,
    paddingVertical: 14,
    ...shadow.card,
  },
  speechSub: {
    color: colors.muted,
    fontFamily: "Nunito_700Bold",
    fontSize: 13,
    marginTop: 4,
    textAlign: "center",
  },
  speechText: {
    color: colors.ink,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 22,
    letterSpacing: -0.5,
    lineHeight: 28,
    textAlign: "center",
  },
  speechWrap: {
    alignItems: "center",
    marginTop: 6,
    zIndex: 4,
  },
  sticker: {
    backgroundColor: "rgba(255,252,247,0.98)",
    borderRadius: 22,
    paddingBottom: 10,
    paddingHorizontal: 11,
    paddingTop: 9,
    position: "absolute",
    width: 128,
    zIndex: 7,
    ...shadow.card,
  },
  stickerDone: {
    opacity: 0.8,
  },
  stickerHeart: {
    alignItems: "center",
    justifyContent: "center",
    left: 0,
    position: "absolute",
    right: 0,
    top: 36,
    zIndex: 9,
  },
  stickerTop: {
    alignItems: "center",
    flexDirection: "row",
    marginBottom: 6,
  },
  time: {
    color: colors.muted,
    fontFamily: "Nunito_700Bold",
    fontSize: 11,
  },
  timeRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
  },
  topBar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
    zIndex: 5,
  },
  wordmark: {
    alignItems: "flex-start",
    flexDirection: "row",
  },
  wordPair: {
    color: colors.coral,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 34,
    letterSpacing: -1.1,
  },
  wordPaw: {
    color: colors.sky,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 34,
    letterSpacing: -1.1,
  },
});
