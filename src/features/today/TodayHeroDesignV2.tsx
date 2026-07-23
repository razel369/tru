import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Image,
  type LayoutChangeEvent,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { MotionPressable } from "../../components/motion";
import type { BreedVisualProfile } from "../../types";
import { usePrefersReducedMotion } from "../accessibility/motion";
import { resolvePetMotionPackForProfile } from "../pet-motion";
import type { PetVisualLayout } from "../pet-visuals";

const LUNA_CUTOUT = require("../../../assets/pawpair-luna-cutout.png");
const PET_FIRST_ROOM = require("../../../assets/pawpair-luna-integrated-room-zoomed.png");

const DEFAULT_PET_LAYOUT: PetVisualLayout = {
  anchorX: 0.5,
  feetY: 0.8,
  maxWidth: 0.48,
  scale: 1,
};

const FALLBACK_SOURCE_FEET_Y: Partial<Record<BreedVisualProfile, number>> = {
  "cat-compact": 0.8,
  "cat-hairless": 0.79,
  "cat-longhair": 0.78,
  "cat-tall": 0.8,
  "dog-tall": 0.84,
  "dog-toy": 0.77,
};

function asImageSource(value: any) {
  if (!value) return undefined;
  return typeof value === "string" ? { uri: value } : value;
}

