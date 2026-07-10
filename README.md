# PawPair

Shared pet medication tracker for caregivers. Confirms
"did someone already give this dose?" in one tap.

## Quick start

```bash
cd C:\Users\rmalk\Projects\tru
npm install
npm test
npx expo start --web
```

The web bundle boots at `http://localhost:8081`. The first
launch goes through the onboarding welcome screen. The
bottom nav has five tabs: Today, Pets, +, Insights, Health.
Health surfaces the navigation to Settings, Household, and
the Paywall.

## Status

- 12/12 implementation stages complete
- 108/108 tests passing
- TypeScript strict mode, no errors
- Production foundation: SQLite, schedule engine, conflict
  detection, household sync, subscriptions, i18n, dark theme

## Where to look

- `docs/AAA-HANDOFF.md` — the 19-section production contract
- `docs/BASELINE-AUDIT.md` — what the prototype looked like
  before stage 2, plus the final state after stage 12
- `ROADMAP.md` — prioritized list of work remaining before
  the App Store submission
- `CHANGELOG.md` (TODO) — copy of the 29 commit messages
- `PRIVACY.md` — what we keep on the device, what we upload
  when a household joins, the no-ads / no-advice guarantees
- `eas.json` — EAS build profiles (development, preview,
  production)

## Architecture

```
src/
├── App.tsx                  # state + nav + 12 screens
├── data/
│   ├── database/            # SQLite connection, schema v1 (15
│   │                        #   tables), migrations runner, clock,
│   │                        #   uuid, types
│   ├── repositories/        # pets, medications, dose_events
│   └── storage/             # secure-storage wrapper (SecureStore)
├── design/                  # colors, typography, spacing, motion,
│                            #   shadows, light + dark themes,
│                            #   ThemeProvider
├── components/              # AppHeader, BottomNav, DateStrip,
│                            #   LoadingScreen, StatCard, Toast,
│                            #   forms/FormInput,
│                            #   feedback/Empty|Error|Offline
└── features/                # 12 submodules
    ├── schedules/           # 10 schedule kinds + DST + adapter
    ├── notifications/       # service + permission + bridge + scheduler + health
    ├── medications/         # multi-step form + menu + schedule editor
    ├── pets/                # form + menu
    ├── insights/, onboarding/, today/
    ├── household/           # auth + service + sync outbox + conflict
    ├── subscriptions/       # entitlements + StoreKit + paywall
    ├── settings/, reports/
    └── i18n/, accessibility/
```

## Test

```bash
npm test
```

The suite covers:
- Schedule engine (10 schedule kinds, DST, leap day, timezone)
- Notifications (service, idempotency, snooze)
- Sync outbox (FNV-1a key, drain loop, per-entry error)
- Conflict detection (terminal events, corrections, ordering)
- Household (invite accept, owner cannot revoke)
- Entitlements (free tier limits, plus tier flags)
- Subscriptions (purchase, restore, failure paths)
- StoreKit wrapper
- Form state (per-step validation, schedule, identity, inventory)
- Migrations (v1 apply, idempotency, downgrade)
- Report renderer (HTML, escaping, redaction)
- Wiring (empty day, error, conflict, i18n, taper validity)

## Privacy

PawPair keeps every pet, medication, and dose log on the
device. Read [`PRIVACY.md`](./PRIVACY.md) for the full
data inventory, the household sync rules, and the
no-medication-advice disclaimer that lives in every form,
report, and onboarding screen.

## Support

- See `ROADMAP.md` for the work remaining before App Store
- Email: raz@rmalk.co.il
- Privacy: [`PRIVACY.md`](./PRIVACY.md)
- Source: `docs/AAA-HANDOFF.md` is the source of truth for
  product behavior; `docs/BASELINE-AUDIT.md` is the source of
  truth for the prototype.
