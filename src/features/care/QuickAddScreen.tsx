import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { colors, shadow } from "../../design";
import type { Pet } from "../../types";
import { INPUT_LIMITS } from "../../utils/input-limits";
import { createLocalId } from "../../utils/local-id";
import { usePrefersReducedMotion } from "../accessibility/motion";

import { careDateKey } from "./engine";
import { CARE_CATEGORIES, getCategoryMeta } from "./meta";
import { tryAcquireSubmissionLock } from "./submission-lock";
import type {
  CareCategory,
  CareFrequency,
  CareTask,
  CareTaskDetails,
  MedicationRoute,
} from "./types";

const MAX_DAILY_TIMES = 8;
const MEDICATION_ROUTES: {
  label: string;
  value: MedicationRoute;
}[] = [
  { label: "Oral", value: "oral" },
  { label: "Topical", value: "topical" },
  { label: "Injection", value: "injection" },
  { label: "Drops", value: "drops" },
  { label: "Inhaled", value: "inhaled" },
  { label: "Other", value: "other" },
];
const APPOINTMENT_REMINDERS = [
  { label: "At time", minutes: 0 },
  { label: "1 hour", minutes: 60 },
  { label: "1 day", minutes: 24 * 60 },
  { label: "2 days", minutes: 2 * 24 * 60 },
  { label: "1 week", minutes: 7 * 24 * 60 },
];

function validCareTime(value: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(value.trim());
  if (!match) return false;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
}

function timeToMinutes(value: string) {
  const hour = Number(value.slice(0, 2));
  const minute = Number(value.slice(3, 5));
  return hour * 60 + minute;
}

function validCareDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return false;
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

function suggestNextTime(times: string[]) {
  const validTimes = times.filter(validCareTime);
  if (validTimes.length === 0) return "08:00";
  const latest = Math.max(...validTimes.map(timeToMinutes));
  const next = (latest + 60) % (24 * 60);
  return `${String(Math.floor(next / 60)).padStart(2, "0")}:${String(
    next % 60,
  ).padStart(2, "0")}`;
}

