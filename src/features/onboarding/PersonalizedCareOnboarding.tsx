import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  FlatList,
  ImageBackground,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";

import { assets, colors } from "../../design";
import {
  getBreedOptions,
  getBreedVisualProfile,
} from "../../data/pet-breeds";
import type { Pet } from "../../types";
import { createLocalId } from "../../utils/local-id";
import { INPUT_LIMITS } from "../../utils/input-limits";
import { usePrefersReducedMotion } from "../accessibility/motion";
import { trackAnalyticsEvent } from "../analytics/service";
import { resolvePetMotionPackForProfile } from "../pet-motion";
import {
  createBreedAssetKey,
  getPetVisualAsset,
  hasExactBreedVisual,
  resolvePetStagePlacement,
} from "../pet-visuals";

const ONBOARDING_STUDIO = require("../../../assets/pawpair-onboarding-studio.png");
const TOTAL_STEPS = 4;

type OnboardingIntent = "free" | "premium";
type SupportedSpecies = Extract<Pet["species"], "dog" | "cat">;

export function PersonalizedCareOnboarding({
  bottomInset,
  onFinish,
  topInset,
}: {
  bottomInset: number;
  onFinish: (pet: Pet, intent: OnboardingIntent) => void;
  topInset: number;
}) {
  const { height, width } = useWindowDimensions();
  const compact = height < 760;
  const tablet = width >= 768;
  const tabletExperienceHeight = Math.min(
    height - topInset - bottomInset - 48,
    1040,
  );
  const reduceMotion = usePrefersReducedMotion();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [species, setSpecies] = useState<SupportedSpecies | null>(null);
  const [breed, setBreed] = useState("");
  const [age, setAge] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [breedPickerOpen, setBreedPickerOpen] = useState(false);
  const [breedQuery, setBreedQuery] = useState("");
  const transition = useRef(new Animated.Value(1)).current;
  const petFloat = useRef(new Animated.Value(0)).current;
  const petReveal = useRef(new Animated.Value(1)).current;
  const submissionLocked = useRef(false);

  useEffect(() => {
    void trackAnalyticsEvent("onboarding_started", {
      entry_point: "first_launch",
    });
  }, []);

  const visual = useMemo(() => {
    if (!species) {
      const pack = resolvePetMotionPackForProfile("pet:milo", "dog-large");
      const placement = resolvePetStagePlacement("pet:milo", {
        maxScale: 2.25,
        targetFeetY: 0.94,
        targetSubjectHeight: 0.82,
      });
      return {
        key: "pet:milo",
        scale: placement.scale,
        source: pack?.states.idle ?? assets.milo,
        translateYRatio: placement.translateYRatio,
      };
    }
    const profile = getBreedVisualProfile(species, breed);
    const key = createBreedAssetKey(species, breed);
    const asset = getPetVisualAsset(key);
    const resolvedProfile = asset?.profile ?? profile;
    const pack = resolvePetMotionPackForProfile(key, resolvedProfile);
    const placement = resolvePetStagePlacement(pack?.petKey ?? key, {
      maxScale: 2.25,
      targetFeetY: 0.94,
      targetSubjectHeight: 0.82,
    });

    return {
      key,
      scale: placement.scale,
      source:
        pack?.states.idle ??
        asset?.petSource ??
        (species === "cat" ? assets.luna : assets.milo),
      translateYRatio: placement.translateYRatio,
    };
  }, [breed, species]);

  const filteredBreeds = useMemo(() => {
    if (!species) return [];
    const query = breedQuery.trim().toLocaleLowerCase();
    const options = getBreedOptions(species).filter((option) =>
      hasExactBreedVisual(species, option.name),
    );
    return query
      ? options.filter((option) =>
          option.name.toLocaleLowerCase().includes(query),
        )
      : options;
  }, [breedQuery, species]);
  const customBreed = breedQuery.trim();
  const hasExactBreedQuery = filteredBreeds.some(
    (option) =>
      option.name.toLocaleLowerCase() === customBreed.toLocaleLowerCase(),
  );

  useEffect(() => {
    transition.stopAnimation();
    transition.setValue(reduceMotion ? 1 : 0);
    Animated.timing(transition, {
      duration: reduceMotion ? 0 : 360,
      toValue: 1,
      useNativeDriver: Platform.OS !== "web",
    }).start();
  }, [reduceMotion, step, transition]);

  useEffect(() => {
    petReveal.stopAnimation();
    petReveal.setValue(reduceMotion ? 1 : 0);
    Animated.timing(petReveal, {
      duration: reduceMotion ? 0 : 280,
      toValue: 1,
      useNativeDriver: Platform.OS !== "web",
    }).start();
  }, [petReveal, reduceMotion, visual.key]);

  useEffect(() => {
    if (reduceMotion) return;
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(petFloat, {
          duration: 2200,
          toValue: 1,
          useNativeDriver: Platform.OS !== "web",
        }),
        Animated.timing(petFloat, {
          duration: 2400,
          toValue: 0,
          useNativeDriver: Platform.OS !== "web",
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [petFloat, reduceMotion]);

  const chooseSpecies = (next: SupportedSpecies) => {
    if (next === species) return;
    setSpecies(next);
    setBreed("");
    setBreedQuery("");
    setError(null);
    void Haptics.selectionAsync().catch(() => undefined);
  };

  const moveTo = (nextStep: number) => {
    const boundedStep = Math.max(0, Math.min(TOTAL_STEPS - 1, nextStep));
    setError(null);
    setStep(boundedStep);
    void trackAnalyticsEvent("screen_view", {
      screen: `onboarding_${boundedStep + 1}`,
    });
    void Haptics.selectionAsync().catch(() => undefined);
  };

  const next = () => {
    if (step === 1 && !name.trim()) {
      setError("Give your companion a name to make this theirs.");
      return;
    }
    if (step === 1 && !species) {
      setError("Choose whether your companion is a dog or cat.");
      return;
    }
    if (step === 2) {
      const normalizedAge = Number(age.trim().replace(",", "."));
      if (!breed.trim()) {
        setError("Choose the breed that feels closest.");
        return;
      }
      if (
        !age.trim() ||
        !Number.isFinite(normalizedAge) ||
        normalizedAge < 0 ||
        normalizedAge > 50
      ) {
        setError("Add an approximate age between 0 and 50.");
        return;
      }
    }
    if (step === TOTAL_STEPS - 1) {
      finish("free");
      return;
    }
    moveTo(step + 1);
  };

  const finish = (intent: OnboardingIntent) => {
    if (submissionLocked.current || !species) return;
    submissionLocked.current = true;
    const savedName = name.trim();
    const savedBreed = breed.trim();
    const profile = getBreedVisualProfile(species, savedBreed);
    const pet: Pet = {
      age: Number(age.trim().replace(",", ".")),
      avatar: species === "cat" ? "luna" : "milo",
      breed: savedBreed,
      color: species === "cat" ? colors.lavender : colors.butter,
      id: createLocalId("pet"),
      medications: [],
      name: savedName,
      species,
      visual: {
        engravingText: savedName,
        profile,
        revision: 1,
        status: "fallback",
      },
      visualProfile: profile,
    };
    void Haptics.notificationAsync(
      Haptics.NotificationFeedbackType.Success,
    ).catch(() => undefined);
    void trackAnalyticsEvent("onboarding_completed", {
      first_care_required: true,
      intent,
      species,
    });
    void trackAnalyticsEvent("pet_profile_created", {
      species,
      visual_profile: profile,
    });
    onFinish(pet, intent);
  };

  const primaryLabel =
    step === 0
      ? "Meet my pet"
      : step === 1
        ? "Continue"
        : step === 2
          ? `Save ${name.trim() || "their"}'s profile`
          : "Add the first care moment";

  const renderContent = () => {
    if (step === 0) {
      return (
        <>
          <Text style={styles.eyebrow}>WELCOME TO PAWPAIR</Text>
          <Text style={styles.title}>Never miss a care moment.</Text>
          <Text style={styles.body}>
            Build a care routine from the moments you choose — nothing is added for you.
          </Text>
          <View style={styles.promiseRow}>
            <Ionicons color={colors.sage} name="shield-checkmark-outline" size={18} />
            <Text style={styles.promiseText}>Private by default. Everything can be changed later.</Text>
          </View>
        </>
      );
    }

    if (step === 1) {
      return (
        <>
          <Text style={styles.eyebrow}>THE FIRST HELLO</Text>
          <Text style={styles.title}>Who are we caring for?</Text>
          <Text style={styles.label}>Their name</Text>
          <TextInput
            accessibilityLabel="Pet name"
            autoCapitalize="words"
            maxLength={INPUT_LIMITS.name}
            onChangeText={(value) => {
              setName(value);
              setError(null);
            }}
            placeholder="e.g. Luna"
            placeholderTextColor={colors.muted}
            returnKeyType="done"
            style={styles.input}
            value={name}
          />
          <Text style={styles.label}>Companion</Text>
          <View style={styles.speciesRow}>
            {(["dog", "cat"] as SupportedSpecies[]).map((item) => {
              const selected = species === item;
              return (
                <Pressable
                  accessibilityLabel={`Choose ${item}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  key={item}
                  onPress={() => chooseSpecies(item)}
                  style={[styles.speciesChoice, selected && styles.speciesChoiceSelected]}
                >
                  <Ionicons
                    color={selected ? colors.white : colors.sage}
                    name={item === "dog" ? "paw-outline" : "sparkles-outline"}
                    size={20}
                  />
                  <Text style={[styles.speciesText, selected && styles.speciesTextSelected]}>
                    {item === "dog" ? "Dog" : "Cat"}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </>
      );
    }

    if (step === 2) {
      return (
        <>
          <Text style={styles.eyebrow}>MAKE IT FEEL LIKE THEM</Text>
          <Text numberOfLines={2} style={styles.title}>
            {name.trim()}, down to the details.
          </Text>
          <Text style={styles.label}>Breed</Text>
          <Pressable
            accessibilityLabel="Choose breed"
            accessibilityRole="button"
            onPress={() => setBreedPickerOpen(true)}
            style={styles.selector}
          >
            <View style={styles.selectorIcon}>
              <Ionicons color={colors.sage} name="paw" size={18} />
            </View>
            <Text
              numberOfLines={1}
              style={[styles.selectorText, !breed && styles.placeholder]}
            >
              {breed || "Choose a breed"}
            </Text>
            <Ionicons color={colors.muted} name="chevron-down" size={19} />
          </Pressable>
          <Text style={styles.label}>Approximate age (required)</Text>
          <View style={styles.ageRow}>
            <TextInput
              accessibilityLabel="Age in years"
              keyboardType="decimal-pad"
              maxLength={5}
              onChangeText={(value) => {
                setAge(value);
                setError(null);
              }}
              placeholder="e.g. 4"
              placeholderTextColor={colors.muted}
              style={[styles.input, styles.ageInput]}
              value={age}
            />
            <View style={styles.yearPill}>
              <Text style={styles.yearText}>years old</Text>
            </View>
          </View>
          <Text style={styles.hint}>
            Age keeps the profile useful. You can refine it later.
          </Text>
        </>
      );
    }

    if (step === 3) {
      return (
        <>
          <Text style={styles.eyebrow}>PROFILE READY</Text>
          <Text numberOfLines={2} style={styles.title}>{name.trim()}'s space is ready.</Text>
          <Text style={styles.bodySmall}>
            No meals, reminders or health entries were created. You decide what belongs here.
          </Text>
          <View style={styles.revealRow}>
            <View style={styles.revealChip}>
              <Ionicons color={colors.sage} name="checkmark-circle" size={15} />
              <Text style={styles.revealText}>Nothing added without you</Text>
            </View>
          </View>
          <View style={styles.readyCard}>
            <View style={styles.readyIcon}>
              <Ionicons color={colors.white} name="arrow-forward" size={20} />
            </View>
            <View style={styles.premiumCopy}>
              <Text style={styles.premiumEyebrow}>ONE CLEAR NEXT STEP</Text>
              <Text style={styles.premiumTitle}>Add their first real care moment.</Text>
              <Text style={styles.premiumBody}>
                Choose the type, time and details. PawPair saves only what you confirm.
              </Text>
            </View>
          </View>
        </>
      );
    }

    return null;
  };

  const sceneHeight = tablet
    ? step === 0
      ? 462
      : 356
    : step === 0
      ? compact
        ? 352
        : 438
      : compact
        ? 264
        : 314;
  const petHeight = tablet
    ? step === 0
      ? 350
      : 304
    : step === 0
      ? compact
        ? 278
        : 330
      : compact
        ? 244
        : 276;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={[styles.screen, tablet && styles.tabletScreen]}
    >
      <View
        style={[
          styles.experience,
          tablet && styles.tabletExperience,
          tablet && { height: tabletExperienceHeight },
        ]}
      >
      <ImageBackground
        imageStyle={styles.sceneImage}
        resizeMode="cover"
        source={ONBOARDING_STUDIO}
        style={[styles.scene, { height: sceneHeight }]}
      >
        <View style={[styles.topChrome, { paddingTop: tablet ? 26 : topInset + 10 }]}>
          <View style={styles.brandRow}>
            <View style={styles.brandMark}>
              <Ionicons color={colors.white} name="paw" size={15} />
            </View>
            <Text style={styles.brandText}>PAWPAIR</Text>
          </View>
          <View style={styles.progressRow}>
            {Array.from({ length: TOTAL_STEPS }, (_, index) => (
              <View key={index} style={[styles.progressTrack, index <= step && styles.progressTrackActive]} />
            ))}
          </View>
        </View>

        <View style={[styles.petStage, { height: petHeight }]}>
          <View style={styles.groundCastShadow} />
          <View style={styles.groundContactShadow} />
          <Animated.Image
            accessibilityIgnoresInvertColors
            accessible={false}
            key={visual.key}
            resizeMode="contain"
            source={visual.source}
            style={[
              styles.petModel,
              {
                height: petHeight,
                opacity: petReveal,
                transform: [
                  {
                    translateY: petFloat.interpolate({
                      inputRange: [0, 1],
                      outputRange: [
                        petHeight * visual.translateYRatio,
                        petHeight * visual.translateYRatio +
                          (reduceMotion ? 0 : -2),
                      ],
                    }),
                  },
                  { scale: visual.scale },
                ],
              },
            ]}
          />
          {step > 0 && (
            <View style={styles.identityBadge}>
              <View style={styles.identityDot} />
              <Text numberOfLines={1} style={styles.identityText}>{name.trim() || "Your companion"}</Text>
              {breed ? (
                <Text numberOfLines={1} style={styles.identityBreed}>· {breed}</Text>
              ) : null}
            </View>
          )}
        </View>
      </ImageBackground>

      <Animated.View
        style={[
          styles.sheet,
          tablet && styles.tabletSheet,
          {
            opacity: transition,
            transform: [{
              translateY: transition.interpolate({
                inputRange: [0, 1],
                outputRange: [reduceMotion ? 0 : 18, 0],
              }),
            }],
          },
        ]}
      >
        <ScrollView
          contentContainerStyle={[
            styles.sheetScroll,
            tablet && styles.tabletSheetScroll,
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          style={styles.sheetScrollView}
        >
          {renderContent()}
          {error && (
            <View
              accessibilityLiveRegion="assertive"
              accessibilityRole="alert"
              style={styles.errorRow}
            >
              <Ionicons color={colors.coral} name="alert-circle" size={17} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
        </ScrollView>

        <View
          style={[
            styles.actions,
            tablet && styles.tabletActions,
            { paddingBottom: tablet ? 24 : Math.max(bottomInset, 12) + 6 },
          ]}
        >
          <View style={styles.actionRow}>
            {step > 0 && (
              <Pressable accessibilityLabel="Go back" accessibilityRole="button" onPress={() => moveTo(step - 1)} style={styles.backButton}>
                <Ionicons color={colors.ink} name="arrow-back" size={21} />
              </Pressable>
            )}
            <Pressable
              accessibilityLabel={primaryLabel}
              accessibilityRole="button"
              onPress={next}
              style={({ pressed }) => [styles.primaryButton, styles.primaryButtonFlex, pressed && styles.buttonPressed]}
            >
              <Text style={styles.primaryButtonText}>{primaryLabel}</Text>
              <Ionicons color={colors.white} name="arrow-forward" size={19} />
            </Pressable>
          </View>
        </View>
      </Animated.View>
      </View>

      <Modal
        animationType="slide"
        onRequestClose={() => setBreedPickerOpen(false)}
        presentationStyle="fullScreen"
        statusBarTranslucent={Platform.OS === "android"}
        visible={breedPickerOpen}
      >
        <View style={[styles.modalScreen, { paddingTop: Math.max(topInset, 18) }]}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalEyebrow}>{species?.toUpperCase()} BREEDS</Text>
              <Text style={styles.modalTitle}>Choose their companion</Text>
            </View>
            <Pressable accessibilityLabel="Close breed picker" accessibilityRole="button" onPress={() => setBreedPickerOpen(false)} style={styles.modalClose}>
              <Ionicons color={colors.ink} name="close" size={22} />
            </Pressable>
          </View>
          <View style={styles.searchBox}>
            <Ionicons color={colors.muted} name="search" size={18} />
            <TextInput
              accessibilityLabel="Search available companion models"
              autoCapitalize="words"
              autoCorrect={false}
              onChangeText={setBreedQuery}
              placeholder="Search 3D-ready breeds"
              placeholderTextColor={colors.muted}
              returnKeyType="search"
              style={styles.searchInput}
              value={breedQuery}
            />
            {breedQuery.length > 0 && (
              <Pressable
                accessibilityLabel="Clear breed search"
                accessibilityRole="button"
                onPress={() => setBreedQuery("")}
              >
                <Ionicons color={colors.muted} name="close-circle" size={18} />
              </Pressable>
            )}
          </View>
          {customBreed && !hasExactBreedQuery ? (
            <Pressable
              accessibilityLabel={`Use custom breed ${customBreed}`}
              accessibilityRole="button"
              onPress={() => {
                setBreed(customBreed);
                setBreedQuery("");
                setBreedPickerOpen(false);
                setError(null);
                void Haptics.selectionAsync().catch(() => undefined);
              }}
              style={[styles.breedRow, styles.customBreedRow]}
            >
              <View style={[styles.breedAvatar, styles.customBreedAvatar]}>
                <Ionicons color={colors.coral} name="create-outline" size={17} />
              </View>
              <View style={styles.breedCopy}>
                <Text style={styles.breedName}>Use “{customBreed}”</Text>
                <Text style={styles.breedProfile}>
                  Saved as typed · neutral {species} visual
                </Text>
              </View>
              <Ionicons color={colors.muted} name="arrow-forward" size={18} />
            </Pressable>
          ) : null}
          <FlatList
            contentContainerStyle={{ paddingBottom: Math.max(bottomInset, 20) + 24 }}
            data={filteredBreeds}
            keyboardShouldPersistTaps="handled"
            keyExtractor={(item) => item.name}
            renderItem={({ item }) => {
              const selected = item.name === breed;
              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => {
                    setBreed(item.name);
                    setBreedQuery("");
                    setBreedPickerOpen(false);
                    setError(null);
                    void Haptics.selectionAsync().catch(() => undefined);
                  }}
                  style={[styles.breedRow, selected && styles.breedRowSelected]}
                >
                  <View style={[styles.breedAvatar, selected && styles.breedAvatarSelected]}>
                    <Ionicons color={selected ? colors.white : colors.sage} name="paw" size={17} />
                  </View>
                  <View style={styles.breedCopy}>
                    <Text style={[styles.breedName, selected && styles.breedNameSelected]}>{item.name}</Text>
                    <Text style={styles.breedProfile}>Exact companion visual</Text>
                  </View>
                  {selected && <Ionicons color={colors.coral} name="checkmark-circle" size={22} />}
                </Pressable>
              );
            }}
            showsVerticalScrollIndicator={false}
          />
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  actionRow: { alignItems: "center", flexDirection: "row", gap: 10 },
  actions: { backgroundColor: colors.background, paddingHorizontal: 20, paddingTop: 10 },
  ageInput: { flex: 1 },
  ageRow: { alignItems: "center", flexDirection: "row", gap: 10 },
  analyticsBody: { color: colors.muted, fontFamily: "Nunito_600SemiBold", fontSize: 9.5, lineHeight: 14, marginTop: 2 },
  analyticsCard: { alignItems: "center", backgroundColor: colors.white, borderColor: colors.line, borderRadius: 17, borderWidth: 1, flexDirection: "row", gap: 9, marginTop: 10, padding: 11 },
  analyticsCopy: { flex: 1 },
  analyticsIcon: { alignItems: "center", backgroundColor: colors.skySoft, borderRadius: 17, height: 34, justifyContent: "center", width: 34 },
  analyticsSwitch: { minHeight: 44, minWidth: 44 },
  analyticsTitle: { color: colors.ink, fontFamily: "Nunito_800ExtraBold", fontSize: 11.5 },
  backButton: { alignItems: "center", backgroundColor: colors.white, borderColor: colors.line, borderRadius: 23, borderWidth: 1, height: 52, justifyContent: "center", width: 52 },
  body: { color: colors.muted, fontFamily: "Nunito_600SemiBold", fontSize: 15, lineHeight: 22, marginTop: 10 },
  bodySmall: { color: colors.muted, fontFamily: "Nunito_600SemiBold", fontSize: 13, lineHeight: 19, marginTop: 6 },
  brandMark: { alignItems: "center", backgroundColor: colors.coral, borderRadius: 13, height: 27, justifyContent: "center", width: 27 },
  brandRow: { alignItems: "center", flexDirection: "row", gap: 8 },
  brandText: { color: colors.white, fontFamily: "Fredoka_700Bold", fontSize: 12, letterSpacing: 1.4, textShadowColor: "rgba(52,35,24,0.22)", textShadowOffset: { height: 1, width: 0 }, textShadowRadius: 4 },
  breedAvatar: { alignItems: "center", backgroundColor: colors.sageSoft, borderRadius: 20, height: 40, justifyContent: "center", width: 40 },
  breedAvatarSelected: { backgroundColor: colors.sage },
  breedCopy: { flex: 1 },
  breedName: { color: colors.ink, fontFamily: "Nunito_800ExtraBold", fontSize: 15 },
  breedNameSelected: { color: colors.navy },
  breedProfile: { color: colors.muted, fontFamily: "Nunito_600SemiBold", fontSize: 11, marginTop: 2, textTransform: "capitalize" },
  breedRow: { alignItems: "center", backgroundColor: colors.white, borderColor: colors.line, borderRadius: 20, borderWidth: 1, flexDirection: "row", gap: 12, marginBottom: 9, minHeight: 66, paddingHorizontal: 13 },
  breedRowSelected: { backgroundColor: colors.coralSoft, borderColor: colors.coral },
  customBreedAvatar: { backgroundColor: colors.coralSoft },
  customBreedRow: { backgroundColor: colors.coralSoft, borderColor: colors.coral },
  buttonPressed: { opacity: 0.88, transform: [{ scale: 0.99 }] },
  errorRow: { alignItems: "center", backgroundColor: colors.coralSoft, borderRadius: 14, flexDirection: "row", gap: 8, marginTop: 12, padding: 10 },
  errorText: { color: colors.danger, flex: 1, fontFamily: "Nunito_700Bold", fontSize: 12 },
  experience: { flex: 1, width: "100%" },
  eyebrow: { color: colors.coral, fontFamily: "Fredoka_700Bold", fontSize: 11, letterSpacing: 1.45 },
  focusBody: { color: colors.muted, fontFamily: "Nunito_600SemiBold", fontSize: 10, marginTop: 2 },
  focusCard: { alignItems: "center", backgroundColor: colors.white, borderColor: colors.line, borderRadius: 18, borderWidth: 1, flexDirection: "row", gap: 9, minHeight: 62, paddingHorizontal: 10 },
  focusCardSelected: { backgroundColor: colors.sageSoft, borderColor: colors.sage },
  focusCopy: { flex: 1 },
  focusGrid: { gap: 8, marginTop: 14 },
  focusIcon: { alignItems: "center", backgroundColor: colors.sageSoft, borderRadius: 16, height: 34, justifyContent: "center", width: 34 },
  focusIconSelected: { backgroundColor: colors.sage },
  focusTitle: { color: colors.ink, fontFamily: "Nunito_800ExtraBold", fontSize: 13 },
  focusTitleSelected: { color: colors.navy },
  freeButton: { alignItems: "center", justifyContent: "center", minHeight: 42 },
  freeButtonText: { color: colors.muted, fontFamily: "Nunito_800ExtraBold", fontSize: 13, textDecorationLine: "underline" },
  groundCastShadow: { backgroundColor: "rgba(83,54,34,0.16)", borderRadius: 100, bottom: 8, height: 24, position: "absolute", width: "58%" },
  groundContactShadow: { backgroundColor: "rgba(52,32,21,0.28)", borderRadius: 100, bottom: 13, height: 10, position: "absolute", width: "34%" },
  hint: { color: colors.muted, fontFamily: "Nunito_600SemiBold", fontSize: 11, marginTop: 10 },
  identityBadge: { alignItems: "center", backgroundColor: "rgba(255,252,247,0.9)", borderRadius: 16, bottom: 8, flexDirection: "row", maxWidth: "86%", paddingHorizontal: 11, paddingVertical: 7, position: "absolute" },
  identityBreed: { color: colors.muted, flexShrink: 1, fontFamily: "Nunito_600SemiBold", fontSize: 11, marginLeft: 4 },
  identityDot: { backgroundColor: colors.coral, borderRadius: 4, height: 7, marginRight: 6, width: 7 },
  identityText: { color: colors.ink, fontFamily: "Nunito_800ExtraBold", fontSize: 12, maxWidth: 110 },
  input: { backgroundColor: colors.white, borderColor: colors.line, borderRadius: 18, borderWidth: 1, color: colors.ink, fontFamily: "Nunito_700Bold", fontSize: 16, minHeight: 52, paddingHorizontal: 15 },
  label: { color: colors.ink, fontFamily: "Nunito_800ExtraBold", fontSize: 12, marginBottom: 7, marginTop: 14 },
  modalClose: { alignItems: "center", backgroundColor: colors.line, borderRadius: 20, height: 40, justifyContent: "center", width: 40 },
  modalEyebrow: { color: colors.coral, fontFamily: "Fredoka_700Bold", fontSize: 10, letterSpacing: 1.2 },
  modalHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: 16 },
  modalScreen: { backgroundColor: colors.background, flex: 1, paddingHorizontal: 18 },
  modalTitle: { color: colors.ink, fontFamily: "Fredoka_600SemiBold", fontSize: 24, marginTop: 2 },
  optionalText: { color: colors.muted, fontFamily: "Nunito_600SemiBold", fontSize: 10, marginTop: 8, textAlign: "center" },
  petModel: { bottom: 2, position: "absolute", width: "78%" },
  petStage: { alignItems: "center", bottom: 0, justifyContent: "flex-end", left: 0, position: "absolute", right: 0 },
  placeholder: { color: colors.muted },
  premiumBody: { color: colors.muted, fontFamily: "Nunito_600SemiBold", fontSize: 11, lineHeight: 16, marginTop: 3 },
  premiumCard: { alignItems: "center", backgroundColor: colors.butterSoft, borderColor: colors.butter, borderRadius: 20, borderWidth: 1, flexDirection: "row", gap: 11, marginTop: 14, padding: 13 },
  premiumCopy: { flex: 1 },
  premiumEyebrow: { color: colors.coral, fontFamily: "Fredoka_700Bold", fontSize: 9, letterSpacing: 1.1 },
  premiumIcon: { alignItems: "center", backgroundColor: colors.white, borderRadius: 20, height: 42, justifyContent: "center", width: 42 },
  premiumTitle: { color: colors.ink, fontFamily: "Fredoka_600SemiBold", fontSize: 18, marginTop: 1 },
  primaryButton: { alignItems: "center", backgroundColor: colors.coral, borderRadius: 24, flexDirection: "row", gap: 8, justifyContent: "center", minHeight: 52, paddingHorizontal: 20 },
  primaryButtonFlex: { flex: 1 },
  primaryButtonText: { color: colors.white, fontFamily: "Fredoka_700Bold", fontSize: 15 },
  promiseRow: { alignItems: "center", backgroundColor: colors.sageSoft, borderRadius: 15, flexDirection: "row", gap: 8, marginTop: 15, paddingHorizontal: 11, paddingVertical: 9 },
  promiseText: { color: colors.sage, flex: 1, fontFamily: "Nunito_700Bold", fontSize: 11 },
  readyCard: { alignItems: "center", backgroundColor: colors.butterSoft, borderColor: colors.butter, borderRadius: 20, borderWidth: 1, flexDirection: "row", gap: 11, marginTop: 14, padding: 13 },
  readyIcon: { alignItems: "center", backgroundColor: colors.coral, borderRadius: 20, height: 42, justifyContent: "center", width: 42 },
  progressRow: { flexDirection: "row", gap: 5, width: 92 },
  progressTrack: { backgroundColor: "rgba(255,255,255,0.38)", borderRadius: 3, flex: 1, height: 4 },
  progressTrackActive: { backgroundColor: colors.coral },
  revealChip: { alignItems: "center", backgroundColor: colors.sageSoft, borderRadius: 15, flexDirection: "row", gap: 5, paddingHorizontal: 9, paddingVertical: 7 },
  revealRow: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 13 },
  revealText: { color: colors.sage, fontFamily: "Nunito_800ExtraBold", fontSize: 10 },
  scene: { backgroundColor: colors.butterSoft, overflow: "hidden", width: "100%" },
  sceneImage: { opacity: 0.98 },
  screen: { backgroundColor: colors.background, flex: 1 },
  searchBox: { alignItems: "center", backgroundColor: colors.white, borderColor: colors.line, borderRadius: 18, borderWidth: 1, flexDirection: "row", gap: 9, marginBottom: 14, minHeight: 50, paddingHorizontal: 13 },
  searchInput: { color: colors.ink, flex: 1, fontFamily: "Nunito_700Bold", fontSize: 15 },
  selector: { alignItems: "center", backgroundColor: colors.white, borderColor: colors.line, borderRadius: 18, borderWidth: 1, flexDirection: "row", gap: 10, minHeight: 54, paddingHorizontal: 12 },
  selectorIcon: { alignItems: "center", backgroundColor: colors.sageSoft, borderRadius: 17, height: 34, justifyContent: "center", width: 34 },
  selectorText: { color: colors.ink, flex: 1, fontFamily: "Nunito_800ExtraBold", fontSize: 15 },
  sheet: { backgroundColor: colors.background, borderTopLeftRadius: 30, borderTopRightRadius: 30, flex: 1, marginTop: -28, overflow: "hidden" },
  sheetScroll: { paddingBottom: 8, paddingHorizontal: 20, paddingTop: 22 },
  sheetScrollView: { flex: 1 },
  speciesChoice: { alignItems: "center", backgroundColor: colors.white, borderColor: colors.line, borderRadius: 18, borderWidth: 1, flex: 1, flexDirection: "row", gap: 8, justifyContent: "center", minHeight: 50 },
  speciesChoiceSelected: { backgroundColor: colors.sage, borderColor: colors.sage },
  speciesRow: { flexDirection: "row", gap: 10 },
  speciesText: { color: colors.ink, fontFamily: "Nunito_800ExtraBold", fontSize: 14 },
  speciesTextSelected: { color: colors.white },
  tabletActions: { alignSelf: "center", maxWidth: 580, paddingHorizontal: 30, width: "100%" },
  tabletExperience: { borderRadius: 34, flex: 0, overflow: "hidden" },
  tabletScreen: { alignItems: "center", justifyContent: "center", paddingVertical: 24 },
  tabletSheet: { borderBottomLeftRadius: 34, borderBottomRightRadius: 34 },
  tabletSheetScroll: { alignSelf: "center", flexGrow: 1, justifyContent: "center", maxWidth: 580, paddingHorizontal: 30, width: "100%" },
  title: { color: colors.ink, fontFamily: "Fredoka_600SemiBold", fontSize: 32, letterSpacing: -0.7, lineHeight: 36, marginTop: 4 },
  topChrome: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", left: 18, position: "absolute", right: 18, top: 0, zIndex: 5 },
  yearPill: { alignItems: "center", backgroundColor: colors.sageSoft, borderRadius: 17, justifyContent: "center", minHeight: 52, paddingHorizontal: 15 },
  yearText: { color: colors.sage, fontFamily: "Nunito_800ExtraBold", fontSize: 12 },
});
