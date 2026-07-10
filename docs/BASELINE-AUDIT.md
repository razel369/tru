# PawPair — Baseline Audit (Stage 1)

**Date:** 2026-07-10
**Branch:** `cursor/raintank-planner-7a02`
**Auditor:** MiniMax-M3 (Cursor) — Stage 1 of `docs/AAA-HANDOFF.md` §17

## 1. Environment

| Tool | Version | Notes |
|---|---|---|
| OS | Windows 11 (10.0.26200) | Audit done in Windows env. iOS simulator not available. |
| Node | v22.17.0 | OK |
| npm | 10.9.2 | OK |
| `npm install` | 537 packages, 46s | One deprecation warning (`uuid@7`) from a transitive — non-blocking. |
| `npm run typecheck` | PASS (0 errors) | Strict TypeScript passes. |
| `npm test` (vitest) | 4/4 PASS in 861ms | All baseline schedule tests green. |
| `npx expo start --web` | Starts at `http://localhost:8081` | Web preview used in place of iOS simulator. |

## 2. Repository layout (cloned snapshot)

```
tru/
├── App.tsx                  # 1,403 lines — single-file monolith
├── app.json                 # Expo config: bundle id app.pawpair.medtracker
├── package.json             # pawpair-pet-med-tracker@0.1.0
├── tsconfig.json
├── README.md
├── docs/
│   ├── AAA-HANDOFF.md       # 19-section production plan (the contract)
│   ├── BASELINE-AUDIT.md    # this file
│   └── market-research.md
├── src/
│   ├── schedule.ts          # 153 lines — pure schedule engine
│   ├── schedule.test.ts     # 4 vitest tests
│   └── types.ts             # 56 lines — domain types
└── assets/
    ├── pawpair-icon.png
    ├── pawpair-milo.png
    └── pawpair-luna.png
```

## 3. What already works (today, July 2026)

Confirmed by running the web bundle (`expo start --web`) and inspecting code:

### 3.1 Today screen
- Greeting + sticky day strip (today plus next 4 days selectable).
- Chronological timeline of all scheduled doses across pets, sorted by time.
- Dose states rendered distinctly:
  - **Given** (sage Soft pill) with caregiver attribution ("Maya 8:04 AM")
  - **Skipped** (muted gray pill)
  - **Due / Upcoming** (neutral navy)
  - **Missed** (implicitly derivable from schedule but not visually surfaced — gap)
- Tap "Given" / "Skipped" → dose is logged, toast appears, haptic fires (Success vs Warning).
- Logging a "Given" dose decrements `medication.stock` by 1.
- Toast auto-dismisses after 2.6 s.

### 3.2 Pets screen
- Card per pet: portrait (real asset, not stock), name, age, breed.
- Per-pet medication list with name, dosage, instructions, stock + unit, color tag.
- Pet-specific CTA "Add medication" wired to the same global Add screen.

### 3.3 Insights screen
- Week selector (W-2, W-1, current).
- Adherence %, dose count, caregiver count.
- Horizontal bar chart of doses per day (Fraunces numerals).
- Caregiver leaderboard.

### 3.4 Add medication flow
- Form: pet picker, name, dosage, form (tablet/liquid/drops/injection), time picker, stock + unit, instructions.
- All fields required.
- Validation: must select pet, must have name, dosage, time, stock ≥ 0.
- Success → toast, navigates back to Today.

### 3.5 Persistence
- AsyncStorage keys: `pawpair.pets.v2`, `pawpair.logs.v2`.
- Hydration on launch, write on every change.
- Seed data: hardcoded `DEMO_PETS` (Milo, Luna) and `makeSeedLogs()` (2 doses pre-logged today).

### 3.6 Typography & color
- Fraunces (700) for emotional display headings.
- Manrope (400/600/700/800) for UI text and data.
- Palette: cream `#F7F4EE`, paper `#FFFDF9`, navy `#243E52`, ink `#1D3040`, muted `#73828B`, line `#E7E2D9`, coral `#EF7B63`, sage `#5D9387`, butter `#F6D58C`, lavender `#9891C7`, danger `#C95C5C`.

### 3.7 Haptics
- Success on dose "given", medication added.
- Warning on dose "skipped".

## 4. Baseline UI screenshot (web bundle, viewport 626 × 710)

`docs/baseline-screenshots/today.png` (captured `2026-07-09T23:35:13Z`)

