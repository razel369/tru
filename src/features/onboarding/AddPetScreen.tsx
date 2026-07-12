import { Ionicons } from "@expo/vector-icons";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors } from "../../design";
import type { OnboardingPetDraft } from "./types";

interface AddPetScreenProps {
  onBack: () => void;
  onNext: (pet: OnboardingPetDraft) => void;
  initial?: OnboardingPetDraft;
}

const SPECIES_OPTIONS: Array<{
  id: OnboardingPetDraft["species"];
  label: string;
  color: string;
}> = [
  { id: "dog", label: "Dog", color: "#F3B66D" },
  { id: "cat", label: "Cat", color: "#9891C7" },
  { id: "other", label: "Other", color: "#5D9387" },
];

const PORTRAIT_OPTIONS: Array<{
  id: OnboardingPetDraft["avatarSeed"];
  label: string;
}> = [
  { id: "milo", label: "Milo" },
  { id: "luna", label: "Luna" },
  { id: "generated", label: "Generated" },
];

/**
 * Stage 4, step 3: create the first pet.
 *
 * Per docs/AAA-HANDOFF.md §8 we collect: name, species, breed,
 * age. Photos and weight are optional and ship in stage 7. The
 * "generated" avatar seed will be replaced with a real AI
 * portrait flow in stage 7; for now it is treated like the demo
 * portraits.
 */
