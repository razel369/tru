import type { Pet } from "../../types";

import type {
  CareLog,
  CareTask,
  CareTaskDetails,
  HealthRecord,
  PetCareState,
} from "./types";
import { isValidPetBirthDate } from "./pet-identity";
import { INPUT_LIMITS } from "../../utils/input-limits";

const CARE_CATEGORIES = new Set([
  "feeding",
  "water",
  "walk",
  "medication",
  "grooming",
  "play",
  "training",
  "appointment",
  "other",
]);
const CARE_FREQUENCIES = new Set(["daily", "weekly", "once"]);
const PET_SEXES = new Set(["female", "male", "unknown"]);
const PET_REPRODUCTIVE_STATUSES = new Set(["intact", "altered", "unknown"]);
const MEDICATION_ROUTES = new Set([
  "oral",
  "topical",
  "injection",
  "drops",
  "inhaled",
  "other",
]);
const HEALTH_TYPES = new Set([
  "weight",
  "vaccination",
  "vet-visit",
  "symptom",
  "document",
  "note",
]);
const HEALTH_SEVERITIES = new Set(["mild", "moderate", "urgent"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isNonEmptyString(value: unknown): value is string {
  return isString(value) && value.trim().length > 0;
}

function isOptionalString(value: unknown) {
  return value === undefined || isString(value);
}

function isBoundedString(value: unknown, maxLength: number) {
  return isString(value) && value.length <= maxLength;
}

function isOptionalBoundedString(value: unknown, maxLength: number) {
  return value === undefined || isBoundedString(value, maxLength);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function validDate(value: unknown) {
  if (!isString(value) || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  const day = Number(value.slice(8, 10));
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

function validTime(value: unknown) {
  if (!isString(value)) return false;
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return false;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
}

function validTimestamp(value: unknown) {
  return isString(value) && !Number.isNaN(Date.parse(value));
}

function validDetails(value: unknown): value is CareTaskDetails {
  if (value === undefined) return true;
  if (!isRecord(value)) return false;
  return (
    isOptionalBoundedString(value.quantity, INPUT_LIMITS.shortText) &&
    (value.durationMinutes === undefined ||
      (isFiniteNumber(value.durationMinutes) &&
        value.durationMinutes > 0 &&
        value.durationMinutes <= 1_440)) &&
    isOptionalBoundedString(value.dose, INPUT_LIMITS.shortText) &&
    (value.route === undefined ||
      (isString(value.route) && MEDICATION_ROUTES.has(value.route))) &&
    isOptionalBoundedString(value.provider, INPUT_LIMITS.shortText) &&
    isOptionalBoundedString(value.location, INPUT_LIMITS.reference) &&
    (value.stock === undefined ||
      (isFiniteNumber(value.stock) && value.stock >= 0)) &&
    isOptionalBoundedString(value.stockUnit, INPUT_LIMITS.identifier) &&
    (value.unitsPerDose === undefined ||
      (isFiniteNumber(value.unitsPerDose) && value.unitsPerDose > 0)) &&
    (value.refillThreshold === undefined ||
      (isFiniteNumber(value.refillThreshold) &&
        value.refillThreshold >= 0)) &&
    (value.reminderLeadMinutes === undefined ||
      (isFiniteNumber(value.reminderLeadMinutes) &&
        value.reminderLeadMinutes >= 0))
  );
}

function validMedication(value: unknown) {
  if (!isRecord(value)) return false;
  return (
    isNonEmptyString(value.id) &&
    isNonEmptyString(value.name) &&
    value.name.length <= INPUT_LIMITS.shortText &&
    isBoundedString(value.dosage, INPUT_LIMITS.shortText) &&
    isBoundedString(value.instructions, INPUT_LIMITS.instructions) &&
    isString(value.form) &&
    Array.isArray(value.times) &&
    value.times.every(validTime) &&
    isFiniteNumber(value.stock) &&
    value.stock >= 0 &&
    isBoundedString(value.stockUnit, INPUT_LIMITS.identifier) &&
    isString(value.color) &&
    (value.paused === undefined || typeof value.paused === "boolean")
  );
}

function validCareProfile(value: unknown) {
  if (value === undefined) return true;
  if (!isRecord(value)) return false;
  return (
    isOptionalBoundedString(value.allergies, INPUT_LIMITS.instructions) &&
    (value.dateOfBirth === undefined ||
      (isString(value.dateOfBirth) && isValidPetBirthDate(value.dateOfBirth))) &&
    isOptionalBoundedString(value.diet, INPUT_LIMITS.instructions) &&
    isOptionalBoundedString(value.veterinarianName, INPUT_LIMITS.shortText) &&
    isOptionalBoundedString(value.veterinarianPhone, INPUT_LIMITS.phone) &&
    isOptionalBoundedString(value.emergencyContactName, INPUT_LIMITS.shortText) &&
    isOptionalBoundedString(value.emergencyContactPhone, INPUT_LIMITS.phone) &&
    isOptionalBoundedString(value.microchipId, INPUT_LIMITS.identifier) &&
    (value.reproductiveStatus === undefined ||
      (isString(value.reproductiveStatus) &&
        PET_REPRODUCTIVE_STATUSES.has(value.reproductiveStatus))) &&
    (value.sex === undefined ||
      (isString(value.sex) && PET_SEXES.has(value.sex))) &&
    isOptionalBoundedString(value.caregiverNotes, INPUT_LIMITS.notes)
  );
}

function validPet(value: unknown): value is Pet {
  if (!isRecord(value)) return false;
  return (
    isNonEmptyString(value.id) &&
    isNonEmptyString(value.name) &&
    value.name.length <= INPUT_LIMITS.name &&
    isString(value.species) &&
    (value.species === "dog" ||
      value.species === "cat" ||
      value.species === "other") &&
    isBoundedString(value.breed, INPUT_LIMITS.breed) &&
    isFiniteNumber(value.age) &&
    value.age >= 0 &&
    value.age <= 250 &&
    isString(value.avatar) &&
    isString(value.color) &&
    Array.isArray(value.medications) &&
    value.medications.every(validMedication) &&
    validCareProfile(value.careProfile) &&
    (value.visual === undefined || isRecord(value.visual))
  );
}

function validTask(value: unknown): value is CareTask {
  if (!isRecord(value) || !isRecord(value.schedule)) return false;
  const schedule = value.schedule;
  const frequency = schedule.frequency;
  if (!isString(frequency) || !CARE_FREQUENCIES.has(frequency)) return false;
  if (
    !Array.isArray(schedule.times) ||
    schedule.times.length === 0 ||
    schedule.times.length > 8 ||
    new Set(schedule.times).size !== schedule.times.length ||
    !schedule.times.every(validTime)
  ) {
    return false;
  }
  if (
    frequency === "weekly" &&
    (!Array.isArray(schedule.weekdays) ||
      schedule.weekdays.length === 0 ||
      schedule.weekdays.length > 7 ||
      new Set(schedule.weekdays).size !== schedule.weekdays.length ||
      schedule.weekdays.some(
        (day) => !Number.isInteger(day) || day < 0 || day > 6,
      ))
  ) {
    return false;
  }
  if (frequency === "once" && !validDate(schedule.date)) return false;
  return (
    isNonEmptyString(value.id) &&
    isNonEmptyString(value.petId) &&
    isString(value.category) &&
    CARE_CATEGORIES.has(value.category) &&
    isNonEmptyString(value.title) &&
    value.title.length <= INPUT_LIMITS.shortText &&
    isBoundedString(value.instructions, INPUT_LIMITS.instructions) &&
    validDetails(value.details) &&
    typeof value.enabled === "boolean" &&
    validTimestamp(value.createdAt) &&
    (value.archivedAt === undefined || validTimestamp(value.archivedAt)) &&
    isOptionalString(value.medicationId)
  );
}

function validActual(value: unknown) {
  if (value === undefined) return true;
  if (!isRecord(value)) return false;
  return (
    isOptionalBoundedString(value.quantity, INPUT_LIMITS.shortText) &&
    (value.durationMinutes === undefined ||
      (isFiniteNumber(value.durationMinutes) &&
        value.durationMinutes > 0 &&
        value.durationMinutes <= 1_440)) &&
    isOptionalBoundedString(value.dose, INPUT_LIMITS.shortText)
  );
}

function validLog(value: unknown): value is CareLog {
  if (!isRecord(value)) return false;
  const validSnapshot =
    value.taskSnapshotVersion === undefined
      ? value.taskTitle === undefined &&
        value.taskCategory === undefined &&
        value.taskInstructions === undefined
      : value.taskSnapshotVersion === 1 &&
        isNonEmptyString(value.taskTitle) &&
        value.taskTitle.length <= INPUT_LIMITS.shortText &&
        isString(value.taskCategory) &&
        CARE_CATEGORIES.has(value.taskCategory) &&
        isBoundedString(value.taskInstructions, INPUT_LIMITS.instructions);
  return (
    isNonEmptyString(value.id) &&
    isNonEmptyString(value.taskId) &&
    isNonEmptyString(value.petId) &&
    validDate(value.date) &&
    validTime(value.scheduledTime) &&
    (value.status === "done" || value.status === "skipped") &&
    validTimestamp(value.completedAt) &&
    isNonEmptyString(value.completedBy) &&
    validSnapshot &&
    validDetails(value.planned) &&
    validActual(value.actual) &&
    isOptionalBoundedString(value.note, INPUT_LIMITS.notes)
  );
}

function invalidLogField(value: unknown) {
  if (!isRecord(value)) return "record is not an object";
  if (!isNonEmptyString(value.id)) return "id is empty";
  if (!isNonEmptyString(value.taskId)) return "taskId is empty";
  if (!isNonEmptyString(value.petId)) return "petId is empty";
  if (!validDate(value.date)) return "date is invalid";
  if (!validTime(value.scheduledTime)) return "scheduledTime is invalid";
  if (value.status !== "done" && value.status !== "skipped") {
    return "status is invalid";
  }
  if (!validTimestamp(value.completedAt)) return "completedAt is invalid";
  if (!isNonEmptyString(value.completedBy)) return "completedBy is empty";
  if (
    value.taskSnapshotVersion !== undefined &&
    (value.taskSnapshotVersion !== 1 ||
      !isNonEmptyString(value.taskTitle) ||
      value.taskTitle.length > INPUT_LIMITS.shortText ||
      !isString(value.taskCategory) ||
      !CARE_CATEGORIES.has(value.taskCategory) ||
      !isBoundedString(value.taskInstructions, INPUT_LIMITS.instructions))
  ) {
    return "task snapshot is invalid";
  }
  if (!validDetails(value.planned)) return "planned details are invalid";
  if (!validActual(value.actual)) return "actual details are invalid";
  if (!isOptionalString(value.note)) return "note is invalid";
  return "record is invalid";
}

function validHealthRecord(value: unknown): value is HealthRecord {
  if (!isRecord(value)) return false;
  if (
    !isNonEmptyString(value.id) ||
    !isNonEmptyString(value.petId) ||
    !isString(value.type) ||
    !HEALTH_TYPES.has(value.type) ||
    !isNonEmptyString(value.title) ||
    value.title.length > INPUT_LIMITS.shortText ||
    !validDate(value.date) ||
    !validTimestamp(value.createdAt)
  ) {
    return false;
  }
  if (
    !isOptionalString(value.value) ||
    !isOptionalString(value.unit) ||
    !isOptionalBoundedString(value.notes, INPUT_LIMITS.notes) ||
    !isOptionalBoundedString(value.provider, INPUT_LIMITS.shortText) ||
    !isOptionalBoundedString(value.reference, INPUT_LIMITS.reference) ||
    (value.nextDueDate !== undefined && !validDate(value.nextDueDate)) ||
    (value.resolvedDate !== undefined &&
      (!isString(value.resolvedDate) ||
        !validDate(value.resolvedDate) ||
        value.type !== "symptom" ||
        !isString(value.date) ||
        value.resolvedDate < value.date)) ||
    (value.severity !== undefined &&
      (!isString(value.severity) || !HEALTH_SEVERITIES.has(value.severity)))
  ) {
    return false;
  }
  if (value.attachment === undefined) return true;
  if (!isRecord(value.attachment)) return false;
  return (
    isNonEmptyString(value.attachment.id) &&
    isNonEmptyString(value.attachment.name) &&
    isNonEmptyString(value.attachment.uri) &&
    isNonEmptyString(value.attachment.mimeType) &&
    isFiniteNumber(value.attachment.size) &&
    value.attachment.size >= 0 &&
    (value.attachment.storage === "app-document" ||
      value.attachment.storage === "session") &&
    validTimestamp(value.attachment.createdAt)
  );
}

function recordIdentity(value: unknown, labelKey: "name" | "title") {
  if (!isRecord(value)) return "";
  const id = isString(value.id) ? value.id : "unknown id";
  const label = isString(value[labelKey]) ? value[labelKey] : "unnamed";
  return ` \"${label}\" (${id})`;
}

function duplicateId(values: { id: string }[]) {
  const seen = new Set<string>();
  for (const value of values) {
    if (seen.has(value.id)) return value.id;
    seen.add(value.id);
  }
  return null;
}

export function getPetCareStateValidationIssue(value: unknown): string | null {
  if (!isRecord(value)) return "state is not an object";
  if (value.version !== 1) return "state.version is not 1";
  if (
    !Array.isArray(value.pets) ||
    !Array.isArray(value.tasks) ||
    !Array.isArray(value.logs) ||
    !Array.isArray(value.healthRecords)
  ) {
    return "state collections are not arrays";
  }
  if (value.pets.length > 100) return "pets exceeds 100 records";
  if (value.tasks.length > 10_000) return "tasks exceeds 10,000 records";
  if (value.logs.length > 250_000) return "logs exceeds 250,000 records";
  if (value.healthRecords.length > 50_000) {
    return "healthRecords exceeds 50,000 records";
  }

  const invalidPetIndex = value.pets.findIndex((pet) => !validPet(pet));
  if (invalidPetIndex >= 0) {
    return `pets[${invalidPetIndex}]${recordIdentity(value.pets[invalidPetIndex], "name")} failed schema validation`;
  }
  const invalidTaskIndex = value.tasks.findIndex((task) => !validTask(task));
  if (invalidTaskIndex >= 0) {
    return `tasks[${invalidTaskIndex}]${recordIdentity(value.tasks[invalidTaskIndex], "title")} failed schema validation`;
  }
  const invalidLogIndex = value.logs.findIndex((log) => !validLog(log));
  if (invalidLogIndex >= 0) {
    const invalidLog = value.logs[invalidLogIndex];
    return `logs[${invalidLogIndex}]${recordIdentity(invalidLog, "title")} failed schema validation: ${invalidLogField(invalidLog)}`;
  }
  const invalidRecordIndex = value.healthRecords.findIndex(
    (record) => !validHealthRecord(record),
  );
  if (invalidRecordIndex >= 0) {
    return `healthRecords[${invalidRecordIndex}]${recordIdentity(value.healthRecords[invalidRecordIndex], "title")} failed schema validation`;
  }

  const pets = value.pets as Pet[];
  const tasks = value.tasks as CareTask[];
  const logs = value.logs as CareLog[];
  const records = value.healthRecords as HealthRecord[];
  const duplicatePetId = duplicateId(pets);
  if (duplicatePetId) return `pets contains duplicate id \"${duplicatePetId}\"`;
  const duplicateTaskId = duplicateId(tasks);
  if (duplicateTaskId) return `tasks contains duplicate id \"${duplicateTaskId}\"`;
  const duplicateLogId = duplicateId(logs);
  if (duplicateLogId) return `logs contains duplicate id \"${duplicateLogId}\"`;
  const duplicateRecordId = duplicateId(records);
  if (duplicateRecordId) {
    return `healthRecords contains duplicate id \"${duplicateRecordId}\"`;
  }

  const petIds = new Set(pets.map((pet) => pet.id));
  const taskIds = new Set(tasks.map((task) => task.id));
  if (
    value.activePetId !== null &&
    (!isString(value.activePetId) || !petIds.has(value.activePetId))
  ) {
    return `activePetId \"${String(value.activePetId)}\" does not reference a pet`;
  }
  const orphanedTask = tasks.find((task) => !petIds.has(task.petId));
  if (orphanedTask) {
    return `task \"${orphanedTask.id}\" references missing pet \"${orphanedTask.petId}\"`;
  }
  const orphanedLog = logs.find(
    (log) => !petIds.has(log.petId) || !taskIds.has(log.taskId),
  );
  if (orphanedLog) {
    return `log \"${orphanedLog.id}\" references missing pet or task`;
  }
  const orphanedRecord = records.find(
    (record) => !petIds.has(record.petId),
  );
  if (orphanedRecord) {
    return `health record \"${orphanedRecord.id}\" references missing pet \"${orphanedRecord.petId}\"`;
  }
  return null;
}

export function isPetCareState(value: unknown): value is PetCareState {
  return getPetCareStateValidationIssue(value) === null;
}
