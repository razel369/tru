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
import { useMemo, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors } from "../../design";
import type { Medication, Pet } from "../../types";
import {
  EMPTY_DRAFT,
  FORM_STEP_TITLES,
  FORM_STEPS,
  validateStep,
} from "./form-state";
import type { FormStep, MedicationDraft } from "./form-state";

interface MedicationFormScreenProps {
  pets: Pet[];
  petImages: Record<Pet["avatar"], import("react-native").ImageSourcePropType>;
  editing?: Medication;
  initialDraft?: Partial<MedicationDraft>;
  onCancel: () => void;
  onSave: (draft: MedicationDraft) => void;
}

/**
 * Multi-step add/edit medication form.
 *
 * - When `editing` is provided we prefill the draft with that
 *   medication's values and the Save flow calls `onSave` with
 *   the new draft. The host is responsible for updating the
 *   state and persisting.
 * - When `editing` is undefined this is a new medication and
 *   we start from the supplied (or empty) draft.
 *
 * Each step blocks on `validateStep`. The Review step is the
 * only place the user can press "Save"; all others let them
 * advance and surface validation as a toast.
 */
export function MedicationFormScreen({
  pets,
  petImages,
  editing,
  initialDraft,
  onCancel,
  onSave,
}: MedicationFormScreenProps) {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<FormStep>(FORM_STEPS[0] ?? "pet");
  const [draft, setDraft] = useState<MedicationDraft>(() => ({
    ...EMPTY_DRAFT,
    ...initialDraft,
    petId: initialDraft?.petId ?? pets[0]?.id ?? "",
  }));

  const stepIndex = useMemo(() => FORM_STEPS.indexOf(step), [step]);
  const totalSteps = FORM_STEPS.length;

  const update = (patch: Partial<MedicationDraft>) => {
    setDraft((current) => ({ ...current, ...patch }));
  };

  const goNext = () => {
    const err = validateStep(step, draft);
    if (err) {
      Alert.alert("A few details are missing", err);
      return;
    }
    const i = FORM_STEPS.indexOf(step);
    const next = FORM_STEPS[i + 1];
    if (next) setStep(next);
  };

  const goBack = () => {
    const i = FORM_STEPS.indexOf(step);
    const prev = FORM_STEPS[i - 1];
    if (prev) setStep(prev);
    else onCancel();
  };

  const submit = () => {
    for (const s of FORM_STEPS) {
      if (s === "review") continue;
      const err = validateStep(s, draft);
      if (err) {
        Alert.alert("A few details are missing", err);
        setStep(s);
        return;
      }
    }
    onSave(draft);
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
          <Pressable onPress={goBack} style={styles.closeButton}>
            <Ionicons
              color={colors.ink}
              name={stepIndex === 0 ? "close" : "arrow-back"}
              size={22}
            />
          </Pressable>
          <View style={styles.flex}>
            <Text style={styles.kicker}>
              {editing ? "EDIT MEDICATION" : "NEW CARE ROUTINE"}
            </Text>
            <Text style={styles.title}>
              {FORM_STEP_TITLES[step]}
            </Text>
          </View>
          <View style={styles.stepPill}>
            <Text style={styles.stepText}>
              {stepIndex + 1} OF {totalSteps}
            </Text>
          </View>
        </View>

        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${Math.round(((stepIndex + 1) / totalSteps) * 100)}%` },
            ]}
          />
        </View>

        {step === "pet" && <PetStep draft={draft} pets={pets} petImages={petImages} update={update} />}
        {step === "identity" && <IdentityStep draft={draft} update={update} />}
        {step === "schedule" && <ScheduleStep draft={draft} update={update} />}
        {step === "inventory" && <InventoryStep draft={draft} update={update} />}
        {step === "review" && (
          <ReviewStep
            draft={draft}
            petName={pets.find((p) => p.id === draft.petId)?.name ?? ""}
          />
        )}

        <View style={styles.cta}>
          {step !== "review" ? (
            <Pressable onPress={goNext} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>Continue</Text>
              <Ionicons color={colors.white} name="arrow-forward" size={18} />
            </Pressable>
          ) : (
            <Pressable onPress={submit} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>
                {editing ? "Save changes" : "Add to care plan"}
              </Text>
              <Ionicons color={colors.white} name="checkmark" size={18} />
            </Pressable>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function PetStep({
  draft,
  pets,
  petImages,
  update,
}: {
  draft: MedicationDraft;
  pets: Pet[];
  petImages: Record<Pet["avatar"], import("react-native").ImageSourcePropType>;
  update: (patch: Partial<MedicationDraft>) => void;
}) {
  return (
    <View>
      <Text style={styles.label}>Who is it for?</Text>
      <View style={styles.petRow}>
        {pets.map((pet) => {
          const active = pet.id === draft.petId;
          return (
            <Pressable
              key={pet.id}
              onPress={() => update({ petId: pet.id })}
              style={[styles.petChoice, active && styles.petChoiceActive]}
            >
              <Image source={petImages[pet.avatar]} style={styles.petChoiceImage} />
              <Text
                style={[
                  styles.petChoiceName,
                  active && styles.petChoiceNameActive,
                ]}
              >
                {pet.name}
              </Text>
              {active && (
                <View style={styles.choiceCheck}>
                  <Ionicons color={colors.white} name="checkmark" size={11} />
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function IdentityStep({
  draft,
  update,
}: {
  draft: MedicationDraft;
  update: (patch: Partial<MedicationDraft>) => void;
}) {
  const forms: Array<{ id: MedicationDraft["form"]; label: string }> = [
    { id: "tablet", label: "Tablet" },
    { id: "capsule", label: "Capsule" },
    { id: "liquid", label: "Liquid" },
    { id: "drops", label: "Drops" },
    { id: "injection", label: "Injection" },
    { id: "topical", label: "Topical" },
  ];
  return (
    <View>
      <Text style={styles.label}>Medication name</Text>
      <View style={styles.input}>
        <TextInput
          accessibilityLabel="Medication name"
          autoFocus
          onChangeText={(value) => update({ name: value })}
          placeholder="e.g. Carprofen"
          placeholderTextColor="#A9B0B3"
          style={styles.inputField}
          value={draft.name}
        />
      </View>
      <Text style={styles.label}>Dosage</Text>
      <View style={styles.input}>
        <TextInput
          accessibilityLabel="Dosage"
          onChangeText={(value) => update({ dosage: value })}
          placeholder="e.g. 75 mg"
          placeholderTextColor="#A9B0B3"
          style={styles.inputField}
          value={draft.dosage}
        />
      </View>
      <Text style={styles.label}>Form</Text>
      <View style={styles.formRow}>
        {forms.map((option) => {
          const active = option.id === draft.form;
          return (
            <Pressable
              key={option.id}
              onPress={() => update({ form: option.id })}
              style={[styles.formChoice, active && styles.formChoiceActive]}
            >
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
      </View>
      <Text style={styles.label}>Instructions (optional)</Text>
      <View style={styles.input}>
        <TextInput
          accessibilityLabel="Instructions"
          multiline
          onChangeText={(value) => update({ instructions: value })}
          placeholder="e.g. Give with food"
          placeholderTextColor="#A9B0B3"
          style={styles.inputFieldMultiline}
          value={draft.instructions}
        />
      </View>
    </View>
  );
}

function ScheduleStep({
  draft,
  update,
}: {
  draft: MedicationDraft;
  update: (patch: Partial<MedicationDraft>) => void;
}) {
  const toggleTime = (time: string) => {
    update({
      times: draft.times.includes(time)
        ? draft.times.filter((t) => t !== time)
        : [...draft.times, time].sort(),
    });
  };
  const presets = ["08:00", "12:00", "20:00"];
  return (
    <View>
      <Text style={styles.label}>When?</Text>
      <View style={styles.timeRow}>
        {presets.map((preset) => {
          const active = draft.times.includes(preset);
          return (
            <Pressable
              key={preset}
              onPress={() => toggleTime(preset)}
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
      <Text style={styles.summaryLine}>
        {draft.times.length === 0
          ? "Pick at least one time."
          : draft.times.length === 1
            ? `Once a day at ${draft.times[0]}`
            : `${draft.times.length} times a day: ${draft.times.join(", ")}`}
      </Text>
    </View>
  );
}

function InventoryStep({
  draft,
  update,
}: {
  draft: MedicationDraft;
  update: (patch: Partial<MedicationDraft>) => void;
}) {
  return (
    <View>
      <Text style={styles.label}>Starting supply</Text>
      <View style={styles.input}>
        <TextInput
          accessibilityLabel="Starting supply"
          keyboardType="number-pad"
          onChangeText={(value) => update({ startingSupply: Number(value) || 0 })}
          placeholder="30"
          placeholderTextColor="#A9B0B3"
          style={styles.inputField}
          value={draft.startingSupply.toString()}
        />
        <Text style={styles.inputSuffix}>
          {draft.form === "liquid" ? "doses" : "tablets"}
        </Text>
      </View>
    </View>
  );
}

function ReviewStep({
  draft,
  petName,
}: {
  draft: MedicationDraft;
  petName: string;
}) {
  return (
    <View>
      <Text style={styles.label}>REVIEW</Text>
      <View style={styles.reviewCard}>
        <View style={styles.reviewRow}>
          <Text style={styles.reviewLabel}>Pet</Text>
          <Text style={styles.reviewValue}>{petName}</Text>
        </View>
        <View style={styles.reviewRow}>
          <Text style={styles.reviewLabel}>Medication</Text>
          <Text style={styles.reviewValue}>{draft.name}</Text>
        </View>
        <View style={styles.reviewRow}>
          <Text style={styles.reviewLabel}>Dosage</Text>
          <Text style={styles.reviewValue}>{draft.dosage}</Text>
        </View>
        <View style={styles.reviewRow}>
          <Text style={styles.reviewLabel}>Form</Text>
          <Text style={styles.reviewValue}>{draft.form}</Text>
        </View>
        <View style={styles.reviewRow}>
          <Text style={styles.reviewLabel}>Times</Text>
          <Text style={styles.reviewValue}>{draft.times.join(", ")}</Text>
        </View>
        <View style={styles.reviewRow}>
          <Text style={styles.reviewLabel}>Starting supply</Text>
          <Text style={styles.reviewValue}>
            {draft.startingSupply} {draft.supplyUnit}
          </Text>
        </View>
      </View>
    </View>
  );
}

import { Image } from "react-native";

const styles = StyleSheet.create({
  choiceCheck: {
    alignItems: "center",
    backgroundColor: colors.coral,
    borderRadius: 8,
    height: 16,
    justifyContent: "center",
    position: "absolute",
    right: 7,
    top: 7,
    width: 16,
  },
  closeButton: {
    alignItems: "center",
    backgroundColor: colors.paper,
    borderColor: colors.line,
    borderRadius: 15,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  content: { paddingHorizontal: 24 },
  cta: { marginTop: 28 },
  flex: { flex: 1 },
  formChoice: {
    alignItems: "center",
    backgroundColor: colors.paper,
    borderColor: colors.line,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  formChoiceActive: { backgroundColor: colors.coralSoft, borderColor: "#F0A797" },
  formChoiceLabel: {
    color: colors.muted,
    fontFamily: "Manrope_700Bold",
    fontSize: 12,
  },
  formChoiceLabelActive: { color: colors.coral },
  formRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  input: {
    alignItems: "center",
    backgroundColor: colors.paper,
    borderColor: colors.line,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    height: 52,
    paddingHorizontal: 14,
  },
  inputField: {
    color: colors.ink,
    flex: 1,
    fontFamily: "Manrope_700Bold",
    fontSize: 15,
    padding: 0,
  },
  inputFieldMultiline: {
    color: colors.ink,
    flex: 1,
    fontFamily: "Manrope_400Regular",
    fontSize: 14,
    minHeight: 60,
    padding: 0,
    paddingTop: 14,
  },
  inputSuffix: {
    color: colors.muted,
    fontFamily: "Manrope_700Bold",
    fontSize: 11,
  },
  kicker: {
    color: colors.muted,
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
  petChoice: {
    alignItems: "center",
    backgroundColor: colors.paper,
    borderColor: colors.line,
    borderRadius: 18,
    borderWidth: 1,
    flex: 1,
    padding: 13,
    position: "relative",
  },
  petChoiceActive: { backgroundColor: colors.coralSoft, borderColor: "#F0A797" },
  petChoiceImage: { borderRadius: 22, height: 44, width: 44 },
  petChoiceName: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "800",
    marginTop: 5,
  },
  petChoiceNameActive: { color: colors.coral },
  petRow: { flexDirection: "row", gap: 9 },
  primaryButton: {
    alignItems: "center",
    backgroundColor: colors.coral,
    borderRadius: 18,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 56,
    paddingHorizontal: 18,
  },
  primaryButtonText: {
    color: colors.white,
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 14,
  },
  progressBar: {
    backgroundColor: colors.line,
    borderRadius: 4,
    height: 6,
    marginBottom: 24,
  },
  progressFill: {
    backgroundColor: colors.coral,
    borderRadius: 4,
    height: 6,
  },
  reviewCard: {
    backgroundColor: colors.paper,
    borderColor: colors.line,
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
  },
  reviewLabel: {
    color: colors.muted,
    fontFamily: "Manrope_700Bold",
    fontSize: 11,
  },
  reviewRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  reviewValue: {
    color: colors.ink,
    fontFamily: "Manrope_700Bold",
    fontSize: 13,
  },
  stepPill: {
    backgroundColor: colors.paper,
    borderColor: colors.line,
    borderRadius: 11,
    borderWidth: 1,
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
    borderColor: colors.line,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  timeChoiceActive: { backgroundColor: colors.coral, borderColor: colors.coral },
  timeChoiceLabel: {
    color: colors.muted,
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 12,
  },
  timeChoiceLabelActive: { color: colors.white },
  timeRow: { flexDirection: "row", gap: 8 },
  title: {
    color: colors.ink,
    fontFamily: "Fraunces_700Bold",
    fontSize: 26,
    letterSpacing: -0.4,
    marginTop: 2,
  },
});
