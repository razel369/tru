import type { DoseLog, Pet } from "../../types";

/**
 * PawPair — vet-ready care report HTML.
 *
 * docs/AAA-HANDOFF.md §8 "Reports":
 * - Include pet, medication plan, dose history, adherence
 *   definition, notes, and date range.
 * - Clearly label user-entered data.
 * - Redact caregiver details when requested.
 * - Preview before share.
 *
 * The export is HTML so it can be rendered in-app for preview,
 * sent to `expo-print` to produce a PDF, or shared via the
 * system share sheet. The file is intentionally self-contained
 * — no external assets, no remote fonts — so the PDF looks
 * identical offline.
 */

export interface ReportInput {
  pets: Pet[];
  logs: DoseLog[];
  rangeStart: Date;
  rangeEnd: Date;
  redactCaregivers?: boolean;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function adherence(logs: DoseLog[]): { total: number; given: number } {
  const total = logs.length;
  const given = logs.filter((l) => l.status === "given").length;
  return { total, given };
}

export function renderReport(input: ReportInput): string {
  const { pets, logs, rangeStart, rangeEnd, redactCaregivers } = input;
  const start = formatDate(rangeStart);
  const end = formatDate(rangeEnd);
  const stats = adherence(logs);
  const pct =
    stats.total === 0
      ? 0
      : Math.round((stats.given / stats.total) * 100);

  const petsHtml = pets
    .map((pet) => {
      const petMedications = pet.medications
        .map(
          (m) => `
            <tr>
              <td>${escapeHtml(m.name)}</td>
              <td>${escapeHtml(m.dosage)}</td>
              <td>${escapeHtml(m.form)}</td>
              <td>${m.times.map(escapeHtml).join(", ")}</td>
              <td>${m.stock} ${escapeHtml(m.stockUnit)}</td>
              <td>${escapeHtml(m.instructions)}</td>
            </tr>`,
        )
        .join("");
      const petLogs = logs
        .filter((l) => l.petId === pet.id)
        .map(
          (l) => `
            <tr>
              <td>${escapeHtml(l.date)}</td>
              <td>${escapeHtml(l.scheduledTime)}</td>
              <td>${escapeHtml(l.status)}</td>
              <td>${escapeHtml(
                redactCaregivers ? "—" : l.completedBy,
              )}</td>
            </tr>`,
        )
        .join("");
      return `
        <section class="pet">
          <h2>${escapeHtml(pet.name)}</h2>
          <p class="meta">
            ${escapeHtml(pet.species)} · ${escapeHtml(pet.breed)} · ${
              pet.age
            } years
          </p>
          <h3>Active medications</h3>
          ${
            petMedications
              ? `<table>
                  <thead>
                    <tr>
                      <th>Medication</th>
                      <th>Dose</th>
                      <th>Form</th>
                      <th>Times</th>
                      <th>Stock</th>
                      <th>Instructions</th>
                    </tr>
                  </thead>
                  <tbody>${petMedications}</tbody>
                </table>`
              : "<p>No active medications.</p>"
          }
          <h3>Dose history</h3>
          ${
            petLogs
              ? `<table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Time</th>
                      <th>Status</th>
                      <th>Caregiver</th>
                    </tr>
                  </thead>
                  <tbody>${petLogs}</tbody>
                </table>`
              : "<p>No doses logged in this range.</p>"
          }
        </section>`;
    })
    .join("");

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>PawPair care report</title>
    <style>
      body { font-family: -apple-system, "Helvetica Neue", Arial, sans-serif; color: #1D3040; margin: 32px; }
      h1 { color: #243E52; }
      h2 { color: #243E52; border-bottom: 1px solid #E7E2D9; padding-bottom: 4px; }
      h3 { color: #5D9387; margin-bottom: 6px; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
      th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid #E7E2D9; font-size: 12px; }
      th { background: #FFFDF9; }
      .meta { color: #73828B; font-size: 12px; margin: 0 0 12px 0; }
      .summary { background: #FFFDF9; border: 1px solid #E7E2D9; border-radius: 12px; padding: 16px; margin-bottom: 24px; }
      .summary .stat { font-size: 22px; color: #243E52; font-weight: 700; }
      .footer { color: #73828B; font-size: 11px; margin-top: 32px; border-top: 1px solid #E7E2D9; padding-top: 12px; }
    </style>
  </head>
  <body>
    <h1>PawPair care report</h1>
    <p class="meta">${escapeHtml(start)} → ${escapeHtml(end)}</p>
    <div class="summary">
      <p>User-entered data. Adherence is computed as the share of terminal events marked "given" in the range above.</p>
      <p class="stat">${pct}% adherence</p>
      <p class="meta">${stats.given} of ${stats.total} doses given.</p>
    </div>
    ${petsHtml}
    <p class="footer">Generated by PawPair. This is a record-keeping report and is not veterinary advice.</p>
  </body>
</html>`;
}
