import type { Pet } from "../../types";

import type { CareTask, HealthRecord, HealthRecordType } from "./types";
import { buildUpcomingAppointments } from "./appointments";
import { petIdentitySummary } from "./pet-identity";

const DAY_MS = 86_400_000;

function parseDateKey(value?: string) {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(year, month - 1, day, 12);
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }
  return parsed;
}

function dateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function calendarDayIndex(value?: string) {
  const parsed = parseDateKey(value);
  if (!parsed) return null;
  return Math.floor(
    Date.UTC(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()) / DAY_MS,
  );
}

function daysBetweenDateKeys(from: string, to?: string) {
  const fromDay = calendarDayIndex(from);
  const toDay = calendarDayIndex(to);
  return fromDay === null || toDay === null ? null : toDay - fromDay;
}

function sortRecordsNewestFirst(a: HealthRecord, b: HealthRecord) {
  return (
    b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)
  );
}

function normalizedVaccineIdentity(record: HealthRecord) {
  const normalized = record.title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\b(vaccine|vaccination|booster|dose|shot)\b/g, " ")
    .replace(/\b\d+(st|nd|rd|th)?\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  if (normalized) return normalized;
  const reference = record.reference?.trim().toLowerCase();
  return reference || record.id;
}

function latestVaccinationRecords(records: HealthRecord[]) {
  const seen = new Set<string>();
  return records
    .filter((record) => record.type === "vaccination")
    .sort(sortRecordsNewestFirst)
    .filter((record) => {
      const identity = normalizedVaccineIdentity(record);
      if (seen.has(identity)) return false;
      seen.add(identity);
      return true;
    });
}

function escapeHtml(value: string | number | undefined) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function displayDate(value?: string) {
  const parsed = parseDateKey(value);
  if (!parsed) return value || "Not recorded";
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

function firstByDate(records: HealthRecord[], type: HealthRecordType) {
  return records.find((record) => record.type === type);
}

function healthNumber(value?: string) {
  if (!value) return Number.NaN;
  const normalized = value.trim().replace(",", ".");
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(normalized)) {
    return Number.NaN;
  }
  return Number(normalized);
}

function normalizedUnit(value?: string) {
  return value?.trim().toLocaleLowerCase() ?? "";
}

export type HealthPassportSummary = {
  activeSymptomCount: number;
  dueSoonVaccines: number;
  latestWeight?: HealthRecord;
  latestWeightDelta?: number;
  medicationCount: number;
  nextAppointment?: CareTask;
  nextAppointmentDate?: string;
  overdueVaccines: number;
  passportLabel: string;
  passportScore: number;
  recordCount: number;
  urgentSymptomCount: number;
  vaccineCount: number;
};

export function buildHealthPassport(
  pet: Pet,
  tasks: CareTask[],
  records: HealthRecord[],
): HealthPassportSummary {
  const today = dateKey();
  const petRecords = records
    .filter((record) => record.petId === pet.id)
    .sort(sortRecordsNewestFirst);
  const activeSymptoms = petRecords.filter(
    (record) => record.type === "symptom" && !record.resolvedDate,
  );
  const urgentSymptomCount = activeSymptoms.filter(
    (record) => record.severity === "urgent",
  ).length;
  const petTasks = tasks.filter((task) => task.petId === pet.id && task.enabled);
  const weights = petRecords.filter((record) => record.type === "weight");
  const latestWeight = weights[0];
  const previousWeight = weights[1];
  const latestNumber = healthNumber(latestWeight?.value);
  const previousNumber = healthNumber(previousWeight?.value);
  const latestWeightDelta =
    Number.isFinite(latestNumber) &&
    Number.isFinite(previousNumber) &&
    normalizedUnit(latestWeight?.unit) === normalizedUnit(previousWeight?.unit)
      ? latestNumber - previousNumber
      : undefined;
  const vaccines = latestVaccinationRecords(petRecords);
  const overdueVaccines = vaccines.filter(
    (record) => {
      const days = daysBetweenDateKeys(today, record.nextDueDate);
      return days !== null && days < 0;
    },
  ).length;
  const dueSoonVaccines = vaccines.filter(
    (record) => {
      const days = daysBetweenDateKeys(today, record.nextDueDate);
      return days !== null && days >= 0 && days <= 45;
    },
  ).length;
  const nextAppointmentItem = buildUpcomingAppointments(
    petTasks,
    [pet],
    new Date(),
  )[0];
  const passportSignals = [
    Boolean(pet.breed && (pet.careProfile?.dateOfBirth || pet.age > 0)),
    Boolean(latestWeight),
    vaccines.length > 0 && overdueVaccines === 0,
    Boolean(firstByDate(petRecords, "vet-visit")),
    petRecords.some(
      (record) => Boolean(record.notes || record.provider || record.reference),
    ),
  ];
  const passportScore = Math.round(
    (passportSignals.filter(Boolean).length / passportSignals.length) * 100,
  );
  const passportLabel =
    urgentSymptomCount > 0
      ? "Ongoing urgent signal"
      : overdueVaccines > 0
      ? "Action needed"
      : passportScore >= 100
      ? "Vet-ready"
      : passportScore >= 80
        ? "Strong baseline"
        : passportScore >= 40
          ? "Taking shape"
          : "Start the passport";

  return {
    activeSymptomCount: activeSymptoms.length,
    dueSoonVaccines,
    latestWeight,
    latestWeightDelta,
    medicationCount: petTasks.filter(
      (task) => task.category === "medication",
    ).length,
    nextAppointment: nextAppointmentItem?.task,
    nextAppointmentDate: nextAppointmentItem
      ? dateKey(nextAppointmentItem.date)
      : undefined,
    overdueVaccines,
    passportLabel,
    passportScore,
    recordCount: petRecords.length,
    urgentSymptomCount,
    vaccineCount: vaccines.length,
  };
}

