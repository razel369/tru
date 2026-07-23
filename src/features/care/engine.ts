import type { Pet } from "../../types";

import type {
  CareLog,
  CareLogActual,
  CareLogStatus,
  CareTask,
  ScheduledCare,
} from "./types";

export function careDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return year + "-" + month + "-" + day;
}

export function careTimeToMinutes(time: string): number {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!match) return Number.POSITIVE_INFINITY;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return Number.POSITIVE_INFINITY;
  }
  return hour * 60 + minute;
}

export function formatCareTime(time: string): string {
  const total = careTimeToMinutes(time);
  if (!Number.isFinite(total)) return "Time not set";
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  const suffix = hours >= 12 ? "PM" : "AM";
  return String(hours % 12 || 12) + ":" + String(minutes).padStart(2, "0") + " " + suffix;
}

function taskOccursOn(task: CareTask, date: Date): boolean {
  if (!task.enabled) {
    if (!task.archivedAt) return false;
    const archivedAt = new Date(task.archivedAt);
    if (
      Number.isNaN(archivedAt.getTime()) ||
      careDateKey(date) >= careDateKey(archivedAt)
    ) {
      return false;
    }
  }
  if (task.schedule.frequency === "daily") return true;
  if (task.schedule.frequency === "once") {
    return task.schedule.date === careDateKey(date);
  }
  return (task.schedule.weekdays ?? []).includes(date.getDay());
}

function occurrenceKey(taskId: string, date: string, scheduledTime: string) {
  return `${taskId}\u0000${date}\u0000${scheduledTime}`;
}

function taskDateKey(task: CareTask) {
  const createdAt = new Date(task.createdAt);
  return Number.isNaN(createdAt.getTime()) ? null : careDateKey(createdAt);
}

export function buildCareSchedule(
  tasks: CareTask[],
  logs: CareLog[],
  pets: Pet[],
  date: Date,
  now = new Date(),
): ScheduledCare[] {
  const day = careDateKey(date);
  const today = careDateKey(now);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const petById = new Map(pets.map((pet) => [pet.id, pet]));
  const latestLogByOccurrence = new Map<string, CareLog>();
  const loggedTimesByTask = new Map<string, Set<string>>();
  for (const entry of logs) {
    if (entry.date !== day) continue;
    const minutes = careTimeToMinutes(entry.scheduledTime);
    if (!Number.isFinite(minutes)) continue;
    const key = occurrenceKey(entry.taskId, entry.date, entry.scheduledTime);
    const current = latestLogByOccurrence.get(key);
    if (!current || entry.completedAt >= current.completedAt) {
      latestLogByOccurrence.set(key, entry);
    }
    const times = loggedTimesByTask.get(entry.taskId) ?? new Set<string>();
    times.add(entry.scheduledTime);
    loggedTimesByTask.set(entry.taskId, times);
  }
  const schedule: ScheduledCare[] = [];

  for (const task of tasks) {
    const pet = petById.get(task.petId);
    if (!pet) continue;
    const createdDay = taskDateKey(task);
    const beforeCreation = createdDay !== null && day < createdDay;
    const occurs = !beforeCreation && taskOccursOn(task, date);
    const loggedTimes = Array.from(loggedTimesByTask.get(task.id) ?? []);
    if (!occurs && loggedTimes.length === 0) continue;

    const configuredTimes = occurs
      ? task.schedule.times.filter((time) =>
          Number.isFinite(careTimeToMinutes(time)),
        )
      : [];
    const occurrenceTimes = Array.from(
      new Set([...configuredTimes, ...loggedTimes]),
    ).sort((first, second) => careTimeToMinutes(first) - careTimeToMinutes(second));

    for (const scheduledTime of occurrenceTimes) {
      const log = latestLogByOccurrence.get(
        occurrenceKey(task.id, day, scheduledTime),
      );
      let status: ScheduledCare["status"];
      if (log) status = log.status;
      else if (day < today) status = "missed";
      else if (day > today) status = "upcoming";
      else {
        const minutes = careTimeToMinutes(scheduledTime);
        if (minutes < nowMinutes - 60) status = "missed";
        else if (minutes <= nowMinutes + 45) status = "due";
        else status = "upcoming";
      }

      const occurrencePet = log ? petById.get(log.petId) ?? pet : pet;
      const occurrenceTask =
        log?.taskSnapshotVersion === 1
          ? {
              ...task,
              petId: occurrencePet.id,
              title: log.taskTitle ?? task.title,
              category: log.taskCategory ?? task.category,
              instructions: log.taskInstructions ?? task.instructions,
              details: log.planned,
            }
          : task;

      schedule.push({
        id: day + ":" + task.id + ":" + scheduledTime,
        task: occurrenceTask,
        pet: occurrencePet,
        date: day,
        scheduledTime,
        status,
        ...(log ? { log } : {}),
      });
    }
  }

  return schedule.sort(
    (first, second) =>
      careTimeToMinutes(first.scheduledTime) -
        careTimeToMinutes(second.scheduledTime) ||
      first.task.title.localeCompare(second.task.title) ||
      first.id.localeCompare(second.id),
  );
}

export function createCareLog(
  occurrence: ScheduledCare,
  status: CareLogStatus,
  completedBy = "You",
  completedAt = new Date(),
): CareLog {
  const planned = occurrence.task.details
    ? { ...occurrence.task.details }
    : undefined;
  const actual: CareLogActual | undefined =
    status === "done" && planned
      ? {
          ...(planned.quantity ? { quantity: planned.quantity } : {}),
          ...(planned.durationMinutes
            ? { durationMinutes: planned.durationMinutes }
            : {}),
          ...(planned.dose ? { dose: planned.dose } : {}),
        }
      : undefined;
  return {
    id: occurrence.id + ":" + completedAt.getTime(),
    taskId: occurrence.task.id,
    petId: occurrence.pet.id,
    date: occurrence.date,
    scheduledTime: occurrence.scheduledTime,
    status,
    completedAt: completedAt.toISOString(),
    completedBy,
    taskSnapshotVersion: 1,
    taskTitle: occurrence.task.title,
    taskCategory: occurrence.task.category,
    taskInstructions: occurrence.task.instructions,
    ...(planned ? { planned } : {}),
    ...(actual && Object.keys(actual).length > 0 ? { actual } : {}),
  };
}

export function careCompletionPercent(schedule: ScheduledCare[]): number {
  if (schedule.length === 0) return 0;
  const done = schedule.filter((item) => item.status === "done").length;
  return Math.round((done / schedule.length) * 100);
}
