import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { Asset } from "expo-asset";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  AppState,
  Easing,
  Image,
  type ImageSourcePropType,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

import { usePrefersReducedMotion } from "../accessibility/motion";
import type { PetVisualLayout } from "../pet-visuals";
import { resolvePetSubjectFraming } from "../pet-visuals";
import type { BreedVisualProfile } from "../../types";
import {
  resolvePetMotionPackForProfile,
  resolvePetRig25D,
  type PetRig25DRegion,
  type PetMotionState,
} from "../pet-motion";
import { resolvePetBlinkProfile } from "../pet-motion/blink-profile";
import { requiresAuthoredBlinkAssets } from "../pet-motion/blink-safety";
import { resolvePetLifeProfile } from "../pet-motion/life-profile";
import {
  createPetMotionOverlayReadiness,
  recordPetMotionOverlayLoad,
  type PetMotionOverlayState,
} from "../pet-motion/overlay-readiness";

import {
  acquirePetInteractionGate,
  type PetInteractionKind,
} from "./pet-interaction-gate";

const USE_NATIVE_DRIVER = Platform.OS !== "web";
const HERO_FLOOR_Y = 535;

function motionSourceIdentity(source: ImageSourcePropType | undefined) {
  if (!source) return "none";
  if (typeof source === "number") return `module:${source}`;
  const resolved = Array.isArray(source) ? source[0] : source;
  return resolved?.uri ?? "inline";
}