export function healthDueLabel(record: HealthRecord) {
  const days = daysBetweenDateKeys(dateKey(), record.nextDueDate);
  if (days === null) return null;
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return "Due today";
  if (days <= 45) return `Due in ${days}d`;
  return `Due ${displayDate(record.nextDueDate)}`;
}

function recordDetails(record: HealthRecord) {
  return [
    record.value
      ? `${record.value}${record.unit ? ` ${record.unit}` : ""}`
      : "",
    record.provider ? `Provider: ${record.provider}` : "",
    record.nextDueDate ? `Next due: ${displayDate(record.nextDueDate)}` : "",
    record.severity ? `Severity: ${record.severity}` : "",
    record.type === "symptom"
      ? record.resolvedDate
        ? `Resolved: ${displayDate(record.resolvedDate)}`
        : "Status: ongoing"
      : "",
    record.reference ? `Reference: ${record.reference}` : "",
    record.attachment ? `Attachment: ${record.attachment.name}` : "",
    record.notes ?? "",
  ].filter(Boolean);
}

function medicationDetails(task: CareTask) {
  return [
    task.details?.dose ? `Dose: ${task.details.dose}` : "",
    task.details?.route ? `Route: ${task.details.route}` : "",
    task.details?.quantity ? `Quantity: ${task.details.quantity}` : "",
    task.instructions || "",
  ].filter(Boolean);
}

export function buildVetBriefText(
  pet: Pet,
  tasks: CareTask[],
  records: HealthRecord[],
) {
  const petRecords = records
    .filter((record) => record.petId === pet.id)
    .sort(sortRecordsNewestFirst);
  const vaccines = latestVaccinationRecords(petRecords);
  const medications = tasks.filter(
    (task) =>
      task.petId === pet.id && task.enabled && task.category === "medication",
  );
  const lines = [
    `${pet.name} - PawPair Vet Brief`,
    `${pet.species} / ${pet.breed || "Breed not recorded"} / ${petIdentitySummary(pet, { includeBirthDate: true })}`,
    `Generated ${displayDate(dateKey())}`,
    "",
    "ACTIVE MEDICATIONS",
    ...(medications.length
      ? medications.map(
          (task) =>
            `- ${task.title}${medicationDetails(task).length ? `: ${medicationDetails(task).join(" | ")}` : ""}`,
        )
      : ["- None recorded"]),
    "",
    "CURRENT VACCINATION STATUS",
    ...(vaccines.length
      ? vaccines.map(
          (record) =>
            `- ${record.title} | Given ${displayDate(record.date)}${healthDueLabel(record) ? ` | ${healthDueLabel(record)}` : " | Next due not recorded"}`,
        )
      : ["- No vaccinations recorded"]),
    "",
    "HEALTH TIMELINE",
    ...(petRecords.length
      ? petRecords.map(
          (record) =>
            `- ${displayDate(record.date)} | ${record.title}${recordDetails(record).length ? ` | ${recordDetails(record).join(" | ")}` : ""}`,
        )
      : ["- No health records yet"]),
    "",
    "This owner-maintained summary is not a substitute for veterinary records or advice.",
  ];
  return lines.join("\n");
}

