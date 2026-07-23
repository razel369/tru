import type { Pet } from "../../types";

import { careTimeToMinutes } from "./engine";
import type { CareTask } from "./types";

export type MedicationSupplySeverity =
  | "healthy"
  | "low"
  | "critical"
  | "out";

export interface MedicationSupplyStatus {
  task: CareTask;
  petName: string;
  stock: number;
  stockUnit: string;
  daysRemaining: number | null;
  severity: MedicationSupplySeverity;
}

function dosesPerWeek(task: CareTask) {
  const times = new Set(
    task.schedule.times.filter((time) =>
      Number.isFinite(careTimeToMinutes(time)),
    ),
  ).size;
  if (task.schedule.frequency === "daily") {
    return times * 7;
  }
  if (task.schedule.frequency === "weekly") {
    const weekdays = new Set(
      (task.schedule.weekdays ?? []).filter(
        (weekday) => Number.isInteger(weekday) && weekday >= 0 && weekday <= 6,
      ),
    ).size;
    return times * weekdays;
  }
  return 0;
}

export function buildMedicationSupplyStatuses(
  tasks: CareTask[],
  pets: Pet[],
): MedicationSupplyStatus[] {
  const petById = new Map(pets.map((pet) => [pet.id, pet]));
  return tasks
    .flatMap((task): MedicationSupplyStatus[] => {
      const details = task.details;
      if (
        task.category !== "medication" ||
        !task.enabled ||
        details?.stock === undefined
      ) {
        return [];
      }
      const pet = petById.get(task.petId);
      if (!pet) return [];
      const unitsPerDose = details.unitsPerDose ?? 1;
      const weeklyUse = dosesPerWeek(task) * unitsPerDose;
      const daysRemaining =
        weeklyUse > 0 ? Math.floor(details.stock / (weeklyUse / 7)) : null;
      const threshold = details.refillThreshold ?? 5;
      const oneTime = task.schedule.frequency === "once";
      const severity: MedicationSupplySeverity =
        details.stock < unitsPerDose
          ? "out"
          : oneTime
            ? "healthy"
          : (daysRemaining !== null && daysRemaining <= 2) ||
              details.stock <= Math.max(unitsPerDose, threshold / 2)
            ? "critical"
            : (daysRemaining !== null && daysRemaining <= 7) ||
                details.stock <= threshold
              ? "low"
              : "healthy";
      return [
        {
          task,
          petName: pet.name,
          stock: details.stock,
          stockUnit: details.stockUnit || "doses",
          daysRemaining,
          severity,
        },
      ];
    })
    .sort((first, second) => {
      const rank: Record<MedicationSupplySeverity, number> = {
        out: 0,
        critical: 1,
        low: 2,
        healthy: 3,
      };
      return rank[first.severity] - rank[second.severity] || first.stock - second.stock;
    });
}
