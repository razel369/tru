import type { Pet, PetReproductiveStatus, PetSex } from "../../types";

const DAY_MS = 86_400_000;
const MAX_PET_AGE_YEARS = 250;

function parseDateKey(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const time = Date.UTC(year, month - 1, day);
  const parsed = new Date(time);
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return null;
  }
  return { day, month, time, year };
}

function todayUtc(now: Date) {
  return Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
}

function numberLabel(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function plural(value: number, singular: string) {
  return `${value} ${singular}${value === 1 ? "" : "s"}`;
}

export function isValidPetBirthDate(value: string, now = new Date()) {
  const parsed = parseDateKey(value);
  if (!parsed) return false;
  const current = todayUtc(now);
  const ageYears = (current - parsed.time) / (DAY_MS * 365.2425);
  return parsed.time <= current && ageYears <= MAX_PET_AGE_YEARS;
}

export function petAgeYearsFromBirthDate(value: string, now = new Date()) {
  const parsed = parseDateKey(value);
  if (!parsed || !isValidPetBirthDate(value, now)) return null;
  const years = (todayUtc(now) - parsed.time) / (DAY_MS * 365.2425);
  return Math.round(years * 100) / 100;
}

export function petAgeLabel(pet: Pet, now = new Date()) {
  const birthDate = pet.careProfile?.dateOfBirth;
  const parsed = birthDate ? parseDateKey(birthDate) : null;
  if (birthDate && parsed && isValidPetBirthDate(birthDate, now)) {
    const current = new Date(todayUtc(now));
    const days = Math.max(0, Math.floor((current.getTime() - parsed.time) / DAY_MS));
    if (days < 14) return plural(days, "day");
    if (days < 56) return plural(Math.floor(days / 7), "week");

    let months =
      (current.getUTCFullYear() - parsed.year) * 12 +
      current.getUTCMonth() -
      (parsed.month - 1);
    if (current.getUTCDate() < parsed.day) months -= 1;
    if (months < 24) return plural(Math.max(1, months), "month");
    return plural(Math.floor(months / 12), "year");
  }

  if (!Number.isFinite(pet.age) || pet.age <= 0) return "Age not recorded";
  if (pet.age < 2) return plural(Math.max(1, Math.round(pet.age * 12)), "month");
  return `${numberLabel(pet.age)} years`;
}

export function petBirthDateLabel(value?: string) {
  const parsed = value ? parseDateKey(value) : null;
  if (!parsed) return null;
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(parsed.time));
}

export function petSexLabel(value?: PetSex) {
  if (value === "female") return "Female";
  if (value === "male") return "Male";
  if (value === "unknown") return "Sex unknown";
  return null;
}

export function petReproductiveStatusLabel(value?: PetReproductiveStatus) {
  if (value === "intact") return "Intact";
  if (value === "altered") return "Spayed / neutered";
  if (value === "unknown") return "Status unknown";
  return null;
}

export function petIdentitySummary(
  pet: Pet,
  { includeBirthDate = false }: { includeBirthDate?: boolean } = {},
) {
  const birthDate = includeBirthDate
    ? petBirthDateLabel(pet.careProfile?.dateOfBirth)
    : null;
  return [
    petAgeLabel(pet),
    birthDate ? `Born ${birthDate}` : null,
    petSexLabel(pet.careProfile?.sex),
    petReproductiveStatusLabel(pet.careProfile?.reproductiveStatus),
  ]
    .filter(Boolean)
    .join(" / ");
}