export function buildVetBriefHtml(
  pet: Pet,
  tasks: CareTask[],
  records: HealthRecord[],
) {
  const petRecords = records
    .filter((record) => record.petId === pet.id)
    .sort(sortRecordsNewestFirst);
  const summary = buildHealthPassport(pet, tasks, records);
  const vaccines = latestVaccinationRecords(petRecords);
  const medications = tasks.filter(
    (task) =>
      task.petId === pet.id && task.enabled && task.category === "medication",
  );
  const rows = petRecords
    .map(
      (record) => `<tr>
        <td>${escapeHtml(displayDate(record.date))}</td>
        <td><strong>${escapeHtml(record.title)}</strong><br><span>${escapeHtml(record.type.replace("-", " "))}</span></td>
        <td>${recordDetails(record).map(escapeHtml).join("<br>") || "-"}</td>
      </tr>`,
    )
    .join("");
  const vaccineRows = vaccines
    .map(
      (record) => `<tr>
        <td><strong>${escapeHtml(record.title)}</strong></td>
        <td>${escapeHtml(displayDate(record.date))}</td>
        <td>${escapeHtml(healthDueLabel(record) ?? "Next due not recorded")}</td>
      </tr>`,
    )
    .join("");

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><style>
    @page { margin: 34px; } * { box-sizing: border-box; }
    body { color: #223043; font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", sans-serif; margin: 0; overflow-wrap: anywhere; }
    .top { align-items: flex-start; border-bottom: 3px solid #223043; display: flex; justify-content: space-between; padding-bottom: 20px; }
    .brand { color: #39749c; font-size: 11px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; }
    h1 { font-family: Georgia, serif; font-size: 32px; margin: 6px 0 3px; }
    .sub { color: #66717e; font-size: 13px; }
    .score { background: #e3f2ec; border-radius: 18px; color: #367966; min-width: 112px; padding: 14px; text-align: center; }
    .score strong { display: block; font-size: 25px; }.score span { font-size: 10px; font-weight: 700; text-transform: uppercase; }
    .metrics { display: grid; gap: 10px; grid-template-columns: repeat(3, 1fr); margin: 20px 0; }
    .metric { background: #f6f0e7; border-radius: 14px; padding: 13px; }.metric b { display:block; font-size: 18px; }.metric span { color:#66717e;font-size:10px;text-transform:uppercase; }
    h2 { font-family: Georgia, serif; font-size: 19px; margin: 23px 0 9px; }
    ul { background:#f6f0e7;border-radius:14px;margin:0;padding:13px 13px 13px 31px; } li { margin: 5px 0; }
    table { border-collapse: collapse; font-size: 11px; width: 100%; } thead { display: table-header-group; } tr { break-inside: avoid; page-break-inside: avoid; } th { background:#223043;color:#fff;text-align:left; }
    th, td { border-bottom:1px solid #e2d8ca;padding:10px;vertical-align:top; } td span { color:#66717e;font-size:9px;text-transform:uppercase; }
    .empty { color:#66717e;padding:18px;text-align:center; }.foot { color:#76808c;font-size:9px;margin-top:20px; }
  </style></head><body>
    <div class="top"><div><div class="brand">PawPair health passport</div><h1>${escapeHtml(pet.name)}</h1><div class="sub">${escapeHtml(pet.species)} / ${escapeHtml(pet.breed || "Breed not recorded")} / ${escapeHtml(petIdentitySummary(pet, { includeBirthDate: true }))}<br>Generated ${escapeHtml(displayDate(dateKey()))}</div></div><div class="score"><strong>${summary.passportScore}%</strong><span>${escapeHtml(summary.passportLabel)}</span></div></div>
    <div class="metrics"><div class="metric"><b>${escapeHtml(summary.latestWeight?.value ? `${summary.latestWeight.value} ${summary.latestWeight.unit ?? ""}`.trim() : "-")}</b><span>Latest weight</span></div><div class="metric"><b>${summary.medicationCount}</b><span>Active medications</span></div><div class="metric"><b>${summary.overdueVaccines ? `${summary.overdueVaccines} overdue` : summary.vaccineCount ? "Up to date" : "Not recorded"}</b><span>Vaccine status</span></div></div>
    <h2>Active medications</h2><ul>${medications.length ? medications.map((task) => `<li><strong>${escapeHtml(task.title)}</strong>${medicationDetails(task).length ? ` - ${medicationDetails(task).map(escapeHtml).join(" / ")}` : ""}</li>`).join("") : "<li>None recorded</li>"}</ul>
    <h2>Current vaccination status</h2>${vaccineRows ? `<table><thead><tr><th>Vaccine</th><th>Given</th><th>Status</th></tr></thead><tbody>${vaccineRows}</tbody></table>` : '<div class="empty">No vaccinations recorded.</div>'}
    <h2>Health timeline</h2>${rows ? `<table><thead><tr><th>Date</th><th>Record</th><th>Details</th></tr></thead><tbody>${rows}</tbody></table>` : '<div class="empty">No health records yet.</div>'}
    <div class="foot">Owner-maintained summary. This document does not replace veterinary records, diagnosis, or professional advice.</div>
  </body></html>`;
}
