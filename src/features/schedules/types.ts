/**
 * PawPair — schedule types.
 *
 * docs/AAA-HANDOFF.md §6 requires 10 schedule kinds. This module
 * defines the discriminated union, the shared occurrence shape,
 * and the helpers for converting legacy `Medication.times: string[]`
 * schedules into the new model.
 *
 * Conventions (per §4 "Data semantics"):
 * - Instants are stored as UTC ISO 8601 strings; the schedule
 *   timezone is a separate field.
 * - Wall-clock schedule times are kept distinct from generated
 *   instants; they round-trip through the occurrence_key.
 * - Each occurrence has a deterministic key. Two clients with
 *   the same data and timezone compute the same key.
 */

export type ScheduleType =
  | "daily"
  | "weekdays"
  | "every_n_hours"
  | "every_n_days"
  | "weekly"
  | "monthly"
  | "date_range"
  | "taper"
  | "cycle"
  | "prn";

export interface ScheduleBase {
  /** UUID v4. */
  id: string;
  /** UUID v4 of the medication row in `medications`. */
  medicationId: string;
  /** IANA timezone, e.g. "Asia/Jerusalem". */
  timezone: string;
  /** ISO date in the schedule timezone marking the first day. */
  startDate: string;
  /** ISO date in the schedule timezone; null for open-ended. */
  endDate: string | null;
  /** Wall-clock HH:MM times in the schedule timezone. */
  times: string[];
  /**
   * Bitmask for the days of the week that apply. Mon=1, Tue=2, …,
   * Sun=64. Used by daily/weekdays/weekly; ignored by other types
   * unless explicitly required.
   */
  weekdayMask: number;
  /** Used by every_n_hours, every_n_days, cycle, taper. */
  everyN: number | null;
  /** Cycle-only: days on. */
  cycleOnDays: number | null;
  /** Cycle-only: days off. */
  cycleOffDays: number | null;
  /** Taper phases; empty for non-taper schedules. */
  taperPhases: TaperPhase[];
  /** True when the user paused the medication. */
  paused: boolean;
  /** PRN minimum interval in minutes (0 = no minimum). */
  prnMinIntervalMinutes: number;
}

export interface TaperPhase {
  /** Days into the taper that this phase starts (0 = first day). */
  startDay: number;
  /** Times and dose for this phase. */
  times: string[];
  dose: string;
}

export type Schedule = ScheduleBase & {
  type: ScheduleType;
};

/**
 * A single scheduled occurrence. The `key` is deterministic for
 * the same (scheduleId, localDate, localTime, timezone).
 */
export interface Occurrence {
  /** UUID v4 of the row in `scheduled_doses` (when persisted). */
  id: string;
  scheduleId: string;
  /** Deterministic key. */
  key: string;
  /** UTC ISO 8601 instant the dose is due. */
  scheduledForUtc: string;
  /** Local date YYYY-MM-DD in the schedule timezone. */
  localDate: string;
  /** Local HH:MM in the schedule timezone. */
  localTime: string;
  /** Optional taper dose text for this occurrence, if applicable. */
  dose: string | null;
}

/** Default 8-point weekday mask. */
export const EVERY_DAY: number = 0b1111111; // 127

export function scheduleTypeLabel(type: ScheduleType): string {
  switch (type) {
    case "daily":
      return "Every day";
    case "weekdays":
      return "Selected weekdays";
    case "every_n_hours":
      return "Every N hours";
    case "every_n_days":
      return "Every N days";
    case "weekly":
      return "Weekly";
    case "monthly":
      return "Monthly";
    case "date_range":
      return "Date range";
    case "taper":
      return "Taper";
    case "cycle":
      return "Cycle (on/off)";
    case "prn":
      return "As needed (PRN)";
  }
}
