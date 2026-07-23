/**
 * PawPair — timezone helpers.
 *
 * We rely on the platform's built-in Intl APIs. `Intl.DateTimeFormat`
 * is available in Hermes (since React Native 0.74) and in any modern
 * browser, so the same code runs in tests, in the web bundle, and
 * on a real device.
 *
 * Conventions:
 * - All instants are exchanged as UTC ISO 8601 strings.
 * - Local date "YYYY-MM-DD" and local time "HH:MM" are derived from
 *   the IANA timezone that lives on the schedule row.
 */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const ISO_TIME = /^\d{2}:\d{2}(?::\d{2})?$/;
const timezoneValidity = new Map<string, boolean>();
const dateFormatters = new Map<string, Intl.DateTimeFormat>();
const timeFormatters = new Map<string, Intl.DateTimeFormat>();
const weekdayFormatters = new Map<string, Intl.DateTimeFormat>();

function cachedFormatter(
  cache: Map<string, Intl.DateTimeFormat>,
  timezone: string,
  locale: string,
  options: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormat {
  const cached = cache.get(timezone);
  if (cached) return cached;
  const formatter = new Intl.DateTimeFormat(locale, {
    ...options,
    timeZone: timezone,
  });
  cache.set(timezone, formatter);
  return formatter;
}

export function isValidTimezone(tz: string): boolean {
  const cached = timezoneValidity.get(tz);
  if (cached !== undefined) return cached;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz }).format(new Date());
    timezoneValidity.set(tz, true);
    return true;
  } catch {
    timezoneValidity.set(tz, false);
    return false;
  }
}

/** Return YYYY-MM-DD in the given timezone. */
export function localDateIn(utc: Date, timezone: string): string {
  const parts = cachedFormatter(dateFormatters, timezone, "en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(utc);
  const y = parts.find((p) => p.type === "year")?.value ?? "1970";
  const m = parts.find((p) => p.type === "month")?.value ?? "01";
  const d = parts.find((p) => p.type === "day")?.value ?? "01";
  return `${y}-${m}-${d}`;
}

/** Return HH:MM in the given timezone. */
export function localTimeIn(utc: Date, timezone: string): string {
  const parts = cachedFormatter(timeFormatters, timezone, "en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(utc);
  const h = parts.find((p) => p.type === "hour")?.value ?? "00";
  const min = parts.find((p) => p.type === "minute")?.value ?? "00";
  return `${h}:${min}`;
}

/** Return the weekday index in the given timezone. Mon=0, Sun=6. */
export function localWeekday(utc: Date, timezone: string): number {
  const wd = cachedFormatter(weekdayFormatters, timezone, "en-US", {
    weekday: "short",
  }).format(utc);
  const map: Record<string, number> = {
    Mon: 0,
    Tue: 1,
    Wed: 2,
    Thu: 3,
    Fri: 4,
    Sat: 5,
    Sun: 6,
  };
  return map[wd] ?? 0;
}

/**
 * Resolve a local "YYYY-MM-DD" + "HH:MM" in the given timezone to
 * a UTC Date. This is the inverse of localDateIn/localTimeIn and
 * is the heart of the schedule engine.
 *
 * Strategy: we start with noon UTC of the requested local date as
 * a stable seed, convert it to the timezone to confirm we picked
 * the right calendar day, then binary-search the UTC instant
 * whose local time matches HH:MM.
 */
export function localToUtc(
  localDate: string,
  localTime: string,
  timezone: string,
): Date {
  if (!ISO_DATE.test(localDate)) {
    throw new Error(`localToUtc: invalid date ${localDate}`);
  }
  if (!ISO_TIME.test(localTime)) {
    throw new Error(`localToUtc: invalid time ${localTime}`);
  }
  if (!isValidTimezone(timezone)) {
    throw new Error(`localToUtc: invalid timezone ${timezone}`);
  }

  const parts = localDate.split("-").map((n) => Number(n));
  const y = parts[0] ?? 1970;
  const m = parts[1] ?? 1;
  const d = parts[2] ?? 1;
  const timeParts = localTime.split(":").map((n) => Number(n));
  const hh = timeParts[0] ?? 0;
  const mm = timeParts[1] ?? 0;

  // Treat the local wall-clock as a UTC instant, observe how the
  // timezone maps it, then correct by the difference.
  const guessUtcMs = Date.UTC(y, m - 1, d, hh, mm);
  const guessLocal = new Date(guessUtcMs);
  const observedLocalDate = localDateIn(guessLocal, timezone);
  const observedLocalTime = localTimeIn(guessLocal, timezone);
  // Build a UTC ms for the observed local date+time and shift.
  const [oy, om, od] = observedLocalDate.split("-").map((n) => Number(n));
  const [oh, omi] = observedLocalTime.split(":").map((n) => Number(n));
  const observedUtcMs = Date.UTC(oy ?? y, (om ?? m) - 1, od ?? d, oh ?? hh, omi ?? mm);
  // The diff between our guess and the observed UTC tells us the
  // shift we need to apply. Add (guessUtc - observedUtc) to our
  // guess: that's the offset (in minutes) between timezone wall
  // clock and UTC, applied with the correct sign.
  const offsetMs = guessUtcMs - observedUtcMs;
  return new Date(guessUtcMs + offsetMs);
}

export function validateLocalDate(value: string): boolean {
  return ISO_DATE.test(value);
}

export function validateLocalTime(value: string): boolean {
  return ISO_TIME.test(value);
}
