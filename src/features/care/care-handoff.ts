import type { Pet } from "../../types";

import type { CareTask, HealthRecord } from "./types";
import { petIdentitySummary } from "./pet-identity";
import { careTaskSummary } from "./task-details";

export type CareHandoffOptions = {
  appointments: boolean;
  contacts: boolean;
  health: boolean;
  medications: boolean;
  routine: boolean;
};

function escapeHtml(value: string | number | undefined) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function displayDate(value?: string) {
  if (!value) return "Not recorded";
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function taskTiming(task: CareTask) {
  const times = task.schedule.times.join(", ") || "Flexible";
  if (task.schedule.frequency === "once") {
    return `${displayDate(task.schedule.date)} / ${times}`;
  }
  if (task.schedule.frequency === "weekly") {
    const days = (task.schedule.weekdays ?? [])
      .map((day) => ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][day])
      .filter(Boolean)
      .join(", ");
    return `${days || "Weekly"} / ${times}`;
  }
  return `Daily / ${times}`;
}

function selectedTasks(pet: Pet, tasks: CareTask[], category: "routine" | "medications") {
  return tasks
    .filter(
      (task) =>
        task.petId === pet.id &&
        task.enabled &&
        (category === "medications"
          ? task.category === "medication"
          : task.category !== "medication" && task.category !== "appointment"),
    )
    .sort((a, b) =>
      (a.schedule.times[0] ?? "99:99").localeCompare(
        b.schedule.times[0] ?? "99:99",
      ),
    );
}

function selectedAppointments(pet: Pet, tasks: CareTask[]) {
  const today = localDateKey();
  return tasks
    .filter(
      (task) =>
        task.petId === pet.id &&
        task.enabled &&
        task.category === "appointment" &&
        (task.schedule.frequency !== "once" ||
          !task.schedule.date ||
          task.schedule.date >= today),
    )
    .sort((first, second) =>
      `${first.schedule.date ?? "9999-12-31"}:${first.schedule.times[0] ?? "99:99"}`.localeCompare(
        `${second.schedule.date ?? "9999-12-31"}:${second.schedule.times[0] ?? "99:99"}`,
      ),
    );
}

function healthRecords(pet: Pet, records: HealthRecord[]) {
  return records
    .filter((record) => record.petId === pet.id)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 12);
}

export function buildCareHandoffText(
  pet: Pet,
  tasks: CareTask[],
  records: HealthRecord[],
  options: CareHandoffOptions,
) {
  const lines = [
    `${pet.name} - PawPair Care Handoff`,
    `${pet.breed || pet.species} / ${petIdentitySummary(pet, { includeBirthDate: true })}`,
    `Prepared ${displayDate(localDateKey())}`,
  ];
  if (options.routine) {
    lines.push("", "DAILY ROUTINE");
    const routine = selectedTasks(pet, tasks, "routine");
    lines.push(...(routine.length ? routine.map((task) => `- ${task.title} / ${taskTiming(task)}${careTaskSummary(task) ? ` / ${careTaskSummary(task)}` : ""}`) : ["- No routine items recorded"]));
    if (pet.careProfile?.diet) lines.push(`- Diet: ${pet.careProfile.diet}`);
    if (pet.careProfile?.caregiverNotes) lines.push(`- Caregiver notes: ${pet.careProfile.caregiverNotes}`);
  }
  if (options.medications) {
    lines.push("", "MEDICATIONS");
    const medications = selectedTasks(pet, tasks, "medications");
    lines.push(...(medications.length ? medications.map((task) => `- ${task.title} / ${taskTiming(task)}${careTaskSummary(task) ? ` / ${careTaskSummary(task)}` : ""}`) : ["- None recorded"]));
    if (pet.careProfile?.allergies) lines.push(`- Allergies: ${pet.careProfile.allergies}`);
  }
  if (options.appointments) {
    lines.push("", "UPCOMING APPOINTMENTS");
    const appointments = selectedAppointments(pet, tasks);
    lines.push(
      ...(appointments.length
        ? appointments.map(
            (task) =>
              `- ${task.title} / ${taskTiming(task)}${careTaskSummary(task) ? ` / ${careTaskSummary(task)}` : ""}`,
          )
        : ["- None scheduled"]),
    );
  }
  if (options.health) {
    lines.push("", "RECENT HEALTH");
    const health = healthRecords(pet, records);
    lines.push(...(health.length ? health.map((record) => `- ${displayDate(record.date)} / ${record.title}${record.value ? ` / ${record.value}${record.unit ? ` ${record.unit}` : ""}` : ""}${record.severity ? ` / ${record.severity} severity` : ""}${record.type === "symptom" ? record.resolvedDate ? ` / Resolved ${displayDate(record.resolvedDate)}` : " / Ongoing" : ""}${record.notes ? ` / ${record.notes}` : ""}`) : ["- No health records included"]));
  }
  if (options.contacts) {
    const profile = pet.careProfile;
    lines.push("", "CONTACTS & IDENTIFIERS");
    lines.push(
      `- Veterinarian: ${profile?.veterinarianName || "Not recorded"}${profile?.veterinarianPhone ? ` / ${profile.veterinarianPhone}` : ""}`,
      `- Emergency contact: ${profile?.emergencyContactName || "Not recorded"}${profile?.emergencyContactPhone ? ` / ${profile.emergencyContactPhone}` : ""}`,
      `- Microchip: ${profile?.microchipId || "Not recorded"}`,
    );
  }
  lines.push("", "Shared intentionally by the pet owner. Once shared, the recipient controls their copy.");
  return lines.join("\n");
}

