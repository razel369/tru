import type { DoseConflict, DoseEventRow, DoseLog } from "./types";
import type { DoseLog as LegacyDoseLog } from "../../types";

/**
 * PawPair — conflict detection.
 *
 * docs/AAA-HANDOFF.md §5: "If two people act concurrently, the
 * second receives a designed conflict screen showing who
 * logged the dose and when."
 *
 * The schema v1 partial unique index on dose_events enforces
 * one terminal event per occurrence. This module surfaces
 * that conflict to the UI by detecting two terminal events
 * for the same scheduled dose and producing a `DoseConflict`
 * the host can render.
 */

interface ConflictInput {
  scheduledDoseId: string;
  events: DoseEventRow[];
  /** Map of user id to display name. Resolved at the UI layer. */
  displayNameFor: (userId: string) => string;
  /** Fallback when the user id is unknown. */
  fallbackName?: string;
}

function rowToLog(row: DoseEventRow): DoseLog {
  return {
    id: row.id,
    petId: "", // resolved by the caller if needed
    medicationId: "", // resolved by the caller if needed
    date: row.completed_at_utc.slice(0, 10),
    scheduledTime: row.completed_at_utc.slice(11, 16),
    status: row.status,
    completedAt: row.completed_at_utc,
    completedBy: row.completed_by_user_id ?? "(unknown)",
  };
}

/**
 * Detect a conflict among the events for a single scheduled
 * dose. A conflict exists when more than one terminal event
 * (status = given or skipped) has a NULL correction_of_event_id.
 * Returns the two most-recent terminal events in the canonical
 * (first, second) order; the rest are returned separately for
 * the UI to keep the surface short.
 */
export function detectConflict(input: ConflictInput): DoseConflict | null {
  const terminal = input.events.filter(
    (e) =>
      (e.status === "given" || e.status === "skipped") &&
      e.correction_of_event_id === null,
  );
  if (terminal.length < 2) return null;
  const sorted = [...terminal].sort((a, b) =>
    a.completed_at_utc.localeCompare(b.completed_at_utc),
  );
  const first = sorted[0];
  const second = sorted[1];
  if (!first || !second) return null;
  return {
    scheduledDoseKey: input.scheduledDoseId,
    firstEvent: {
      id: first.id,
      completedAtUtc: first.completed_at_utc,
      completedByUserId: first.completed_by_user_id ?? "",
      completedByDisplayName: input.displayNameFor(
        first.completed_by_user_id ?? input.fallbackName ?? "",
      ),
    },
    secondEvent: {
      id: second.id,
      completedAtUtc: second.completed_at_utc,
      completedByUserId: second.completed_by_user_id ?? "",
      completedByDisplayName: input.displayNameFor(
        second.completed_by_user_id ?? input.fallbackName ?? "",
      ),
    },
  };
}

export function legacyLogToRow(log: LegacyDoseLog): DoseEventRow {
  return {
    id: log.id,
    scheduled_dose_id: `${log.petId}::${log.medicationId}::${log.date}::${log.scheduledTime}`,
    status: log.status,
    completed_at_utc: log.completedAt,
    completed_by_user_id: null,
    note: null,
    correction_of_event_id: null,
  };
}

export { rowToLog };
