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
import type {
  MedicationForm,
  OnboardingMedicationDraft,
  OnboardingPetDraft,
} from "./types";

interface AddMedicationOnboardingScreenProps {
  pet: OnboardingPetDraft;
  onBack: () => void;
  onNext: (medication: OnboardingMedicationDraft) => void;
}

const FORM_OPTIONS: Array<{
  id: MedicationForm;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}> = [
  { id: "tablet", icon: "ellipse-outline", label: "Tablet" },
  { id: "liquid", icon: "water-outline", label: "Liquid" },
  { id: "drops", icon: "eyedrop-outline", label: "Drops" },
  { id: "injection", icon: "medkit-outline", label: "Injection" },
];

const TIME_PRESETS = ["08:00", "12:00", "20:00"];

/**
 * Stage 4, step 4: add the first medication.
 *
 * v1 supports a single daily-at-times schedule. The full
 * recurrence engine lands in stage 5.
 */
export function AddMedicationOnboardingScreen({
  pet,
  onBack,
  onNext,
}: AddMedicationOnboardingScreenProps) {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [form, setForm] = useState<MedicationForm>("tablet");
  const [times, setTimes] = useState<string[]>(["08:00"]);
  const [customTime, setCustomTime] = useState("");
  const [supply, setSupply] = useState("30");

  const togglePreset = (time: string) => {
    setTimes((current) =>
      current.includes(time)
        ? current.filter((t) => t !== time)
        : [...current, time].sort(),
    );
  };

  const addCustomTime = () => {
    if (!/^\d{2}:\d{2}$/.test(customTime)) {
      Alert.alert("Time must be HH:MM", "Use the 24-hour format, for example 08:30 or 19:45.");
      return;
    }
    setTimes((current) =>
      current.includes(customTime) ? current : [...current, customTime].sort(),
    );
    setCustomTime("");
  };

  const submit = () => {
    if (!name.trim() || !dosage.trim() || times.length === 0) {
      Alert.alert(
        "A few details are missing",
        "Add the medication name, dosage, and at least one time.",
      );
      return;
    }
    onNext({
      petId: pet.name,
      name: name.trim(),
      form,
      dosageText: dosage.trim(),
      times,
      startingSupply: Math.max(0, Number(supply) || 0),
      supplyUnit: form === "liquid" ? "doses" : "tablets",
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
            <Text style={styles.kicker}>{`${pet.name.toUpperCase()}'S FIRST MED`}</Text>
            <Text style={styles.title}>Add medication</Text>
          </View>
          <View style={styles.stepPill}>
            <Text style={styles.stepText}>2 OF 2</Text>
          </View>
        </View>

        <View style={styles.illustration}>
          <Ionicons color={colors.coral} name="medical" size={30} />
          <View style={styles.flex}>
            <Text style={styles.illustrationTitle}>Add exactly what your vet prescribed.</Text>
            <Text style={styles.illustrationCopy}>
              PawPair tracks the schedule. It never changes dosage or
              replaces veterinary advice.
            </Text>
          </View>
        </View>

        <Text style={styles.label}>Medication name</Text>
        <View style={styles.input}>
          <TextInput
            accessibilityLabel="Medication name"
            autoFocus
            onChangeText={setName}
            placeholder="e.g. Carprofen"
            placeholderTextColor="#A9B0B3"
            style={styles.inputField}
            value={name}
          />
        </View>

        <Text style={styles.label}>Dosage</Text>
        <View style={styles.input}>
          <TextInput
            accessibilityLabel="Dosage"
            onChangeText={setDosage}
            placeholder="e.g. 75 mg"
            placeholderTextColor="#A9B0B3"
            style={styles.inputField}
            value={dosage}
          />
        </View>

        <Text style={styles.label}>Form</Text>
        <ScrollView
          contentContainerStyle={styles.formRow}
          horizontal
          showsHorizontalScrollIndicator={false}
        >
          {FORM_OPTIONS.map((option) => {
            const active = option.id === form;
            return (
              <Pressable
                key={option.id}
                onPress={() => setForm(option.id)}
                style={[
                  styles.formChoice,
                  active && styles.formChoiceActive,
                ]}
              >
                <Ionicons
                  color={active ? colors.coral : colors.muted}
                  name={option.icon}
                  size={18}
                />
                <Text
                  style={[
                    styles.formChoiceLabel,
                    active && styles.formChoiceLabelActive,
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <Text style={styles.label}>When?</Text>
        <View style={styles.timeRow}>
          {TIME_PRESETS.map((preset) => {
            const active = times.includes(preset);
            return (
              <Pressable
                key={preset}
                onPress={() => togglePreset(preset)}
                style={[styles.timeChoice, active && styles.timeChoiceActive]}
              >
                <Text
                  style={[
                    styles.timeChoiceLabel,
                    active && styles.timeChoiceLabelActive,
                  ]}
                >
                  {preset}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.customTimeRow}>
          <View style={[styles.input, styles.flex]}>
            <TextInput
              accessibilityLabel="Custom time"
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={5}
              onChangeText={setCustomTime}
              placeholder="Custom HH:MM"
              placeholderTextColor="#A9B0B3"
              style={styles.inputField}
              value={customTime}
            />
          </View>
          <Pressable onPress={addCustomTime} style={styles.addTimeButton}>
            <Ionicons color={colors.white} name="add" size={18} />
            <Text style={styles.addTimeButtonText}>Add</Text>
          </Pressable>
        </View>
        {times.length > 0 && (
          <Text style={styles.summaryLine}>
            {times.length === 1
              ? `Once a day at ${times[0]}`
              : `${times.length} times a day: ${times.join(", ")}`}
          </Text>
        )}

        <Text style={styles.label}>Starting supply</Text>
        <View style={styles.input}>
          <TextInput
            accessibilityLabel="Starting supply"
            keyboardType="number-pad"
            onChangeText={setSupply}
            placeholder="30"
            placeholderTextColor="#A9B0B3"
            style={styles.inputField}
            value={supply}
          />
          <Text style={styles.inputSuffix}>
            {form === "liquid" ? "doses" : "tablets"}
          </Text>
        </View>

        <View style={styles.cta}>
          <Pressable onPress={submit} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Save medication</Text>
            <Ionicons color={colors.white} name="checkmark" size={18} />
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  addTimeButton: {
    alignItems: "center",
    backgroundColor: colors.coral,
    borderRadius: 14,
    flexDirection: "row",
    gap: 6,
    height: 52,
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  addTimeButtonText: {
    color: colors.white,
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 12,
  },
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
  customTimeRow: { alignItems: "center", flexDirection: "row", gap: 8, marginTop: 8 },
  flex: { flex: 1 },
  formChoice: {
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
  formChoiceActive: {
    backgroundColor: colors.coralSoft,
  },
  formChoiceLabel: {
    color: colors.muted,
    fontFamily: "Manrope_700Bold",
    fontSize: 12,
  },
  formChoiceLabelActive: { color: colors.coral },
  formRow: { gap: 8, paddingBottom: 4 },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  illustration: {
    alignItems: "center",
    backgroundColor: colors.butterSoft,
    borderRadius: 24,
    flexDirection: "row",
    gap: 14,
    marginBottom: 24,
    padding: 16,
  },
  illustrationCopy: {
    color: colors.muted,
    fontFamily: "Manrope_400Regular",
    fontSize: 12,
    marginTop: 4,
  },
  illustrationTitle: {
    color: colors.ink,
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 14,
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
  inputSuffix: {
    color: colors.muted,
    fontFamily: "Manrope_700Bold",
    fontSize: 11,
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
  summaryLine: {
    color: colors.muted,
    fontFamily: "Manrope_600SemiBold",
    fontSize: 11,
    marginTop: 10,
  },
  timeChoice: {
    backgroundColor: colors.paper,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: "#2A3A4A",
    shadowOffset: { height: 4, width: 0 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
  },
  timeChoiceActive: {
    backgroundColor: colors.coral,
  },
  timeChoiceLabel: {
    color: colors.muted,
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 12,
  },
  timeChoiceLabelActive: { color: colors.white },
  timeRow: { flexDirection: "row", gap: 8 },
  title: {
    color: colors.ink,
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 26,
    letterSpacing: -0.5,
    marginTop: 2,
  },
});
