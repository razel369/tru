export type MedicationForm =
  | "tablet"
  | "capsule"
  | "liquid"
  | "drops"
  | "injection"
  | "topical";

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  instructions: string;
  form: MedicationForm;
  times: string[];
  stock: number;
  stockUnit: string;
  color: string;
}

export interface Pet {
  id: string;
  name: string;
  species: "dog" | "cat" | "other";
  breed: string;
  age: number;
  avatar: "milo" | "luna";
  color: string;
  medications: Medication[];
}

export interface DoseLog {
  id: string;
  petId: string;
  medicationId: string;
  date: string;
  scheduledTime: string;
  status: "given" | "skipped";
  completedAt: string;
  completedBy: string;
}

export interface ScheduledDose {
  id: string;
  pet: Pet;
  medication: Medication;
  scheduledTime: string;
  status: "given" | "skipped" | "due" | "upcoming" | "missed";
  log?: DoseLog;
}

export interface NewMedication {
  petId: string;
  name: string;
  dosage: string;
  instructions: string;
  form: MedicationForm;
  time: string;
  stock: number;
  stockUnit: string;
}
