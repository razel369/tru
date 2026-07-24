import type { MedicationForm, Pet } from "../../types";

import type {
  CareLog,
  CareTask,
  MedicationRoute,
  PetCareState,
} from "./types";

function routeForMedicationForm(form: MedicationForm): MedicationRoute {
  if (form === "topical") return "topical";
  if (form === "injection") return "injection";
  if (form === "drops") return "drops";
  return "oral";
}

function normalizeScheduleTimes(times: readonly string[]) {
  return Array.from(
    new Set(
      times
        .map((time) => time.trim())
        .filter((time) => {
          const match = /^(\d{2}):(\d{2})$/.exec(time);
          if (!match) return false;
          const hour = Number(match[1]);
          const minute = Number(match[2]);
          return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
        }),
    ),
  ).sort();
}

function normalizeWeekdays(weekdays?: readonly number[]) {
  if (!weekdays) return undefined;
  return Array.from(
    new Set(
      weekdays.filter(
        (weekday) => Number.isInteger(weekday) && weekday >= 0 && weekday <= 6,
      ),
    ),
  ).sort((a, b) => a - b);
}

function sameNumbers(first?: readonly number[], second?: readonly number[]) {
  if (first === undefined || second === undefined) return first === second;
  return (
    first.length === second.length &&
    first.every((value, index) => value === second[index])
  );
}

