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

const WATCH_STATUS_PRIORITY: Readonly<
  Record<ScheduledCare["status"], number>
> = {
  due: 0,
  missed: 1,
  upcoming: 2,
  done: 3,
  skipped: 4,
};

function selectWatchCare(
  schedule: readonly ScheduledCare[],
): readonly ScheduledCare[] {
  return [...schedule]
    .sort(
      (first, second) =>
        WATCH_STATUS_PRIORITY[first.status] -
          WATCH_STATUS_PRIORITY[second.status] ||
        first.scheduledTime.localeCompare(second.scheduledTime) ||
        first.id.localeCompare(second.id),
    )
    .slice(0, 12);
}

export function buildWatchSnapshot(
  schedule: readonly ScheduledCare[],
  activePetId: string | null,
  now = new Date(),
): WatchSnapshot {
  return {
    version: 1,
    generatedAt: now.toISOString(),
    activePetId,
    items: selectWatchCare(schedule).map((item) => ({
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
