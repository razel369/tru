import type { Pet } from "../../types";

export type CareCategory =
  | "feeding"
  | "water"
  | "walk"
  | "medication"
  | "grooming"
  | "play"
  | "training"
  | "appointment"
  | "other";

export type CareFrequency = "daily" | "weekly" | "once";
export type CareLogStatus = "done" | "skipped";
export type ScheduledCareStatus =
  | CareLogStatus
  | "due"
  | "upcoming"
  | "missed";

export interface CareTaskSchedule {
  frequency: CareFrequency;
  times: string[];
  weekdays?: number[];
  date?: string;
}

export type MedicationRoute =
  | "oral"
  | "topical"
  | "injection"
  | "drops"
  | "inhaled"
  | "other";

export interface CareTaskDetails {
  quantity?: string;
  durationMinutes?: number;
  dose?: string;
  route?: MedicationRoute;
  provider?: string;
  location?: string;
  stock?: number;
  stockUnit?: string;
  unitsPerDose?: number;
  refillThreshold?: number;
  reminderLeadMinutes?: number;
}

export interface CareTask {
  id: string;
  petId: string;
  category: CareCategory;
  title: string;
  instructions: string;
  details?: CareTaskDetails;
  schedule: CareTaskSchedule;
  enabled: boolean;
  createdAt: string;
  archivedAt?: string;
  medicationId?: string;
}

export interface CareLogActual {
  quantity?: string;
  durationMinutes?: number;
  dose?: string;
}

export interface CareLog {
  id: string;
  taskId: string;
  petId: string;
  date: string;
  scheduledTime: string;
  status: CareLogStatus;
  completedAt: string;
  completedBy: string;
  taskSnapshotVersion?: 1;
  taskTitle?: string;
  taskCategory?: CareCategory;
  taskInstructions?: string;
  planned?: CareTaskDetails;
  actual?: CareLogActual;
  note?: string;
}

export type HealthRecordType =
  | "weight"
  | "vaccination"
  | "vet-visit"
  | "symptom"
  | "document"
  | "note";

export type HealthRecordSeverity = "mild" | "moderate" | "urgent";

export interface HealthAttachment {
  id: string;
  name: string;
  uri: string;
  mimeType: string;
  size: number;
  storage: "app-document" | "session";
  createdAt: string;
}

export interface HealthRecord {
  id: string;
  petId: string;
  type: HealthRecordType;
  title: string;
  date: string;
  value?: string;
  unit?: string;
  notes?: string;
  provider?: string;
  nextDueDate?: string;
  severity?: HealthRecordSeverity;
  resolvedDate?: string;
  reference?: string;
  attachment?: HealthAttachment;
  createdAt: string;
}

export interface ScheduledCare {
  id: string;
  task: CareTask;
  pet: Pet;
  date: string;
  scheduledTime: string;
  status: ScheduledCareStatus;
  log?: CareLog;
}

export interface PetCareState {
  version: 1;
  pets: Pet[];
  tasks: CareTask[];
  logs: CareLog[];
  healthRecords: HealthRecord[];
  activePetId: string | null;
}