function sameStrings(first: readonly string[], second: readonly string[]) {
  return (
    first.length === second.length &&
    first.every((value, index) => value === second[index])
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function nonEmptyString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function validDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
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

function validTime(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return false;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
}

function legacyTimestamp(value: unknown, date: string, time: string) {
  const candidate =
    typeof value === "number" && Number.isFinite(value)
      ? value
      : typeof value === "string"
        ? Date.parse(value)
        : Number.NaN;
  if (Number.isFinite(candidate)) return new Date(candidate).toISOString();
  return new Date(`${date}T${time}:00.000Z`).toISOString();
}

function legacyDate(value: unknown, completedAt: unknown, id: unknown) {
  if (validDate(value)) return value;
  const completedAtMs =
    typeof completedAt === "number" && Number.isFinite(completedAt)
      ? completedAt
      : typeof completedAt === "string"
        ? Date.parse(completedAt)
        : Number.NaN;
  if (Number.isFinite(completedAtMs)) {
    return new Date(completedAtMs).toISOString().slice(0, 10);
  }
  const idDate = typeof id === "string" ? /\d{4}-\d{2}-\d{2}/.exec(id)?.[0] : undefined;
  return validDate(idDate) ? idDate : null;
}

function legacyTime(value: unknown, id: unknown, fallback?: string) {
  if (validTime(value)) return value;
  const idTime =
    typeof id === "string"
      ? /(?:^|:)(\d{2}:\d{2})(?:$|:)/.exec(id)?.[1]
      : undefined;
  if (validTime(idTime)) return idTime;
  return validTime(fallback) ? fallback : null;
}

export function emptyCareState(): PetCareState {
  return {
    version: 1,
    pets: [],
    tasks: [],
    logs: [],
    healthRecords: [],
    activePetId: null,
  };
}

export function migrateLegacyData(
  pets: Pet[],
  doseLogs: unknown[],
): PetCareState {
  const migratedAt = new Date().toISOString();
  const medicationTasks: CareTask[] = [];
  const taskByMedication = new Map<string, CareTask>();

  for (const pet of pets) {
    for (const medication of pet.medications) {
      const taskId = "care-med-" + pet.id + "-" + medication.id;
      const times = normalizeScheduleTimes(medication.times);
      const task: CareTask = {
        id: taskId,
        petId: pet.id,
        category: "medication",
        title: medication.name,
        instructions: [medication.dosage, medication.instructions]
          .filter(Boolean)
          .join(" - "),
        details: {
          dose: medication.dosage,
          route: routeForMedicationForm(medication.form),
          stock: medication.stock,
          stockUnit: medication.stockUnit || "doses",
          unitsPerDose: 1,
          refillThreshold: 5,
        },
        schedule: { frequency: "daily", times },
        enabled: medication.paused !== true && times.length > 0,
        createdAt: migratedAt,
        medicationId: medication.id,
      };
      taskByMedication.set(pet.id + ":" + medication.id, task);
      medicationTasks.push(task);
    }
  }

  const usedLogIds = new Set<string>();
  const logs: CareLog[] = doseLogs.flatMap((value, index) => {
    if (!isRecord(value)) return [];
    const petId = nonEmptyString(value.petId);
    const medicationId = nonEmptyString(value.medicationId);
    if (!petId || !medicationId) return [];
    const task = taskByMedication.get(petId + ":" + medicationId);
    if (!task) return [];
    const date = legacyDate(value.date, value.completedAt, value.id);
    const scheduledTime = legacyTime(
      value.scheduledTime,
      value.id,
      task.schedule.times[0],
    );
    if (!date || !scheduledTime) return [];
    if (value.status !== "given" && value.status !== "skipped") return [];
    const originalId = nonEmptyString(value.id);
    const idBase = originalId
      ? "care-log-" + originalId
      : `care-log-${task.id}:${date}:${scheduledTime}:${index}`;
    let id = idBase;
    let duplicateIndex = 1;
    while (usedLogIds.has(id)) {
      id = `${idBase}-${duplicateIndex}`;
      duplicateIndex += 1;
    }
    usedLogIds.add(id);
    return [
      {
        id,
        taskId: task.id,
        petId,
        date,
        scheduledTime,
        status: value.status === "given" ? "done" : "skipped",
        completedAt: legacyTimestamp(value.completedAt, date, scheduledTime),
        completedBy: nonEmptyString(value.completedBy) ?? "Caregiver",
        planned: task.details ? { ...task.details } : undefined,
        actual:
          value.status === "given" && task.details?.dose
            ? { dose: task.details.dose }
            : undefined,
      },
    ];
  });

  return {
    version: 1,
    pets,
    tasks: medicationTasks,
    logs,
    healthRecords: [],
    activePetId: pets[0]?.id ?? null,
  };
}

export function upgradeCareState(state: PetCareState): PetCareState {
  const petById = new Map(state.pets.map((pet) => [pet.id, pet]));
  let changed = false;
  const tasks = state.tasks.map((task) => {
    let nextTask = task;
    let taskChanged = false;
    const normalizedTimes = normalizeScheduleTimes(task.schedule.times);
    const normalizedWeekdays = normalizeWeekdays(task.schedule.weekdays);
    if (
      !sameStrings(task.schedule.times, normalizedTimes) ||
      !sameNumbers(task.schedule.weekdays, normalizedWeekdays)
    ) {
      nextTask = {
        ...nextTask,
        schedule: {
          ...nextTask.schedule,
          times: normalizedTimes,
          weekdays: normalizedWeekdays,
        },
      };
      taskChanged = true;
    }
    if (
      (task.category === "walk" || task.category === "play") &&
      (!task.details?.durationMinutes || task.details.durationMinutes <= 0)
    ) {
      nextTask = {
        ...nextTask,
        details: {
          ...nextTask.details,
          durationMinutes: task.category === "walk" ? 30 : 20,
        },
      };
      taskChanged = true;
    }
    if (task.category === "medication" && task.medicationId) {
      const medication = petById
        .get(task.petId)
        ?.medications.find((item) => item.id === task.medicationId);
      if (medication) {
        const details = { ...nextTask.details };
        if (!details.dose && medication.dosage) {
          details.dose = medication.dosage;
          taskChanged = true;
        }
        if (!details.route) {
          details.route = routeForMedicationForm(medication.form);
          taskChanged = true;
        }
        if (
          details.stock === undefined ||
          !Number.isFinite(details.stock) ||
          details.stock < 0
        ) {
          details.stock = Math.max(0, medication.stock);
          taskChanged = true;
        }
        if (!details.stockUnit) {
          details.stockUnit = medication.stockUnit || "doses";
          taskChanged = true;
        }
        if (
          details.unitsPerDose === undefined ||
          !Number.isFinite(details.unitsPerDose) ||
          details.unitsPerDose <= 0
        ) {
          details.unitsPerDose = 1;
          taskChanged = true;
        }
        if (
          details.refillThreshold === undefined ||
          !Number.isFinite(details.refillThreshold) ||
          details.refillThreshold < 0
        ) {
          details.refillThreshold = 5;
          taskChanged = true;
        }
        nextTask = { ...nextTask, details };
      }
    }
    if (taskChanged) changed = true;
    return nextTask;
  });
  const activePetId =
    state.activePetId && petById.has(state.activePetId)
      ? state.activePetId
      : (state.pets[0]?.id ?? null);
  if (activePetId !== state.activePetId) changed = true;
  return changed ? { ...state, activePetId, tasks } : state;
}
