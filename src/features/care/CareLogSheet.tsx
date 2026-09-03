import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import {
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

import { colors, shadow } from "../../design";
import { INPUT_LIMITS } from "../../utils/input-limits";

import { formatCareTime } from "./engine";
import { getCategoryMeta } from "./meta";
import { tryAcquireSubmissionLock } from "./submission-lock";
import { careTaskSummary } from "./task-details";
import type { CareLogActual, ScheduledCare } from "./types";

export function CareLogSheet({
  visible,
  occurrence,
  bottomInset,
  onClose,
  onSave,
  onUndo,
}: {
  visible: boolean;
  occurrence: ScheduledCare | null;
  bottomInset: number;
  onClose: () => void;
  onSave: (note: string, actual?: CareLogActual) => void;
  onUndo: () => void;
}) {
  const [quantity, setQuantity] = useState("");
  const [duration, setDuration] = useState("");
  const [dose, setDose] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const saveLock = useRef(false);

  useEffect(() => {
    const planned = occurrence?.log?.planned ?? occurrence?.task.details;
    const actual = occurrence?.log?.actual;
    setQuantity(actual?.quantity ?? planned?.quantity ?? "");
    setDuration(
      actual?.durationMinutes ?? planned?.durationMinutes
        ? String(actual?.durationMinutes ?? planned?.durationMinutes)
        : "",
    );
    setDose(actual?.dose ?? planned?.dose ?? "");
    setNote(occurrence?.log?.note ?? "");
    setError(null);
  }, [occurrence?.id, occurrence?.log, occurrence?.task.details]);

  if (!occurrence || !occurrence.log) return null;

  const meta = getCategoryMeta(occurrence.task.category);
  const completed = occurrence.status === "done";
  const capturesQuantity =
    occurrence.task.category === "feeding" ||
    occurrence.task.category === "water";
  const capturesDuration =
    occurrence.task.category === "walk" ||
    occurrence.task.category === "play" ||
    occurrence.task.category === "training" ||
    occurrence.task.category === "grooming";
  const capturesDose = occurrence.task.category === "medication";
  const plannedTask = occurrence.log.planned
    ? { ...occurrence.task, details: occurrence.log.planned }
    : occurrence.task;
  const plannedSummary = careTaskSummary(plannedTask);

  const save = () => {
    const actual: CareLogActual = {};
    if (completed && capturesQuantity && quantity.trim()) {
      actual.quantity = quantity.trim();
    }
    if (completed && capturesDuration && duration.trim()) {
      const durationMinutes = Number(duration);
      if (
        !Number.isInteger(durationMinutes) ||
        durationMinutes <= 0 ||
        durationMinutes > 1440
      ) {
        setError("Duration must be a whole number between 1 and 1440 minutes.");
        return;
      }
      actual.durationMinutes = durationMinutes;
    }
    if (completed && capturesDose && dose.trim()) {
      actual.dose = dose.trim();
    }
    if (!tryAcquireSubmissionLock(saveLock)) return;
    onSave(note, Object.keys(actual).length > 0 ? actual : undefined);
  };

  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      presentationStyle="overFullScreen"
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.overlay}
      >
        <Pressable
          accessibilityLabel="Close care log"
          accessibilityRole="button"
          onPress={onClose}
          style={styles.backdrop}
        />
        <View accessibilityViewIsModal style={[styles.sheet, { paddingBottom: bottomInset + 18 }]}>
          <View style={styles.handle} />
          <View style={styles.heading}>
            <View style={[styles.icon, { backgroundColor: meta.softColor }]}>
              <Ionicons
                color={meta.color}
                name={meta.icon as keyof typeof Ionicons.glyphMap}
                size={22}
              />
            </View>
            <View style={styles.flex}>
              <Text style={styles.eyebrow}>CARE HISTORY</Text>
              <Text numberOfLines={1} style={styles.title}>
                {occurrence.task.title}
              </Text>
              <Text style={styles.subtitle}>
                {occurrence.pet.name} / {formatCareTime(occurrence.scheduledTime)}
              </Text>
            </View>
            <View
              style={[
                styles.status,
                completed ? styles.statusDone : styles.statusSkipped,
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  completed ? styles.statusTextDone : styles.statusTextSkipped,
                ]}
              >
                {completed ? "DONE" : "SKIPPED"}
              </Text>
            </View>
            <Pressable
              accessibilityLabel="Close care log"
              accessibilityRole="button"
              hitSlop={4}
              onPress={onClose}
              style={styles.close}
            >
              <Ionicons color={colors.ink} name="close" size={20} />
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {plannedSummary ? (
              <View style={styles.planned}>
                <Ionicons color={colors.navy} name="calendar-outline" size={16} />
                <View style={styles.flex}>
                  <Text style={styles.plannedLabel}>PLANNED</Text>
                  <Text style={styles.plannedText}>{plannedSummary}</Text>
                </View>
              </View>
            ) : null}

            {completed && capturesQuantity ? (
              <>
                <Text style={styles.inputLabel}>Actual amount</Text>
                <TextInput
                  accessibilityLabel="Actual care amount"
                  maxLength={INPUT_LIMITS.shortText}
                  onChangeText={setQuantity}
                  placeholder="What was actually served?"
                  placeholderTextColor={colors.muted}
                  style={styles.input}
                  value={quantity}
                />
              </>
            ) : null}
            {completed && capturesDuration ? (
              <>
                <Text style={styles.inputLabel}>Actual duration</Text>
                <TextInput
                  accessibilityLabel="Actual duration in minutes"
                  keyboardType="number-pad"
                  maxLength={4}
                  onChangeText={setDuration}
                  placeholder="Minutes completed"
                  placeholderTextColor={colors.muted}
                  style={styles.input}
                  value={duration}
                />
              </>
            ) : null}
            {completed && capturesDose ? (
              <>
                <Text style={styles.inputLabel}>Dose given</Text>
                <TextInput
                  accessibilityLabel="Dose actually given"
                  maxLength={INPUT_LIMITS.shortText}
                  onChangeText={setDose}
                  placeholder="Confirm the dose"
                  placeholderTextColor={colors.muted}
                  style={styles.input}
                  value={dose}
                />
              </>
            ) : null}

            <Text style={styles.inputLabel}>
              {completed ? "Care note" : "Reason or note"}
            </Text>
            <TextInput
              accessibilityLabel="Care log note"
              maxLength={INPUT_LIMITS.notes}
              multiline
              onChangeText={setNote}
              placeholder={
                completed
                  ? "Anything useful for the next caregiver?"
                  : "Why was this skipped?"
              }
              placeholderTextColor={colors.muted}
              style={[styles.input, styles.note]}
              value={note}
            />
            {error ? (
              <Text
                accessibilityLiveRegion="polite"
                accessibilityRole="alert"
                style={styles.error}
              >
                {error}
              </Text>
            ) : null}

            <Pressable
              accessibilityLabel="Save care log details"
              accessibilityRole="button"
              onPress={save}
              style={styles.save}
            >
              <Ionicons color={colors.white} name="checkmark" size={19} />
              <Text style={styles.saveText}>Save log details</Text>
            </Pressable>
            <Pressable
              accessibilityLabel="Return care moment to pending"
              accessibilityRole="button"
              onPress={onUndo}
              style={styles.undo}
            >
              <Ionicons color={colors.danger} name="refresh-outline" size={17} />
              <Text style={styles.undoText}>Return to pending</Text>
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { backgroundColor: "rgba(24,34,42,0.48)", bottom: 0, left: 0, position: "absolute", right: 0, top: 0 },
  close: { alignItems: "center", backgroundColor: colors.background, borderColor: colors.line, borderRadius: 22, borderWidth: 1, height: 44, justifyContent: "center", width: 44 },
  content: { paddingBottom: 4, paddingHorizontal: 20 },
  error: { color: colors.danger, fontFamily: "Nunito_700Bold", fontSize: 11, marginTop: 7 },
  eyebrow: { color: colors.navy, fontFamily: "Nunito_800ExtraBold", fontSize: 8, letterSpacing: 1 },
  flex: { flex: 1 },
  handle: { alignSelf: "center", backgroundColor: colors.line, borderRadius: 3, height: 5, marginBottom: 14, width: 42 },
  heading: { alignItems: "center", flexDirection: "row", gap: 10, paddingBottom: 13, paddingHorizontal: 20 },
  icon: { alignItems: "center", borderRadius: 20, height: 44, justifyContent: "center", width: 44 },
  input: { backgroundColor: colors.background, borderColor: colors.line, borderRadius: 16, borderWidth: 1, color: colors.ink, fontFamily: "Nunito_700Bold", fontSize: 13, paddingHorizontal: 13, paddingVertical: 11 },
  inputLabel: { color: colors.muted, fontFamily: "Nunito_700Bold", fontSize: 10, marginBottom: 5, marginLeft: 2, marginTop: 10 },
  note: { minHeight: 74, textAlignVertical: "top" },
  overlay: { flex: 1, justifyContent: "flex-end" },
  planned: { alignItems: "flex-start", backgroundColor: colors.skySoft, borderRadius: 17, flexDirection: "row", gap: 9, marginBottom: 4, padding: 12 },
  plannedLabel: { color: colors.navy, fontFamily: "Nunito_800ExtraBold", fontSize: 8, letterSpacing: 0.8 },
  plannedText: { color: colors.ink, fontFamily: "Nunito_600SemiBold", fontSize: 11, lineHeight: 16, marginTop: 2 },
  save: { alignItems: "center", backgroundColor: colors.sage, borderRadius: 18, flexDirection: "row", gap: 7, justifyContent: "center", marginTop: 15, minHeight: 50, ...shadow.subtle },
  saveText: { color: colors.white, fontFamily: "Nunito_800ExtraBold", fontSize: 13 },
  sheet: { backgroundColor: colors.paper, borderTopLeftRadius: 31, borderTopRightRadius: 31, maxHeight: "88%", paddingTop: 10, ...shadow.card },
  status: { borderRadius: 12, paddingHorizontal: 8, paddingVertical: 6 },
  statusDone: { backgroundColor: colors.sageSoft },
  statusSkipped: { backgroundColor: colors.line },
  statusText: { fontFamily: "Nunito_800ExtraBold", fontSize: 8, letterSpacing: 0.5 },
  statusTextDone: { color: colors.sage },
  statusTextSkipped: { color: colors.muted },
  subtitle: { color: colors.muted, fontFamily: "Nunito_600SemiBold", fontSize: 10, marginTop: 1 },
  title: { color: colors.ink, fontFamily: "Fredoka_600SemiBold", fontSize: 20, lineHeight: 23 },
  undo: { alignItems: "center", flexDirection: "row", gap: 6, justifyContent: "center", marginTop: 8, minHeight: 44 },
  undoText: { color: colors.danger, fontFamily: "Nunito_800ExtraBold", fontSize: 11 },
});
