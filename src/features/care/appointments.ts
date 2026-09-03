import type { Pet } from "../../types";

import { careTimeToMinutes } from "./engine";
import type { CareTask } from "./types";

export interface UpcomingAppointment {
  task: CareTask;
  petName: string;
  date: Date;
  daysUntil: number;
}

function appointmentDate(date: Date, time: string) {
  const [hour, minute] = time.split(":").map(Number);
  const result = new Date(date);
  result.setHours(hour || 0, minute || 0, 0, 0);
  return result;
}

function nextTaskDate(task: CareTask, now: Date): Date | null {
  const times = [...task.schedule.times].sort(
    (first, second) => careTimeToMinutes(first) - careTimeToMinutes(second),
  );
  if (times.length === 0) return null;
  if (task.schedule.frequency === "once") {
    if (!task.schedule.date) return null;
    const date = new Date(`${task.schedule.date}T12:00:00`);
    const candidates = times.map((time) => appointmentDate(date, time));
    return candidates.find((candidate) => candidate.getTime() >= now.getTime()) ?? null;
  }

  for (let offset = 0; offset <= 7; offset += 1) {
    const date = new Date(now);
    date.setDate(date.getDate() + offset);
    const allowed =
      task.schedule.frequency === "daily" ||
      (task.schedule.weekdays ?? []).includes(date.getDay());
    if (!allowed) continue;
    for (const time of times) {
      const candidate = appointmentDate(date, time);
      if (candidate.getTime() >= now.getTime()) return candidate;
    }
  }
  return null;
}

export function buildUpcomingAppointments(
  tasks: CareTask[],
  pets: Pet[],
  now = new Date(),
): UpcomingAppointment[] {
  const petById = new Map(pets.map((pet) => [pet.id, pet]));
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  return tasks
    .flatMap((task): UpcomingAppointment[] => {
      if (task.category !== "appointment" || !task.enabled) return [];
      const pet = petById.get(task.petId);
      if (!pet) return [];
      const date = nextTaskDate(task, now);
      if (!date) return [];
      const appointmentDay = new Date(date);
      appointmentDay.setHours(0, 0, 0, 0);
      return [
        {
          task,
          petName: pet.name,
          date,
          daysUntil: Math.round(
            (appointmentDay.getTime() - today.getTime()) / (24 * 60 * 60 * 1000),
          ),
        },
      ];
    })
    .sort((first, second) => first.date.getTime() - second.date.getTime());
}

export function appointmentDateLabel(item: UpcomingAppointment) {
  const day = item.date.toLocaleDateString("en", {
    day: "numeric",
    month: "short",
    weekday: "short",
  });
  const time = item.date.toLocaleTimeString("en", {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${day} / ${time}`;
}

export function appointmentReminderLabel(task: CareTask) {
  const minutes = task.details?.reminderLeadMinutes ?? 0;
  if (minutes === 0) return "At appointment time";
  if (minutes < 24 * 60) return `${minutes / 60}h before`;
  const days = minutes / (24 * 60);
  return `${days}d before`;
}
