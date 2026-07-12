import { Ionicons } from "@expo/vector-icons";
import {
  Alert,
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
import type { Pet } from "../../types";

const SPECIES_OPTIONS: Array<{
  id: Pet["species"];
  label: string;
  color: string;
}> = [
  { id: "dog", label: "Dog", color: "#F3B66D" },
  { id: "cat", label: "Cat", color: "#9891C7" },
  { id: "other", label: "Other", color: "#5D9387" },
];

const PORTRAIT_OPTIONS: Array<{
  id: Pet["avatar"];
  label: string;
}> = [
  { id: "milo", label: "Milo" },
  { id: "luna", label: "Luna" },
];

interface PetFormScreenProps {
  editing?: Pet;
  onCancel: () => void;
  onSave: (pet: Pet) => void;
}

/**
 * Add or edit a pet. Single-screen form with progressive
 * validation. Reuses the visual language of the onboarding
 * "Add your first pet" screen so the experience is consistent.
 */
export function PetFormScreen({
  editing,
  onCancel,
  onSave,
}: PetFormScreenProps) {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState(editing?.name ?? "");
  const [species, setSpecies] = useState<Pet["species"]>(
    editing?.species ?? "dog",
  );
  const [breed, setBreed] = useState(editing?.breed ?? "");
  const [age, setAge] = useState(
    editing?.age ? String(editing.age) : "",
  );
  const [avatar, setAvatar] = useState<Pet["avatar"]>(
    editing?.avatar ?? "milo",
  );

  const accent =
    editing?.color ??
    SPECIES_OPTIONS.find((s) => s.id === species)?.color ??
    colors.coral;

  const submit = () => {
    if (!name.trim()) {
      Alert.alert("Name required", "Add a name for your pet.");
      return;
    }
    const pet: Pet = {
      id: editing?.id ?? name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      name: name.trim(),
      species,
      breed: breed.trim(),
      age: age ? Number(age) : 0,
      avatar,
      color: accent,
      medications: editing?.medications ?? [],
    };
    onSave(pet);
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
          <Pressable onPress={onCancel} style={styles.closeButton}>
            <Ionicons color={colors.ink} name="close" size={22} />
          </Pressable>
          <View style={styles.flex}>
            <Text style={styles.kicker}>
              {editing ? "EDIT PET" : "NEW PET"}
            </Text>
            <Text style={styles.title}>
              {editing ? editing.name : "Add a pet"}
            </Text>
          </View>
        </View>

        <View style={[styles.preview, { backgroundColor: `${accent}22` }]}>
          <View style={[styles.previewDot, { backgroundColor: accent }]} />
          <Text style={styles.previewName}>{name.trim() || "Your pet"}</Text>
        </View>

        <Text style={styles.label}>Name</Text>
        <View style={styles.input}>
          <TextInput
            accessibilityLabel="Pet name"
            autoFocus={!editing}
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
                  style={[styles.speciesDot, { backgroundColor: option.color }]}
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
            const active = option.id === avatar;
            return (
              <Pressable
                key={option.id}
                onPress={() => setAvatar(option.id)}
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
          <Pressable onPress={submit} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>
              {editing ? "Save changes" : "Add pet"}
            </Text>
            <Ionicons color={colors.white} name="arrow-forward" size={18} />
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
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
  cta: { marginTop: 28 },
  flex: { flex: 1 },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  input: {
    alignItems: "center",
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
    color: colors.ink,
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
  title: {
    color: colors.ink,
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 26,
    letterSpacing: -0.5,
    marginTop: 2,
  },
});