export function QuickAddScreen({
  pets,
  activePetId,
  initialCategory,
  initialDate,
  editingTask,
  topInset,
  bottomInset,
  onSave,
  onCancel,
}: {
  pets: Pet[];
  activePetId: string | null;
  initialCategory?: CareCategory;
  initialDate?: Date;
  editingTask?: CareTask;
  topInset: number;
  bottomInset: number;
  onSave: (task: CareTask) => void;
  onCancel: () => void;
}) {
  const [category, setCategory] = useState<CareCategory>(
    editingTask?.category ?? initialCategory ?? "feeding",
  );
  const [petId, setPetId] = useState(
    editingTask?.petId ?? activePetId ?? pets[0]?.id ?? "",
  );
  const [title, setTitle] = useState(
    editingTask?.title ??
      getCategoryMeta(initialCategory ?? "feeding").defaultTitle,
  );
  const [instructions, setInstructions] = useState(
    editingTask?.instructions ?? "",
  );
  const nextAppointmentSlot = initialDate
    ? new Date(initialDate)
    : new Date();
  nextAppointmentSlot.setMinutes(0, 0, 0);
  if (careDateKey(nextAppointmentSlot) === careDateKey(new Date())) {
    nextAppointmentSlot.setHours(nextAppointmentSlot.getHours() + 1);
  } else {
    nextAppointmentSlot.setHours(9);
  }
  const suggestedAppointmentTime = `${String(nextAppointmentSlot.getHours()).padStart(2, "0")}:00`;
  const [times, setTimes] = useState<string[]>(
    editingTask?.schedule.times.length
      ? [...editingTask.schedule.times]
      : [initialCategory === "appointment" ? suggestedAppointmentTime : "08:00"],
  );
  const [frequency, setFrequency] = useState<CareFrequency>(
    editingTask?.schedule.frequency ??
      (initialCategory === "appointment" ? "once" : "daily"),
  );
  const [date, setDate] = useState(
    editingTask?.schedule.date ??
      careDateKey(
        initialCategory === "appointment" ? nextAppointmentSlot : new Date(),
      ),
  );
  const [weekdays, setWeekdays] = useState<number[]>(
    editingTask?.schedule.weekdays ?? [new Date().getDay()],
  );
  const [quantity, setQuantity] = useState(
    editingTask?.details?.quantity ?? "",
  );
  const [duration, setDuration] = useState(
    editingTask?.details?.durationMinutes
      ? String(editingTask.details.durationMinutes)
      : "",
  );
  const [dose, setDose] = useState(editingTask?.details?.dose ?? "");
  const [route, setRoute] = useState<MedicationRoute>(
    editingTask?.details?.route ?? "oral",
  );
  const [provider, setProvider] = useState(
    editingTask?.details?.provider ?? "",
  );
  const [location, setLocation] = useState(
    editingTask?.details?.location ?? "",
  );
  const [stock, setStock] = useState(
    editingTask?.details?.stock !== undefined
      ? String(editingTask.details.stock)
      : "",
  );
  const [stockUnit, setStockUnit] = useState(
    editingTask?.details?.stockUnit ?? "doses",
  );
  const [unitsPerDose, setUnitsPerDose] = useState(
    String(editingTask?.details?.unitsPerDose ?? 1),
  );
  const [refillThreshold, setRefillThreshold] = useState(
    String(editingTask?.details?.refillThreshold ?? 5),
  );
  const [reminderLeadMinutes, setReminderLeadMinutes] = useState(
    editingTask?.details?.reminderLeadMinutes ?? 24 * 60,
  );
  const [error, setError] = useState<string | null>(null);
  const reduceMotion = usePrefersReducedMotion();
  const formTransition = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (editingTask) return;
    const next = initialCategory ?? "feeding";
    setCategory(next);
    setTitle(getCategoryMeta(next).defaultTitle);
  }, [editingTask, initialCategory]);

  const chooseCategory = (next: CareCategory) => {
    formTransition.stopAnimation();
    if (reduceMotion) {
      formTransition.setValue(1);
    } else {
      formTransition.setValue(0);
      Animated.spring(formTransition, {
        damping: 18,
        mass: 0.7,
        stiffness: 190,
        toValue: 1,
        useNativeDriver: Platform.OS !== "web",
      }).start();
    }
    const previousDefault = getCategoryMeta(category).defaultTitle;
    setCategory(next);
    if (!title.trim() || title === previousDefault) {
      setTitle(getCategoryMeta(next).defaultTitle);
    }
    if (!editingTask && next === "appointment") {
      setFrequency("once");
      setDate(careDateKey(nextAppointmentSlot));
      setTimes([suggestedAppointmentTime]);
    }
    setError(null);
  };

  const capturesQuantity = category === "feeding" || category === "water";
  const capturesDuration =
    category === "walk" ||
    category === "play" ||
    category === "training" ||
    category === "grooming";
  const capturesMedication = category === "medication";
  const capturesAppointment = category === "appointment";

  const saveLock = useRef(false);

  const submit = () => {
    if (!petId || !title.trim()) {
      setError("Choose a pet and add a title.");
      return;
    }
    const normalizedTimes = Array.from(
      new Set(times.map((value) => value.trim())),
    );
    if (
      normalizedTimes.length === 0 ||
      normalizedTimes.some((value) => !validCareTime(value))
    ) {
      setError("Use real 24-hour times such as 08:30 or 18:45.");
      return;
    }
    normalizedTimes.sort(
      (first, second) => timeToMinutes(first) - timeToMinutes(second),
    );
    if (frequency === "weekly" && weekdays.length === 0) {
      setError("Choose at least one day for a weekly care moment.");
      return;
    }
    if (frequency === "once" && !validCareDate(date)) {
      setError("Use a real calendar date in YYYY-MM-DD format.");
      return;
    }
    if (!editingTask && frequency === "once") {
      const now = new Date();
      const today = careDateKey(now);
      if (date < today) {
        setError("Choose today or a future date for a new care moment.");
        return;
      }
      if (
        date === today &&
        normalizedTimes.some(
          (careTime) =>
            timeToMinutes(careTime) <= now.getHours() * 60 + now.getMinutes(),
        )
      ) {
        setError("Choose a time later today or schedule this care moment for another date.");
        return;
      }
      if (capturesAppointment && reminderLeadMinutes > 0) {
        const unavailableLead = normalizedTimes.some((careTime) => {
          const appointment = new Date(`${date}T${careTime}:00`);
          return (
            appointment.getTime() - reminderLeadMinutes * 60 * 1000 <=
            now.getTime()
          );
        });
        if (unavailableLead) {
          setError(
            "That reminder time has already passed. Choose a shorter reminder or move the appointment later.",
          );
          return;
        }
      }
    }
    let durationMinutes: number | undefined;
    if (capturesDuration && duration.trim()) {
      durationMinutes = Number(duration);
      if (
        !Number.isInteger(durationMinutes) ||
        durationMinutes <= 0 ||
        durationMinutes > 1440
      ) {
        setError("Duration must be a whole number between 1 and 1440 minutes.");
        return;
      }
    }
    const inventoryDetails: CareTaskDetails = {};
    if (capturesMedication && stock.trim()) {
      const stockValue = Number(stock);
      const unitsValue = Number(unitsPerDose);
      const thresholdValue = Number(refillThreshold);
      if (!Number.isFinite(stockValue) || stockValue < 0) {
        setError("Medication supply must be zero or greater.");
        return;
      }
      if (!Number.isFinite(unitsValue) || unitsValue <= 0) {
        setError("Units used per dose must be greater than zero.");
        return;
      }
      if (!Number.isFinite(thresholdValue) || thresholdValue < 0) {
        setError("The refill alert level must be zero or greater.");
        return;
      }
      inventoryDetails.stock = stockValue;
      inventoryDetails.stockUnit = stockUnit.trim() || "doses";
      inventoryDetails.unitsPerDose = unitsValue;
      inventoryDetails.refillThreshold = thresholdValue;
    }
    const details: CareTaskDetails = {
      ...(capturesQuantity && quantity.trim()
        ? { quantity: quantity.trim() }
        : {}),
      ...(capturesDuration && durationMinutes ? { durationMinutes } : {}),
      ...(capturesMedication && dose.trim() ? { dose: dose.trim() } : {}),
      ...(capturesMedication ? { route } : {}),
      ...(capturesAppointment && provider.trim()
        ? { provider: provider.trim() }
        : {}),
      ...(capturesAppointment && location.trim()
        ? { location: location.trim() }
        : {}),
      ...(capturesAppointment ? { reminderLeadMinutes } : {}),
      ...inventoryDetails,
    };
    const now = Date.now();
    if (!tryAcquireSubmissionLock(saveLock)) return;
    onSave({
      id: editingTask?.id ?? createLocalId("care-custom"),
      petId,
      category,
      title: title.trim(),
      instructions: instructions.trim(),
      ...(Object.keys(details).length > 0 ? { details } : {}),
      schedule: {
        frequency,
        times: normalizedTimes,
        ...(frequency === "weekly"
          ? { weekdays: [...weekdays].sort((first, second) => first - second) }
          : {}),
        ...(frequency === "once" ? { date } : {}),
      },
      enabled: editingTask?.enabled ?? true,
      createdAt: editingTask?.createdAt ?? new Date(now).toISOString(),
      ...(editingTask?.medicationId &&
      category === "medication" &&
      editingTask.petId === petId
        ? { medicationId: editingTask.medicationId }
        : {}),
    });
  };

  const selectedMeta = getCategoryMeta(category);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.screen}
    >
      <ScrollView
        contentContainerStyle={{
          paddingBottom: bottomInset + 126,
          paddingTop: topInset + 12,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable
            accessibilityLabel="Close quick add"
            accessibilityRole="button"
            onPress={onCancel}
            style={styles.close}
          >
            <Ionicons color={colors.ink} name="close" size={22} />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>QUICK ADD</Text>
            <Text style={styles.title}>
              {editingTask ? "Edit care moment" : "New care moment"}
            </Text>
          </View>
        </View>

        <Text style={styles.label}>What kind of care?</Text>
        <ScrollView
          contentContainerStyle={styles.categoryRow}
          horizontal
          showsHorizontalScrollIndicator={false}
        >
          {CARE_CATEGORIES.map((item) => {
            const meta = getCategoryMeta(item);
            const selected = item === category;
            return (
              <Pressable
                accessibilityLabel={`Choose ${meta.label}`}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                key={item}
                onPress={() => chooseCategory(item)}
                style={[
                  styles.category,
                  {
                    backgroundColor: selected ? meta.color : meta.softColor,
                    borderColor: selected ? meta.color : "transparent",
                  },
                ]}
              >
                <Ionicons
                  color={selected ? colors.white : meta.color}
                  name={meta.icon as keyof typeof Ionicons.glyphMap}
                  size={18}
                />
                <Text
                  style={[
                    styles.categoryText,
                    { color: selected ? colors.white : colors.ink },
                  ]}
                >
                  {meta.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
        <View style={styles.categoryHint}>
          <Ionicons color={colors.muted} name="swap-horizontal" size={14} />
          <Text style={styles.categoryHintText}>Swipe to see every care type</Text>
        </View>

        <View style={styles.petSection}>
          <Text style={styles.labelInline}>For</Text>
          <View style={styles.chipRow}>
            {pets.map((pet) => (
              <Pressable
                accessibilityLabel={`Schedule for ${pet.name}`}
                accessibilityRole="button"
                accessibilityState={{ selected: pet.id === petId }}
                key={pet.id}
                onPress={() => setPetId(pet.id)}
                style={[styles.chip, pet.id === petId && styles.chipSelected]}
              >
                <View style={[styles.petDot, { backgroundColor: pet.color }]} />
                <Text
                  style={[
                    styles.chipText,
                    pet.id === petId && styles.chipTextSelected,
                  ]}
                >
                  {pet.name}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <Animated.View
          style={[
            styles.formCard,
            {
              opacity: formTransition,
              transform: [
                {
                  translateY: formTransition.interpolate({
                    inputRange: [0, 1],
                    outputRange: [7, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.formHeading}>
            <View
              style={[
                styles.formIcon,
                { backgroundColor: selectedMeta.softColor },
              ]}
            >
              <Ionicons
                color={selectedMeta.color}
                name={selectedMeta.icon as keyof typeof Ionicons.glyphMap}
                size={19}
              />
            </View>
            <View style={styles.flex}>
              <Text style={styles.formEyebrow}>{selectedMeta.label.toUpperCase()}</Text>
              <Text style={styles.formHint}>Details and timing</Text>
            </View>
          </View>

          <Text style={styles.inputLabel}>Title</Text>
          <TextInput
            accessibilityLabel="Care moment title"
            maxLength={INPUT_LIMITS.shortText}
            onChangeText={setTitle}
            placeholder="e.g. Morning walk"
            placeholderTextColor={colors.muted}
            style={styles.input}
            value={title}
          />
          <Text style={styles.inputLabel}>Instructions</Text>
          <TextInput
            accessibilityLabel="Care instructions"
            maxLength={INPUT_LIMITS.instructions}
            multiline
            onChangeText={setInstructions}
            placeholder={
              capturesAppointment
                ? "Reason, preparation or questions..."
                : capturesMedication
                  ? "Dose instructions, food or precautions..."
                  : capturesQuantity
                    ? "Portion, routine or notes..."
                    : capturesDuration
                      ? "Duration, route or goals..."
                      : "Helpful notes for the caregiver..."
            }
            placeholderTextColor={colors.muted}
            style={[styles.input, styles.notes]}
            value={instructions}
          />
          {capturesQuantity && (
            <>
              <Text style={styles.inputLabel}>
                {category === "feeding" ? "Portion" : "Amount"}
              </Text>
              <TextInput
                accessibilityLabel={
                  category === "feeding" ? "Meal portion" : "Water amount"
                }
                onChangeText={setQuantity}
                maxLength={INPUT_LIMITS.reference}
                placeholder={category === "feeding" ? "e.g. 120 g or 1/2 cup" : "e.g. Full bowl or 400 ml"}
                placeholderTextColor={colors.muted}
                style={styles.input}
                value={quantity}
              />
            </>
          )}
          {capturesDuration && (
            <>
              <Text style={styles.inputLabel}>Duration</Text>
              <TextInput
                accessibilityLabel="Duration in minutes"
                keyboardType="number-pad"
                maxLength={4}
                onChangeText={setDuration}
                placeholder="e.g. 30 minutes"
                placeholderTextColor={colors.muted}
                style={styles.input}
                value={duration}
              />
            </>
          )}
          {capturesMedication && (
            <>
              <Text style={styles.inputLabel}>Dose</Text>
              <TextInput
                accessibilityLabel="Medication dose"
                maxLength={INPUT_LIMITS.reference}
                onChangeText={setDose}
                placeholder="e.g. 75 mg or 1 tablet"
                placeholderTextColor={colors.muted}
                style={styles.input}
                value={dose}
              />
              <Text style={styles.inputLabel}>Route</Text>
              <View style={styles.routeRow}>
                {MEDICATION_ROUTES.map((option) => {
                  const selected = route === option.value;
                  return (
                    <Pressable
                      accessibilityLabel={`Medication route ${option.label}`}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      key={option.value}
                      onPress={() => setRoute(option.value)}
                      style={[
                        styles.routeChip,
                        selected && styles.routeChipSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.routeText,
                          selected && styles.routeTextSelected,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <Text style={styles.inputLabel}>Supply tracking (optional)</Text>
              <View style={styles.inventoryRow}>
                <View style={styles.inventoryField}>
                  <TextInput
                    accessibilityLabel="Medication supply remaining"
                    keyboardType="decimal-pad"
                    maxLength={12}
                    onChangeText={setStock}
                    placeholder="30"
                    placeholderTextColor={colors.muted}
                    style={styles.input}
                    value={stock}
                  />
                  <Text style={styles.inventoryHint}>Remaining</Text>
                </View>
                <View style={styles.inventoryField}>
                  <TextInput
                    accessibilityLabel="Medication supply unit"
                    maxLength={INPUT_LIMITS.shortText}
                    onChangeText={setStockUnit}
                    placeholder="doses"
                    placeholderTextColor={colors.muted}
                    style={styles.input}
                    value={stockUnit}
                  />
                  <Text style={styles.inventoryHint}>Unit</Text>
                </View>
              </View>
              <View style={styles.inventoryRow}>
                <View style={styles.inventoryField}>
                  <TextInput
                    accessibilityLabel="Medication units used per dose"
                    keyboardType="decimal-pad"
                    maxLength={12}
                    onChangeText={setUnitsPerDose}
                    placeholder="1"
                    placeholderTextColor={colors.muted}
                    style={styles.input}
                    value={unitsPerDose}
                  />
                  <Text style={styles.inventoryHint}>Used each time</Text>
                </View>
                <View style={styles.inventoryField}>
                  <TextInput
                    accessibilityLabel="Medication refill alert level"
                    keyboardType="decimal-pad"
                    maxLength={12}
                    onChangeText={setRefillThreshold}
                    placeholder="5"
                    placeholderTextColor={colors.muted}
                    style={styles.input}
                    value={refillThreshold}
                  />
                  <Text style={styles.inventoryHint}>Alert at</Text>
                </View>
              </View>
            </>
          )}
          {capturesAppointment && (
            <>
              <Text style={styles.inputLabel}>Provider</Text>
              <TextInput
                accessibilityLabel="Appointment provider"
                autoCapitalize="words"
                maxLength={INPUT_LIMITS.shortText}
                onChangeText={setProvider}
                placeholder="Vet, clinic, groomer or trainer"
                placeholderTextColor={colors.muted}
                style={styles.input}
                value={provider}
              />
              <Text style={styles.inputLabel}>Location</Text>
              <TextInput
                accessibilityLabel="Appointment location"
                maxLength={INPUT_LIMITS.reference}
                onChangeText={setLocation}
                placeholder="Clinic, address or video call"
                placeholderTextColor={colors.muted}
                style={styles.input}
                value={location}
              />
              <Text style={styles.inputLabel}>Reminder</Text>
              <View style={styles.routeRow}>
                {APPOINTMENT_REMINDERS.map((option) => {
                  const selected = reminderLeadMinutes === option.minutes;
                  return (
                    <Pressable
                      accessibilityLabel={`Appointment reminder ${option.label}`}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      key={option.minutes}
                      onPress={() => setReminderLeadMinutes(option.minutes)}
                      style={[
                        styles.routeChip,
                        selected && styles.routeChipSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.routeText,
                          selected && styles.routeTextSelected,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          )}
          <Text style={styles.inputLabel}>Times</Text>
          <View style={styles.timeList}>
            {times.map((timeValue, index) => (
              <View key={`care-time-${index}`} style={styles.timeRow}>
                <View style={styles.timeNumber}>
                  <Text style={styles.timeNumberText}>{index + 1}</Text>
                </View>
              <TextInput
                  accessibilityLabel={`Care time ${index + 1}`}
                  autoCorrect={false}
                  keyboardType="numbers-and-punctuation"
                  maxLength={5}
                  onChangeText={(value) =>
                    setTimes((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index ? value : item,
                      ),
                    )
                  }
                  placeholder="08:00"
                  placeholderTextColor={colors.muted}
                  style={[styles.input, styles.timeInput]}
                  value={timeValue}
              />
                {times.length > 1 && (
                  <Pressable
                    accessibilityLabel={`Remove care time ${index + 1}`}
                    accessibilityRole="button"
                    hitSlop={6}
                    onPress={() =>
                      setTimes((current) =>
                        current.filter((_, itemIndex) => itemIndex !== index),
                      )
                    }
                    style={styles.removeTime}
                  >
                    <Ionicons color={colors.muted} name="close" size={17} />
                  </Pressable>
                )}
              </View>
            ))}
            {times.length < MAX_DAILY_TIMES && (
              <Pressable
                accessibilityHint="Adds another reminder time to this care moment"
                accessibilityLabel="Add another care time"
                accessibilityRole="button"
                onPress={() => {
                  setTimes((current) => [...current, suggestNextTime(current)]);
                  setError(null);
                }}
                style={styles.addTime}
              >
                <Ionicons color={colors.sky} name="add" size={17} />
                <Text style={styles.addTimeText}>Add another time</Text>
              </Pressable>
            )}
          </View>
          {frequency === "once" && (
            <View>
              <Text style={styles.inputLabel}>Date</Text>
              <TextInput
                accessibilityLabel="Care date"
                autoCorrect={false}
                keyboardType="numbers-and-punctuation"
                maxLength={10}
                onChangeText={setDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.muted}
                style={styles.input}
                value={date}
              />
            </View>
          )}
        </Animated.View>

        <View style={styles.repeatSection}>
          <Text style={styles.labelInline}>Repeat</Text>
          <View style={styles.repeatRow}>
            {(["daily", "weekly", "once"] as CareFrequency[]).map((item) => (
              <Pressable
                accessibilityLabel={`Repeat ${item}`}
                accessibilityRole="button"
                accessibilityState={{ selected: item === frequency }}
                key={item}
                onPress={() => setFrequency(item)}
                style={[styles.repeat, item === frequency && styles.repeatSelected]}
              >
                <Text
                  style={[
                    styles.repeatText,
                    item === frequency && styles.repeatTextSelected,
                  ]}
                >
                  {item[0]?.toUpperCase() + item.slice(1)}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {frequency === "weekly" && (
          <View style={styles.weekdayRow}>
            {["S", "M", "T", "W", "T", "F", "S"].map((dayLabel, day) => {
              const selected = weekdays.includes(day);
              return (
                <Pressable
                  accessibilityLabel={`${["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][day]} schedule`}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  key={day}
                  onPress={() =>
                    setWeekdays((current) =>
                      current.includes(day)
                        ? current.filter((item) => item !== day)
                        : [...current, day],
                    )
                  }
                  style={[styles.weekday, selected && styles.weekdaySelected]}
                >
                  <Text
                    style={[
                      styles.weekdayText,
                      selected && styles.weekdayTextSelected,
                    ]}
                  >
                    {dayLabel}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}

        {error && (
          <Text
            accessibilityLiveRegion="polite"
            accessibilityRole="alert"
            style={styles.error}
          >
            {error}
          </Text>
        )}
        <Pressable accessibilityRole="button" onPress={submit} style={styles.save}>
          <Text style={styles.saveText}>
            {editingTask ? "Save changes" : "Add to care plan"}
          </Text>
          <Ionicons color={colors.white} name="arrow-forward" size={19} />
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  addTime: {
    alignItems: "center",
    alignSelf: "flex-start",
    flexDirection: "row",
    gap: 5,
    minHeight: 44,
    paddingHorizontal: 4,
  },
  addTimeText: {
    color: colors.sky,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 11,
  },
  category: {
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 7,
    minHeight: 44,
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  categoryRow: { gap: 8, paddingHorizontal: 18 },
  categoryHint: {
    alignItems: "center",
    flexDirection: "row",
    gap: 5,
    marginHorizontal: 18,
    marginTop: 6,
  },
  categoryHintText: {
    color: colors.muted,
    fontFamily: "Nunito_700Bold",
    fontSize: 10,
  },
  categoryText: {
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 11,
  },
  chip: {
    alignItems: "center",
    backgroundColor: colors.paper,
    borderColor: colors.line,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 7,
    minHeight: 44,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  chipRow: { flex: 1, flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chipSelected: { backgroundColor: colors.ink, borderColor: colors.ink },
  chipText: {
    color: colors.ink,
    fontFamily: "Nunito_700Bold",
    fontSize: 12,
  },
  chipTextSelected: { color: colors.white },
  close: {
    alignItems: "center",
    backgroundColor: colors.paper,
    borderColor: colors.line,
    borderRadius: 20,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    width: 44,
    ...shadow.subtle,
  },
  error: {
    color: colors.danger,
    fontFamily: "Nunito_700Bold",
    fontSize: 12,
    marginHorizontal: 18,
    marginTop: 10,
  },
  eyebrow: {
    color: colors.navy,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 9,
    letterSpacing: 1.2,
  },
  flex: { flex: 1 },
  formCard: {
    backgroundColor: colors.paper,
    borderColor: "rgba(34,48,67,0.07)",
    borderRadius: 25,
    borderWidth: 1,
    gap: 6,
    marginHorizontal: 18,
    marginTop: 14,
    padding: 15,
    ...shadow.subtle,
  },
  formEyebrow: {
    color: colors.navy,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 8,
    letterSpacing: 0.9,
  },
  formHeading: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    marginBottom: 3,
  },
  formHint: {
    color: colors.muted,
    fontFamily: "Nunito_600SemiBold",
    fontSize: 11,
    marginTop: 1,
  },
  formIcon: {
    alignItems: "center",
    borderRadius: 18,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 18,
  },
  headerCopy: { flex: 1 },
  input: {
    backgroundColor: colors.background,
    borderColor: colors.line,
    borderRadius: 16,
    borderWidth: 1,
    color: colors.ink,
    fontFamily: "Nunito_700Bold",
    fontSize: 14,
    minHeight: 44,
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  inputLabel: {
    color: colors.muted,
    fontFamily: "Nunito_700Bold",
    fontSize: 10,
    marginLeft: 2,
    marginTop: 4,
  },
  inventoryField: { flex: 1, gap: 3 },
  inventoryHint: {
    color: colors.muted,
    fontFamily: "Nunito_700Bold",
    fontSize: 8,
    marginLeft: 3,
  },
  inventoryRow: { flexDirection: "row", gap: 8 },
  label: {
    color: colors.ink,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 13,
    marginBottom: 8,
    marginHorizontal: 18,
    marginTop: 17,
  },
  labelInline: {
    color: colors.ink,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 13,
  },
  notes: { minHeight: 64, textAlignVertical: "top" },
  petDot: { borderRadius: 4, height: 8, width: 8 },
  petSection: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
    marginHorizontal: 18,
    marginTop: 15,
  },
  repeat: {
    alignItems: "center",
    backgroundColor: colors.paper,
    borderColor: colors.line,
    borderRadius: 17,
    borderWidth: 1,
    minHeight: 44,
    paddingHorizontal: 15,
    paddingVertical: 9,
  },
  repeatRow: { flexDirection: "row", gap: 8 },
  repeatSection: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    marginHorizontal: 18,
    marginTop: 15,
  },
  repeatSelected: { backgroundColor: colors.sky, borderColor: colors.sky },
  repeatText: {
    color: colors.ink,
    fontFamily: "Nunito_700Bold",
    fontSize: 11,
  },
  repeatTextSelected: { color: colors.white },
  removeTime: {
    alignItems: "center",
    backgroundColor: colors.background,
    borderRadius: 15,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  routeChip: {
    alignItems: "center",
    backgroundColor: colors.background,
    borderColor: colors.line,
    borderRadius: 14,
    borderWidth: 1,
    minHeight: 44,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  routeChipSelected: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  routeRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  routeText: {
    color: colors.ink,
    fontFamily: "Nunito_700Bold",
    fontSize: 10,
  },
  routeTextSelected: { color: colors.white },
  save: {
    alignItems: "center",
    backgroundColor: colors.coral,
    borderRadius: 21,
    flexDirection: "row",
    gap: 9,
    justifyContent: "center",
    marginHorizontal: 18,
    marginTop: 16,
    paddingVertical: 14,
    ...shadow.subtle,
  },
  saveText: {
    color: colors.white,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 14,
  },
  screen: { backgroundColor: colors.background, flex: 1 },
  title: {
    color: colors.ink,
    fontFamily: "Fredoka_600SemiBold",
    fontSize: 27,
    lineHeight: 31,
  },
  timeInput: { flex: 1 },
  timeList: { gap: 7 },
  timeNumber: {
    alignItems: "center",
    backgroundColor: colors.skySoft,
    borderRadius: 15,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  timeNumberText: {
    color: colors.navy,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 11,
  },
  timeRow: { alignItems: "center", flexDirection: "row", gap: 7 },
  weekday: {
    alignItems: "center",
    aspectRatio: 1,
    backgroundColor: colors.paper,
    borderRadius: 16,
    flex: 1,
    justifyContent: "center",
    maxWidth: 44,
    minWidth: 44,
  },
  weekdayRow: {
    flexDirection: "row",
    gap: 4,
    justifyContent: "center",
    marginHorizontal: 16,
    marginTop: 10,
  },
  weekdaySelected: { backgroundColor: colors.sage },
  weekdayText: {
    color: colors.ink,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 11,
  },
  weekdayTextSelected: { color: colors.white },
});
