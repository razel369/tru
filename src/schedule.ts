import { DoseLog, Medication, Pet, ScheduledDose } from "./types";

export function dateKey(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function timeToMinutes(time: string): number {
  const [hours = "0", minutes = "0"] = time.split(":");
  return Number(hours) * 60 + Number(minutes);
}

export function formatTime(time: string): string {
  const total = timeToMinutes(time);
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  const suffix = hours >= 12 ? "PM" : "AM";
  const displayHour = hours % 12 || 12;
  return `${displayHour}:${`${minutes}`.padStart(2, "0")} ${suffix}`;
}

export function buildSchedule(
  pets: Pet[],
  logs: DoseLog[],
  date: Date,
  nowMinutes = date.getHours() * 60 + date.getMinutes(),
): ScheduledDose[] {
  const day = dateKey(date);
  const doses: ScheduledDose[] = [];

  pets.forEach((pet) => {
    pet.medications.forEach((medication) => {
      medication.times.forEach((scheduledTime) => {
        const id = `${day}:${pet.id}:${medication.id}:${scheduledTime}`;
        const log = logs.find(
          (item) =>
            item.date === day &&
            item.petId === pet.id &&
            item.medicationId === medication.id &&
            item.scheduledTime === scheduledTime,
        );
        const minutes = timeToMinutes(scheduledTime);
        let status: ScheduledDose["status"];

        if (log) status = log.status;
        else if (minutes < nowMinutes - 60) status = "missed";
        else if (minutes <= nowMinutes + 30) status = "due";
        else status = "upcoming";

        doses.push({
          id,
          pet,
          medication,
          scheduledTime,
          status,
          ...(log ? { log } : {}),
        });
      });
    });
  });

  return doses.sort(
    (first, second) =>
      timeToMinutes(first.scheduledTime) - timeToMinutes(second.scheduledTime),
  );
}

export function createDoseLog(
  dose: ScheduledDose,
  status: DoseLog["status"],
  caregiver: string,
  completedAt = new Date(),
): DoseLog {
  return {
    id: `${dose.id}:${completedAt.getTime()}`,
    petId: dose.pet.id,
    medicationId: dose.medication.id,
    date: dose.id.slice(0, 10),
    scheduledTime: dose.scheduledTime,
    status,
    completedAt: completedAt.toISOString(),
    completedBy: caregiver,
  };
}

export function adherencePercent(schedule: ScheduledDose[]): number {
  const resolved = schedule.filter(
    (dose) => dose.status === "given" || dose.status === "skipped",
  );
  if (resolved.length === 0) return 0;
  const given = resolved.filter((dose) => dose.status === "given").length;
  return Math.round((given / resolved.length) * 100);
}

export function addMedicationToPets(
  pets: Pet[],
  petId: string,
  medication: Medication,
): Pet[] {
  return pets.map((pet) =>
    pet.id === petId
      ? { ...pet, medications: [...pet.medications, medication] }
      : pet,
  );
}
