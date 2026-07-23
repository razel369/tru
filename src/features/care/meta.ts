import { colors } from "../../design";

import type { CareCategory, HealthRecordType } from "./types";

export interface CareCategoryMeta {
  label: string;
  icon: string;
  color: string;
  softColor: string;
  defaultTitle: string;
}

export const CARE_CATEGORIES: CareCategory[] = [
  "feeding",
  "water",
  "walk",
  "medication",
  "grooming",
  "play",
  "training",
  "appointment",
  "other",
];

const CATEGORY_META: Record<CareCategory, CareCategoryMeta> = {
  feeding: {
    label: "Meals",
    icon: "restaurant-outline",
    color: "#C98245",
    softColor: "#F7E6D3",
    defaultTitle: "Meal",
  },
  water: {
    label: "Water",
    icon: "water-outline",
    color: colors.sky,
    softColor: colors.skySoft,
    defaultTitle: "Fresh water",
  },
  walk: {
    label: "Walks",
    icon: "paw-outline",
    color: colors.sage,
    softColor: colors.sageSoft,
    defaultTitle: "Walk",
  },
  medication: {
    label: "Medication",
    icon: "medical-outline",
    color: colors.coral,
    softColor: colors.coralSoft,
    defaultTitle: "Medication",
  },
  grooming: {
    label: "Grooming",
    icon: "sparkles-outline",
    color: colors.lavender,
    softColor: "#ECE7F6",
    defaultTitle: "Grooming",
  },
  play: {
    label: "Play",
    icon: "football-outline",
    color: "#D6933D",
    softColor: colors.butterSoft,
    defaultTitle: "Play time",
  },
  training: {
    label: "Training",
    icon: "school-outline",
    color: colors.navy,
    softColor: colors.skySoft,
    defaultTitle: "Training",
  },
  appointment: {
    label: "Appointment",
    icon: "calendar-outline",
    color: "#A56B58",
    softColor: "#F2E4DF",
    defaultTitle: "Vet appointment",
  },
  other: {
    label: "Other",
    icon: "add-circle-outline",
    color: colors.muted,
    softColor: colors.line,
    defaultTitle: "Care task",
  },
};

export function getCategoryMeta(category: CareCategory): CareCategoryMeta {
  return CATEGORY_META[category];
}

export const HEALTH_RECORD_TYPES: {
  type: HealthRecordType;
  label: string;
  icon: string;
}[] = [
  { type: "weight", label: "Weight", icon: "scale-outline" },
  { type: "vaccination", label: "Vaccine", icon: "shield-checkmark-outline" },
  { type: "vet-visit", label: "Vet visit", icon: "medkit-outline" },
  { type: "symptom", label: "Symptom", icon: "pulse-outline" },
  { type: "document", label: "Document", icon: "document-text-outline" },
  { type: "note", label: "Note", icon: "create-outline" },
];