export function AnimatedPetHero({
  petKey,
  petName,
  visualProfile,
  sceneSource,
  petSource,
  sceneContainsPet,
  layout,
  reactionToken,
  interactionCommand,
  motionCommand,
  onMotionReadyChange,
  inspectionMode = false,
}: {
  petKey: string;
  petName: string;
  visualProfile: BreedVisualProfile;
  sceneSource: ImageSourcePropType;
  petSource: ImageSourcePropType;
  sceneContainsPet: boolean;
  layout: PetVisualLayout;
  reactionToken: number;
  interactionCommand?: {
    id: number;
    kind: Exclude<PetInteractionKind, "care">;
  };
  inspectionMode?: boolean;
  onMotionReadyChange?: (ready: boolean) => void;
  motionCommand?: {
    durationMs?: number;
    id: number;
    sequenceScale?: number;
    state: PetMotionState;
  };
}) {
  const { width: viewportWidth } = useWindowDimensions();
  const [measuredWidth, setMeasuredWidth] = useState<number | null>(null);
  const width = measuredWidth ?? viewportWidth;
  const reduceMotion = usePrefersReducedMotion();
  const [appActive, setAppActive] = useState(
    AppState.currentState === "active",
  );
  const [motionState, setMotionState] = useState<PetMotionState>("idle");
  const breathe = useRef(new Animated.Value(0)).current;
  const sway = useRef(new Animated.Value(0)).current;
  const presence = useRef(new Animated.Value(0)).current;
  const attentionAnimation = useRef<
    ReturnType<typeof Animated.sequence> | null
  >(null);
  const blinkAnimation = useRef<
    ReturnType<typeof Animated.sequence> | null
  >(null);
  const lunaHeadLife = useRef(new Animated.Value(0)).current;
  const lunaLeftEar = useRef(new Animated.Value(0)).current;
  const lunaRightEar = useRef(new Animated.Value(0)).current;
  const entrance = useRef(new Animated.Value(1)).current;
  const touchFeedback = useRef(new Animated.Value(0)).current;
  const expressionOpacity = useRef(new Animated.Value(0)).current;
  const blinkHalfOpacity = useRef(new Animated.Value(0)).current;
  const blinkClosedOpacity = useRef(new Animated.Value(0)).current;
  const [readyMotionPackKeys, setReadyMotionPackKeys] = useState<
    ReadonlySet<string>
  >(() => new Set());
  const motionAssetReadiness = useRef(
    createPetMotionOverlayReadiness("", { blink: 0, blinkHalf: 0 }),
  );
  const [failedMotionPackKeys, setFailedMotionPackKeys] = useState<
    ReadonlySet<string>
  >(() => new Set());
  const pendingBlink = useRef<{
    interruptExpression: boolean;
    sequenceScale: number;
  } | null>(null);
  const blinkHalfCompositeOpacity = useMemo(
    () =>
      Animated.multiply(
        blinkHalfOpacity,
        Animated.subtract(1, blinkClosedOpacity),
      ),
    [blinkClosedOpacity, blinkHalfOpacity],
  );
  const proceduralBlink = useRef(new Animated.Value(0)).current;
  const expressionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastReactionToken = useRef(reactionToken);
  const lastInteractionCommandId = useRef(interactionCommand?.id ?? 0);
  const interactionLockedUntil = useRef(0);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      setAppActive(nextState === "active");
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (appActive) return;

    pendingBlink.current = null;
    if (expressionTimer.current) {
      clearTimeout(expressionTimer.current);
      expressionTimer.current = null;
    }
    attentionAnimation.current?.stop();
    attentionAnimation.current = null;
    blinkAnimation.current?.stop();
    blinkAnimation.current = null;
    expressionOpacity.stopAnimation();
    blinkHalfOpacity.stopAnimation();
    blinkClosedOpacity.stopAnimation();
    proceduralBlink.stopAnimation();
    presence.stopAnimation();
    touchFeedback.stopAnimation();
    expressionOpacity.setValue(0);
    blinkHalfOpacity.setValue(0);
    blinkClosedOpacity.setValue(0);
    proceduralBlink.setValue(0);
    presence.setValue(0);
    touchFeedback.setValue(0);
    setMotionState("idle");
  }, [
    appActive,
    blinkClosedOpacity,
    blinkHalfOpacity,
    expressionOpacity,
    presence,
    proceduralBlink,
    touchFeedback,
  ]);

  const motionPack = useMemo(
    () => resolvePetMotionPackForProfile(petKey, visualProfile),
    [petKey, visualProfile],
  );
  const activeMotionPackKey = useMemo(
    () =>
      motionPack
        ? [
            motionPack.petKey,
            motionPack.version,
            motionSourceIdentity(motionPack.states.blinkHalf),
            motionSourceIdentity(motionPack.states.blink),
          ].join("|")
        : "",
    [motionPack],
  );
  if (motionAssetReadiness.current.packKey !== activeMotionPackKey) {
    const expectedOverlayCount = (state: PetMotionOverlayState) => {
      if (!motionPack?.states[state]) return 0;
      return Math.max(
        1,
        motionPack.rig?.overlays?.[state]?.regions?.length ?? 1,
      );
    };
    motionAssetReadiness.current = createPetMotionOverlayReadiness(
      activeMotionPackKey,
      {
        blink: expectedOverlayCount("blink"),
        blinkHalf: expectedOverlayCount("blinkHalf"),
      },
    );
  }
  useEffect(() => {
    pendingBlink.current = null;

    if (!motionPack) return;

    const uris = Array.from(
      new Set(
        Object.values(motionPack.states)
          .map((source) => {
            if (!source) return null;
            if (typeof source === "number") return Asset.fromModule(source).uri;
            const uriSource = Array.isArray(source) ? source[0] : source;
            return uriSource?.uri ?? null;
          })
          .filter((uri): uri is string => Boolean(uri)),
      ),
    );

    void Promise.all(
      uris.map((uri) => Image.prefetch(uri).catch(() => false)),
    );
  }, [motionPack]);
  const handleMotionAssetReady = useCallback(
    (
      packKey: string,
      state: PetMotionOverlayState,
      index: number,
      succeeded: boolean,
    ) => {
      const result = recordPetMotionOverlayLoad(
        motionAssetReadiness.current,
        { index, packKey, state, succeeded },
      );
      motionAssetReadiness.current = result.readiness;

      if (result.status === "failed") {
        pendingBlink.current = null;
        setFailedMotionPackKeys((current) => {
          if (current.has(packKey)) return current;
          const next = new Set(current);
          next.add(packKey);
          return next;
        });
        setReadyMotionPackKeys((current) => {
          if (!current.has(packKey)) return current;
          const next = new Set(current);
          next.delete(packKey);
          return next;
        });
      } else if (result.status === "ready") {
        setReadyMotionPackKeys((current) => {
          if (current.has(packKey)) return current;
          const next = new Set(current);
          next.add(packKey);
          return next;
        });
      }
    },
    [],
  );
  const motionFailedForPack =
    failedMotionPackKeys.has(activeMotionPackKey);
  const motionReadyForPack =
    !motionPack ||
    !requiresAuthoredBlinkAssets(motionPack.states) ||
    (!motionFailedForPack &&
      readyMotionPackKeys.has(activeMotionPackKey));
  useEffect(() => {
    onMotionReadyChange?.(motionReadyForPack);
  }, [motionReadyForPack, onMotionReadyChange]);
  const resolvedPetKey = motionPack?.petKey ?? petKey;
  const blinkProfile = useMemo(
    () => resolvePetBlinkProfile(resolvedPetKey, visualProfile),
    [resolvedPetKey, visualProfile],
  );
  const lifeProfile = useMemo(
    () => resolvePetLifeProfile(resolvedPetKey, visualProfile),
    [resolvedPetKey, visualProfile],
  );
  const lifeProfileRef = useRef(lifeProfile);
  lifeProfileRef.current = lifeProfile;
  const rig25d = useMemo(
    () => resolvePetRig25D(resolvedPetKey),
    [resolvedPetKey],
  );
  const isLunaRig = rig25d !== null && motionPack !== null;
  // The old segmented renderer painted full-image head/chest crops over the
  // base cutout. On iOS those subpixel layers could remain rasterized after a
  // tap, producing a soft face, doubled fur, or a one-eye frame. Keep the
  // authored cutout on one crisp plane and layer only paired-eye expressions.
  const renderSegmentedRig = false;
  const hasLayeredPet = motionPack !== null || !sceneContainsPet;
  const motionIdleSource = motionPack?.states.idle ?? petSource;
  const motionExpressionState =
    motionState === "idle"
      ? null
      : motionPack?.states[motionState]
        ? motionState
        : null;
  const motionStageSource = motionPack?.stage ?? sceneSource;
  const motionProfile = useMemo(() => {
    const hash = Array.from(resolvedPetKey).reduce(
      (total, character) => total + character.charCodeAt(0),
      0,
    );
    const hour = new Date().getHours();
    const pace =
      hour >= 21 || hour < 7
        ? lifeProfileRef.current.nightTempo
        : hour < 11
          ? lifeProfileRef.current.morningTempo
          : lifeProfileRef.current.dayTempo;
    const isCat =
      resolvedPetKey.includes(":cat:") || resolvedPetKey === "pet:luna";
    const isLargeDog =
      !isCat &&
      /great-dane|golden-retriever|labrador-retriever|border-collie|pet:milo/.test(resolvedPetKey);
    const isSmallDog =
      !isCat &&
      /chihuahua|pomeranian|dachshund|french-bulldog/.test(resolvedPetKey);
    const attentionDirection = hash % 2 === 0 ? 1 : -1;

    return {
      attentionAcquireMs: isCat ? 330 : isLargeDog ? 470 : 390,
      attentionDelay: 7200 + (hash % 5) * 970,
      attentionDirection,
      attentionHoldMs: isCat ? 1180 : isLargeDog ? 930 : 780,
      attentionLift: isCat ? 1.2 : isLargeDog ? 1.05 : 1.55,
      attentionReleaseMs: isCat ? 680 : isLargeDog ? 790 : 640,
      attentionScale: isCat ? 1.0032 : isLargeDog ? 1.0024 : 1.0038,
      attentionShift: attentionDirection * (isCat ? 0.55 : isLargeDog ? 0.42 : 0.7),
      attentionTilt: isCat ? 0.58 : isSmallDog ? 0.82 : 0.48,
      breathDamping: isCat ? 0.18 : isLargeDog ? 0.34 : 0.26,
      pace: pace * (0.94 + (hash % 7) * 0.02),
      swayDamping: isCat ? 0.08 : isLargeDog ? 0.2 : 0.14,
      swayDistance: 0.28 + (hash % 4) * 0.07,
    };
  }, [resolvedPetKey]);

  useEffect(() => {
    if (!appActive || reduceMotion || inspectionMode) {
      breathe.stopAnimation();
      sway.stopAnimation();
      breathe.setValue(0);
      sway.setValue(0);
      return;
    }

    let active = true;
    let breathingAnimation: ReturnType<typeof Animated.sequence> | null = null;
    let swayAnimation: ReturnType<typeof Animated.sequence> | null = null;
    let swayDirection = motionProfile.attentionDirection;

    const runBreathingCycle = () => {
      if (!active) return;
      const peak = 0.84 + Math.random() * 0.16;
      const inhaleMs = (1700 + Math.random() * 900) * motionProfile.pace;
      const exhaleMs = (2200 + Math.random() * 1200) * motionProfile.pace;
      const restMs = (220 + Math.random() * 760) * motionProfile.pace;
      breathingAnimation = Animated.sequence([
        Animated.timing(breathe, {
          duration: inhaleMs,
          easing: Easing.inOut(Easing.sin),
          toValue: peak,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(breathe, {
          duration: exhaleMs,
          easing: Easing.inOut(Easing.sin),
          toValue: 0,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.delay(restMs),
      ]);
      breathingAnimation.start(({ finished }) => {
        if (active && finished) runBreathingCycle();
      });
    };

    const runWeightShift = () => {
      if (!active) return;
      const target = swayDirection * (0.48 + Math.random() * 0.42);
      swayDirection *= -1;
      const acquireMs = (2400 + Math.random() * 1700) * motionProfile.pace;
      const settleMs = (1900 + Math.random() * 1500) * motionProfile.pace;
      const holdMs = (480 + Math.random() * 1450) * motionProfile.pace;
      const restMs = (900 + Math.random() * 2400) * motionProfile.pace;
      swayAnimation = Animated.sequence([
        Animated.timing(sway, {
          duration: acquireMs,
          easing: Easing.inOut(Easing.sin),
          toValue: target,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.delay(holdMs),
        Animated.timing(sway, {
          duration: settleMs,
          easing: Easing.inOut(Easing.sin),
          toValue: 0,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.delay(restMs),
      ]);
      swayAnimation.start(({ finished }) => {
        if (active && finished) runWeightShift();
      });
    };

    runBreathingCycle();
    runWeightShift();
    return () => {
      active = false;
      breathingAnimation?.stop();
      swayAnimation?.stop();
    };
  }, [appActive, breathe, inspectionMode, motionProfile, reduceMotion, sway]);

  useEffect(() => {
    lunaHeadLife.stopAnimation();
    lunaHeadLife.setValue(0);
    if (!appActive || !isLunaRig || reduceMotion || inspectionMode) return;

    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let headAnimation: ReturnType<typeof Animated.sequence> | null = null;
    const scheduleHeadLife = () => {
      const waitMs =
        (1750 + Math.random() * 4300) * motionProfile.pace;
      timer = setTimeout(() => {
        if (!active) return;
        const direction =
          Math.random() < 0.58
            ? motionProfile.attentionDirection
            : -motionProfile.attentionDirection;
        const target = direction * (0.2 + Math.random() * 0.4);
        const correction = target * (0.56 + Math.random() * 0.22);
        const acquireMs = (620 + Math.random() * 620) * motionProfile.pace;
        const correctionMs = (360 + Math.random() * 520) * motionProfile.pace;
        const releaseMs = (820 + Math.random() * 820) * motionProfile.pace;
        const firstHoldMs = (420 + Math.random() * 1300) * motionProfile.pace;
        const secondHoldMs = (240 + Math.random() * 720) * motionProfile.pace;

        headAnimation = Animated.sequence([
          Animated.timing(lunaHeadLife, {
            duration: acquireMs,
            easing: Easing.inOut(Easing.sin),
            toValue: target,
            useNativeDriver: USE_NATIVE_DRIVER,
          }),
          Animated.delay(firstHoldMs),
          Animated.timing(lunaHeadLife, {
            duration: correctionMs,
            easing: Easing.inOut(Easing.sin),
            toValue: correction,
            useNativeDriver: USE_NATIVE_DRIVER,
          }),
          Animated.delay(secondHoldMs),
          Animated.timing(lunaHeadLife, {
            duration: releaseMs,
            easing: Easing.inOut(Easing.sin),
            toValue: 0,
            useNativeDriver: USE_NATIVE_DRIVER,
          }),
        ]);
        headAnimation.start(({ finished }) => {
          if (active && finished) scheduleHeadLife();
        });
      }, waitMs);
    };

    scheduleHeadLife();
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
      headAnimation?.stop();
    };
  }, [appActive, inspectionMode, isLunaRig, lunaHeadLife, motionProfile, reduceMotion]);

  useEffect(() => {
    lunaLeftEar.stopAnimation();
    lunaRightEar.stopAnimation();
    lunaLeftEar.setValue(0);
    lunaRightEar.setValue(0);
    if (!appActive || !isLunaRig || reduceMotion || inspectionMode) return;

    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const scheduleEarTwitch = () => {
      timer = setTimeout(() => {
        if (!active) return;
        const ear = Math.random() < 0.52 ? lunaLeftEar : lunaRightEar;
        Animated.sequence([
          Animated.timing(ear, {
            duration: lifeProfile.earTwitchLiftMs,
            easing: Easing.out(Easing.cubic),
            toValue: 1,
            useNativeDriver: USE_NATIVE_DRIVER,
          }),
          Animated.timing(ear, {
            duration: lifeProfile.earTwitchReboundMs,
            easing: Easing.inOut(Easing.sin),
            toValue: -0.16,
            useNativeDriver: USE_NATIVE_DRIVER,
          }),
          Animated.timing(ear, {
            duration: lifeProfile.earTwitchSettleMs,
            easing: Easing.out(Easing.cubic),
            toValue: 0,
            useNativeDriver: USE_NATIVE_DRIVER,
          }),
        ]).start(({ finished }) => {
          if (active && finished) scheduleEarTwitch();
        });
      }, lifeProfile.earTwitchEveryMs[0] + Math.round(
        Math.random() *
          (lifeProfile.earTwitchEveryMs[1] - lifeProfile.earTwitchEveryMs[0]),
      ));
    };

    scheduleEarTwitch();
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
      lunaLeftEar.stopAnimation();
      lunaRightEar.stopAnimation();
    };
  }, [
    appActive,
    inspectionMode,
    isLunaRig,
    lifeProfile,
    lunaLeftEar,
    lunaRightEar,
    reduceMotion,
  ]);

  const showExpression = useCallback(
    (nextState: PetMotionState, duration: number) => {
      if (!appActive || !motionPack?.states[nextState]) return;
      if (expressionTimer.current) clearTimeout(expressionTimer.current);
      blinkAnimation.current?.stop();
      blinkHalfOpacity.stopAnimation();
      blinkClosedOpacity.stopAnimation();
      proceduralBlink.stopAnimation();
      blinkHalfOpacity.setValue(0);
      blinkClosedOpacity.setValue(0);
      proceduralBlink.setValue(0);
      expressionOpacity.stopAnimation();
      expressionOpacity.setValue(0);
      setMotionState(nextState);

      const fadeInDuration = nextState === "blink" ? 70 : 120;
      const fadeOutDuration = nextState === "blink" ? 110 : 160;
      Animated.timing(expressionOpacity, {
        duration: reduceMotion ? 0 : fadeInDuration,
        easing: Easing.out(Easing.cubic),
        toValue: 1,
        useNativeDriver: USE_NATIVE_DRIVER,
      }).start();
      expressionTimer.current = setTimeout(() => {
        expressionTimer.current = null;
        Animated.timing(expressionOpacity, {
          duration: reduceMotion ? 0 : fadeOutDuration,
          easing: Easing.inOut(Easing.sin),
          toValue: 0,
          useNativeDriver: USE_NATIVE_DRIVER,
        }).start(({ finished }) => {
          if (finished) setMotionState("idle");
        });
      }, Math.max(fadeInDuration, duration - fadeOutDuration));
    },
    [
      appActive,
      blinkClosedOpacity,
      blinkHalfOpacity,
      expressionOpacity,
      motionPack,
      proceduralBlink,
      reduceMotion,
    ],
  );

  const runBlink = useCallback((sequenceScale = 1, interruptExpression = true) => {
    if (!appActive || !motionPack?.states.blink) return;
    if (motionFailedForPack) {
      pendingBlink.current = null;
      return;
    }
    if (!motionReadyForPack) {
      pendingBlink.current = { interruptExpression, sequenceScale };
      return;
    }
    if (!interruptExpression && (expressionTimer.current || motionState !== "idle")) {
      return;
    }

    if (interruptExpression) {
      if (expressionTimer.current) {
        clearTimeout(expressionTimer.current);
        expressionTimer.current = null;
      }
      expressionOpacity.stopAnimation();
      expressionOpacity.setValue(0);
      setMotionState("idle");
    }

    blinkAnimation.current?.stop();
    blinkHalfOpacity.stopAnimation();
    blinkClosedOpacity.stopAnimation();
    blinkHalfOpacity.setValue(0);
    blinkClosedOpacity.setValue(0);
    proceduralBlink.stopAnimation();
    proceduralBlink.setValue(0);

    const slowBlink =
      !inspectionMode && Math.random() < blinkProfile.slowBlinkChance;
    const doubleBlink =
      !inspectionMode &&
      !slowBlink &&
      Math.random() < blinkProfile.doubleBlinkChance;
    const hasHalfFrame = Boolean(motionPack.states.blinkHalf);
    const scaled = (duration: number) =>
      reduceMotion ? 0 : Math.round(duration * sequenceScale);
    const sampleRange = (range: readonly [number, number]) =>
      range[0] + Math.round(Math.random() * (range[1] - range[0]));
    const blinkScale = slowBlink ? blinkProfile.slowBlinkScale : 1;
    const closeDuration = Math.round(sampleRange(blinkProfile.closeMs) * blinkScale);
    const halfCloseHold = Math.round(blinkProfile.halfCloseHoldMs * blinkScale);
    const closeBlend = Math.round(blinkProfile.closeBlendMs * blinkScale);
    const closedHold = Math.round(sampleRange(blinkProfile.closedHoldMs) * blinkScale);
    const openBlend = Math.round(blinkProfile.openBlendMs * blinkScale);
    const halfOpenHold = Math.round(blinkProfile.halfOpenHoldMs * blinkScale);
    const openDuration = Math.round(sampleRange(blinkProfile.openMs) * blinkScale);

    const animate = (
      value: Animated.Value,
      toValue: number,
      duration: number,
      easing: (value: number) => number,
    ) =>
      Animated.timing(value, {
        duration: scaled(duration),
        easing,
        toValue,
        useNativeDriver: USE_NATIVE_DRIVER,
      });

    const makeCycle = () =>
      hasHalfFrame
        ? Animated.sequence([
            animate(
              blinkHalfOpacity,
              1,
              closeDuration,
              Easing.in(Easing.quad),
            ),
            Animated.delay(scaled(halfCloseHold)),
            Animated.parallel([
              animate(
                blinkHalfOpacity,
                0,
                closeBlend,
                Easing.inOut(Easing.sin),
              ),
              animate(
                blinkClosedOpacity,
                1,
                closeBlend,
                Easing.inOut(Easing.sin),
              ),
            ]),
            Animated.delay(scaled(closedHold)),
            Animated.parallel([
              animate(
                blinkClosedOpacity,
                0,
                openBlend,
                Easing.inOut(Easing.sin),
              ),
              animate(
                blinkHalfOpacity,
                1,
                openBlend,
                Easing.inOut(Easing.sin),
              ),
            ]),
            Animated.delay(scaled(halfOpenHold)),
            animate(
              blinkHalfOpacity,
              0,
              openDuration,
              Easing.out(Easing.cubic),
            ),
          ])
        : Animated.sequence([
            animate(
              blinkClosedOpacity,
              1,
              closeDuration,
              Easing.in(Easing.quad),
            ),
            Animated.delay(scaled(closedHold)),
            animate(
              blinkClosedOpacity,
              0,
              openDuration,
              Easing.out(Easing.cubic),
            ),
          ]);

    const animation = doubleBlink
      ? Animated.sequence([
          makeCycle(),
          Animated.delay(scaled(sampleRange(blinkProfile.doubleBlinkGapMs))),
          makeCycle(),
        ])
      : makeCycle();

    blinkAnimation.current = animation;
    animation.start(({ finished }) => {
      if (finished) {
        blinkHalfOpacity.setValue(0);
        blinkClosedOpacity.setValue(0);
      }
      if (blinkAnimation.current === animation) blinkAnimation.current = null;
    });
  }, [
    appActive,
    blinkProfile,
    blinkClosedOpacity,
    blinkHalfOpacity,
    expressionOpacity,
    inspectionMode,
    motionFailedForPack,
    motionReadyForPack,
    motionPack,
    motionState,
    proceduralBlink,
    reduceMotion,
  ]);

  useEffect(() => {
    if (!motionReadyForPack || !pendingBlink.current) return;
    const queuedBlink = pendingBlink.current;
    pendingBlink.current = null;
    runBlink(queuedBlink.sequenceScale, queuedBlink.interruptExpression);
  }, [motionReadyForPack, runBlink]);

  const runProceduralHalfBlink = useCallback((durationMs = 900) => {
    if (!appActive || !rig25d?.eyes || motionPack?.states.blinkHalf) return;
    proceduralBlink.stopAnimation();
    proceduralBlink.setValue(0);
    Animated.sequence([
      Animated.timing(proceduralBlink, {
        duration: reduceMotion ? 0 : 180,
        easing: Easing.out(Easing.cubic),
        toValue: 0.52,
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
      Animated.delay(reduceMotion ? 0 : durationMs),
      Animated.timing(proceduralBlink, {
        duration: reduceMotion ? 0 : 240,
        easing: Easing.inOut(Easing.sin),
        toValue: 0,
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
    ]).start();
  }, [appActive, motionPack, proceduralBlink, reduceMotion, rig25d]);

  const runAttention = useCallback((sequenceScale = 1) => {
    if (!appActive) return;
    attentionAnimation.current?.stop();
    presence.stopAnimation();
    presence.setValue(0);

    if (reduceMotion) return;

    if (Math.random() < lifeProfileRef.current.attentionBlinkChance) {
      runBlink(lifeProfileRef.current.attentionBlinkScale, false);
    }

    const speed = Math.max(
      0.45,
      sequenceScale * lifeProfileRef.current.attentionTempo,
    );
    const acquire = motionProfile.attentionAcquireMs * speed;
    const hold = motionProfile.attentionHoldMs * speed;
    const release = motionProfile.attentionReleaseMs * speed;
    const totalDuration = acquire + hold + release + 430 * speed;

    if (motionPack?.states.attention) {
      showExpression("attention", totalDuration);
    }

    const animation = Animated.sequence([
      Animated.timing(presence, {
        duration: 85 * speed,
        easing: Easing.out(Easing.quad),
        toValue: -0.055,
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
      Animated.timing(presence, {
        duration: acquire * 0.72,
        easing: Easing.out(Easing.cubic),
        toValue: 0.82,
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
      Animated.timing(presence, {
        duration: acquire * 0.28,
        easing: Easing.inOut(Easing.sin),
        toValue: 1,
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
      Animated.delay(hold * 0.58),
      Animated.timing(presence, {
        duration: 105 * speed,
        easing: Easing.inOut(Easing.sin),
        toValue: 0.94,
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
      Animated.delay(70 * speed),
      Animated.timing(presence, {
        duration: 155 * speed,
        easing: Easing.inOut(Easing.sin),
        toValue: 1,
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
      Animated.delay(hold * 0.22),
      Animated.timing(presence, {
        duration: release * 0.56,
        easing: Easing.inOut(Easing.sin),
        toValue: 0.34,
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
      Animated.timing(presence, {
        duration: release * 0.44,
        easing: Easing.out(Easing.cubic),
        toValue: 0,
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
    ]);

    attentionAnimation.current = animation;
    animation.start(({ finished }) => {
      if (finished) presence.setValue(0);
      if (attentionAnimation.current === animation) {
        attentionAnimation.current = null;
      }
    });
  }, [
    appActive,
    motionPack,
    motionProfile,
    presence,
    reduceMotion,
    runBlink,
    showExpression,
  ]);

  useEffect(() => {
    if (!appActive || !motionCommand) return;

    if (motionCommand.state === "idle") {
      if (expressionTimer.current) {
        clearTimeout(expressionTimer.current);
        expressionTimer.current = null;
      }
      expressionOpacity.stopAnimation();
      expressionOpacity.setValue(0);
      blinkAnimation.current?.stop();
      blinkHalfOpacity.stopAnimation();
      blinkClosedOpacity.stopAnimation();
      proceduralBlink.stopAnimation();
      blinkHalfOpacity.setValue(0);
      blinkClosedOpacity.setValue(0);
      proceduralBlink.setValue(0);
      setMotionState("idle");
      return;
    }

    if (motionCommand.state === "blink") {
      runBlink(motionCommand.sequenceScale ?? 1);
      return;
    }

    if (
      motionCommand.state === "blinkHalf" &&
      !motionPack?.states.blinkHalf &&
      rig25d?.eyes
    ) {
      runProceduralHalfBlink(motionCommand.durationMs ?? 900);
      return;
    }

    if (motionCommand.state === "attention") {
      runAttention(motionCommand.sequenceScale ?? 1);
      return;
    }

    if (motionPack?.states[motionCommand.state]) {
      showExpression(
        motionCommand.state,
        motionCommand.durationMs ??
          (motionCommand.state === "happy" ? 920 : 760),
      );
    }
  }, [
    appActive,
    expressionOpacity,
    blinkClosedOpacity,
    blinkHalfOpacity,
    motionCommand,
    motionPack,
    runAttention,
    runBlink,
    runProceduralHalfBlink,
    proceduralBlink,
    rig25d,
    showExpression,
  ]);

  useEffect(
    () => () => {
      if (expressionTimer.current) clearTimeout(expressionTimer.current);
      attentionAnimation.current?.stop();
      blinkAnimation.current?.stop();
      proceduralBlink.stopAnimation();
    },
    [proceduralBlink],
  );

  useEffect(() => {
    if (
      !appActive ||
      reduceMotion ||
      inspectionMode ||
      !motionPack?.states.blink
    ) return;
    let active = true;
    let blinkTimer: ReturnType<typeof setTimeout> | undefined;
    const [minimum, maximum] = motionPack.behavior?.blinkEveryMs ?? [4200, 7200];
    const scheduleBlink = () => {
      const delay = minimum + Math.round(Math.random() * (maximum - minimum));
      blinkTimer = setTimeout(() => {
        if (!active) return;
        runBlink(1, false);
        scheduleBlink();
      }, delay);
    };

    scheduleBlink();
    return () => {
      active = false;
      if (blinkTimer) clearTimeout(blinkTimer);
    };
  }, [appActive, inspectionMode, motionPack, reduceMotion, rig25d, runBlink]);

  useEffect(() => {
    if (!appActive || reduceMotion || inspectionMode) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const scheduleAttention = () => {
      timer = setTimeout(() => {
        if (!active) return;
        runAttention();
        if (active) scheduleAttention();
      }, motionProfile.attentionDelay + lifeProfile.attentionDelayJitterMs[0] + Math.round(
        Math.random() *
          (lifeProfile.attentionDelayJitterMs[1] -
            lifeProfile.attentionDelayJitterMs[0]),
      ));
    };

    scheduleAttention();
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [
    appActive,
    inspectionMode,
    lifeProfile,
    motionProfile.attentionDelay,
    reduceMotion,
    runAttention,
  ]);

  useEffect(() => {
    entrance.setValue(reduceMotion || inspectionMode ? 1 : 0);
    Animated.timing(entrance, {
      duration: reduceMotion || inspectionMode ? 0 : 520,
      easing: Easing.out(Easing.cubic),
      toValue: 1,
      useNativeDriver: USE_NATIVE_DRIVER,
    }).start();
  }, [entrance, inspectionMode, petKey, reduceMotion]);

  const runReaction = useCallback((kind: PetInteractionKind = "body") => {
    if (!appActive) return;
    const gate = acquirePetInteractionGate({
      kind,
      lockedUntil: interactionLockedUntil.current,
      now: Date.now(),
      touchCooldownMs: lifeProfileRef.current.touchCooldownMs,
    });
    interactionLockedUntil.current = gate.lockedUntil;
    if (!gate.accepted) return;

    if (kind !== "care") {
      touchFeedback.stopAnimation();
      touchFeedback.setValue(0);
      const hapticStyle =
        lifeProfileRef.current.touchHaptic === "light"
          ? Haptics.ImpactFeedbackStyle.Light
          : Haptics.ImpactFeedbackStyle.Soft;
      void Haptics.impactAsync(hapticStyle).catch(
        () => undefined,
      );
    } else {
      showExpression("happy", motionPack?.behavior?.happyHoldMs ?? 1250);
    }

    if (kind !== "care") {
      // Touch feedback lives on a separate icon plane. The primary pet artwork
      // is never stopped or transformed by a tap, so repeated touches cannot
      // leave the face on a subpixel-rasterized native layer.
      Animated.sequence([
        Animated.timing(touchFeedback, {
          duration: reduceMotion ? 0 : 150,
          easing: Easing.out(Easing.cubic),
          toValue: 1,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.delay(reduceMotion ? 0 : 120),
        Animated.timing(touchFeedback, {
          duration: reduceMotion ? 0 : 280,
          easing: Easing.inOut(Easing.sin),
          toValue: 2,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ]).start(({ finished }) => {
        if (finished) touchFeedback.setValue(0);
      });
    }
  }, [
    appActive,
    motionPack,
    reduceMotion,
    showExpression,
    touchFeedback,
  ]);

  useEffect(() => {
    if (!appActive) {
      lastReactionToken.current = reactionToken;
      return;
    }
    if (reactionToken === lastReactionToken.current) return;
    lastReactionToken.current = reactionToken;
    runReaction("care");
  }, [appActive, reactionToken, runReaction]);

  useEffect(() => {
    if (!appActive || !interactionCommand) return;
    if (interactionCommand.id === lastInteractionCommandId.current) return;
    lastInteractionCommandId.current = interactionCommand.id;
    runReaction(interactionCommand.kind);
  }, [appActive, interactionCommand, runReaction]);

  const geometry = useMemo(() => {
    const petReferenceWidth = Math.min(width, 420);
    const framing = resolvePetSubjectFraming(resolvedPetKey);
    const targetSubjectHeight = petReferenceWidth * 0.82;
    const naturalPetHeight = motionPack
      ? targetSubjectHeight / framing.subjectHeight
      : 0;
    const naturalPetWidth = motionPack
      ? naturalPetHeight *
        (motionPack.canvas.width / motionPack.canvas.height)
      : 0;
    const motionWidthScale = motionPack
      ? Math.min(1, (petReferenceWidth * 0.86) / naturalPetWidth)
      : 1;
    const petWidth = motionPack
      ? naturalPetWidth * motionWidthScale
      : Math.min(
          petReferenceWidth * layout.maxWidth * layout.scale,
          petReferenceWidth * 0.72,
        );
    const petHeight = motionPack
      ? naturalPetHeight * motionWidthScale
      : petWidth * (hasLayeredPet ? 1.42 : 1.72);
    const feetY = HERO_FLOOR_Y * (layout.feetY / 0.81);
    const sourceFeetY = motionPack ? framing.feetY : 1;
    const sourceCenterX = motionPack ? framing.centerX : 0.5;
    return {
      height: petHeight,
      left: width * layout.anchorX - petWidth * sourceCenterX,
      top: feetY - petHeight * sourceFeetY,
      width: petWidth,
    };
  }, [hasLayeredPet, layout, motionPack, resolvedPetKey, width]);

  const lunaHeadMotion = Animated.add(
    Animated.multiply(lunaHeadLife, rig25d?.motion.headLife ?? 0.64),
    Animated.multiply(
      presence,
      motionProfile.attentionDirection *
        (rig25d?.motion.attention ?? 1) *
        1.42,
    ),
  );
  const lunaTagMotion = Animated.add(
    Animated.multiply(sway, 0.22),
    Animated.multiply(presence, motionProfile.attentionDirection * 0.82),
  );
  const getRigClipGeometry = (region: PetRig25DRegion) => ({
    borderRadius: geometry.width * region.width * 0.5,
    height: geometry.height * region.height,
    left: geometry.width * region.x,
    top: geometry.height * region.y,
    width: geometry.width * region.width,
  });
  const getRigLayerGeometry = (region: PetRig25DRegion) => ({
    height: geometry.height,
    left: -geometry.width * region.x,
    position: "absolute" as const,
    top: -geometry.height * region.y,
    width: geometry.width,
  });
  const getInteractionGeometry = (
    region: PetRig25DRegion,
    horizontalPadding: number,
    verticalPadding: number,
  ) => {
    const x = Math.max(0, region.x - horizontalPadding);
    const y = Math.max(0, region.y - verticalPadding);
    const width = Math.min(1 - x, region.width + horizontalPadding * 2);
    const height = Math.min(1 - y, region.height + verticalPadding * 2);
    return {
      height: geometry.height * height,
      left: geometry.left + geometry.width * x,
      top: geometry.top + geometry.height * y,
      width: geometry.width * width,
    };
  };
  const bodyHitGeometry = getInteractionGeometry(
    rig25d?.chest ?? { x: 0.16, y: 0.34, width: 0.68, height: 0.58 },
    0.07,
    0.05,
  );
  const headHitGeometry = getInteractionGeometry(
    rig25d?.head ?? { x: 0.18, y: 0.08, width: 0.64, height: 0.36 },
    0.05,
    0.04,
  );
  const renderExpressionLayer = (
    state: PetMotionState,
    opacity: Animated.Value | ReturnType<typeof Animated.multiply>,
    origin: Pick<PetRig25DRegion, "x" | "y"> = { x: 0, y: 0 },
  ) => {
    const source = motionPack?.states[state];
    if (!source) return null;
    const overlay = motionPack?.rig?.overlays?.[state];
    const fallbackRegion = {
      x: 0.22,
      y: 0.285,
      height: 0.075,
      width: 0.56,
    };
    // One parent opacity is the atomic expression plane for both eyes. The two
    // clips are static children, so iOS cannot commit one blinking eye a frame
    // before the other while each authored eye still keeps a tight soft edge.
    const regions = overlay?.regions ?? [overlay?.region ?? fallbackRegion];
    const registration = overlay?.registration;

    return (
      <Animated.View
        pointerEvents="none"
        style={[
          styles.expressionPlane,
          {
            height: geometry.height,
            left: -geometry.width * origin.x,
            opacity,
            top: -geometry.height * origin.y,
            width: geometry.width,
            zIndex: 999,
          },
        ]}
      >
        {regions.map((region, index) => (
          <View
            key={`${state}-eye-${index}`}
            style={[
              styles.expressionClip,
              {
                borderRadius: geometry.height * region.height * 0.5,
                height: geometry.height * region.height,
                left: geometry.width * region.x,
                top: geometry.height * region.y,
                width: geometry.width * region.width,
              },
            ]}
          >
            <Image
              onError={() =>
                (state === "blinkHalf" || state === "blink") &&
                handleMotionAssetReady(
                  activeMotionPackKey,
                  state,
                  index,
                  false,
                )
              }
              onLoad={() =>
                (state === "blinkHalf" || state === "blink") &&
                handleMotionAssetReady(
                  activeMotionPackKey,
                  state,
                  index,
                  true,
                )
              }
              resizeMode="contain"
              source={source}
              style={{
                height: geometry.height,
                left:
                  -geometry.width * region.x +
                  geometry.width * (registration?.translateX ?? 0),
                position: "absolute",
                top:
                  -geometry.height * region.y +
                  geometry.height * (registration?.translateY ?? 0),
                transform: [
                  { scaleX: registration?.scaleX ?? 1 },
                  { scaleY: registration?.scaleY ?? 1 },
                ],
                width: geometry.width,
              }}
            />
          </View>
        ))}
      </Animated.View>
    );
  };

  const attentiveBreath = Animated.multiply(
    breathe,
    presence.interpolate({
      inputRange: [-0.055, 0, 1],
      outputRange: [1, 1, motionProfile.breathDamping],
    }),
  );
  const attentiveSway = Animated.multiply(
    sway,
    presence.interpolate({
      inputRange: [-0.055, 0, 1],
      outputRange: [1, 1, motionProfile.swayDamping],
    }),
  );

  const sharedMotion = {
    opacity: entrance.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }),
    transform: [
      {
        translateX: Animated.add(
          attentiveSway.interpolate({
            inputRange: [-1, 0, 1],
            outputRange: [
              isLunaRig ? -0.08 : -motionProfile.swayDistance,
              0,
              isLunaRig ? 0.08 : motionProfile.swayDistance,
            ],
          }),
          presence.interpolate({
            inputRange: [-0.055, 0, 1],
            outputRange: [
              isLunaRig ? 0 : -motionProfile.attentionShift * 0.08,
              0,
              isLunaRig ? 0 : motionProfile.attentionShift,
            ],
          }),
        ),
      },
      {
        translateY: Animated.add(
          attentiveBreath.interpolate({
            inputRange: [0, 1],
            outputRange: [0, isLunaRig ? 0 : -0.8],
          }),
          Animated.add(
            presence.interpolate({
              inputRange: [-0.055, 0, 1],
              outputRange: [
                isLunaRig ? 0 : 0.24,
                0,
                isLunaRig ? 0 : -motionProfile.attentionLift,
              ],
            }),
            entrance.interpolate({ inputRange: [0, 1], outputRange: [5, 0] }),
          ),
        ),
      },
      {
        scale: Animated.multiply(
          attentiveBreath.interpolate({
            inputRange: [0, 1],
            outputRange: [1, isLunaRig ? 1 : 1.004],
          }),
          Animated.multiply(
            presence.interpolate({
              inputRange: [-0.055, 0, 1],
              outputRange: [
                isLunaRig ? 1 : 0.9997,
                1,
                isLunaRig ? 1 : motionProfile.attentionScale,
              ],
            }),
            entrance.interpolate({ inputRange: [0, 1], outputRange: [0.985, 1] }),
          ),
        ),
      },
      {
        rotate: presence.interpolate({
          inputRange: [-0.055, 0, 0.82, 1],
          outputRange: [
            isLunaRig
              ? "0deg"
              : `${-motionProfile.attentionDirection * 0.06}deg`,
            "0deg",
            isLunaRig
              ? "0deg"
              : `${motionProfile.attentionDirection * motionProfile.attentionTilt * 0.72}deg`,
            isLunaRig
              ? "0deg"
              : `${motionProfile.attentionDirection * motionProfile.attentionTilt}deg`,
          ],
        }),
      },
    ],
  };

  return (
    <View
      onLayout={({ nativeEvent }) => {
        const nextWidth = Math.round(nativeEvent.layout.width);
        setMeasuredWidth((current) =>
          current === nextWidth ? current : nextWidth,
        );
      }}
      style={styles.root}
      pointerEvents="box-none"
    >
      {!hasLayeredPet ? (
        <Animated.Image
          resizeMode="cover"
          source={motionStageSource}
          style={[styles.scene, sharedMotion]}
        />
      ) : motionPack ? (
        <>
          <Image
            resizeMode="cover"
            source={motionStageSource}
            style={styles.scene}
          />
          {isLunaRig && rig25d && (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.lunaShadowPlane,
                {
                  height: Math.max(10, geometry.height * rig25d.shadow.height),
                  left: geometry.left + geometry.width * rig25d.shadow.x,
                  opacity: entrance.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 0.96],
                  }),
                  top:
                    geometry.top +
                    geometry.height * motionPack.canvas.feetY -
                    Math.max(5, geometry.height * rig25d.shadow.overlap),
                  transform: [
                    {
                      scaleX: entrance.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.96, 1],
                      }),
                    },
                  ],
                  width: geometry.width * rig25d.shadow.width,
                },
              ]}
            >
              <View style={styles.lunaShadowPenumbra} />
              <View style={styles.lunaShadowUmbra} />
              <View style={styles.lunaBodyContact} />
              {rig25d.shadow.pawContacts.map((contact, index) => (
                <View
                  key={`${rig25d.id}-paw-${index}`}
                  style={[
                    styles.lunaPawContact,
                    {
                      left: `${contact.x * 100}%`,
                      width: `${contact.width * 100}%`,
                    },
                  ]}
                />
              ))}
            </Animated.View>
          )}
          <Animated.View
            style={[
              styles.cutout,
              geometry,
              sharedMotion,
              {
                transform: [
                  ...sharedMotion.transform,
                  {
                    translateY: entrance.interpolate({
                      inputRange: [0, 1],
                      outputRange: [8, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <Image
              resizeMode="contain"
              source={motionIdleSource}
              style={styles.layeredFrame}
            />
            {renderSegmentedRig && rig25d && (
              <>
                <Animated.View
                  pointerEvents="none"
                  style={[
                    styles.lunaRigClip,
                    {
                      ...getRigClipGeometry(rig25d.head),
                      // Rigs without separate ear planes render expressions inside
                      // this head plane, so it must sit above the base cutout.
                      zIndex:
                        !rig25d.leftEar && !rig25d.rightEar ? 999 : undefined,
                      transform: [
                        { perspective: 900 },
                        {
                          translateX: lunaHeadMotion.interpolate({
                            inputRange: [-1, 0, 1],
                            outputRange: [
                              -rig25d.motion.headTranslateX,
                              0,
                              rig25d.motion.headTranslateX,
                            ],
                          }),
                        },
                        {
                          translateY: lunaHeadMotion.interpolate({
                            inputRange: [-1, 0, 1],
                            outputRange: [
                              rig25d.motion.headTranslateY * 0.6,
                              0,
                              -rig25d.motion.headTranslateY,
                            ],
                          }),
                        },
                        {
                          rotateY: lunaHeadMotion.interpolate({
                            inputRange: [-1, 0, 1],
                            outputRange: [
                              `${-rig25d.motion.headYawDeg}deg`,
                              "0deg",
                              `${rig25d.motion.headYawDeg}deg`,
                            ],
                          }),
                        },
                        {
                          rotate: lunaHeadMotion.interpolate({
                            inputRange: [-1, 0, 1],
                            outputRange: [
                              `${-rig25d.motion.headRotateDeg}deg`,
                              "0deg",
                              `${rig25d.motion.headRotateDeg}deg`,
                            ],
                          }),
                        },
                        {
                          scale: lunaHeadMotion.interpolate({
                            inputRange: [-1, 0, 1],
                            outputRange: [
                              1 + (rig25d.motion.headScale - 1) * 0.4,
                              1,
                              rig25d.motion.headScale,
                            ],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <Image
                    resizeMode="contain"
                    source={motionIdleSource}
                    style={getRigLayerGeometry(rig25d.head)}
                  />
                  {!rig25d.leftEar && !rig25d.rightEar && (
                    <>
                      {motionExpressionState &&
                        renderExpressionLayer(
                          motionExpressionState,
                          expressionOpacity,
                          rig25d.head,
                        )}
                      {renderExpressionLayer(
                        "blinkHalf",
                        blinkHalfCompositeOpacity,
                        rig25d.head,
                      )}
                      {renderExpressionLayer(
                        "blink",
                        blinkClosedOpacity,
                        rig25d.head,
                      )}
                    </>
                  )}
                </Animated.View>

                {rig25d.leftEar && <Animated.View
                  pointerEvents="none"
                  style={[
                    styles.lunaRigClip,
                    {
                      ...getRigClipGeometry(rig25d.leftEar),
                      transform: [
                        {
                          translateX: lunaHeadMotion.interpolate({
                            inputRange: [-1, 0, 1],
                            outputRange: [-1.15, 0, 1.15],
                          }),
                        },
                        {
                          translateY: lunaHeadMotion.interpolate({
                            inputRange: [-1, 0, 1],
                            outputRange: [0.52, 0, -0.86],
                          }),
                        },
                        {
                          rotate: lunaHeadMotion.interpolate({
                            inputRange: [-1, 0, 1],
                            outputRange: ["-0.58deg", "0deg", "0.58deg"],
                          }),
                        },
                        {
                          rotate: lunaLeftEar.interpolate({
                            inputRange: [-0.2, 0, 1],
                            outputRange: [
                              `${rig25d.motion.earTwitchDeg * 0.14}deg`,
                              "0deg",
                              `${-rig25d.motion.earTwitchDeg}deg`,
                            ],
                          }),
                        },
                        {
                          translateY: lunaLeftEar.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, 0.88],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <Image
                    resizeMode="contain"
                    source={motionIdleSource}
                    style={getRigLayerGeometry(rig25d.leftEar)}
                  />
                </Animated.View>}

                {rig25d.rightEar && <Animated.View
                  pointerEvents="none"
                  style={[
                    styles.lunaRigClip,
                    {
                      ...getRigClipGeometry(rig25d.rightEar),
                      transform: [
                        {
                          translateX: lunaHeadMotion.interpolate({
                            inputRange: [-1, 0, 1],
                            outputRange: [-1.15, 0, 1.15],
                          }),
                        },
                        {
                          translateY: lunaHeadMotion.interpolate({
                            inputRange: [-1, 0, 1],
                            outputRange: [0.52, 0, -0.86],
                          }),
                        },
                        {
                          rotate: lunaHeadMotion.interpolate({
                            inputRange: [-1, 0, 1],
                            outputRange: ["-0.58deg", "0deg", "0.58deg"],
                          }),
                        },
                        {
                          rotate: lunaRightEar.interpolate({
                            inputRange: [-0.2, 0, 1],
                            outputRange: [
                              `${-rig25d.motion.earTwitchDeg * 0.14}deg`,
                              "0deg",
                              `${rig25d.motion.earTwitchDeg}deg`,
                            ],
                          }),
                        },
                        {
                          translateY: lunaRightEar.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, 0.88],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <Image
                    resizeMode="contain"
                    source={motionIdleSource}
                    style={getRigLayerGeometry(rig25d.rightEar)}
                  />
                </Animated.View>}

                <Animated.View
                  pointerEvents="none"
                  style={[
                    styles.lunaRigClip,
                    {
                      ...getRigClipGeometry(rig25d.chest),
                      transform: [
                        {
                          scaleX: breathe.interpolate({
                            inputRange: [0, 1],
                            outputRange: [1, rig25d.motion.chestScaleX],
                          }),
                        },
                        {
                          scaleY: breathe.interpolate({
                            inputRange: [0, 1],
                            outputRange: [1, rig25d.motion.chestScaleY],
                          }),
                        },
                        {
                          translateY: breathe.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, -rig25d.motion.chestLift],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <Image
                    resizeMode="contain"
                    source={motionIdleSource}
                    style={getRigLayerGeometry(rig25d.chest)}
                  />
                </Animated.View>

                {rig25d.tag && <Animated.View
                  pointerEvents="none"
                  style={[
                    styles.lunaRigClip,
                    {
                      ...getRigClipGeometry(rig25d.tag),
                      transform: [
                        {
                          rotate: lunaTagMotion.interpolate({
                            inputRange: [-1.5, 0, 1.5],
                            outputRange: [
                              `${-rig25d.motion.tagSwingDeg}deg`,
                              "0deg",
                              `${rig25d.motion.tagSwingDeg}deg`,
                            ],
                          }),
                        },
                        {
                          translateX: lunaTagMotion.interpolate({
                            inputRange: [-1.5, 0, 1.5],
                            outputRange: [-0.82, 0, 0.82],
                          }),
                        },
                        {
                          translateY: lunaTagMotion.interpolate({
                            inputRange: [-1.5, 0, 1.5],
                            outputRange: [0.24, 0, 0.24],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <Image
                    resizeMode="contain"
                    source={motionIdleSource}
                    style={getRigLayerGeometry(rig25d.tag)}
                  />
                </Animated.View>}

                {rig25d.engraving && petName.trim() && (
                  <Animated.View
                    pointerEvents="none"
                    style={[
                      styles.engraving,
                      {
                        ...getRigClipGeometry(rig25d.engraving),
                        transform: [
                          {
                            rotate: lunaTagMotion.interpolate({
                              inputRange: [-1.5, 0, 1.5],
                              outputRange: ["-0.8deg", "0deg", "0.8deg"],
                            }),
                          },
                          {
                            translateX: lunaTagMotion.interpolate({
                              inputRange: [-1.5, 0, 1.5],
                              outputRange: [-0.3, 0, 0.3],
                            }),
                          },
                        ],
                      },
                    ]}
                  >
                    <Text
                      adjustsFontSizeToFit
                      minimumFontScale={0.48}
                      numberOfLines={1}
                      style={[
                        styles.engravingText,
                        {
                          fontSize: Math.max(
                            3,
                            Math.min(
                              8,
                              (geometry.width *
                                rig25d.engraving.width *
                                0.9) /
                                (Math.max(
                                  3,
                                  petName.trim().slice(0, 12).length,
                                ) *
                                  0.62),
                            ),
                          ),
                          letterSpacing:
                            petName.trim().slice(0, 12).length > 8
                              ? -0.5
                              : -0.25,
                        },
                      ]}
                    >
                      {petName.trim().slice(0, 12).toUpperCase()}
                    </Text>
                  </Animated.View>
                )}

                {(rig25d.leftEar || rig25d.rightEar) && (
                  <Animated.View
                    pointerEvents="none"
                    style={[
                      styles.lunaRigClip,
                      {
                        ...getRigClipGeometry(rig25d.head),
                        // Keep the expression plane above the separately composited
                        // head and ear planes. Without an explicit stack order,
                        // coplanar 2.5D layers can z-fight on web and hide blinks.
                        zIndex: 999,
                        transform: [
                          { perspective: 900 },
                          {
                            translateX: lunaHeadMotion.interpolate({
                              inputRange: [-1, 0, 1],
                              outputRange: [
                                -rig25d.motion.headTranslateX,
                                0,
                                rig25d.motion.headTranslateX,
                              ],
                            }),
                          },
                          {
                            translateY: lunaHeadMotion.interpolate({
                              inputRange: [-1, 0, 1],
                              outputRange: [
                                rig25d.motion.headTranslateY * 0.6,
                                0,
                                -rig25d.motion.headTranslateY,
                              ],
                            }),
                          },
                          {
                            rotateY: lunaHeadMotion.interpolate({
                              inputRange: [-1, 0, 1],
                              outputRange: [
                                `${-rig25d.motion.headYawDeg}deg`,
                                "0deg",
                                `${rig25d.motion.headYawDeg}deg`,
                              ],
                            }),
                          },
                          {
                            rotate: lunaHeadMotion.interpolate({
                              inputRange: [-1, 0, 1],
                              outputRange: [
                                `${-rig25d.motion.headRotateDeg}deg`,
                                "0deg",
                                `${rig25d.motion.headRotateDeg}deg`,
                              ],
                            }),
                          },
                          {
                            scale: lunaHeadMotion.interpolate({
                              inputRange: [-1, 0, 1],
                              outputRange: [
                                1 + (rig25d.motion.headScale - 1) * 0.4,
                                1,
                                rig25d.motion.headScale,
                              ],
                            }),
                          },
                        ],
                      },
                    ]}
                  >
                    {motionExpressionState &&
                      renderExpressionLayer(
                        motionExpressionState,
                        expressionOpacity,
                        rig25d.head,
                      )}
                    {renderExpressionLayer(
                      "blinkHalf",
                      blinkHalfCompositeOpacity,
                      rig25d.head,
                    )}
                    {renderExpressionLayer(
                      "blink",
                      blinkClosedOpacity,
                      rig25d.head,
                    )}
                  </Animated.View>
                )}
              </>
            )}
            {!renderSegmentedRig && motionExpressionState &&
              renderExpressionLayer(motionExpressionState, expressionOpacity)}
            {!renderSegmentedRig &&
              renderExpressionLayer("blinkHalf", blinkHalfCompositeOpacity)}
            {!renderSegmentedRig &&
              renderExpressionLayer("blink", blinkClosedOpacity)}
          </Animated.View>
        </>
      ) : (
        <>
          <Image
            resizeMode="cover"
            source={motionStageSource}
            style={styles.scene}
          />
          <Animated.Image
            resizeMode="contain"
            source={motionIdleSource}
            style={[
              styles.cutout,
              geometry,
              sharedMotion,
              {
                transform: [
                  ...sharedMotion.transform,
                  {
                    translateY: entrance.interpolate({
                      inputRange: [0, 1],
                      outputRange: [8, 0],
                    }),
                  },
                ],
              },
            ]}
          />
        </>
      )}

      <Animated.View
        pointerEvents="none"
        style={[
          styles.touchResponse,
          {
            left: geometry.left + geometry.width * 0.57,
            opacity: touchFeedback.interpolate({
              inputRange: [0, 0.18, 1, 2],
              outputRange: [0, 1, 1, 0],
            }),
            top: Math.max(78, geometry.top + geometry.height * 0.08),
            transform: [
              {
                translateY: touchFeedback.interpolate({
                  inputRange: [0, 2],
                  outputRange: [8, -24],
                }),
              },
              {
                scale: touchFeedback.interpolate({
                  inputRange: [0, 0.45, 2],
                  outputRange: [0.72, 1.05, 0.9],
                }),
              },
            ],
          },
        ]}
      >
        <View style={styles.touchBubblePrimary}>
          <Ionicons color="#E66F51" name="heart" size={17} />
        </View>
        <View style={styles.touchBubbleSecondary}>
          <Ionicons color="#489184" name="paw" size={13} />
        </View>
      </Animated.View>

      <Pressable
        accessibilityHint="Gives your pet a gentle pat"
        accessibilityLabel={`Pet ${petName}`}
        accessibilityRole="button"
        onPress={() => runReaction("body")}
        style={[styles.hitTarget, bodyHitGeometry]}
      />
      <Pressable
        accessibilityHint="Gets your pet's attention"
        accessibilityLabel={`Scratch ${petName}'s head`}
        accessibilityRole="button"
        onPress={() => runReaction("head")}
        style={[styles.headHitTarget, headHitGeometry]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  engraving: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    position: "absolute",
    zIndex: 8,
  },
  engravingText: {
    color: "rgba(63, 45, 26, 0.82)",
    fontFamily: "Nunito_800ExtraBold",
    letterSpacing: -0.25,
    textAlign: "center",
    textShadowColor: "rgba(255, 235, 184, 0.38)",
    textShadowOffset: { height: 0.35, width: 0 },
    textShadowRadius: 0.5,
  },
  lunaBodyContact: {
    backgroundColor: "rgba(52, 34, 21, 0.24)",
    borderRadius: 999,
    height: 5,
    left: "5%",
    position: "absolute",
    shadowColor: "#342116",
    shadowOffset: { height: 0.5, width: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 3,
    top: 1,
    width: "90%",
  },
  lunaPawContact: {
    backgroundColor: "rgba(50, 32, 20, 0.36)",
    borderRadius: 999,
    height: 4,
    position: "absolute",
    shadowColor: "#342116",
    shadowOffset: { height: 1, width: 0.5 },
    shadowOpacity: 0.24,
    shadowRadius: 2.2,
    top: 1,
  },
  lunaShadowPenumbra: {
    backgroundColor: "rgba(91, 58, 35, 0.065)",
    borderRadius: 999,
    bottom: 0,
    height: "60%",
    left: "6%",
    position: "absolute",
    shadowColor: "#6b452a",
    shadowOffset: { height: 2, width: 4 },
    shadowOpacity: 0.13,
    shadowRadius: 8,
    transform: [{ rotate: "-1.2deg" }, { translateX: 2 }],
    width: "92%",
  },
  lunaShadowPlane: {
    position: "absolute",
    zIndex: 0,
  },
  lunaShadowUmbra: {
    backgroundColor: "rgba(66, 43, 28, 0.18)",
    borderRadius: 999,
    height: "48%",
    left: "8%",
    position: "absolute",
    shadowColor: "#40291b",
    shadowOffset: { height: 1, width: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    top: 2,
    transform: [{ translateX: 1 }],
    width: "84%",
  },
  lunaRigClip: {
    overflow: "hidden",
    position: "absolute",
  },
  cutout: { position: "absolute" },
  expressionClip: {
    overflow: "hidden",
    position: "absolute",
  },
  expressionPlane: {
    position: "absolute",
  },
  hitTarget: {
    position: "absolute",
    zIndex: 5,
  },
  layeredFrame: {
    height: "100%",
    left: 0,
    position: "absolute",
    top: 0,
    width: "100%",
  },
  headHitTarget: {
    position: "absolute",
    zIndex: 6,
  },
  touchBubblePrimary: {
    alignItems: "center",
    backgroundColor: "rgba(255,252,247,0.96)",
    borderColor: "rgba(255,255,255,0.92)",
    borderRadius: 19,
    borderWidth: 1,
    height: 38,
    justifyContent: "center",
    position: "absolute",
    right: 0,
    top: 0,
    width: 38,
  },
  touchBubbleSecondary: {
    alignItems: "center",
    backgroundColor: "rgba(255,252,247,0.92)",
    borderRadius: 15,
    height: 30,
    justifyContent: "center",
    left: 3,
    position: "absolute",
    top: 25,
    width: 30,
  },
  touchResponse: {
    height: 62,
    position: "absolute",
    width: 66,
    zIndex: 7,
  },
  root: StyleSheet.absoluteFill,
  scene: {
    height: "105%",
    left: 0,
    position: "absolute",
    top: -36,
    width: "100%",
  },
});
