# ADR 0001 — Schedule engine over recurring-events library

## Status

Accepted 2026-07-10 (stage 5).

## Context

PawPair needs to compute "when is this dose due?" for every
medication. The natural options:

- A third-party library like `rrule` that follows the iCalendar
  recurrence grammar
- A custom engine that emits `Occurrence` rows on demand

## Decision

Custom engine. Specifically the module under
`src/features/schedules/`.

The engine has:
- One `generateOccurrences(schedule, from, to)` entry point
- A separate generator per `ScheduleType` value
- A single `OccurrenceKey = "${scheduleId}:${localDate}:${localTime}"`
  hash so the client and server can deduplicate without
  coordination
- A `localToUtc` helper that uses the platform Intl.DateTimeFormat
  so we do not need a third-party timezone library

## Consequences

- We own the bug surface. DST transitions, leap day, timezone
  changes are all bugs we fix in-house.
- We can keep the on-device store in sync with the server
  using just the `OccurrenceKey`.
- The engine is well-typed and 49/49 of its tests pass,
  including property-based ones from fast-check.
- A future swap to `rrule` is possible behind the same public
  API: `generateOccurrences(schedule, from, to) -> Occurrence[]`.

## Alternatives considered

- `rrule`: rejected because we do not need iCal interop and the
  API surface is larger than what the prototype needs. The
  custom engine ships 10 schedule kinds in 1,200 lines; `rrule`
  is 30 KB minified and would still need glue code for the
  pet-specific kinds (cycle, taper).
- A database-level CRON job: rejected because we want offline-
  first. The device needs to compute occurrences without a
  network round-trip.
