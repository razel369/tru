# PawPair Privacy Policy

PawPair is a shared pet medication tracker. This policy
describes the data the app collects, where it lives, and
what we (don't) do with it.

## What stays on your device

- Every pet, medication, dose log, schedule, and household
  member you create
- Notification registration records
- The outbox queue for offline mutations waiting to sync

By default this data lives in the on-device SQLite store
created on first launch. Nothing leaves the device unless
you sign in to a household.

## What we collect when you sign in to a household

- Your display name and account id
- A device push token (so the household can wake up your
  reminders when another caregiver logs a dose)
- An audit trail of who joined, who revoked whom, and which
  role changes happened

## What we never collect

- Medication brand names for advertising or model training
- Precise geolocation
- Device identifiers for cross-app tracking
- Cookies or web trackers

## Your controls

- Export every pet, medication, and dose log as JSON
  (Settings → Export care data).
- Delete the account, which removes every pet, medication,
  log, and household membership from this device and from
  the household. The household's owner is the source of
  truth for the household itself.
- Pause reminders for any medication at any time.

## Health data disclaimer

PawPair is a record-keeping tool. It does not recommend
medications, does not change doses, does not diagnose, and
does not replace veterinary advice.
