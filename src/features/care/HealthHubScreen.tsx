import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AccessibilityInfo,
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { assets, colors, shadow } from "../../design";
import type { Pet } from "../../types";
import { INPUT_LIMITS } from "../../utils/input-limits";
import { createLocalId } from "../../utils/local-id";
import { resolvePetMotionPackForProfile } from "../pet-motion";
import { createBreedAssetKey, resolvePetVisual } from "../pet-visuals";

import { careDateKey } from "./engine";
import { tryAcquireSubmissionLock } from "./submission-lock";
import {
  formatAttachmentSize,
  pickLocalHealthAttachment,
  removeLocalHealthAttachment,
  shareLocalHealthAttachment,
} from "./health-attachments";
import {
  buildHealthPassport,
  buildVetBriefHtml,
  buildVetBriefText,
  healthDueLabel,
} from "./health-passport";
import { HEALTH_RECORD_TYPES } from "./meta";
import { removeTemporaryShareFile } from "./temporary-share-file";
import { WeightTrendCard } from "./WeightTrendCard";
import type {
  CareCategory,
  CareTask,
  HealthAttachment,
  HealthRecord,
  HealthRecordSeverity,
  HealthRecordType,
} from "./types";

type HealthFilter = "all" | "preventive" | "signals" | "files";

const FILTERS: {
  filter: HealthFilter;
  label: string;
  types?: HealthRecordType[];
}[] = [
  { filter: "all", label: "All" },
  {
    filter: "preventive",
    label: "Preventive",
    types: ["vaccination", "vet-visit"],
  },
  { filter: "signals", label: "Signals", types: ["weight", "symptom"] },
  { filter: "files", label: "Notes & files", types: ["document", "note"] },
];

const RECORD_TONES: Record<
  HealthRecordType,
  { color: string; soft: string }
> = {
  weight: { color: colors.sky, soft: colors.skySoft },
  vaccination: { color: colors.sage, soft: colors.sageSoft },
  "vet-visit": { color: colors.navy, soft: "#E6EDF2" },
  symptom: { color: colors.coral, soft: colors.coralSoft },
  document: { color: "#9B7AB8", soft: "#F0EAF5" },
  note: { color: "#C98245", soft: "#F7E6D3" },
};

const SEVERITIES: HealthRecordSeverity[] = ["mild", "moderate", "urgent"];

