import type { ScheduledCare } from "../care/types";

export type WatchCareItem = {
  id: string;
  petId: string;
  petName: string;
  title: string;
  time: string;
  status: ScheduledCare["status"];
  category: ScheduledCare["task"]["category"];
  instructions: string;
};

export type WatchSnapshot = {
  version: 1;
  generatedAt: string;
  activePetId: string | null;
  items: WatchCareItem[];
};

export function buildWatchSnapshot(
  schedule: readonly ScheduledCare[],
  activePetId: string | null,
  now = new Date(),
): WatchSnapshot {
  return {
    version: 1,
    generatedAt: now.toISOString(),
    activePetId,
    items: schedule.slice(0, 12).map((item) => ({
      id: item.id,
      petId: item.pet.id,
      petName: item.pet.name,
      title: item.task.title,
      time: item.scheduledTime,
      status: item.status,
      category: item.task.category,
      instructions: item.task.instructions,
    })),
  };
}
