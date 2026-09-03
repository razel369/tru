import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { colors } from "../../design";
import { BreedPicker } from "../../components/BreedPicker";
import {
  getBreedVisualProfile,
} from "../../data/pet-breeds";
import type { Pet, PetReproductiveStatus, PetSex } from "../../types";
import { createLocalId } from "../../utils/local-id";
import { INPUT_LIMITS } from "../../utils/input-limits";
import { usePrefersReducedMotion } from "../accessibility/motion";
import {
  createBreedAssetKey,
  getPetVisualAsset,
  hasExactBreedVisual,
} from "../pet-visuals/registry";
import { resolvePetStagePlacement } from "../pet-visuals/subject-framing";
import { resolvePetMotionPackForProfile } from "../pet-motion";
import {
  isValidPetBirthDate,
  petAgeYearsFromBirthDate,
} from "./pet-identity";
import { tryAcquireSubmissionLock } from "./submission-lock";

const SEX_OPTIONS: { label: string; value: PetSex }[] = [
  { label: "Female", value: "female" },
  { label: "Male", value: "male" },
  { label: "Unknown", value: "unknown" },
];

const REPRODUCTIVE_OPTIONS: {
  label: string;
  value: PetReproductiveStatus;
}[] = [
  { label: "Intact", value: "intact" },
  { label: "Spayed / neutered", value: "altered" },
  { label: "Unknown", value: "unknown" },
];