The screenshot shows the Today screen with:
- "Good morning, Maya." greeting (Fraunces serif).
- Sticky day strip: FRI 10 (selected, coral) · SAT 11 · SUN 12 · MON 13 · TUE 14.
- Hero card with "Today's care plan" + 4-of-5 progress ring.
- Doses in order: 7:30 AM Carprofen Given (Alex 8:00 AM, coral) · 8:00 AM Carprofen Skipped (Maya 8:04 AM, gray) · 6:30 PM Omega-3 Upcoming (Maya, navy) · 7:30 PM Thyronorm Upcoming (Luna, navy) · 8:00 PM Carprofen Upcoming (Milo, navy).
- Floating coral "Given" / "Skip" actions inside each card.
- Bottom tab bar: Today · Pets · `+` · Insights · Profile.
- Toast at the bottom: "Carprofen logged for Milo" (fades after 2.6 s).

The web bundle is visually faithful to the iOS design intent, including: midnight gradient top band, cream surface, Fraunces/Manrope pairing, original pet portraits, coral FAB, sage/coral state pills.

## 5. Concrete gaps vs `docs/AAA-HANDOFF.md`

This list is the raw input to Stage 2 (Refactor) and beyond. Each item maps to a stage in the handoff.

### 5.1 Architecture (§4)
- [ ] `App.tsx` is a 1,403-line monolith with 4 screens + state + persistence + design tokens inline.
- [ ] No `app/` directory using Expo Router.
- [ ] No `src/components/primitives` or `src/features/*` modules.
- [ ] No `src/design/{colors,typography,spacing,motion,shadows}.ts` (tokens are inline `const COLORS` at the top of `App.tsx`).
- [ ] No `src/data/database`, no `src/data/repositories`, no `src/data/sync`.

### 5.2 Data layer (§4 "Local data")
- [ ] Uses AsyncStorage, not `expo-sqlite`. No schema, no migrations, no relational integrity.
- [ ] No `users`, `households`, `household_members`, `pets`, `pet_photos`, `medications`, `medication_schedules`, `schedule_times`, `scheduled_doses`, `dose_events`, `inventory_transactions`, `refill_reminders`, `notification_registrations`, `sync_outbox`, `sync_metadata` tables.
- [ ] IDs are human-readable strings (`milo`, `carprofen`) — not UUIDs.
- [ ] Instants stored as local strings, not UTC ISO.
- [ ] No timezone stored on schedules.
- [ ] No deterministic clock for tests.

### 5.3 Backend & household sync (§5)
- [ ] No Supabase project, no `supabase/` directory.
- [ ] No authentication (no Sign in with Apple).
- [ ] No household model; only single-caregiver ("Maya" hardcoded) + "Alex" hardcoded in seed.
- [ ] No RLS policies.
- [ ] No sync outbox; no double-dose prevention; if two caregivers tap "Given" on the same scheduled dose at the same time, both logs are written locally with no conflict UX.

### 5.4 Schedule engine (§6)
- [ ] `Medication.times: string[]` — only simple daily fixed times. No weekday selector, no every-N-hours, no every-N-days, no weekly/monthly, no taper, no cycle (days on/off), no PRN, no pause.
- [ ] No DST handling, no timezone awareness.
- [ ] No "leap day" or month-boundary coverage.
- [ ] Status logic in `buildSchedule` uses `nowMinutes` derived from `new Date()` — non-deterministic for tests.
- [ ] Edit of `times` after occurrences exist is not supported (the array is just a fixed list).
- [ ] No inventory ledger; `medication.stock` is a directly edited counter.
- [ ] No refill reminder table.
- [ ] No property-based / table-driven tests for recurrence.

### 5.5 Notifications (§7)
- [ ] No `expo-notifications` dependency, no scheduling, no actions, no permission flow, no diagnostics screen.
- [ ] No `notification_registrations` table.