function section(title: string, body: string) {
  return `<section><h2>${escapeHtml(title)}</h2>${body}</section>`;
}

function taskList(items: CareTask[]) {
  return items.length
    ? `<div class="list">${items.map((task) => `<div class="item"><div><strong>${escapeHtml(task.title)}</strong><span>${escapeHtml(taskTiming(task))}</span></div><p>${escapeHtml(careTaskSummary(task) || "No extra instructions")}</p></div>`).join("")}</div>`
    : '<div class="empty">None recorded</div>';
}

export function buildCareHandoffHtml(
  pet: Pet,
  tasks: CareTask[],
  records: HealthRecord[],
  options: CareHandoffOptions,
) {
  const profile = pet.careProfile;
  const sections: string[] = [];
  if (options.routine) {
    const notes = [
      profile?.diet ? `<div class="note"><b>Diet</b>${escapeHtml(profile.diet)}</div>` : "",
      profile?.caregiverNotes ? `<div class="note"><b>Caregiver notes</b>${escapeHtml(profile.caregiverNotes)}</div>` : "",
    ].filter(Boolean).join("");
    sections.push(section("Daily routine", taskList(selectedTasks(pet, tasks, "routine")) + notes));
  }
  if (options.medications) {
    const allergy = profile?.allergies ? `<div class="alert"><b>Allergies and sensitivities</b>${escapeHtml(profile.allergies)}</div>` : "";
    sections.push(section("Medications", allergy + taskList(selectedTasks(pet, tasks, "medications"))));
  }
  if (options.appointments) {
    sections.push(
      section(
        "Upcoming appointments",
        taskList(selectedAppointments(pet, tasks)),
      ),
    );
  }
  if (options.health) {
    const health = healthRecords(pet, records);
    const body = health.length
      ? `<div class="timeline">${health.map((record) => `<div class="health"><span>${escapeHtml(displayDate(record.date))}</span><strong>${escapeHtml(record.title)}</strong><p>${escapeHtml([record.value ? `${record.value}${record.unit ? ` ${record.unit}` : ""}` : "", record.provider || "", record.severity ? `${record.severity} severity` : "", record.type === "symptom" ? record.resolvedDate ? `Resolved ${displayDate(record.resolvedDate)}` : "Ongoing" : "", record.notes || ""].filter(Boolean).join(" / ") || "No additional details")}</p></div>`).join("")}</div>`
      : '<div class="empty">No recent health records</div>';
    sections.push(section("Recent health", body));
  }
  if (options.contacts) {
    sections.push(section("Contacts and identifiers", `<div class="contacts"><div><span>Veterinarian</span><b>${escapeHtml(profile?.veterinarianName || "Not recorded")}</b><p>${escapeHtml(profile?.veterinarianPhone || "")}</p></div><div><span>Emergency contact</span><b>${escapeHtml(profile?.emergencyContactName || "Not recorded")}</b><p>${escapeHtml(profile?.emergencyContactPhone || "")}</p></div><div><span>Microchip</span><b>${escapeHtml(profile?.microchipId || "Not recorded")}</b></div></div>`));
  }
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    @page{margin:32px}*{box-sizing:border-box}body{color:#223043;font-family:-apple-system,BlinkMacSystemFont,"Helvetica Neue",sans-serif;margin:0}.hero{background:linear-gradient(135deg,#dceee8,#f3e5d2);border-radius:24px;padding:22px;position:relative}.brand{color:#39749c;font-size:10px;font-weight:800;letter-spacing:1.4px}.hero h1{font-family:Georgia,serif;font-size:34px;margin:5px 0}.hero p{color:#66717e;margin:0}.prepared{position:absolute;right:20px;top:20px;color:#66717e;font-size:10px}section{break-inside:avoid;margin-top:22px}h2{font-family:Georgia,serif;font-size:20px;margin:0 0 9px}.list{display:grid;gap:7px}.item{background:#f7f1e8;border-radius:13px;padding:11px}.item>div{display:flex;justify-content:space-between}.item span{color:#66717e;font-size:10px}.item p,.health p{color:#56616d;font-size:10px;margin:5px 0 0}.note,.alert{border-radius:13px;margin-top:8px;padding:11px}.note{background:#e5f1ed}.alert{background:#fff0eb}.note b,.alert b{display:block;font-size:9px;letter-spacing:.7px;margin-bottom:3px;text-transform:uppercase}.health{border-left:3px solid #74ab9d;margin-bottom:8px;padding:4px 0 7px 12px}.health span{color:#66717e;display:block;font-size:9px}.contacts{display:grid;gap:8px;grid-template-columns:repeat(3,1fr)}.contacts>div{background:#f7f1e8;border-radius:13px;min-height:76px;padding:11px}.contacts span{color:#66717e;display:block;font-size:9px;text-transform:uppercase}.contacts b{display:block;font-size:12px;margin-top:6px}.contacts p{font-size:10px;margin:4px 0}.empty{background:#f7f1e8;border-radius:13px;color:#66717e;padding:15px}.footer{border-top:1px solid #ded5c9;color:#77818c;font-size:9px;margin-top:24px;padding-top:10px}
  </style></head><body><div class="hero"><div class="brand">PAWPAIR CARE HANDOFF</div><h1>${escapeHtml(pet.name)}</h1><p>${escapeHtml(pet.breed || pet.species)} / ${escapeHtml(petIdentitySummary(pet, { includeBirthDate: true }))}</p><div class="prepared">Prepared ${escapeHtml(displayDate(localDateKey()))}</div></div>${sections.join("")}<div class="footer">Shared intentionally by the pet owner. This handoff is not veterinary advice. Once shared, the recipient controls their copy.</div></body></html>`;
}