export function PetProfileForm({
  editing,
  topInset,
  bottomInset,
  onSave,
  onCancel,
}: {
  editing?: Pet;
  topInset: number;
  bottomInset: number;
  onSave: (pet: Pet) => void;
  onCancel?: () => void;
}) {
  const adding = !editing && Boolean(onCancel);
  const [name, setName] = useState(editing?.name ?? "");
  const [species, setSpecies] = useState<Pet["species"]>(
    editing?.species ?? "dog",
  );
  const [breed, setBreed] = useState(
    editing
      ? editing.breed || (editing.species === "other" ? "" : "Mixed breed")
      : "",
  );
  const [age, setAge] = useState(editing ? String(editing.age) : "");
  const [dateOfBirth, setDateOfBirth] = useState(
    editing?.careProfile?.dateOfBirth ?? "",
  );
  const [sex, setSex] = useState<PetSex | null>(editing?.careProfile?.sex ?? null);
  const [reproductiveStatus, setReproductiveStatus] =
    useState<PetReproductiveStatus | null>(
      editing?.careProfile?.reproductiveStatus ?? null,
    );
  const [allergies, setAllergies] = useState(editing?.careProfile?.allergies ?? "");
  const [diet, setDiet] = useState(editing?.careProfile?.diet ?? "");
  const [vetName, setVetName] = useState(editing?.careProfile?.veterinarianName ?? "");
  const [vetPhone, setVetPhone] = useState(editing?.careProfile?.veterinarianPhone ?? "");
  const [emergencyName, setEmergencyName] = useState(editing?.careProfile?.emergencyContactName ?? "");
  const [emergencyPhone, setEmergencyPhone] = useState(editing?.careProfile?.emergencyContactPhone ?? "");
  const [microchipId, setMicrochipId] = useState(editing?.careProfile?.microchipId ?? "");
  const [caregiverNotes, setCaregiverNotes] = useState(editing?.careProfile?.caregiverNotes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const reduceMotion = usePrefersReducedMotion();
  const previewMotion = useRef(new Animated.Value(0)).current;
  const initialForm = useRef({
    age,
    allergies,
    breed,
    caregiverNotes,
    dateOfBirth,
    diet,
    emergencyName,
    emergencyPhone,
    microchipId,
    name,
    reproductiveStatus,
    sex,
    species,
    vetName,
    vetPhone,
  }).current;

  const previewBreed = breed.trim();
  const derivedAge = dateOfBirth.trim()
    ? petAgeYearsFromBirthDate(dateOfBirth.trim())
    : null;
  const preview = useMemo(() => {
    const exactKey = createBreedAssetKey(species, previewBreed);
    const hasExactVisual =
      Boolean(previewBreed) && hasExactBreedVisual(species, previewBreed);
    const exactAsset = hasExactVisual ? getPetVisualAsset(exactKey) : undefined;
    const profile = getBreedVisualProfile(species, previewBreed);
    const pack = hasExactVisual
      ? resolvePetMotionPackForProfile(exactKey, profile)
      : null;
    const placement = resolvePetStagePlacement(pack?.petKey ?? exactKey, {
      targetFeetY: 0.91,
      targetSubjectHeight: 0.72,
    });
    return {
      asset: exactAsset,
      key: exactKey,
      placement,
      profile,
      source: pack?.states.idle ?? exactAsset?.petSource,
    };
  }, [previewBreed, species]);
  const hasUnsavedChanges =
    JSON.stringify(initialForm) !==
    JSON.stringify({
      age,
      allergies,
      breed,
      caregiverNotes,
      dateOfBirth,
      diet,
      emergencyName,
      emergencyPhone,
      microchipId,
      name,
      reproductiveStatus,
      sex,
      species,
      vetName,
      vetPhone,
    });

  useEffect(() => {
    previewMotion.stopAnimation();
    if (reduceMotion) {
      previewMotion.setValue(0);
      return;
    }
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(previewMotion, {
          duration: 2100,
          toValue: 1,
          useNativeDriver: Platform.OS !== "web",
        }),
        Animated.timing(previewMotion, {
          duration: 2300,
          toValue: 0,
          useNativeDriver: Platform.OS !== "web",
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [previewMotion, reduceMotion]);

  const saveLock = useRef(false);

  const submit = () => {
    if (!name.trim()) {
      setError("Add your pet's name.");
      return;
    }
    if (!breed.trim()) {
      setError(
        species === "other"
          ? "Add your pet's kind."
          : "Choose your pet's breed.",
      );
      return;
    }
    if (
      species !== "other" &&
      !hasExactBreedVisual(species, breed.trim())
    ) {
      setError(
        "Choose a breed with a verified PawPair companion model.",
      );
      return;
    }
    const savedBirthDate = dateOfBirth.trim();
    if (savedBirthDate && !isValidPetBirthDate(savedBirthDate)) {
      setError("Enter a real date of birth in YYYY-MM-DD format, not in the future.");
      return;
    }
    if (!savedBirthDate && !age.trim()) {
      setError("Add your pet's approximate age.");
      return;
    }
    const birthDateAge = savedBirthDate
      ? petAgeYearsFromBirthDate(savedBirthDate)
      : null;
    const normalizedAge =
      birthDateAge ??
      (age.trim() ? Number(age.trim().replace(",", ".")) : 0);
    if (!Number.isFinite(normalizedAge) || normalizedAge < 0 || normalizedAge > 250) {
      setError("Enter an age between 0 and 250 years.");
      return;
    }
    const savedBreed = breed.trim();
    const savedName = name.trim();
    const id = editing?.id ?? createLocalId("pet");
    const profile = getBreedVisualProfile(species, savedBreed);
    const visualIdentityChanged =
      !editing ||
      editing.species !== species ||
      editing.breed.trim().toLocaleLowerCase() !==
        savedBreed.toLocaleLowerCase() ||
      editing.name.trim() !== savedName;
    const fallbackVisual = {
      engravingText: savedName,
      profile,
      revision: visualIdentityChanged
        ? Math.max(1, (editing?.visual?.revision ?? 0) + 1)
        : 1,
      status: "fallback" as const,
    };
    const careProfile = {
      ...(allergies.trim() ? { allergies: allergies.trim() } : {}),
      ...(savedBirthDate ? { dateOfBirth: savedBirthDate } : {}),
      ...(diet.trim() ? { diet: diet.trim() } : {}),
      ...(vetName.trim() ? { veterinarianName: vetName.trim() } : {}),
      ...(vetPhone.trim() ? { veterinarianPhone: vetPhone.trim() } : {}),
      ...(emergencyName.trim() ? { emergencyContactName: emergencyName.trim() } : {}),
      ...(emergencyPhone.trim() ? { emergencyContactPhone: emergencyPhone.trim() } : {}),
      ...(microchipId.trim() ? { microchipId: microchipId.trim() } : {}),
      ...(reproductiveStatus ? { reproductiveStatus } : {}),
      ...(sex ? { sex } : {}),
      ...(caregiverNotes.trim() ? { caregiverNotes: caregiverNotes.trim() } : {}),
    };
    if (!tryAcquireSubmissionLock(saveLock)) return;
    onSave({
      id,
      name: savedName,
      species,
      breed: savedBreed,
      age: normalizedAge,
      avatar:
        editing && editing.species === species
          ? editing.avatar
          : species === "cat"
            ? "luna"
            : "milo",
      color:
        editing && editing.species === species
          ? editing.color
          : species === "cat"
            ? colors.lavender
            : colors.butter,
      medications: editing?.medications ?? [],
      visualProfile: profile,
      ...(Object.keys(careProfile).length ? { careProfile } : {}),
      visual:
        editing?.visual && !visualIdentityChanged
          ? { ...editing.visual, engravingText: savedName, profile }
          : fallbackVisual,
    });
  };

  const chooseSpecies = (nextSpecies: Pet["species"]) => {
    if (nextSpecies === species) return;
    setSpecies(nextSpecies);
    setBreed("");
    setError(null);
  };

  const requestCancel = () => {
    if (!onCancel) return;
    if (!hasUnsavedChanges) {
      onCancel();
      return;
    }
    setShowDiscardConfirm(true);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.screen}
    >
      <ScrollView
        contentContainerStyle={{
          paddingBottom: bottomInset + 28,
          paddingTop: topInset + 16,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          {onCancel && (
            <Pressable
              accessibilityLabel="Go back"
              accessibilityRole="button"
              onPress={requestCancel}
              style={styles.back}
            >
              <Ionicons color={colors.ink} name="arrow-back" size={20} />
            </Pressable>
          )}
          <View style={styles.flex}>
            <Text style={styles.eyebrow}>
              {editing
                ? "PET PROFILE"
                : adding
                  ? "NEW COMPANION"
                  : "WELCOME TO PAWPAIR"}
            </Text>
            <Text style={styles.title}>
              {editing
                ? "Make it feel like them"
                : adding
                  ? "Add to your family"
                  : "Meet your companion"}
            </Text>
          </View>
        </View>

        <View style={styles.previewCard}>
          <View style={[styles.previewGlow, styles.nonInteractive]} />
          <View style={[styles.previewOrb, styles.nonInteractive]} />
          <View style={styles.nameBadge}>
            <View style={styles.nameBadgeDot} />
            <Text numberOfLines={1} style={styles.nameBadgeText}>
              {name.trim() || "Your pet"}
            </Text>
          </View>
          <View style={styles.speciesBadge}>
            <Ionicons
              color={colors.navy}
              name={species === "cat" ? "sparkles-outline" : "paw-outline"}
              size={13}
            />
            <Text style={styles.speciesBadgeText}>
              {breed.trim() ||
                (species === "other"
                  ? "Companion"
                  : species === "cat"
                    ? "Cat preview"
                    : "Dog preview")}
            </Text>
          </View>
          <View style={[styles.groundCastShadow, styles.nonInteractive]} />
          <View style={[styles.groundContactShadow, styles.nonInteractive]} />
          {species === "other" || !preview.source ? (
            <View style={[styles.otherPreview, styles.nonInteractive]}>
              <Ionicons color={colors.sage} name="heart" size={58} />
              <Ionicons
                color={colors.navy}
                name="paw"
                size={24}
                style={styles.otherPaw}
              />
            </View>
          ) : (
            <Animated.Image
              accessibilityIgnoresInvertColors
              accessible={false}
              resizeMode="contain"
              source={preview.source}
              style={[
                styles.petPreview,
                {
                  transform: [
                    {
                      translateX:
                        184 * preview.placement.translateXRatio,
                    },
                    {
                      translateY: previewMotion.interpolate({
                        inputRange: [0, 1],
                        outputRange: [
                          151 * preview.placement.translateYRatio,
                          151 * preview.placement.translateYRatio -
                            (reduceMotion ? 0 : 2.5),
                        ],
                      }),
                    },
                    {
                      scale: previewMotion.interpolate({
                        inputRange: [0, 1],
                        outputRange: [
                          preview.placement.scale,
                          preview.placement.scale * 1.008,
                        ],
                      }),
                    },
                  ],
                },
              ]}
            />
          )}
          <Text style={styles.previewHint}>A care world shaped around them</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Name</Text>
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
            style={styles.input}
            value={name}
          />

          <Text style={styles.label}>Species</Text>
          <View style={styles.speciesRow}>
            {(["dog", "cat", "other"] as Pet["species"][]).map((item) => (
              <Pressable
                accessibilityLabel={`Choose ${item} as the species`}
                accessibilityRole="button"
                accessibilityState={{ selected: species === item }}
                key={item}
                onPress={() => chooseSpecies(item)}
                style={[styles.species, species === item && styles.speciesActive]}
              >
                <Ionicons
                  color={species === item ? colors.white : colors.navy}
                  name={
                    (item === "dog"
                      ? "paw-outline"
                      : item === "cat"
                        ? "sparkles-outline"
                        : "heart-outline") as keyof typeof Ionicons.glyphMap
                  }
                  size={16}
                />
                <Text
                  style={[
                    styles.speciesText,
                    species === item && styles.speciesTextActive,
                  ]}
                >
                  {item[0]?.toUpperCase() + item.slice(1)}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.detailsRow}>
            <View style={styles.breedField}>
              <Text style={styles.label}>{species === "other" ? "Kind" : "Breed"}</Text>
              <BreedPicker
                onChange={(value) => {
                  setBreed(value);
                  setError(null);
                }}
                species={species}
                value={breed}
              />
            </View>
            <View style={styles.ageField}>
              <Text style={styles.label}>
                {derivedAge === null ? "Age" : "Age (from birth date)"}
              </Text>
              <TextInput
                accessibilityLabel="Age in years"
                accessibilityState={{ disabled: derivedAge !== null }}
                editable={derivedAge === null}
                keyboardType="decimal-pad"
                maxLength={5}
                onChangeText={setAge}
                placeholder="4"
                placeholderTextColor={colors.muted}
                style={[
                  styles.input,
                  styles.ageInput,
                  derivedAge !== null && styles.inputDisabled,
                ]}
                value={derivedAge === null ? age : String(derivedAge)}
              />
            </View>
          </View>
        </View>

        {editing && (
          <View style={styles.secondaryCard}>
            <View style={styles.sectionHeading}>
              <View style={styles.sectionIcon}>
                <Ionicons color={colors.sage} name="shield-checkmark-outline" size={19} />
              </View>
              <View style={styles.flex}>
            <Text style={styles.sectionEyebrow}>CARE & SAFETY / OPTIONAL</Text>
                <Text style={styles.sectionTitle}>Care identity & safety</Text>
                <Text style={styles.sectionCopy}>Optional details stay on this device and improve the health passport and handoffs you choose to share.</Text>
              </View>
            </View>

            <Text style={styles.label}>Date of birth</Text>
            <TextInput
              accessibilityLabel="Pet date of birth"
              autoCapitalize="none"
              keyboardType="numbers-and-punctuation"
              maxLength={10}
              onChangeText={(value) => {
                setDateOfBirth(value);
                setError(null);
              }}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.muted}
              style={styles.input}
              value={dateOfBirth}
            />
            <Text style={styles.fieldHint}>An exact date keeps age accurate automatically.</Text>

            <Text style={styles.label}>Sex</Text>
            <View style={styles.choiceRow}>
              {SEX_OPTIONS.map((option) => (
                <Pressable
                  accessibilityLabel={`Set sex to ${option.label}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: sex === option.value }}
                  key={option.value}
                  onPress={() => setSex(option.value)}
                  style={[styles.choice, sex === option.value && styles.choiceSelected]}
                >
                  <Text style={[styles.choiceText, sex === option.value && styles.choiceTextSelected]}>{option.label}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.label}>Reproductive status</Text>
            <View style={styles.choiceRow}>
              {REPRODUCTIVE_OPTIONS.map((option) => (
                <Pressable
                  accessibilityLabel={`Set reproductive status to ${option.label}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: reproductiveStatus === option.value }}
                  key={option.value}
                  onPress={() => setReproductiveStatus(option.value)}
                  style={[
                    styles.choice,
                    styles.choiceWide,
                    reproductiveStatus === option.value && styles.choiceSelected,
                  ]}
                >
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.choiceText,
                      reproductiveStatus === option.value && styles.choiceTextSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.label}>Allergies or sensitivities</Text>
            <TextInput accessibilityLabel="Pet allergies" autoCapitalize="sentences" maxLength={INPUT_LIMITS.instructions} onChangeText={setAllergies} placeholder="Food, medication or environmental" placeholderTextColor={colors.muted} style={styles.input} value={allergies} />
            <Text style={styles.label}>Diet and feeding notes</Text>
            <TextInput accessibilityLabel="Pet diet" maxLength={INPUT_LIMITS.instructions} multiline onChangeText={setDiet} placeholder="Food, portions and restrictions" placeholderTextColor={colors.muted} style={[styles.input, styles.multilineInput]} value={diet} />

            <View style={styles.pairRow}>
              <View style={styles.flex}>
                <Text style={styles.label}>Veterinarian</Text>
                <TextInput accessibilityLabel="Veterinarian name" autoCapitalize="words" maxLength={INPUT_LIMITS.shortText} onChangeText={setVetName} placeholder="Clinic or vet" placeholderTextColor={colors.muted} style={styles.input} value={vetName} />
              </View>
              <View style={styles.phoneField}>
                <Text style={styles.label}>Phone</Text>
                <TextInput accessibilityLabel="Veterinarian phone" keyboardType="phone-pad" maxLength={INPUT_LIMITS.phone} onChangeText={setVetPhone} placeholder="Number" placeholderTextColor={colors.muted} style={styles.input} value={vetPhone} />
              </View>
            </View>

            <View style={styles.pairRow}>
              <View style={styles.flex}>
                <Text style={styles.label}>Emergency contact</Text>
                <TextInput accessibilityLabel="Emergency contact name" autoCapitalize="words" maxLength={INPUT_LIMITS.shortText} onChangeText={setEmergencyName} placeholder="Name" placeholderTextColor={colors.muted} style={styles.input} value={emergencyName} />
              </View>
              <View style={styles.phoneField}>
                <Text style={styles.label}>Phone</Text>
                <TextInput accessibilityLabel="Emergency contact phone" keyboardType="phone-pad" maxLength={INPUT_LIMITS.phone} onChangeText={setEmergencyPhone} placeholder="Number" placeholderTextColor={colors.muted} style={styles.input} value={emergencyPhone} />
              </View>
            </View>

            <Text style={styles.label}>Microchip ID</Text>
            <TextInput accessibilityLabel="Microchip ID" autoCapitalize="characters" maxLength={INPUT_LIMITS.identifier} onChangeText={setMicrochipId} placeholder="Optional identifier" placeholderTextColor={colors.muted} style={styles.input} value={microchipId} />
            <Text style={styles.label}>Caregiver notes</Text>
            <TextInput accessibilityLabel="Caregiver notes" maxLength={INPUT_LIMITS.notes} multiline onChangeText={setCaregiverNotes} placeholder="Comfort, behavior, access or household notes" placeholderTextColor={colors.muted} style={[styles.input, styles.multilineInput]} value={caregiverNotes} />
          </View>
        )}

        <View style={styles.info}>
          <View style={styles.infoIcon}>
            <Ionicons color={colors.sage} name="leaf-outline" size={17} />
          </View>
          <Text style={styles.infoText}>
            Start with a thoughtful routine. Change any moment, anytime.
          </Text>
        </View>
        {error && (
          <Text
            accessibilityLiveRegion="polite"
            accessibilityRole="alert"
            style={styles.error}
          >
            {error}
          </Text>
        )}
        <Pressable
          accessibilityRole="button"
          onPress={submit}
          style={({ pressed }) => [styles.save, pressed && styles.savePressed]}
        >
          <Text style={styles.saveText}>
            {editing
              ? "Save profile"
              : adding
                ? "Add companion"
                : "Create our care plan"}
          </Text>
          <Ionicons color={colors.white} name="arrow-forward" size={19} />
        </Pressable>
      </ScrollView>
      <Modal
        animationType="fade"
        onRequestClose={() => setShowDiscardConfirm(false)}
        transparent
        visible={showDiscardConfirm}
      >
        <View style={styles.confirmOverlay}>
          <View accessibilityViewIsModal style={styles.confirmCard}>
            <View style={styles.confirmIcon}>
              <Ionicons color={colors.coral} name="alert-circle-outline" size={24} />
            </View>
            <Text style={styles.confirmTitle}>Discard changes?</Text>
            <Text style={styles.confirmBody}>
              Your profile edits have not been saved.
            </Text>
            <View style={styles.confirmActions}>
              <Pressable
                accessibilityRole="button"
                onPress={() => setShowDiscardConfirm(false)}
                style={styles.confirmKeep}
              >
                <Text style={styles.confirmKeepText}>Keep editing</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={onCancel}
                style={styles.confirmDiscard}
              >
                <Text style={styles.confirmDiscardText}>Discard</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  confirmActions: { flexDirection: "row", gap: 8, marginTop: 18 },
  confirmBody: {
    color: colors.muted,
    fontFamily: "Nunito_600SemiBold",
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6,
    textAlign: "center",
  },
  confirmCard: {
    alignItems: "center",
    backgroundColor: colors.paper,
    borderRadius: 26,
    maxWidth: 360,
    padding: 22,
    width: "88%",
  },
  confirmDiscard: {
    alignItems: "center",
    backgroundColor: colors.coral,
    borderRadius: 16,
    flex: 1,
    minHeight: 46,
    justifyContent: "center",
  },
  confirmDiscardText: {
    color: colors.white,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 12,
  },
  confirmIcon: {
    alignItems: "center",
    backgroundColor: colors.coralSoft,
    borderRadius: 22,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  confirmKeep: {
    alignItems: "center",
    backgroundColor: colors.background,
    borderColor: colors.line,
    borderRadius: 16,
    borderWidth: 1,
    flex: 1,
    minHeight: 46,
    justifyContent: "center",
  },
  confirmKeepText: {
    color: colors.ink,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 12,
  },
  confirmOverlay: {
    alignItems: "center",
    backgroundColor: "rgba(34,48,67,0.36)",
    flex: 1,
    justifyContent: "center",
    padding: 18,
  },
  confirmTitle: {
    color: colors.ink,
    fontFamily: "Fredoka_600SemiBold",
    fontSize: 22,
    marginTop: 12,
  },
  ageField: { width: 78 },
  ageInput: { textAlign: "center" },
  back: {
    alignItems: "center",
    backgroundColor: colors.paper,
    borderColor: colors.line,
    borderRadius: 20,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  breedField: { flex: 1 },
  card: {
    backgroundColor: colors.paper,
    borderColor: colors.line,
    borderRadius: 25,
    borderWidth: 1,
    gap: 6,
    marginHorizontal: 18,
    marginTop: 13,
    padding: 15,
  },
  detailsRow: {
    flexDirection: "row",
    gap: 9,
  },
  error: {
    color: colors.danger,
    fontFamily: "Nunito_700Bold",
    fontSize: 12,
    marginHorizontal: 22,
    marginTop: 8,
  },
  eyebrow: {
    color: colors.navy,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 10,
    letterSpacing: 1.2,
  },
  flex: { flex: 1 },
  groundCastShadow: {
    backgroundColor: "rgba(51, 60, 54, 0.06)",
    borderRadius: 999,
    bottom: 28,
    height: 10,
    left: "50%",
    marginLeft: -54,
    position: "absolute",
    transform: [{ scaleX: 1.08 }],
    width: 108,
  },
  groundContactShadow: {
    backgroundColor: "rgba(51, 60, 54, 0.17)",
    borderRadius: 999,
    bottom: 32,
    height: 4,
    left: "50%",
    marginLeft: -34,
    position: "absolute",
    width: 68,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: 11,
    paddingHorizontal: 18,
  },
  info: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    marginHorizontal: 22,
    marginTop: 12,
  },
  infoIcon: {
    alignItems: "center",
    backgroundColor: colors.sageSoft,
    borderRadius: 15,
    height: 30,
    justifyContent: "center",
    width: 30,
  },
  infoText: {
    color: colors.sage,
    flex: 1,
    fontFamily: "Nunito_700Bold",
    fontSize: 11,
    lineHeight: 15,
  },
  input: {
    backgroundColor: colors.background,
    borderColor: colors.line,
    borderRadius: 14,
    borderWidth: 1,
    color: colors.ink,
    fontFamily: "Nunito_700Bold",
    fontSize: 13,
    height: 44,
    paddingHorizontal: 12,
    paddingVertical: 0,
  },
  inputDisabled: { backgroundColor: colors.line, color: colors.muted },
  choice: {
    alignItems: "center",
    backgroundColor: colors.background,
    borderColor: colors.line,
    borderRadius: 13,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 7,
  },
  choiceRow: { flexDirection: "row", gap: 6 },
  choiceSelected: { backgroundColor: colors.navy, borderColor: colors.navy },
  choiceText: { color: colors.muted, fontFamily: "Nunito_700Bold", fontSize: 9 },
  choiceTextSelected: { color: colors.white },
  choiceWide: { paddingHorizontal: 5 },
  fieldHint: { color: colors.muted, fontFamily: "Nunito_600SemiBold", fontSize: 9, marginLeft: 2 },
  label: {
    color: colors.muted,
    fontFamily: "Nunito_700Bold",
    fontSize: 10,
    marginLeft: 2,
    marginTop: 4,
  },
  multilineInput: { height: 72, paddingTop: 11, textAlignVertical: "top" },
  pairRow: { flexDirection: "row", gap: 9 },
  phoneField: { width: 118 },
  secondaryCard: { backgroundColor: colors.paper, borderColor: colors.line, borderRadius: 25, borderWidth: 1, gap: 6, marginHorizontal: 18, marginTop: 12, padding: 15 },
  sectionCopy: { color: colors.muted, fontFamily: "Nunito_600SemiBold", fontSize: 10, lineHeight: 14, marginTop: 2 },
  sectionEyebrow: { color: colors.sage, fontFamily: "Nunito_800ExtraBold", fontSize: 8, letterSpacing: 1 },
  sectionHeading: { alignItems: "center", flexDirection: "row", gap: 10, marginBottom: 4 },
  sectionIcon: { alignItems: "center", backgroundColor: colors.sageSoft, borderRadius: 18, height: 38, justifyContent: "center", width: 38 },
  sectionTitle: { color: colors.ink, fontFamily: "Nunito_800ExtraBold", fontSize: 14 },
  nameBadge: {
    alignItems: "center",
    backgroundColor: colors.navy,
    borderRadius: 16,
    flexDirection: "row",
    gap: 6,
    left: 13,
    maxWidth: 126,
    paddingHorizontal: 10,
    paddingVertical: 7,
    position: "absolute",
    top: 13,
    zIndex: 3,
  },
  nonInteractive: { pointerEvents: "none" },
  nameBadgeDot: {
    backgroundColor: colors.butter,
    borderRadius: 4,
    height: 7,
    width: 7,
  },
  nameBadgeText: {
    color: colors.white,
    flexShrink: 1,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 11,
  },
  otherPaw: {
    left: 17,
    position: "absolute",
    top: 18,
  },
  otherPreview: {
    alignItems: "center",
    bottom: 28,
    height: 105,
    justifyContent: "center",
    left: "50%",
    marginLeft: -58,
    position: "absolute",
    width: 116,
  },
  petPreview: {
    bottom: 24,
    height: 151,
    left: "50%",
    marginLeft: -92,
    position: "absolute",
    width: 184,
    zIndex: 2,
  },
  previewCard: {
    backgroundColor: colors.sageSoft,
    borderRadius: 27,
    height: 184,
    marginHorizontal: 18,
    marginTop: 12,
    overflow: "hidden",
    position: "relative",
  },
  previewGlow: {
    backgroundColor: "rgba(255, 255, 255, 0.72)",
    borderRadius: 140,
    height: 235,
    left: "50%",
    marginLeft: -117,
    position: "absolute",
    top: 17,
    width: 235,
  },
  previewHint: {
    bottom: 8,
    color: colors.sage,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 9,
    left: 14,
    letterSpacing: 0.4,
    position: "absolute",
  },
  previewOrb: {
    backgroundColor: "rgba(255, 210, 107, 0.55)",
    borderRadius: 45,
    height: 90,
    position: "absolute",
    right: -22,
    top: -24,
    width: 90,
  },
  save: {
    alignItems: "center",
    backgroundColor: colors.coral,
    borderRadius: 21,
    flexDirection: "row",
    gap: 9,
    justifyContent: "center",
    marginHorizontal: 18,
    marginTop: 13,
    minHeight: 53,
  },
  savePressed: { opacity: 0.88, transform: [{ scale: 0.99 }] },
  saveText: {
    color: colors.white,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 15,
  },
  screen: { backgroundColor: colors.background, flex: 1 },
  species: {
    alignItems: "center",
    backgroundColor: colors.skySoft,
    borderRadius: 14,
    flex: 1,
    flexDirection: "row",
    gap: 5,
    justifyContent: "center",
    minHeight: 44,
  },
  speciesActive: { backgroundColor: colors.navy },
  speciesBadge: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.82)",
    borderRadius: 15,
    flexDirection: "row",
    gap: 5,
    maxWidth: 130,
    paddingHorizontal: 9,
    paddingVertical: 6,
    position: "absolute",
    right: 13,
    top: 13,
    zIndex: 3,
  },
  speciesBadgeText: {
    color: colors.navy,
    flexShrink: 1,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 9,
  },
  speciesRow: { flexDirection: "row", gap: 7 },
  speciesText: {
    color: colors.navy,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 10,
  },
  speciesTextActive: { color: colors.white },
  title: {
    color: colors.ink,
    fontFamily: "Fredoka_600SemiBold",
    fontSize: 27,
    lineHeight: 31,
  },
});
