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
  /** When true, the medication is paused — no reminders, no Today entries. */
  paused?: boolean;
}

export type BreedVisualProfile =
  | "cat-compact"
  | "cat-longhair"
  | "cat-hairless"
  | "cat-tall"
  | "dog-toy"
  | "dog-long-low"
  | "dog-compact"
  | "dog-standard"
  | "dog-tall"
  | "dog-large"
  | "dog-fluffy"
  | "other";

export type PetVisualStatus = "pending" | "processing" | "ready" | "failed" | "fallback";

export type PetSex = "female" | "male" | "unknown";
export type PetReproductiveStatus = "intact" | "altered" | "unknown";

export interface PetVisualIdentity {
  assetKey?: string;
  engravingText?: string;
  profile: BreedVisualProfile;
  revision: number;
  status: PetVisualStatus;
}

export interface PetCareProfile {
  allergies?: string;
  dateOfBirth?: string;
  diet?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  veterinarianName?: string;
  veterinarianPhone?: string;
  microchipId?: string;
  reproductiveStatus?: PetReproductiveStatus;
  sex?: PetSex;
  caregiverNotes?: string;
}

export interface Pet {
  id: string;
  name: string;
  species: "dog" | "cat" | "other";
  breed: string;
  age: number;
  avatar: string;
  visualProfile?: BreedVisualProfile;
  visual?: PetVisualIdentity;
  careProfile?: PetCareProfile;
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