export function TodayHero(props: any) {
  const {
    petName = "Luna",
    petBreed = "British Shorthair",
    medication: suppliedMedication,
  } = props;

  const [localMedicationDone, setLocalMedicationDone] = useState(false);
  const [sceneSize, setSceneSize] = useState({ height: 844, width: 390 });
  const reduceMotion = usePrefersReducedMotion();
  const sceneBreath = useRef(new Animated.Value(0)).current;
  const sceneOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (reduceMotion) {
      sceneBreath.setValue(0);
      return;
    }
    const breathing = Animated.loop(
      Animated.sequence([
        Animated.timing(sceneBreath, {
          toValue: 1,
          duration: 5200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: Platform.OS !== "web",
        }),
        Animated.timing(sceneBreath, {
          toValue: 0,
          duration: 5200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: Platform.OS !== "web",
        }),
      ]),
    );
    breathing.start();
    return () => breathing.stop();
  }, [reduceMotion, sceneBreath]);

  useEffect(() => {
    if (reduceMotion) {
      sceneOpacity.setValue(1);
      return;
    }
    sceneOpacity.setValue(0.72);
    Animated.timing(sceneOpacity, {
      toValue: 1,
      duration: 360,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: Platform.OS !== "web",
    }).start();
  }, [petName, reduceMotion, sceneOpacity]);

  const suppliedPetSource = useMemo(
    () =>
      asImageSource(
        props.petCutout ??
          props.petPhoto ??
          props.petImage ??
          props.petAvatar ??
          props.photo ??
          props.pet?.photoUrl ??
          props.pet?.image
      ),
    [
      props.petCutout,
      props.petPhoto,
      props.petImage,
      props.petAvatar,
      props.photo,
      props.pet,
    ]
  );

  const petSource =
    petName.toLowerCase() === "luna" ? LUNA_CUTOUT : suppliedPetSource;
  const petLayout: PetVisualLayout = props.petLayout ?? DEFAULT_PET_LAYOUT;
  const petVisualProfile = props.petVisualProfile as
    | BreedVisualProfile
    | undefined;
  const petMotionPack = useMemo(
    () =>
      props.petKey && petVisualProfile
        ? resolvePetMotionPackForProfile(props.petKey, petVisualProfile)
        : null,
    [petVisualProfile, props.petKey],
  );
  const petGeometry = useMemo(() => {
    const stageWidth = Math.max(sceneSize.width, 320);
    const stageHeight = Math.max(sceneSize.height, 620);
    const profileWidth = stageWidth * petLayout.maxWidth * petLayout.scale;
    const petWidth = Math.min(
      stageWidth * 0.64,
      Math.max(stageWidth * 0.38, profileWidth),
    );
    const petHeight =
      petWidth *
      (petMotionPack
        ? petMotionPack.canvas.height / petMotionPack.canvas.width
        : 4 / 3);
    const floorBias = (petLayout.feetY - 0.8) * stageHeight * 0.2;
    const floorY =
      Math.min(stageHeight - 270, stageHeight * 0.7) + floorBias;
    const sourceFeetY =
      petMotionPack?.canvas.feetY ??
      (petVisualProfile
        ? FALLBACK_SOURCE_FEET_Y[petVisualProfile]
        : undefined) ??
      0.82;
    const centerX = stageWidth * petLayout.anchorX;

    return {
      pet: {
        height: petHeight,
        left: centerX - petWidth / 2,
        top: floorY - petHeight * sourceFeetY,
        width: petWidth,
      },
      shadow: {
        height: Math.max(16, petWidth * 0.085),
        left: centerX - petWidth * 0.39,
        top: floorY - Math.max(7, petWidth * 0.035),
        width: petWidth * 0.78,
      },
    };
  }, [
    petLayout.anchorX,
    petLayout.feetY,
    petLayout.maxWidth,
    petLayout.scale,
    petMotionPack,
    petVisualProfile,
    sceneSize.height,
    sceneSize.width,
  ]);

  const handleSceneLayout = (event: LayoutChangeEvent) => {
    const { height, width } = event.nativeEvent.layout;
    setSceneSize((current) =>
      Math.abs(current.height - height) < 0.5 &&
      Math.abs(current.width - width) < 0.5
        ? current
        : { height, width },
    );
  };

  const scheduledDose =
    props.schedule?.find(
      (dose: any) =>
        dose.status === "due" ||
        dose.status === "missed" ||
        dose.status === "upcoming",
    ) ?? props.schedule?.[0];
  const medication = suppliedMedication ?? scheduledDose?.medication;
  const scheduledDoseDone = scheduledDose?.status === "given";

  const medicationDone =
    props.medicationDone ??
    props.isMedicationDone ??
    medication?.completed ??
    (scheduledDoseDone || localMedicationDone);

  useEffect(() => {
    setLocalMedicationDone(false);
  }, [petName, scheduledDose?.id]);

  const medicationName =
    props.medicationName ?? medication?.name ?? medication?.title ?? "Thyronorm";
  const medicationTime =
    props.medicationTime ?? scheduledDose?.scheduledTime ?? medication?.time ?? "7:30 AM";
  const medicationDose =
    props.medicationDose ?? medication?.dosage ?? medication?.dose ?? "0.5 ml";

  const giveMedication = () => {
    if (typeof props.onLog === "function" && scheduledDose) {
      setLocalMedicationDone(true);
      props.onLog(scheduledDose, "given");
      return;
    }
    const handler =
      props.onGiveMedication ??
      props.onMedicationGiven ??
      props.onMedicationPress ??
      props.onCompleteMedication;

    setLocalMedicationDone(true);
    if (typeof handler === "function") handler(medication);
  };

  const sceneScale = sceneBreath.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.006],
  });
  const sceneY = sceneBreath.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -1.5],
  });

  return (
    <View style={styles.root}>
      <View
        style={styles.scene}
        accessibilityLabel={petName + " at home"}
        onLayout={handleSceneLayout}
      >
        <Animated.Image
        source={asImageSource(props.heroScene) ?? PET_FIRST_ROOM}
        resizeMode="cover"
          style={[
            styles.sceneImage,
            {
              opacity: sceneOpacity,
              transform: [{ scale: sceneScale }, { translateY: sceneY }],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.lightWash,
            {
              opacity: sceneBreath.interpolate({
                inputRange: [0, 1],
                outputRange: [0.35, 0.72],
              }),
            },
          ]}
        />

        <View style={styles.header}>
          <MotionPressable
            accessibilityRole="button"
            accessibilityLabel="Open menu"
            style={({ pressed }) => [
              styles.headerButton,
              pressed && styles.pressed,
            ]}
          >
            <Feather name="menu" size={20} color="#163f46" />
          </MotionPressable>

          <View style={styles.wordmarkSpacer} />

          <MotionPressable
            accessibilityRole="button"
            accessibilityLabel="Notifications"
            style={({ pressed }) => [
              styles.headerButton,
              pressed && styles.pressed,
            ]}
          >
            <Feather name="bell" size={18} color="#163f46" />
          </MotionPressable>
        </View>

        <View style={styles.greeting}>
          <Text style={styles.greetingLine}>Morning,</Text>
          <Text style={styles.greetingName}>{petName}</Text>
        </View>

        {!props.sceneContainsPet && petName.toLowerCase() !== "luna" &&
          (petSource ? (
            <>
              <View
                pointerEvents="none"
                style={[styles.petGroundShadow, petGeometry.shadow]}
              >
                <View style={styles.petContactShadow} />
              </View>
              <Image
                source={petSource}
                resizeMode="contain"
                style={[styles.pet, petGeometry.pet]}
                accessibilityLabel={petName + ", " + petBreed}
              />
            </>
          ) : (
            <View style={styles.petFallback}>
              <MaterialCommunityIcons name="paw" size={82} color="#9f7563" />
            </View>
          ))}

        <View style={styles.nextCard}>
          <Text style={styles.nextLabel}>Next up</Text>

          <View style={styles.taskRow}>
            <View style={styles.pillIcon}>
              <MaterialCommunityIcons name="pill" size={27} color="#f26f63" />
            </View>

            <View style={styles.taskCopy}>
              <Text numberOfLines={1} style={styles.taskName}>
                {medicationName}
              </Text>
              <Text numberOfLines={1} style={styles.taskMeta}>
                {medicationTime}  ·  {medicationDose}
              </Text>
            </View>

            <MotionPressable
              onPress={giveMedication}
              disabled={Boolean(medicationDone)}
              accessibilityRole="button"
              accessibilityLabel={
                medicationDone
                  ? medicationName + " was given"
                  : "Mark " + medicationName + " as given"
              }
              style={({ pressed }) => [
                styles.giveButton,
                medicationDone && styles.giveButtonDone,
                pressed && !medicationDone && styles.pressed,
              ]}
            >
              <Feather
                name={medicationDone ? "check" : "plus"}
                size={21}
                color="#fff"
              />
              <Text style={styles.giveText}>
                {medicationDone ? "Given" : "Give"}
              </Text>
            </MotionPressable>
          </View>
        </View>
      </View>
    </View>
  );
}

