import type { Pet } from "../../types";

import { buildCareSchedule, careDateKey } from "./engine";
import type { CareLog, CareTask } from "./types";

export interface CareDayInsight {
  date: string;
  label: string;
  planned: number;
  completed: number;
  skipped: number;
  missed: number;
  open: number;
  adherence: number | null;
  isToday: boolean;
}

export interface CareInsightSummary {
  days: CareDayInsight[];
  planned: number;
  completed: number;
  adherence: number | null;
  streak: number;
  activityMinutes: number;
  medicationAdherence: number | null;
  attentionCount: number;
}

function dateAtOffset(now: Date, offset: number) {
  const date = new Date(now);
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + offset);
  return date;
}

export function buildCareInsights(
  tasks: CareTask[],
  logs: CareLog[],
  pets: Pet[],
  now = new Date(),
  windowDays = 7,
): CareInsightSummary {
  const today = careDateKey(now);
  const days = Array.from({ length: windowDays }, (_, index) => {
    const date = dateAtOffset(now, index - windowDays + 1);
    const dateKey = careDateKey(date);
    const isToday = dateKey === today;
    const schedule = buildCareSchedule(tasks, logs, pets, date, now).filter(
      (item) => !isToday || item.status !== "upcoming",
    );
    const completed = schedule.filter((item) => item.status === "done").length;
    const skipped = schedule.filter((item) => item.status === "skipped").length;
    const missed = schedule.filter((item) => item.status === "missed").length;
    const open = schedule.filter((item) => item.status === "due").length;
    return {
      date: dateKey,
      label: date.toLocaleDateString("en", { weekday: "narrow" }),
      planned: schedule.length,
      completed,
      skipped,
      missed,
      open,
      adherence:
        schedule.length > 0
          ? Math.round((completed / schedule.length) * 100)
          : null,
      isToday,
    } satisfies CareDayInsight;
  });

  const planned = days.reduce((total, day) => total + day.planned, 0);
  const completed = days.reduce((total, day) => total + day.completed, 0);
  const attentionCount = days.reduce(
    (total, day) => total + day.skipped + day.missed + day.open,
    0,
  );
  let streak = 0;
  for (const day of [...days].reverse()) {
    if (day.planned === 0) continue;
    if (day.isToday && day.completed < day.planned) continue;
    if (day.completed !== day.planned) break;
    streak += 1;
  }

  const taskById = new Map(tasks.map((task) => [task.id, task]));
  const windowDates = new Set(days.map((day) => day.date));
  const latestLogs = new Map<string, CareLog>();
  for (const log of logs) {
    if (!windowDates.has(log.date)) continue;
    const key = `${log.taskId}\u0000${log.date}\u0000${log.scheduledTime}`;
    const current = latestLogs.get(key);
    if (!current || log.completedAt >= current.completedAt) {
      latestLogs.set(key, log);
    }
  }
  const activityMinutes = Array.from(latestLogs.values()).reduce((total, log) => {
    if (log.status !== "done" || !windowDates.has(log.date)) return total;
    const task = taskById.get(log.taskId);
    const category = log.taskCategory ?? task?.category;
    if (
      !task ||
      (category !== "walk" &&
        category !== "play" &&
        category !== "training")
    ) {
      return total;
    }
    return (
      total +
      (log.actual?.durationMinutes ??
        log.planned?.durationMinutes ??
        task.details?.durationMinutes ??
        0)
    );
  }, 0);

  const medicationMoments = days.flatMap((day) => {
    const date = new Date(`${day.date}T12:00:00`);
    return buildCareSchedule(tasks, logs, pets, date, now).filter(
      (item) =>
        item.task.category === "medication" &&
        (!day.isToday || item.status !== "upcoming"),
    );
  });
  const medicationDone = medicationMoments.filter(
    (item) => item.status === "done",
  ).length;

  return {
    days,
    planned,
    completed,
    adherence: planned > 0 ? Math.round((completed / planned) * 100) : null,
    streak,
    activityMinutes,
    medicationAdherence:
      medicationMoments.length > 0
        ? Math.round((medicationDone / medicationMoments.length) * 100)
        : null,
    attentionCount,
  };
}
