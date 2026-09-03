import type { Pet } from "../../types";
import type { CareNotificationActionTarget } from "../notifications/care-runtime";

import type { CareTask, ScheduledCare } from "./types";

function localCareDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day, 12, 0, 0, 0);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

function taskOccursOnDate(task: CareTask, date: Date, dateKey: string) {
  if (task.schedule.frequency === "daily") return true;
  if (task.schedule.frequency === "once") {
    return task.schedule.date === dateKey;
  }
  return Boolean(task.schedule.weekdays?.includes(date.getDay()));
}

export function scheduledCareFromNotificationAction(
  action: CareNotificationActionTarget,
  tasks: CareTask[],
  pets: Pet[],
): ScheduledCare | null {
  const task = tasks.find((candidate) => candidate.id === action.taskId);
  const pet = pets.find((candidate) => candidate.id === action.petId);
  if (
    !task ||
    !pet ||
    !task.enabled ||
    task.petId !== pet.id ||
    task.category === "appointment"
  ) {
    return null;
  }

  const date = localCareDate(action.date);
  const scheduledTime = action.scheduledTime.trim();
  if (
    !date ||
    !task.schedule.times.some((time) => time.trim() === scheduledTime) ||
    !taskOccursOnDate(task, date, action.date)
  ) {
    return null;
  }

  return {
    date: action.date,
    id: `${action.date}:${task.id}:${scheduledTime}`,
    pet,
    scheduledTime,
    status: "due",
    task,
  };
}