export default TodayHero;

const styles = StyleSheet.create({
  root: {
    width: "100%",
    flex: 1,
    overflow: "hidden",
    backgroundColor: "#e8cba8",
  },
  scene: {
    flex: 1,
    paddingHorizontal: 20,
  },
  sceneImage: {
    position: "absolute",
    top: -36,
    left: 0,
    height: "105%",
    width: "100%",
  },
  lightWash: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(255, 239, 213, 0.05)",
  },
  header: {
    height: 86,
    paddingTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 5,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 252, 246, 0.94)",
    shadowColor: "#634932",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
  wordmark: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  wordmarkSpacer: {
    flex: 1,
  },
  wordmarkPaw: {
    fontFamily: "Fredoka_600SemiBold",
    color: "#3189a2",
    fontSize: 25,
    letterSpacing: -1,
  },
  wordmarkPair: {
    fontFamily: "Fredoka_600SemiBold",
    color: "#ef7468",
    fontSize: 25,
    letterSpacing: -1,
  },
  greeting: {
    position: "absolute",
    top: 98,
    left: 38,
    zIndex: 4,
  },
  greetingLine: {
    fontFamily: "Fredoka_600SemiBold",
    color: "#173f45",
    fontSize: 34,
    lineHeight: 33,
    letterSpacing: -1,
  },
  greetingName: {
    marginTop: -3,
    fontFamily: "Fredoka_600SemiBold",
    color: "#173f45",
    fontSize: 34,
    lineHeight: 33,
    letterSpacing: -1,
  },
  breed: {
    maxWidth: 180,
    marginTop: 6,
    fontFamily: "Manrope_700Bold",
    color: "#526a6d",
    fontSize: 13,
    textTransform: "capitalize",
  },
  pet: {
    position: "absolute",
    zIndex: 3,
  },
  petContactShadow: {
    alignSelf: "center",
    backgroundColor: "rgba(48, 31, 20, 0.34)",
    borderRadius: 999,
    height: 6,
    marginTop: 2,
    width: "62%",
  },
  petGroundShadow: {
    backgroundColor: "rgba(73, 48, 31, 0.14)",
    borderRadius: 999,
    position: "absolute",
    shadowColor: "#3b271b",
    shadowOffset: { width: 2, height: 3 },
    shadowOpacity: 0.14,
    shadowRadius: 9,
    transform: [{ rotate: "-1deg" }],
    zIndex: 2,
  },
  petFallback: {
    position: "absolute",
    left: 59,
    bottom: 218,
    width: 272,
    height: 350,
    alignItems: "center",
    justifyContent: "center",
  },
  nextCard: {
    position: "absolute",
    left: 18,
    right: 18,
    bottom: 124,
    height: 114,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 13,
    borderRadius: 28,
    backgroundColor: "rgba(255, 253, 248, 0.98)",
    shadowColor: "#6d4b31",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.17,
    shadowRadius: 25,
    elevation: 8,
    zIndex: 6,
  },
  nextLabel: {
    marginLeft: 1,
    marginBottom: 6,
    fontFamily: "Manrope_700Bold",
    color: "#ef6e62",
    fontSize: 13,
  },
  taskRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  pillIcon: {
    width: 50,
    height: 50,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  taskCopy: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 13,
  },
  taskName: {
    fontFamily: "Manrope_800ExtraBold",
    color: "#193f46",
    fontSize: 17,
  },
  taskMeta: {
    marginTop: 4,
    fontFamily: "Manrope_600SemiBold",
    color: "#667579",
    fontSize: 12,
  },
  giveButton: {
    minWidth: 88,
    height: 50,
    paddingHorizontal: 15,
    borderRadius: 25,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    backgroundColor: "#ef7064",
    shadowColor: "#c75f56",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 11,
    elevation: 4,
  },
  giveButtonDone: {
    backgroundColor: "#639276",
    shadowOpacity: 0,
  },
  giveText: {
    fontFamily: "Manrope_800ExtraBold",
    color: "#fff",
    fontSize: 13,
  },
});