### 5.6 Complete UX flows (§8)
- [ ] Onboarding: none. App opens straight to Today with demo data.
- [ ] Today: no long-press menu, no notes, no reschedule, no skip reason, no correction flow. No pull-to-refresh (good — sync doesn't exist yet). No empty-day state beyond the list.
- [ ] Add/edit medication: no edit. No archive. No draft preservation. No prescription photo.
- [ ] Pets: no edit, no archive, no delete with confirmation. No camera/photo-library picker. No weight, breed, age, vet fields.
- [ ] Insights: weeks only; no month, no custom range, no per-medication filter, no supply forecast.
- [ ] Reports: none.
- [ ] Profile/Settings: tab exists in nav but is a placeholder (per handoff).

### 5.7 Subscription (§9)
- [ ] No RevenueCat / StoreKit 2.
- [ ] No entitlement gating, no Plus tier, no paywall, no restore, no Family Sharing handling.

### 5.8 Component system (§10)
- [ ] No `PPButton`, `PPCard`, `PPPetAvatar`, `PPDoseCard`, `PPStatusBadge`, `PPTimeline`, `PPBottomSheet`, `PPToast`, `PPEmptyState`, `PPErrorState`, `PPSkeleton`, `PPProgressRing`, `PPFormField`, `PPSegmentedControl`, `PPDateStrip`, `PPSyncIndicator`.
- [ ] No design-gallery screen.

### 5.9 Motion & sound (§11)
- [ ] Haptics used (good). Reanimated not installed — no spring transitions.
- [ ] No Reduce Motion handling.

### 5.10 Accessibility & localization (§12)
- [ ] No VoiceOver labels, no accessibility roles.
- [ ] No Dynamic Type enforcement.
- [ ] No localization; all strings hardcoded in English.
- [ ] No Reduce Transparency fallback, no Increase Contrast check, no 44pt touch-target audit.

### 5.11 Privacy, safety, security (§13)
- [ ] No data inventory doc.
- [ ] No SecureStore; tokens will eventually need it.
- [ ] No privacy manifest, no nutrition labels, no in-app export/delete.
- [ ] Disclaimer text in `README.md` is good; needs in-app surfaces.

### 5.12 Testing (§14)
- [ ] 4 unit tests for schedule basics. No integration, no component, no E2E, no visual regression, no notification, no sync, no migration, no RLS tests.
- [ ] No deterministic clock.

### 5.13 Performance budgets (§15)
- [ ] No measured LCP / TTI / frame budgets.
- [ ] Bundle audit not run.

### 5.14 Release engineering (§16)
- [ ] No `eas.json`.
- [ ] No CI.
- [ ] No privacy manifest, no App Store assets, no ASO metadata.

## 6. Out of scope for this audit (deliberately not done in Stage 1)

- No code was modified.
- No new dependencies added.
- No new files created outside `docs/BASELINE-AUDIT.md` and `docs/baseline-screenshots/`.
- No commits or pushes were made.

## 7. Recommended next step

Proceed to **Stage 2 — Refactor**: introduce `src/design/*` tokens, `src/components/primitives/*`, `src/features/*` modules, and Expo Router under `app/`. Preserve all current behavior and visual identity. No feature additions. After each module extraction, run `npm run typecheck` and `npm test` to confirm no regression.

---

## 8. Final state (after all 12 stages)

**Date:** 2026-07-10 (commit `6e2b1dc`)
**Branch:** `cursor/raintank-planner-7a02`

### What was built

| Stage | Description | Tests |
|---|---|---|
| 1 | Baseline audit | 4 |
| 2 | Refactor (1,403 → 187 lines) | 4 |
| 3 | SQLite + 15 tables + 3 repos | 18 |
| 4 | Onboarding flow (4 screens) | 18 |
| 5 | Schedule engine (10 kinds, DST, UI) | 49 |
| 6 | Local notifications + actions + health | 63 |
| 7 | UX flows (med/pet forms, settings, reports, feedback) | 66 |
| 8 | Household + sync outbox + conflict | 85 |
| 9 | Subscriptions (entitlements, StoreKit, paywall) | 96 |
| 10 | Dark theme + i18n + Reduce Motion | 100 |
| 11 | E2E scaffold + release config (partial) | 100 |
| 12 | EAS + PRIVACY + ROADMAP | 100 |
| **Total** | **12/12 stages** | **100/100** |

### Final layout

```
tru/
├── App.tsx                            # 187 lines, state + nav + 12 screens
├── ROADMAP.md                         # next-step priorities
├── PRIVACY.md                         # data + ad policy
├── eas.json                           # EAS build profiles
├── app.json                           # Expo config
├── package.json                       # pawpair-pet-med-tracker@0.7.0
├── docs/
│   ├── AAA-HANDOFF.md                 # 19-section production plan
│   ├── BASELINE-AUDIT.md              # this file
│   ├── market-research.md
│   └── baseline-screenshots/           # 8 visual references
├── assets/                            # pet portraits, app icon
└── src/
    ├── App.tsx
    ├── design/                        # tokens, themes (light+dark), ThemeProvider
    ├── data/                          # SQLite + repositories
    ├── components/                    # AppHeader, BottomNav, Toast, forms, feedback
    └── features/                      # 12 submodules
        ├── schedules/                 # 10 schedule kinds + DST + adapter
        ├── notifications/             # service + bridge + health
        ├── medications/               # multi-step form + menu
        ├── pets/                      # form + menu
        ├── insights/, onboarding/, today/
        ├── household/                 # auth + service + sync outbox + conflict
        ├── subscriptions/             # entitlements + StoreKit + paywall
        ├── settings/, reports/
        └── i18n/, accessibility/
```

### How to continue

See `ROADMAP.md` for the prioritized list. The recommended
30-minute starter is the ThemeProvider + i18n switch in
App.tsx (both are import-and-call changes).