function displayDate(value?: string) {
  if (!value) return "Not set";
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function validDateKey(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day || year < 1900 || year > 2100) return false;
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

export function HealthHubScreen({
  pets,
  activePetId,
  tasks,
  records,
  focusRecordId,
  topInset,
  bottomInset,
  onActivePetChange,
  onAddRecord,
  onRemoveRecord,
  onOpenAddTask,
  onFocusRecordHandled,
  onUpdateRecord,
}: {
  pets: Pet[];
  activePetId: string | null;
  tasks: CareTask[];
  records: HealthRecord[];
  focusRecordId?: string | null;
  topInset: number;
  bottomInset: number;
  onActivePetChange: (petId: string) => void;
  onAddRecord: (record: HealthRecord) => void;
  onRemoveRecord: (recordId: string) => void;
  onOpenAddTask: (category: CareCategory) => void;
  onFocusRecordHandled?: () => void;
  onUpdateRecord: (record: HealthRecord) => void;
}) {
  const activePet = pets.find((pet) => pet.id === activePetId) ?? pets[0];
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<HealthFilter>("all");
  const [type, setType] = useState<HealthRecordType>("weight");
  const [title, setTitle] = useState("");
  const [value, setValue] = useState("");
  const [unit, setUnit] = useState("kg");
  const [date, setDate] = useState(careDateKey(new Date()));
  const [notes, setNotes] = useState("");
  const [provider, setProvider] = useState("");
  const [nextDueDate, setNextDueDate] = useState("");
  const [severity, setSeverity] = useState<HealthRecordSeverity>("mild");
  const [symptomResolved, setSymptomResolved] = useState(false);
  const [resolvedDate, setResolvedDate] = useState(careDateKey(new Date()));
  const [reference, setReference] = useState("");
  const [attachment, setAttachment] = useState<HealthAttachment | undefined>();
  const [attachmentBusy, setAttachmentBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [editingRecord, setEditingRecord] = useState<HealthRecord | null>(null);
  const [listRef, setListRef] = useState<FlatList<HealthRecord> | null>(null);
  const formOffset = useRef<number | null>(null);
  const shouldScrollToForm = useRef(false);
  const saveLock = useRef(false);
  const [shareState, setShareState] = useState<
    "idle" | "working" | "copied" | "error"
  >("idle");

  const petRecords = useMemo(
    () =>
      activePet
        ? records
            .filter((record) => record.petId === activePet.id)
            .sort((a, b) => b.date.localeCompare(a.date))
        : [],
    [activePet, records],
  );
  const passport = useMemo(
    () =>
      activePet
        ? buildHealthPassport(activePet, tasks, records)
        : undefined,
    [activePet, records, tasks],
  );
  const filteredRecords = useMemo(() => {
    const selected = FILTERS.find((item) => item.filter === filter);
    return selected?.types
      ? petRecords.filter((record) => selected.types?.includes(record.type))
      : petRecords;
  }, [filter, petRecords]);

  useEffect(() => {
    if (!focusRecordId) return;
    const index = filteredRecords.findIndex(
      (record) => record.id === focusRecordId,
    );
    if (index < 0) {
      if (filter !== "all") {
        setFilter("all");
      } else {
        onFocusRecordHandled?.();
      }
      return;
    }

    const frame = requestAnimationFrame(() => {
      listRef?.scrollToIndex({ animated: true, index, viewPosition: 0.48 });
    });
    const timeout = setTimeout(() => onFocusRecordHandled?.(), 2400);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timeout);
    };
  }, [filter, filteredRecords, focusRecordId, listRef, onFocusRecordHandled]);

  if (!activePet || !passport) return null;

  const fallback = activePet.avatar === "luna" ? assets.luna : assets.milo;
  const visual = resolvePetVisual(activePet, fallback, assets.heroScene);
  const motionKey =
    visual.assetKey ?? createBreedAssetKey(activePet.species, activePet.breed);
  const petSource =
    resolvePetMotionPackForProfile(motionKey, visual.profile)?.states.idle ??
    visual.petSource;
  const selectedType = HEALTH_RECORD_TYPES.find((item) => item.type === type);
  const scoreTone =
    passport.passportScore >= 80
      ? colors.sage
      : passport.passportScore >= 40
        ? "#C98245"
        : colors.coral;
  const attentionMessage = passport.urgentSymptomCount
    ? `${passport.urgentSymptomCount} urgent ${passport.urgentSymptomCount === 1 ? "symptom is" : "symptoms are"} still marked ongoing`
    : passport.activeSymptomCount
      ? `${passport.activeSymptomCount} ${passport.activeSymptomCount === 1 ? "symptom is" : "symptoms are"} being tracked`
      : passport.overdueVaccines
        ? `${passport.overdueVaccines} vaccine ${passport.overdueVaccines === 1 ? "record needs" : "records need"} attention`
        : passport.dueSoonVaccines
      ? `${passport.dueSoonVaccines} vaccine ${passport.dueSoonVaccines === 1 ? "is" : "are"} due within 45 days`
      : passport.recordCount
        ? "No overdue preventive records"
        : "Add a weight and vaccine record to establish a baseline";

  const resetForm = () => {
    setType("weight");
    setTitle("");
    setValue("");
    setUnit("kg");
    setDate(careDateKey(new Date()));
    setNotes("");
    setProvider("");
    setNextDueDate("");
    setSeverity("mild");
    setSymptomResolved(false);
    setResolvedDate(careDateKey(new Date()));
    setReference("");
    setAttachment(undefined);
    setFormError(null);
    setEditingRecord(null);
  };

  const closeForm = () => {
    if (attachment?.uri !== editingRecord?.attachment?.uri) {
      void removeLocalHealthAttachment(attachment);
    }
    resetForm();
    setShowForm(false);
  };

  const revealForm = (mode: "new" | "edit" = "new") => {
    shouldScrollToForm.current = true;
    setShowForm(true);
    AccessibilityInfo.announceForAccessibility(
      mode === "edit"
        ? "Edit health record form opened"
        : "New health record form opened",
    );
    requestAnimationFrame(() => {
      if (formOffset.current === null) return;
      shouldScrollToForm.current = false;
      listRef?.scrollToOffset({
        animated: true,
        offset: Math.max(0, formOffset.current - 12),
      });
    });
  };

  const discardAttachment = () => {
    const discarded = attachment;
    setAttachment(undefined);
    if (discarded?.uri !== editingRecord?.attachment?.uri) {
      void removeLocalHealthAttachment(discarded);
    }
  };

  const openEditRecord = (record: HealthRecord) => {
    if (attachment?.uri !== editingRecord?.attachment?.uri) {
      void removeLocalHealthAttachment(attachment);
    }
    setEditingRecord(record);
    setType(record.type);
    setTitle(record.title);
    setValue(record.value === undefined ? "" : String(record.value));
    setUnit(record.unit ?? "kg");
    setDate(record.date);
    setNotes(record.notes ?? "");
    setProvider(record.provider ?? "");
    setNextDueDate(record.nextDueDate ?? "");
    setSeverity(record.severity ?? "mild");
    setSymptomResolved(Boolean(record.resolvedDate));
    setResolvedDate(record.resolvedDate ?? careDateKey(new Date()));
    setReference(record.reference ?? "");
    setAttachment(record.attachment);
    setFormError(null);
    revealForm("edit");
  };

  const saveRecord = () => {
    if (!validDateKey(date)) {
      setFormError("Enter a real calendar date in YYYY-MM-DD format.");
      return;
    }
    if (date > careDateKey(new Date())) {
      setFormError(
        "A health record cannot be dated in the future. Add future care as an appointment instead.",
      );
      return;
    }
    if (nextDueDate && !validDateKey(nextDueDate)) {
      setFormError("Enter a real next date in YYYY-MM-DD format.");
      return;
    }
    if (
      (type === "vaccination" || type === "vet-visit") &&
      nextDueDate &&
      nextDueDate < date
    ) {
      setFormError(
        type === "vaccination"
          ? "The next due date cannot be before the vaccination date."
          : "The follow-up date cannot be before the visit date.",
      );
      return;
    }
    let normalizedWeight: string | undefined;
    if (type === "weight") {
      const parsedWeight = Number(value.trim().replace(",", "."));
      if (!Number.isFinite(parsedWeight) || parsedWeight <= 0) {
        setFormError("Add a weight greater than zero.");
        return;
      }
      normalizedWeight = String(parsedWeight);
    }
    if (type === "vaccination" && !title.trim()) {
      setFormError("Add the vaccine name.");
      return;
    }
    if (type === "vet-visit" && !title.trim()) {
      setFormError("Add a reason or title for the visit.");
      return;
    }
    if (type === "symptom" && !title.trim() && !notes.trim()) {
      setFormError("Add what you observed.");
      return;
    }
    if (type === "symptom" && symptomResolved) {
      if (!validDateKey(resolvedDate)) {
        setFormError("Enter a real resolution date in YYYY-MM-DD format.");
        return;
      }
      if (resolvedDate < date) {
        setFormError("The resolution date cannot be before the symptom was observed.");
        return;
      }
      if (resolvedDate > careDateKey(new Date())) {
        setFormError("The resolution date cannot be in the future.");
        return;
      }
    }
    if (type === "note" && !title.trim() && !notes.trim()) {
      setFormError("Add a title or note.");
      return;
    }
    if (type === "document" && !attachment && !reference.trim()) {
      setFormError("Choose a file or add a document reference.");
      return;
    }
    const nextRecord: HealthRecord = {
      id: editingRecord?.id ?? createLocalId("health"),
      petId: editingRecord?.petId ?? activePet.id,
      type,
      title: title.trim() || selectedType?.label || "Health note",
      date,
      ...(type === "weight" && normalizedWeight
        ? { value: normalizedWeight, unit }
        : {}),
      ...(notes.trim() ? { notes: notes.trim() } : {}),
      ...((type === "vaccination" || type === "vet-visit" || type === "document") && provider.trim()
        ? { provider: provider.trim() }
        : {}),
      ...((type === "vaccination" || type === "vet-visit") && nextDueDate
        ? { nextDueDate }
        : {}),
      ...(type === "symptom" ? { severity } : {}),
      ...(type === "symptom" && symptomResolved ? { resolvedDate } : {}),
      ...(type === "document" && reference.trim()
        ? { reference: reference.trim() }
        : {}),
      ...(type === "document" && attachment ? { attachment } : {}),
      createdAt: editingRecord?.createdAt ?? new Date().toISOString(),
    };
    if (!tryAcquireSubmissionLock(saveLock)) return;
    if (editingRecord) {
      onUpdateRecord(nextRecord);
    } else {
      onAddRecord(nextRecord);
    }
    if (
      type !== "document" &&
      attachment?.uri !== editingRecord?.attachment?.uri
    ) {
      void removeLocalHealthAttachment(attachment);
    }
    resetForm();
    setShowForm(false);
  };

  const shareVetBrief = async () => {
    if (shareState === "working") return;
    setShareState("working");
    let temporaryPdfUri: string | undefined;
    try {
      const message = buildVetBriefText(activePet, tasks, records);
      if (Platform.OS === "web") {
        const title = `${activePet.name} - Vet Brief`;
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(message);
          setShareState("copied");
          return;
        } else if (typeof navigator.share === "function") {
          await navigator.share({ text: message, title });
        } else {
          throw new Error("Sharing is not available in this browser.");
        }
      } else {
        const { uri } = await Print.printToFileAsync({
          html: buildVetBriefHtml(activePet, tasks, records),
        });
        temporaryPdfUri = uri;
        if (!(await Sharing.isAvailableAsync())) {
          throw new Error("Sharing is not available on this device.");
        }
        await Sharing.shareAsync(uri, {
          dialogTitle: `${activePet.name} - Vet Brief`,
          mimeType: "application/pdf",
          UTI: "com.adobe.pdf",
        });
      }
      setShareState("idle");
    } catch {
      setShareState("error");
    } finally {
      removeTemporaryShareFile(temporaryPdfUri);
    }
  };

  const pickAttachment = async () => {
    if (attachmentBusy) return;
    setAttachmentBusy(true);
    setFormError(null);
    try {
      const selected = await pickLocalHealthAttachment();
      if (selected) {
        if (attachment?.uri !== editingRecord?.attachment?.uri) {
          void removeLocalHealthAttachment(attachment);
        }
        setAttachment(selected);
        if (!reference.trim()) setReference(selected.name);
      }
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "The document could not be added.",
      );
    } finally {
      setAttachmentBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={[styles.screen, { paddingTop: topInset }]}
    >
      <FlatList
        ref={setListRef}
        contentContainerStyle={{ paddingBottom: bottomInset + 126 }}
        data={filteredRecords}
        keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
        keyboardShouldPersistTaps="handled"
        keyExtractor={(record) => record.id}
        onScrollToIndexFailed={({ averageItemLength, index }) => {
          listRef?.scrollToOffset({
            animated: true,
            offset: Math.max(0, averageItemLength * index),
          });
        }}
        ListEmptyComponent={
          !showForm ? (
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Ionicons color={colors.navy} name="pulse-outline" size={22} />
              </View>
              <Text style={styles.emptyTitle}>
                {petRecords.length ? "Nothing in this view yet" : "Build a trusted baseline"}
              </Text>
              <Text style={styles.emptyBody}>
                {petRecords.length
                  ? "Choose another filter or add a new health record."
                  : "Start with a weight, vaccine or recent vet visit. Small details make the passport useful."}
              </Text>
              <Pressable
                accessibilityLabel="Add first health record"
                accessibilityRole="button"
                onPress={() => revealForm()}
                style={styles.emptyAction}
              >
                <Ionicons color={colors.white} name="add" size={17} />
                <Text style={styles.emptyActionText}>Add health record</Text>
              </Pressable>
            </View>
          ) : null
        }
        ListHeaderComponent={
          <>
            <View style={styles.header}>
              <View>
                <Text style={styles.eyebrow}>WELLBEING</Text>
                <Text style={styles.title}>Health</Text>
              </View>
              <View style={styles.headerActions}>
                <Pressable
                  accessibilityLabel={showForm ? "Close health record form" : "Add health record"}
                  accessibilityRole="button"
                  onPress={() => (showForm ? closeForm() : revealForm())}
                  style={styles.add}
                >
                  <Ionicons color={colors.white} name={showForm ? "close" : "add"} size={23} />
                </Pressable>
              </View>
            </View>

            <ScrollView
              contentContainerStyle={styles.petRow}
              horizontal
              showsHorizontalScrollIndicator={false}
            >
              {pets.map((pet) => (
                <Pressable
                  accessibilityLabel={`Show ${pet.name}'s health passport`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: pet.id === activePet.id }}
                  key={pet.id}
                  onPress={() => {
                    if (pet.id === activePet.id) return;
                    if (showForm) closeForm();
                    onActivePetChange(pet.id);
                  }}
                  style={[styles.petChip, pet.id === activePet.id && styles.petChipActive]}
                >
                  <View style={[styles.petDot, { backgroundColor: pet.color }]} />
                  <Text style={[styles.petChipText, pet.id === activePet.id && styles.petChipTextActive]}>{pet.name}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <LinearGradient
              colors={["#DCEDE8", "#F3E5D2", "#E8D4BC"]}
              end={{ x: 1, y: 1 }}
              start={{ x: 0, y: 0 }}
              style={styles.passportHero}
            >
              <View style={styles.heroOrb} />
              <View style={styles.heroCopy}>
                <Text style={styles.heroEyebrow}>HEALTH PASSPORT</Text>
                <Text style={styles.heroTitle}>{passport.passportLabel}</Text>
                <Text style={styles.heroBody}>{attentionMessage}</Text>
                <View style={styles.scoreRow}>
                  <View style={[styles.scorePill, { backgroundColor: scoreTone }]}>
                    <Text style={styles.scoreValue}>{passport.passportScore}%</Text>
                  </View>
                  <View>
                    <Text style={styles.scoreLabel}>PROFILE DEPTH</Text>
                    <Text style={styles.scoreHint}>{passport.recordCount} saved entries</Text>
                  </View>
                </View>
              </View>
              <View style={styles.heroPetCastShadow} />
              <View style={styles.heroPetContactShadow} />
              <Image resizeMode="contain" source={petSource} style={styles.heroPet} />
            </LinearGradient>

            <View style={styles.metricGrid}>
              <View style={styles.metricCard}>
                <View style={[styles.metricIcon, { backgroundColor: colors.skySoft }]}>
                  <Ionicons color={colors.sky} name="scale-outline" size={17} />
                </View>
                <Text numberOfLines={1} style={styles.metricValue}>
                  {passport.latestWeight
                    ? `${passport.latestWeight.value}${passport.latestWeight.unit ? ` ${passport.latestWeight.unit}` : ""}`
                    : "--"}
                </Text>
                <Text style={styles.metricLabel}>
                  {passport.latestWeightDelta === undefined
                    ? "Latest weight"
                    : `${passport.latestWeightDelta > 0 ? "+" : ""}${passport.latestWeightDelta.toFixed(1)} change`}
                </Text>
              </View>
              <View style={styles.metricCard}>
                <View style={[styles.metricIcon, { backgroundColor: colors.coralSoft }]}>
                  <Ionicons color={colors.coral} name="medical-outline" size={17} />
                </View>
                <Text style={styles.metricValue}>{passport.medicationCount}</Text>
                <Text style={styles.metricLabel}>Active medications</Text>
              </View>
              <View style={styles.metricCard}>
                <View style={[styles.metricIcon, { backgroundColor: colors.sageSoft }]}>
                  <Ionicons color={colors.sage} name="calendar-outline" size={17} />
                </View>
                <Text numberOfLines={1} style={styles.metricValueSmall}>
                  {passport.nextAppointmentDate
                    ? displayDate(passport.nextAppointmentDate)
                    : "None"}
                </Text>
                <Text style={styles.metricLabel}>Next vet visit</Text>
              </View>
            </View>

            <WeightTrendCard records={petRecords} />

            <View style={styles.actionRow}>
              <Pressable accessibilityLabel="Add medication" accessibilityRole="button" onPress={() => onOpenAddTask("medication")} style={styles.quickAction}>
                <Ionicons color={colors.coral} name="medical-outline" size={18} />
                <Text style={styles.quickText}>Medication</Text>
              </Pressable>
              <Pressable accessibilityLabel="Add appointment" accessibilityRole="button" onPress={() => onOpenAddTask("appointment")} style={styles.quickAction}>
                <Ionicons color={colors.sage} name="calendar-outline" size={18} />
                <Text style={styles.quickText}>Appointment</Text>
              </Pressable>
              <Pressable accessibilityLabel="Share vet brief" accessibilityRole="button" accessibilityState={{ busy: shareState === "working", disabled: shareState === "working" }} disabled={shareState === "working"} onPress={() => void shareVetBrief()} style={[styles.quickAction, shareState === "working" && styles.quickActionDisabled]}>
                <Ionicons color={colors.navy} name="document-text-outline" size={18} />
                <Text style={styles.quickText}>Vet brief</Text>
              </Pressable>
            </View>

            {shareState === "error" && (
              <Pressable
                accessibilityLabel="Dismiss sharing error"
                accessibilityRole="button"
                onPress={() => setShareState("idle")}
                style={styles.inlineError}
              >
                <Ionicons color={colors.danger} name="alert-circle-outline" size={16} />
                <Text style={styles.inlineErrorText}>The vet brief could not be shared. Tap to dismiss.</Text>
              </Pressable>
            )}
            {shareState === "copied" && (
              <Pressable
                accessibilityLabel="Dismiss copied vet brief message"
                accessibilityRole="button"
                onPress={() => setShareState("idle")}
                style={styles.inlineSuccess}
              >
                <Ionicons color={colors.sage} name="checkmark-circle-outline" size={16} />
                <Text style={styles.inlineSuccessText}>Vet brief copied. Paste it into a message or email.</Text>
              </Pressable>
            )}

            {showForm && (
              <View
                onLayout={({ nativeEvent }) => {
                  formOffset.current = nativeEvent.layout.y;
                  if (!shouldScrollToForm.current) return;
                  shouldScrollToForm.current = false;
                  requestAnimationFrame(() => {
                    listRef?.scrollToOffset({
                      animated: true,
                      offset: Math.max(0, nativeEvent.layout.y - 12),
                    });
                  });
                }}
                style={styles.form}
              >
                <View style={styles.formHeading}>
                  <View style={styles.formIcon}>
                    <Ionicons
                      color={colors.navy}
                      name={(selectedType?.icon ?? "add-circle-outline") as keyof typeof Ionicons.glyphMap}
                      size={20}
                    />
                  </View>
                  <View style={styles.flex}>
                    <Text style={styles.formEyebrow}>
                      {editingRecord ? "EDIT PASSPORT ENTRY" : "NEW PASSPORT ENTRY"}
                    </Text>
                    <Text accessibilityRole="header" style={styles.formTitle}>
                      {selectedType?.label ?? "Health record"}
                    </Text>
                  </View>
                </View>

                <View style={styles.typeGrid}>
                  {HEALTH_RECORD_TYPES.map((item) => (
                    <Pressable
                      accessibilityLabel={`Choose ${item.label} record`}
                      accessibilityRole="button"
                      accessibilityState={{ selected: type === item.type }}
                      key={item.type}
                      onPress={() => {
                        setType(item.type);
                        setFormError(null);
                      }}
                      style={[styles.typeChip, type === item.type && styles.typeChipActive]}
                    >
                      <Ionicons color={type === item.type ? colors.white : colors.navy} name={item.icon as keyof typeof Ionicons.glyphMap} size={15} />
                      <Text style={[styles.typeText, type === item.type && styles.typeTextActive]}>{item.label}</Text>
                    </Pressable>
                  ))}
                </View>

                <Text style={styles.inputLabel}>Title</Text>
                <TextInput
                  accessibilityLabel="Health record title"
                  maxLength={INPUT_LIMITS.shortText}
                  onChangeText={setTitle}
                  placeholder={selectedType ? `${selectedType.label} details` : "Record title"}
                  placeholderTextColor={colors.muted}
                  style={styles.input}
                  value={title}
                />

                <Text style={styles.inputLabel}>Record date</Text>
                <TextInput
                  accessibilityLabel="Health record date"
                  keyboardType="numbers-and-punctuation"
                  maxLength={10}
                  onChangeText={setDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.muted}
                  style={styles.input}
                  value={date}
                />

                {type === "weight" && (
                  <View style={styles.inputRow}>
                    <View style={styles.flex}>
                      <Text style={styles.inputLabel}>Weight</Text>
                      <TextInput accessibilityLabel="Measured weight" keyboardType="decimal-pad" maxLength={12} onChangeText={setValue} placeholder="24.5" placeholderTextColor={colors.muted} style={styles.input} value={value} />
                    </View>
                    <View style={styles.unitColumn}>
                      <Text style={styles.inputLabel}>Unit</Text>
                      <View style={styles.unitPicker}>
                        {(["kg", "lb"] as const).map((item) => (
                          <Pressable
                            accessibilityLabel={`Weight unit ${item}`}
                            accessibilityRole="button"
                            accessibilityState={{ selected: unit === item }}
                            key={item}
                            onPress={() => setUnit(item)}
                            style={[styles.unitOption, unit === item && styles.unitOptionActive]}
                          >
                            <Text style={[styles.unitOptionText, unit === item && styles.unitOptionTextActive]}>{item}</Text>
                          </Pressable>
                        ))}
                      </View>
                    </View>
                  </View>
                )}

                {(type === "vaccination" || type === "vet-visit") && (
                  <>
                    <Text style={styles.inputLabel}>{type === "vet-visit" ? "Clinic or veterinarian" : "Administered by"}</Text>
                    <TextInput accessibilityLabel="Care provider" maxLength={INPUT_LIMITS.shortText} onChangeText={setProvider} placeholder="Provider name" placeholderTextColor={colors.muted} style={styles.input} value={provider} />
                    <Text style={styles.inputLabel}>{type === "vet-visit" ? "Follow-up date" : "Next due date"}</Text>
                    <TextInput accessibilityLabel={type === "vet-visit" ? "Follow-up date" : "Next due date"} keyboardType="numbers-and-punctuation" maxLength={10} onChangeText={setNextDueDate} placeholder="YYYY-MM-DD (optional)" placeholderTextColor={colors.muted} style={styles.input} value={nextDueDate} />
                  </>
                )}

                {type === "symptom" && (
                  <>
                    <Text style={styles.inputLabel}>Observed severity</Text>
                    <View style={styles.severityRow}>
                      {SEVERITIES.map((item) => (
                        <Pressable accessibilityLabel={`${item} symptom severity`} accessibilityRole="button" accessibilityState={{ selected: severity === item }} key={item} onPress={() => setSeverity(item)} style={[styles.severity, severity === item && styles.severityActive, item === "urgent" && severity === item && styles.severityUrgent]}>
                          <Text style={[styles.severityText, severity === item && styles.severityTextActive]}>{item[0]?.toUpperCase() + item.slice(1)}</Text>
                        </Pressable>
                      ))}
                    </View>
                    <Text style={styles.inputLabel}>Current status</Text>
                    <View style={styles.severityRow}>
                      <Pressable
                        accessibilityLabel="Mark symptom as ongoing"
                        accessibilityRole="button"
                        accessibilityState={{ selected: !symptomResolved }}
                        onPress={() => setSymptomResolved(false)}
                        style={[styles.severity, !symptomResolved && styles.statusOngoing]}
                      >
                        <Text style={[styles.severityText, !symptomResolved && styles.severityTextActive]}>Ongoing</Text>
                      </Pressable>
                      <Pressable
                        accessibilityLabel="Mark symptom as resolved"
                        accessibilityRole="button"
                        accessibilityState={{ selected: symptomResolved }}
                        onPress={() => {
                          setSymptomResolved(true);
                          if (!resolvedDate) setResolvedDate(careDateKey(new Date()));
                        }}
                        style={[styles.severity, symptomResolved && styles.severityActive]}
                      >
                        <Text style={[styles.severityText, symptomResolved && styles.severityTextActive]}>Resolved</Text>
                      </Pressable>
                    </View>
                    {symptomResolved && (
                      <>
                        <Text style={styles.inputLabel}>Resolution date</Text>
                        <TextInput
                          accessibilityLabel="Symptom resolution date"
                          keyboardType="numbers-and-punctuation"
                          maxLength={10}
                          onChangeText={setResolvedDate}
                          placeholder="YYYY-MM-DD"
                          placeholderTextColor={colors.muted}
                          style={styles.input}
                          value={resolvedDate}
                        />
                      </>
                    )}
                  </>
                )}

                {type === "document" && (
                  <>
                    <Text style={styles.inputLabel}>Secure attachment</Text>
                    {attachment ? (
                      <View style={styles.attachmentSelected}>
                        <View style={styles.attachmentIcon}>
                          <Ionicons color={colors.navy} name="document-attach-outline" size={20} />
                        </View>
                        <View style={styles.flex}>
                          <Text numberOfLines={1} style={styles.attachmentName}>{attachment.name}</Text>
                          <Text style={styles.attachmentMeta}>{attachment.mimeType} / {formatAttachmentSize(attachment.size)}</Text>
                        </View>
                        <Pressable accessibilityLabel="Remove selected attachment" accessibilityRole="button" onPress={discardAttachment} style={styles.attachmentRemove}>
                          <Ionicons color={colors.danger} name="close" size={18} />
                        </Pressable>
                      </View>
                    ) : (
                      <Pressable accessibilityLabel="Choose medical document" accessibilityRole="button" accessibilityState={{ busy: attachmentBusy, disabled: attachmentBusy }} disabled={attachmentBusy} onPress={() => void pickAttachment()} style={styles.attachmentPicker}>
                        {attachmentBusy ? <ActivityIndicator color={colors.navy} size="small" /> : <Ionicons color={colors.navy} name="cloud-upload-outline" size={20} />}
                        <View style={styles.flex}>
                          <Text style={styles.attachmentPickerTitle}>Choose PDF or image</Text>
                          <Text style={styles.attachmentPickerBody}>Stored privately on this device / up to 20 MB</Text>
                        </View>
                      </Pressable>
                    )}
                    <Text style={styles.inputLabel}>Document reference</Text>
                    <TextInput accessibilityLabel="Document reference" maxLength={INPUT_LIMITS.reference} onChangeText={setReference} placeholder="Lab report, invoice or file name" placeholderTextColor={colors.muted} style={styles.input} value={reference} />
                    <Text style={styles.inputLabel}>Provider</Text>
                    <TextInput accessibilityLabel="Document provider" maxLength={INPUT_LIMITS.shortText} onChangeText={setProvider} placeholder="Clinic or laboratory" placeholderTextColor={colors.muted} style={styles.input} value={provider} />
                  </>
                )}

                <Text style={styles.inputLabel}>Notes</Text>
                <TextInput accessibilityLabel="Health record notes" maxLength={INPUT_LIMITS.notes} multiline onChangeText={setNotes} placeholder="What should a future caregiver or vet know?" placeholderTextColor={colors.muted} style={[styles.input, styles.notes]} value={notes} />
                {formError && (
                  <Text accessibilityLiveRegion="assertive" accessibilityRole="alert" style={styles.formError}>
                    {formError}
                  </Text>
                )}
                <Pressable accessibilityLabel={editingRecord ? "Save health record changes" : "Save health record"} accessibilityRole="button" onPress={saveRecord} style={styles.save}>
                  <Text style={styles.saveText}>{editingRecord ? "Save changes" : "Save to health passport"}</Text>
                  <Ionicons color={colors.white} name="arrow-forward" size={18} />
                </Pressable>
              </View>
            )}

            <View style={styles.timelineHeading}>
              <View>
                <Text style={styles.timelineEyebrow}>HEALTH HISTORY</Text>
                <Text style={styles.timelineTitle}>Timeline</Text>
              </View>
              <Text style={styles.timelineCount}>{petRecords.length} records</Text>
            </View>
            <View style={styles.filterRow}>
              {FILTERS.map((item) => (
                <Pressable accessibilityLabel={`Show ${item.label} health records`} accessibilityRole="button" accessibilityState={{ selected: filter === item.filter }} key={item.filter} onPress={() => setFilter(item.filter)} style={[styles.filterChip, filter === item.filter && styles.filterChipActive]}>
                  <Text style={[styles.filterText, filter === item.filter && styles.filterTextActive]}>{item.label}</Text>
                </Pressable>
              ))}
            </View>
          </>
        }
        renderItem={({ item }) => {
          const meta = HEALTH_RECORD_TYPES.find((entry) => entry.type === item.type);
          const tone = RECORD_TONES[item.type];
          const dueLabel = healthDueLabel(item);
          const recordAttachment = item.attachment;
          const overdue = Boolean(item.nextDueDate && item.nextDueDate < careDateKey(new Date()));
          return (
            <View
              accessibilityLabel={
                item.id === focusRecordId
                  ? `${item.title}, opened from reminder`
                  : undefined
              }
              style={[
                styles.record,
                item.id === focusRecordId && styles.recordFocused,
              ]}
            >
              <View style={[styles.recordIcon, { backgroundColor: tone.soft }]}>
                <Ionicons color={tone.color} name={(meta?.icon ?? "document-outline") as keyof typeof Ionicons.glyphMap} size={20} />
              </View>
              <View style={styles.flex}>
                <View style={styles.recordTitleRow}>
                  <Text numberOfLines={1} style={styles.recordTitle}>{item.title}</Text>
                  {item.severity && <View style={[styles.statusBadge, item.severity === "urgent" && styles.statusBadgeUrgent]}><Text style={[styles.statusBadgeText, item.severity === "urgent" && styles.statusBadgeTextUrgent]}>{item.severity}</Text></View>}
                </View>
                <Text style={styles.recordMeta}>
                  {displayDate(item.date)}
                  {item.value ? ` / ${item.value}${item.unit ? ` ${item.unit}` : ""}` : ""}
                </Text>
                {item.provider && <Text style={styles.recordProvider}>{item.provider}</Text>}
                {item.reference && <Text style={styles.recordProvider}>{item.reference}</Text>}
                {item.resolvedDate && (
                  <View style={styles.resolvedLine}>
                    <Ionicons color={colors.sage} name="checkmark-circle" size={14} />
                    <Text style={styles.resolvedText}>Resolved {displayDate(item.resolvedDate)}</Text>
                  </View>
                )}
                {item.notes && <Text numberOfLines={3} style={styles.recordNotes}>{item.notes}</Text>}
                {recordAttachment && (
                  <Pressable accessibilityLabel={`Open ${recordAttachment.name}`} accessibilityRole="button" onPress={() => void shareLocalHealthAttachment(recordAttachment).catch(() => setShareState("error"))} style={styles.recordAttachment}>
                    <Ionicons color={colors.navy} name="attach-outline" size={14} />
                    <Text numberOfLines={1} style={styles.recordAttachmentText}>{recordAttachment.name}</Text>
                    <Text style={styles.recordAttachmentSize}>{formatAttachmentSize(recordAttachment.size)}</Text>
                  </Pressable>
                )}
                {dueLabel && <View style={[styles.duePill, overdue && styles.duePillOverdue]}><Ionicons color={overdue ? colors.danger : colors.sage} name={overdue ? "alert-circle-outline" : "time-outline"} size={13} /><Text style={[styles.dueText, overdue && styles.dueTextOverdue]}>{dueLabel}</Text></View>}
              </View>
              <View style={{ gap: 6 }}>
                <Pressable accessibilityLabel={`Edit ${item.title}`} accessibilityRole="button" hitSlop={8} onPress={() => openEditRecord(item)} style={styles.delete}>
                  <Ionicons color={colors.navy} name="create-outline" size={18} />
                </Pressable>
                <Pressable accessibilityLabel={`Delete ${item.title}`} accessibilityRole="button" hitSlop={8} onPress={() => onRemoveRecord(item.id)} style={styles.delete}>
                  <Ionicons color={colors.muted} name="trash-outline" size={18} />
                </Pressable>
              </View>
            </View>
          );
        }}
        showsVerticalScrollIndicator={false}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  heroPetCastShadow: {
    backgroundColor: "rgba(51,60,54,0.07)",
    borderRadius: 999,
    bottom: 8,
    height: 12,
    position: "absolute",
    right: 29,
    transform: [{ scaleX: 1.08 }],
    width: 106,
  },
  heroPetContactShadow: {
    backgroundColor: "rgba(51,60,54,0.17)",
    borderRadius: 999,
    bottom: 13,
    height: 5,
    position: "absolute",
    right: 47,
    width: 70,
  },
  recordFocused: { borderColor: colors.sage, borderWidth: 1.5, shadowColor: colors.sage, shadowOpacity: 0.16, shadowRadius: 13 },
  actionRow: { flexDirection: "row", gap: 8, paddingHorizontal: 18, paddingTop: 12 },
  add: { alignItems: "center", backgroundColor: colors.coral, borderRadius: 22, height: 44, justifyContent: "center", width: 44, ...shadow.subtle },
  attachmentIcon: { alignItems: "center", backgroundColor: colors.skySoft, borderRadius: 16, height: 34, justifyContent: "center", width: 34 },
  attachmentMeta: { color: colors.muted, fontFamily: "Nunito_600SemiBold", fontSize: 9, marginTop: 2 },
  attachmentName: { color: colors.ink, fontFamily: "Nunito_800ExtraBold", fontSize: 11 },
  attachmentPicker: { alignItems: "center", backgroundColor: colors.skySoft, borderColor: "rgba(57,116,156,0.18)", borderRadius: 17, borderStyle: "dashed", borderWidth: 1, flexDirection: "row", gap: 10, minHeight: 62, paddingHorizontal: 12 },
  attachmentPickerBody: { color: colors.muted, fontFamily: "Nunito_600SemiBold", fontSize: 9, marginTop: 2 },
  attachmentPickerTitle: { color: colors.navy, fontFamily: "Nunito_800ExtraBold", fontSize: 11 },
  attachmentRemove: { alignItems: "center", backgroundColor: colors.coralSoft, borderRadius: 22, height: 44, justifyContent: "center", width: 44 },
  attachmentSelected: { alignItems: "center", backgroundColor: colors.background, borderColor: colors.line, borderRadius: 17, borderWidth: 1, flexDirection: "row", gap: 9, minHeight: 62, paddingHorizontal: 10 },
  delete: { alignItems: "center", borderRadius: 14, height: 44, justifyContent: "center", width: 44 },
  duePill: { alignItems: "center", alignSelf: "flex-start", backgroundColor: colors.sageSoft, borderRadius: 13, flexDirection: "row", gap: 4, marginTop: 7, paddingHorizontal: 8, paddingVertical: 5 },
  duePillOverdue: { backgroundColor: colors.coralSoft },
  dueText: { color: colors.sage, fontFamily: "Nunito_800ExtraBold", fontSize: 9 },
  dueTextOverdue: { color: colors.danger },
  empty: { backgroundColor: colors.paper, borderColor: "rgba(34,48,67,0.08)", borderRadius: 26, borderWidth: 1, marginHorizontal: 18, marginTop: 12, padding: 18, ...shadow.subtle },
  emptyAction: { alignItems: "center", alignSelf: "flex-start", backgroundColor: colors.navy, borderRadius: 16, flexDirection: "row", gap: 6, marginTop: 14, minHeight: 44, paddingHorizontal: 13, paddingVertical: 9 },
  emptyActionText: { color: colors.white, fontFamily: "Nunito_800ExtraBold", fontSize: 11 },
  emptyBody: { color: colors.muted, fontFamily: "Nunito_600SemiBold", fontSize: 12, lineHeight: 18, marginTop: 4 },
  emptyIcon: { alignItems: "center", backgroundColor: colors.skySoft, borderRadius: 19, height: 38, justifyContent: "center", width: 38 },
  emptyTitle: { color: colors.ink, fontFamily: "Nunito_800ExtraBold", fontSize: 16, marginTop: 11 },
  eyebrow: { color: colors.navy, fontFamily: "Nunito_800ExtraBold", fontSize: 10, letterSpacing: 1.2 },
  filterChip: { alignItems: "center", backgroundColor: colors.paper, borderColor: colors.line, borderRadius: 16, borderWidth: 1, justifyContent: "center", minHeight: 44, minWidth: 44, paddingHorizontal: 11, paddingVertical: 7 },
  filterChipActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  filterRow: { flexDirection: "row", gap: 7, paddingBottom: 13, paddingHorizontal: 18 },
  filterText: { color: colors.ink, fontFamily: "Nunito_700Bold", fontSize: 10 },
  filterTextActive: { color: colors.white },
  flex: { flex: 1 },
  form: { backgroundColor: colors.paper, borderColor: "rgba(34,48,67,0.08)", borderRadius: 27, borderWidth: 1, gap: 8, marginHorizontal: 18, marginTop: 14, padding: 16, ...shadow.card },
  formError: { color: colors.danger, fontFamily: "Nunito_700Bold", fontSize: 11, lineHeight: 16 },
  formEyebrow: { color: colors.navy, fontFamily: "Nunito_800ExtraBold", fontSize: 8, letterSpacing: 1 },
  formHeading: { alignItems: "center", flexDirection: "row", gap: 10, marginBottom: 3 },
  formIcon: { alignItems: "center", backgroundColor: colors.skySoft, borderRadius: 18, height: 38, justifyContent: "center", width: 38 },
  formTitle: { color: colors.ink, fontFamily: "Fredoka_600SemiBold", fontSize: 19 },
  header: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", paddingBottom: 13, paddingHorizontal: 18, paddingTop: 15 },
  headerActions: { flexDirection: "row", gap: 8 },
  heroBody: { color: "rgba(34,48,67,0.72)", fontFamily: "Nunito_600SemiBold", fontSize: 11, lineHeight: 16, marginTop: 6, maxWidth: 190 },
  heroCopy: { left: 17, position: "absolute", top: 17, width: "60%", zIndex: 4 },
  heroEyebrow: { color: colors.navy, fontFamily: "Nunito_800ExtraBold", fontSize: 8, letterSpacing: 1 },
  heroOrb: { backgroundColor: "rgba(255,255,255,0.38)", borderRadius: 130, height: 230, position: "absolute", right: -20, top: -4, width: 195 },
  heroPet: { bottom: -2, height: 208, position: "absolute", right: -4, width: "46%", zIndex: 3 },
  heroPetShadow: { backgroundColor: "rgba(72,45,27,0.14)", borderRadius: 999, bottom: 17, height: 12, position: "absolute", right: 18, width: "35%", zIndex: 2 },
  heroTitle: { color: colors.ink, fontFamily: "Fredoka_600SemiBold", fontSize: 23, lineHeight: 26, marginTop: 4 },
  inlineError: { alignItems: "center", backgroundColor: colors.coralSoft, borderRadius: 15, flexDirection: "row", gap: 7, marginHorizontal: 18, marginTop: 9, padding: 10 },
  inlineErrorText: { color: colors.danger, flex: 1, fontFamily: "Nunito_700Bold", fontSize: 10 },
  inlineSuccess: { alignItems: "center", backgroundColor: colors.sageSoft, borderRadius: 15, flexDirection: "row", gap: 7, marginHorizontal: 18, marginTop: 9, minHeight: 44, padding: 10 },
  inlineSuccessText: { color: colors.sage, flex: 1, fontFamily: "Nunito_700Bold", fontSize: 10 },
  input: { backgroundColor: colors.background, borderColor: colors.line, borderRadius: 15, borderWidth: 1, color: colors.ink, fontFamily: "Nunito_700Bold", fontSize: 13, minHeight: 44, paddingHorizontal: 12, paddingVertical: 10 },
  inputLabel: { color: colors.muted, fontFamily: "Nunito_700Bold", fontSize: 10, marginLeft: 2, marginTop: 3 },
  inputRow: { flexDirection: "row", gap: 9 },
  metricCard: { backgroundColor: colors.paper, borderColor: "rgba(34,48,67,0.07)", borderRadius: 19, borderWidth: 1, flex: 1, minHeight: 99, padding: 10, ...shadow.subtle },
  metricGrid: { flexDirection: "row", gap: 8, marginTop: -22, paddingHorizontal: 18, position: "relative", zIndex: 5 },
  metricIcon: { alignItems: "center", borderRadius: 14, height: 29, justifyContent: "center", width: 29 },
  metricLabel: { color: colors.muted, fontFamily: "Nunito_700Bold", fontSize: 9, marginTop: 2 },
  metricValue: { color: colors.ink, fontFamily: "Nunito_800ExtraBold", fontSize: 18, marginTop: 7 },
  metricValueSmall: { color: colors.ink, fontFamily: "Nunito_800ExtraBold", fontSize: 11, marginTop: 9 },
  notes: { minHeight: 70, textAlignVertical: "top" },
  passportHero: { borderRadius: 29, height: 218, marginHorizontal: 18, marginTop: 13, overflow: "hidden", position: "relative" },
  petChip: { alignItems: "center", backgroundColor: colors.paper, borderRadius: 17, flexDirection: "row", gap: 6, minHeight: 44, paddingHorizontal: 13, paddingVertical: 8 },
  petChipActive: { backgroundColor: colors.ink },
  petChipText: { color: colors.ink, fontFamily: "Nunito_700Bold", fontSize: 11 },
  petChipTextActive: { color: colors.white },
  petDot: { borderRadius: 4, height: 7, width: 7 },
  petRow: { flexDirection: "row", gap: 8, paddingHorizontal: 18 },
  quickAction: { alignItems: "center", backgroundColor: colors.paper, borderColor: "rgba(34,48,67,0.07)", borderRadius: 17, borderWidth: 1, flex: 1, flexDirection: "row", gap: 5, justifyContent: "center", minHeight: 44, paddingHorizontal: 7 },
  quickActionDisabled: { opacity: 0.55 },
  quickText: { color: colors.ink, fontFamily: "Nunito_800ExtraBold", fontSize: 9 },
  record: { alignItems: "flex-start", backgroundColor: colors.paper, borderColor: "rgba(34,48,67,0.07)", borderRadius: 21, borderWidth: 1, flexDirection: "row", gap: 11, marginBottom: 9, marginHorizontal: 18, padding: 13, ...shadow.subtle },
  recordAttachment: { alignItems: "center", alignSelf: "stretch", backgroundColor: colors.skySoft, borderRadius: 12, flexDirection: "row", gap: 5, marginTop: 7, minHeight: 44, paddingHorizontal: 8 },
  recordAttachmentSize: { color: colors.muted, fontFamily: "Nunito_700Bold", fontSize: 8 },
  recordAttachmentText: { color: colors.navy, flex: 1, fontFamily: "Nunito_800ExtraBold", fontSize: 9 },
  recordIcon: { alignItems: "center", borderRadius: 18, height: 38, justifyContent: "center", width: 38 },
  recordMeta: { color: colors.muted, fontFamily: "Nunito_700Bold", fontSize: 10, marginTop: 2 },
  recordNotes: { color: colors.ink, fontFamily: "Nunito_600SemiBold", fontSize: 11, lineHeight: 16, marginTop: 5 },
  recordProvider: { color: colors.navy, fontFamily: "Nunito_700Bold", fontSize: 10, marginTop: 4 },
  recordTitle: { color: colors.ink, flex: 1, fontFamily: "Nunito_800ExtraBold", fontSize: 14 },
  recordTitleRow: { alignItems: "center", flexDirection: "row", gap: 7 },
  save: { alignItems: "center", backgroundColor: colors.sage, borderRadius: 18, flexDirection: "row", gap: 8, justifyContent: "center", marginTop: 5, minHeight: 48, paddingVertical: 12 },
  saveText: { color: colors.white, fontFamily: "Nunito_800ExtraBold", fontSize: 13 },
  resolvedLine: { alignItems: "center", flexDirection: "row", gap: 5, marginTop: 4 },
  resolvedText: { color: colors.sage, fontFamily: "Nunito_800ExtraBold", fontSize: 9 },
  scoreHint: { color: "rgba(34,48,67,0.65)", fontFamily: "Nunito_700Bold", fontSize: 9, marginTop: 1 },
  scoreLabel: { color: colors.navy, fontFamily: "Nunito_800ExtraBold", fontSize: 8, letterSpacing: 0.8 },
  scorePill: { alignItems: "center", borderRadius: 13, justifyContent: "center", minWidth: 48, paddingHorizontal: 8, paddingVertical: 7 },
  scoreRow: { alignItems: "center", flexDirection: "row", gap: 8, marginTop: 12 },
  scoreValue: { color: colors.white, fontFamily: "Nunito_800ExtraBold", fontSize: 12 },
  screen: { backgroundColor: colors.background, flex: 1 },
  severity: { alignItems: "center", backgroundColor: colors.background, borderColor: colors.line, borderRadius: 15, borderWidth: 1, flex: 1, justifyContent: "center", minHeight: 44, paddingVertical: 9 },
  severityActive: { backgroundColor: colors.sage, borderColor: colors.sage },
  severityRow: { flexDirection: "row", gap: 7 },
  severityText: { color: colors.ink, fontFamily: "Nunito_700Bold", fontSize: 10 },
  severityTextActive: { color: colors.white },
  severityUrgent: { backgroundColor: colors.coral, borderColor: colors.coral },
  shareButton: { alignItems: "center", backgroundColor: colors.paper, borderColor: colors.line, borderRadius: 22, borderWidth: 1, height: 44, justifyContent: "center", width: 44 },
  statusBadge: { backgroundColor: colors.sageSoft, borderRadius: 11, paddingHorizontal: 7, paddingVertical: 4 },
  statusBadgeText: { color: colors.sage, fontFamily: "Nunito_800ExtraBold", fontSize: 8, textTransform: "uppercase" },
  statusBadgeTextUrgent: { color: colors.danger },
  statusBadgeUrgent: { backgroundColor: colors.coralSoft },
  statusOngoing: { backgroundColor: colors.navy, borderColor: colors.navy },
  timelineCount: { color: colors.muted, fontFamily: "Nunito_700Bold", fontSize: 10 },
  timelineEyebrow: { color: colors.navy, fontFamily: "Nunito_800ExtraBold", fontSize: 8, letterSpacing: 1 },
  timelineHeading: { alignItems: "flex-end", flexDirection: "row", justifyContent: "space-between", paddingBottom: 10, paddingHorizontal: 18, paddingTop: 22 },
  timelineTitle: { color: colors.ink, fontFamily: "Fredoka_600SemiBold", fontSize: 22, lineHeight: 25 },
  title: { color: colors.ink, fontFamily: "Fredoka_600SemiBold", fontSize: 32 },
  typeChip: { alignItems: "center", backgroundColor: colors.skySoft, borderRadius: 15, flexDirection: "row", gap: 5, minHeight: 44, paddingHorizontal: 9, paddingVertical: 7 },
  typeChipActive: { backgroundColor: colors.navy },
  typeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  typeText: { color: colors.navy, fontFamily: "Nunito_700Bold", fontSize: 10 },
  typeTextActive: { color: colors.white },
  unitColumn: { width: 98 },
  unitOption: { alignItems: "center", borderRadius: 12, flex: 1, justifyContent: "center", minHeight: 44, minWidth: 44 },
  unitOptionActive: { backgroundColor: colors.ink },
  unitOptionText: { color: colors.muted, fontFamily: "Nunito_800ExtraBold", fontSize: 11 },
  unitOptionTextActive: { color: colors.white },
  unitPicker: { backgroundColor: colors.background, borderColor: colors.line, borderRadius: 15, borderWidth: 1, flexDirection: "row", gap: 3, minHeight: 44, padding: 2 },
});
