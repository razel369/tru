import type { CareTask, MedicationRoute } from "./types";

const ROUTE_LABELS: Record<MedicationRoute, string> = {
  oral: "Oral",
  topical: "Topical",
  injection: "Injection",
  drops: "Drops",
  inhaled: "Inhaled",
  other: "Other route",
};

export function careTaskDetailParts(task: CareTask): string[] {
  const details = task.details;
  if (!details) return [];

  const parts: string[] = [];
  if (
    (task.category === "feeding" || task.category === "water") &&
    details.quantity
  ) {
    parts.push(details.quantity);
  }
  if (
    (task.category === "walk" ||
      task.category === "play" ||
      task.category === "training" ||
      task.category === "grooming") &&
    details.durationMinutes
  ) {
    parts.push(`${details.durationMinutes} min`);
  }
  if (task.category === "medication") {
    if (details.dose) parts.push(details.dose);
    if (details.route) parts.push(ROUTE_LABELS[details.route]);
    if (details.stock !== undefined) {
      parts.push(`${details.stock} ${details.stockUnit || "doses"} left`);
    }
  }
  if (task.category === "appointment") {
    if (details.provider) parts.push(details.provider);
    if (details.location) parts.push(details.location);
  }
  return Array.from(new Set(parts));
}

export function careTaskSummary(task: CareTask): string {
  const parts = careTaskDetailParts(task);
  const instructions = task.instructions.trim();
  if (instructions) parts.push(instructions);
  return Array.from(new Set(parts)).join(" / ");
}