export function AddPetScreen({ onBack, onNext, initial }: AddPetScreenProps) {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState(initial?.name ?? "");
  const [species, setSpecies] = useState<OnboardingPetDraft["species"]>(
    initial?.species ?? "dog",
  );
  const [breed, setBreed] = useState(initial?.breed ?? "");
  const [age, setAge] = useState(initial?.ageYears?.toString() ?? "");
  const [avatarSeed, setAvatarSeed] = useState<OnboardingPetDraft["avatarSeed"]>(
    initial?.avatarSeed ?? "milo",
  );

  const accent = SPECIES_OPTIONS.find((s) => s.id === species)?.color ?? colors.coral;

  const canContinue = name.trim().length > 0;

  const submit = () => {
    if (!canContinue) return;
    onNext({
      name: name.trim(),
      species,
      breed: breed.trim() || undefined,
      ageYears: age ? Number(age) : undefined,
      avatarSeed,
      accentColor: accent,
    });
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.flex}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 12, paddingBottom: 24 + insets.bottom },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable onPress={onBack} style={styles.closeButton}>
            <Ionicons color={colors.ink} name="arrow-back" size={22} />
          </Pressable>
          <View style={styles.flex}>
            <Text style={styles.kicker}>WHO LIVES WITH YOU</Text>
            <Text style={styles.title}>Add your first pet</Text>
          </View>
          <View style={styles.stepPill}>
            <Text style={styles.stepText}>1 OF 2</Text>
          </View>
        </View>

        <View style={[styles.preview, { backgroundColor: `${accent}22` }]}>
          <View style={[styles.previewDot, { backgroundColor: accent }]} />
          <Text style={[styles.previewName, { color: colors.ink }]}>
            {name.trim() || "Your pet"}
          </Text>
        </View>

        <Text style={styles.label}>Name</Text>
        <View style={styles.input}>
          <TextInput
            accessibilityLabel="Pet name"
            autoFocus
            onChangeText={setName}
            placeholder="e.g. Milo"
            placeholderTextColor="#A9B0B3"
            style={styles.inputField}
            value={name}
          />
        </View>

        <Text style={styles.label}>Species</Text>
        <View style={styles.speciesRow}>
          {SPECIES_OPTIONS.map((option) => {
            const active = option.id === species;
            return (
              <Pressable
                key={option.id}
                onPress={() => setSpecies(option.id)}
                style={[
                  styles.speciesChoice,
                  active && styles.speciesChoiceActive,
                ]}
              >
                <View
                  style={[
                    styles.speciesDot,
                    { backgroundColor: option.color },
                  ]}
                />
                <Text
                  style={[
                    styles.speciesLabel,
                    active && styles.speciesLabelActive,
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.label}>Breed (optional)</Text>
        <View style={styles.input}>
          <TextInput
            accessibilityLabel="Breed"
            onChangeText={setBreed}
            placeholder="e.g. Golden retriever"
            placeholderTextColor="#A9B0B3"
            style={styles.inputField}
            value={breed}
          />
        </View>

        <Text style={styles.label}>Age (years, optional)</Text>
        <View style={styles.input}>
          <TextInput
            accessibilityLabel="Age in years"
            keyboardType="number-pad"
            onChangeText={setAge}
            placeholder="e.g. 9"
            placeholderTextColor="#A9B0B3"
            style={styles.inputField}
            value={age}
          />
        </View>

        <Text style={styles.label}>Portrait</Text>
        <View style={styles.portraitRow}>
          {PORTRAIT_OPTIONS.map((option) => {
            const active = option.id === avatarSeed;
            return (
              <Pressable
                key={option.id}
                onPress={() => setAvatarSeed(option.id)}
                style={[
                  styles.portraitChoice,
                  active && styles.portraitChoiceActive,
                ]}
              >
                <Text
                  style={[
                    styles.portraitLabel,
                    active && styles.portraitLabelActive,
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.cta}>
          <Pressable
            disabled={!canContinue}
            onPress={submit}
            style={({ pressed }) => [
              styles.primaryButton,
              !canContinue && styles.primaryButtonDisabled,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.primaryButtonText}>Continue</Text>
            <Ionicons color={colors.white} name="arrow-forward" size={18} />
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  cta: { marginTop: 28 },
  closeButton: {
    alignItems: "center",
    backgroundColor: colors.paper,
    borderRadius: 22,
    height: 44,
    justifyContent: "center",
    width: 44,
    shadowColor: "#2A3A4A",
    shadowOffset: { height: 2, width: 0 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  content: { paddingHorizontal: 24 },
  flex: { flex: 1 },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  input: {
    backgroundColor: colors.paper,
    borderRadius: 18,
    flexDirection: "row",
    height: 52,
    paddingHorizontal: 14,
    shadowColor: "#2A3A4A",
    shadowOffset: { height: 4, width: 0 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
  },
  inputField: {
    color: colors.ink,
    flex: 1,
    fontFamily: "Manrope_700Bold",
    fontSize: 15,
    padding: 0,
  },
  kicker: {
    color: colors.sky,
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 9,
    letterSpacing: 1.4,
  },
  label: {
    color: colors.ink,
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 12,
    marginBottom: 8,
    marginTop: 18,
  },
  portraitChoice: {
    alignItems: "center",
    backgroundColor: colors.paper,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: "#2A3A4A",
    shadowOffset: { height: 4, width: 0 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
  },
  portraitChoiceActive: {
    backgroundColor: colors.skySoft,
  },
  portraitLabel: {
    color: colors.muted,
    fontFamily: "Manrope_700Bold",
    fontSize: 12,
  },
  portraitLabelActive: { color: colors.sky },
  portraitRow: { flexDirection: "row", gap: 8 },
  pressed: { opacity: 0.85 },
  preview: {
    alignItems: "center",
    borderRadius: 22,
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  previewDot: { borderRadius: 5, height: 10, width: 10 },
  previewName: {
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 18,
    letterSpacing: -0.3,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: colors.coral,
    borderRadius: 999,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 56,
    paddingHorizontal: 18,
    shadowColor: colors.coral,
    shadowOffset: { height: 10, width: 0 },
    shadowOpacity: 0.28,
    shadowRadius: 16,
  },
  primaryButtonDisabled: { opacity: 0.4 },
  primaryButtonText: {
    color: colors.white,
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 14,
  },
  speciesChoice: {
    alignItems: "center",
    backgroundColor: colors.paper,
    borderRadius: 18,
    flexDirection: "row",
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 10,
    shadowColor: "#2A3A4A",
    shadowOffset: { height: 4, width: 0 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
  },
  speciesChoiceActive: {
    backgroundColor: colors.coralSoft,
  },
  speciesDot: { borderRadius: 5, height: 8, width: 8 },
  speciesLabel: {
    color: colors.muted,
    fontFamily: "Manrope_700Bold",
    fontSize: 12,
  },
  speciesLabelActive: { color: colors.coral },
  speciesRow: { flexDirection: "row", gap: 8 },
  stepPill: {
    backgroundColor: colors.paper,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  stepText: {
    color: colors.muted,
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 9,
    letterSpacing: 0.6,
  },
  title: {
    color: colors.ink,
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 26,
    letterSpacing: -0.5,
    marginTop: 2,
  },
});
