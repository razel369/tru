import { Ionicons } from "@expo/vector-icons";
import type { ImageSourcePropType } from "react-native";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useState } from "react";

import { FormInput, FormLabel } from "../../components/forms/FormInput";
import { colors } from "../../design";
import type { Medication, MedicationForm, Pet } from "../../types";

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

interface AddMedicationScreenProps {
  pets: Pet[];
  topInset: number;
  petImages: Record<Pet["avatar"], ImageSourcePropType>;
  onBack: () => void;
  onSave: (petId: string, medication: Medication) => void;
}

/**
 * Add Medication screen — single-step form for adding a new medication
 * to a pet's care plan. Extracted verbatim from App.tsx in stage 2.
 *
 * The handoff (docs/AAA-HANDOFF.md §8) calls for a multi-step native
 * flow with progressive validation; the current single-form UI will be
 * reworked in stage 7.
 */
export function AddMedicationScreen({
  pets,
  topInset,
  petImages,
  onBack,
  onSave,
}: AddMedicationScreenProps) {
  const [petId, setPetId] = useState(pets[0]?.id ?? "");
  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [instructions, setInstructions] = useState("Give with food");
  const [time, setTime] = useState("08:00");
  const [stock, setStock] = useState("30");
  const [form, setForm] = useState<MedicationForm>("tablet");

  const save = () => {
    if (!petId || !name.trim() || !dosage.trim() || !/^\d{2}:\d{2}$/.test(time)) {
      Alert.alert(
        "A few details are missing",
        "Choose a pet and add the medication, dosage, and time.",
      );
      return;
    }
    onSave(petId, {
      id: `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`,
      name: name.trim(),
      dosage: dosage.trim(),
      instructions: instructions.trim() || "Follow veterinary instructions",
      form,
      times: [time],
      stock: Math.max(0, Number(stock) || 0),
      stockUnit: form === "liquid" ? "doses" : "tablets",
      color: colors.coral,
    });
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.flex}
    >
      <ScrollView
        contentContainerStyle={[
          styles.addContent,
          { paddingTop: topInset + 12 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.addHeader}>
          <Pressable onPress={onBack} style={styles.closeButton}>
            <Ionicons color={colors.ink} name="close" size={22} />
          </Pressable>
          <View style={styles.flex}>
            <Text style={styles.sectionKicker}>NEW CARE ROUTINE</Text>
            <Text style={styles.addTitle}>Add medication</Text>
          </View>
          <View style={styles.stepPill}>
            <Text style={styles.stepText}>1 OF 1</Text>
          </View>
        </View>

        <View style={styles.addIllustration}>
          <View style={styles.addIllustrationCircle}>
            <Ionicons color={colors.coral} name="medical" size={30} />
          </View>
          <View>
            <Text style={styles.addIllustrationTitle}>
              Let’s make every dose easy.
            </Text>
            <Text style={styles.addIllustrationCopy}>
              Add exactly what your veterinarian prescribed.
            </Text>
          </View>
        </View>

        <FormLabel label="Who is it for?" />
        <View style={styles.petChoiceRow}>
          {pets.map((pet) => {
            const active = pet.id === petId;
            return (
              <Pressable
                key={pet.id}
                onPress={() => setPetId(pet.id)}
                style={[styles.petChoice, active && styles.petChoiceActive]}
              >
                <Image
                  accessibilityLabel={`Portrait of ${pet.name}`}
                  source={petImages[pet.avatar]}
                  style={styles.petChoiceImage}
                />
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
                    <Ionicons
                      color={colors.white}
                      name="checkmark"
                      size={11}
                    />
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>

        <FormLabel label="Medication form" />
        <ScrollView
          contentContainerStyle={styles.formChoiceRow}
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
                  size={19}
                />
                <Text
                  style={[
                    styles.formChoiceText,
                    active && styles.formChoiceTextActive,
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.formCard}>
          <FormInput
            label="Medication name"
            onChange={setName}
            placeholder="e.g. Carprofen"
            value={name}
          />
          <View style={styles.formTwoColumns}>
            <View style={styles.flex}>
              <FormInput
                label="Dosage"
                onChange={setDosage}
                placeholder="e.g. 75 mg"
                value={dosage}
              />
            </View>
            <View style={styles.flex}>
              <FormInput
                label="Time"
                onChange={setTime}
                placeholder="08:00"
                value={time}
              />
            </View>
          </View>
          <FormInput
            label="Instructions"
            onChange={setInstructions}
            placeholder="Give with food"
            value={instructions}
          />
          <FormInput
            keyboardType="number-pad"
            label="Starting supply"
            onChange={setStock}
            placeholder="30"
            suffix={form === "liquid" ? "doses" : "tablets"}
            value={stock}
          />
        </View>

        <View style={styles.safetyNote}>
          <Ionicons
            color={colors.sage}
            name="shield-checkmark-outline"
            size={21}
          />
          <Text style={styles.safetyText}>
            PawPair tracks the schedule you enter. It never changes dosage or
            replaces veterinary advice.
          </Text>
        </View>

        <Pressable
          onPress={save}
          style={({ pressed }) => [
            styles.saveMedicationButton,
            pressed && styles.pressed,
          ]}
        >
          <Ionicons color={colors.white} name="sparkles" size={19} />
          <Text style={styles.saveMedicationText}>Add to care plan</Text>
          <Ionicons color={colors.white} name="arrow-forward" size={19} />
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  addContent: { paddingBottom: 34, paddingHorizontal: 18 },
  addHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  addIllustration: {
    alignItems: "center",
    backgroundColor: colors.butterSoft,
    borderRadius: 22,
    flexDirection: "row",
    gap: 14,
    marginBottom: 24,
    padding: 17,
  },
  addIllustrationCircle: {
    alignItems: "center",
    backgroundColor: colors.paper,
    borderRadius: 18,
    height: 58,
    justifyContent: "center",
    transform: [{ rotate: "-5deg" }],
    width: 58,
  },
  addIllustrationCopy: {
    color: colors.muted,
    fontFamily: "Manrope_400Regular",
    fontSize: 11,
    marginTop: 4,
  },
  addIllustrationTitle: {
    color: colors.ink,
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 15,
  },
  addTitle: {
    color: colors.ink,
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 28,
    letterSpacing: -0.6,
    marginTop: 2,
  },
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
    borderRadius: 22,
    height: 44,
    justifyContent: "center",
    width: 44,
    shadowColor: "#2A3A4A",
    shadowOffset: { height: 2, width: 0 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  flex: { flex: 1 },
  formCard: {
    backgroundColor: colors.paper,
    borderRadius: 28,
    marginTop: 5,
    padding: 17,
    shadowColor: "#2A3A4A",
    shadowOffset: { height: 8, width: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
  },
  formChoice: {
    alignItems: "center",
    backgroundColor: colors.background,
    borderRadius: 18,
    flexDirection: "row",
    gap: 7,
    paddingHorizontal: 13,
    paddingVertical: 11,
  },
  formChoiceActive: { backgroundColor: colors.coralSoft },
  formChoiceRow: { gap: 8, paddingBottom: 18 },
  formChoiceText: {
    color: colors.muted,
    fontFamily: "Manrope_700Bold",
    fontSize: 11,
  },
  formChoiceTextActive: { color: colors.coral },
  formTwoColumns: { flexDirection: "row", gap: 10 },
  petChoice: {
    alignItems: "center",
    backgroundColor: colors.background,
    borderRadius: 22,
    flex: 1,
    padding: 13,
    position: "relative",
  },
  petChoiceActive: { backgroundColor: colors.skySoft },
  petChoiceImage: { borderRadius: 22, height: 44, width: 44 },
  petChoiceName: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "800",
    marginTop: 5,
  },
  petChoiceNameActive: { color: colors.sky },
  petChoiceRow: { flexDirection: "row", gap: 9, marginBottom: 22 },
  pressed: { opacity: 0.85 },
  safetyNote: {
    alignItems: "center",
    backgroundColor: colors.sageSoft,
    borderRadius: 20,
    flexDirection: "row",
    gap: 10,
    marginTop: 20,
    padding: 14,
  },
  safetyText: {
    color: "#3F6B61",
    flex: 1,
    fontFamily: "Manrope_600SemiBold",
    fontSize: 11,
    lineHeight: 16,
  },
  saveMedicationButton: {
    alignItems: "center",
    backgroundColor: colors.coral,
    borderRadius: 999,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    marginTop: 20,
    minHeight: 56,
    paddingHorizontal: 18,
    shadowColor: colors.coral,
    shadowOffset: { height: 10, width: 0 },
    shadowOpacity: 0.28,
    shadowRadius: 16,
  },
  saveMedicationText: {
    color: colors.white,
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 13,
  },
  sectionKicker: {
    color: colors.sky,
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 9,
    letterSpacing: 1.4,
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
});
