# PawPair — AAA Completion Handoff

Audience: the next autonomous AI engineering agent.

Purpose: take the current polished prototype to a production-complete,
App-Store-ready pet medication product without losing its visual identity.

## 1. North star

PawPair must answer one question faster and more reliably than any competitor:

> Has this pet already received this dose, and who gave it?

The product should feel calm, affectionate, precise, and unmistakably native to
iOS. It is not a generic pet diary and must not grow into one. Medication
coordination, adherence, supply, and vet-ready history are the core.

Success requires all of the following:

1. A new user understands the value from the first screen in under five
   seconds.
2. A caregiver can confirm a dose in one deliberate action.
3. Two caregivers cannot silently double-log the same scheduled dose.
4. The app remains useful offline and reconciles safely when connectivity
   returns.
5. Every major state has intentional design: loading, empty, partial, error,
   offline, conflict, success, overdue, paused, and completed.
6. VoiceOver, Dynamic Type, Reduce Motion, color contrast, and 44-point touch
   targets work throughout.
7. No emoji is used anywhere in the product UI, metadata, notifications, or
   generated reports.
8. PawPair never recommends medication, changes a dose, diagnoses a condition,
   or replaces veterinary advice.

## 2. Current repository state

### What already exists

- Expo 57 / React Native 0.86 / React 19 TypeScript application.
- Browser and iOS-compatible bundle.
- Original generated assets:
  - `assets/pawpair-milo.png`
  - `assets/pawpair-luna.png`
  - `assets/pawpair-icon.png`
- Fraunces display typography and Manrope UI typography.
- Native blur and haptic packages.
- Today timeline with given, skipped, due, upcoming, and missed states.
- Caregiver-attributed dose logging.
- Multi-pet profiles and medication inventory display.
- Insights presentation.
- Functional local add-medication flow.
- AsyncStorage persistence.
- Four unit tests for schedule basics.
- Product and market rationale in `docs/market-research.md`.

### What is still prototype-only

- `App.tsx` is a large monolith containing navigation, screens, state, and the
  visual system.
- Milo, Luna, medications, weekly statistics, and caregivers are demo data.
- Only simple fixed daily times are supported.
- AsyncStorage is not an adequate relational or transactional data store.
- There is no authentication, household, invitation, backend, or real sync.
- There are no production local notifications or notification actions.
- There is no robust inventory transaction history.
- There is no edit, pause, archive, delete, undo, snooze, or PRN workflow.
- The Profile tab is intentionally non-functional.
- Reports, subscriptions, privacy controls, onboarding, settings, and support
  are presentation concepts only.
- There are no component, integration, notification, sync, migration, visual
  regression, or end-to-end tests.
- There is no EAS build/release configuration.

Do not mistake a successful bundle for a finished application.

## 3. Non-negotiable design direction

### Brand attributes

- Calm, not clinical.
- Cute, not childish.
- Premium, not decorative.
- Trustworthy, not alarmist.
- Native iOS, not a responsive website inside a phone.

### Existing visual language to preserve

- Midnight navy for trust and focus.
- Coral for the primary action and attention.
- Sage for completion and safety.
- Butter yellow for warmth.
- Warm cream surfaces rather than sterile white.
- Fraunces for emotional display moments only.
- Manrope for navigation, labels, controls, data, and body text.
- Original pet portraits instead of emoji, stock photos, or remote placeholders.

### Design rules

1. Use an 8-point spacing grid with 4-point optical exceptions.
2. Keep one clear primary action per screen.
3. Use SF Symbols-compatible vector iconography through Ionicons only where a
   custom asset is not meaningful.
4. Use blur as a material, not decoration. Keep text contrast valid when
   transparency is disabled.
5. Use haptics for confirmation, warnings, destructive actions, and selection;
   never on every tap.
6. Motion must explain state change. Prefer spring-based 180–320 ms transitions
   and respect Reduce Motion.
7. Never encode medication state using color alone.
8. Never place critical copy below an image or animation that may fail.
9. Pet portraits must share the same lighting, crop, material, and background
   system. Future generated portraits require a user confirmation step.
10. All controls need pressed, disabled, loading, error, and VoiceOver states.

## 4. Required product architecture

Refactor before adding major features.

### Target structure

```text
app/
  _layout.tsx
  (tabs)/
    today.tsx
    pets.tsx
    insights.tsx
    profile.tsx
  medication/
    new.tsx
    [id].tsx
  pet/
    new.tsx
    [id].tsx
  household/
    invite.tsx
    members.tsx
  onboarding/
    index.tsx
src/
  components/
    primitives/
    medication/
    pets/
    feedback/
  features/
    auth/
    households/
    medications/
    schedules/
    doses/
    inventory/
    notifications/
    reports/
    subscriptions/
  data/
    database/
    repositories/
    sync/
  design/
    colors.ts
    typography.ts
    spacing.ts
    motion.ts
    shadows.ts
  lib/
  types/
  validation/
```

Use Expo Router unless a concrete incompatibility is proven. Keep screens thin:
screens compose feature components and call feature hooks; they do not own
business rules.

### Local data

Use `expo-sqlite` as the durable source of truth. AsyncStorage should retain
only lightweight preferences and onboarding flags.

Required tables:

- `users`
- `households`
- `household_members`
- `pets`
- `pet_photos`
- `medications`
- `medication_schedules`
- `schedule_times`
- `scheduled_doses`
- `dose_events`
- `inventory_transactions`
- `refill_reminders`
- `notification_registrations`
- `sync_outbox`
- `sync_metadata`

Every schema change requires a numbered migration and migration test. Never
silently discard prototype data; provide a v2 import path or an explicit
development-only reset.

### Data semantics

- Store identifiers as UUIDs.
- Store instants as UTC ISO timestamps.
- Store a schedule timezone separately.
- Store wall-clock schedule times separately from generated instants.
- Treat dose history as append-only events.
- Corrections create superseding events; they do not mutate history invisibly.
- Inventory changes are ledger transactions, not a directly edited counter.
- A scheduled dose must have a deterministic occurrence key.
- Enforce one active terminal event per occurrence at both local and server
  layers.

## 5. Backend and household sync

Use Supabase unless repository or product constraints require another backend.
It provides Postgres constraints, row-level security, realtime updates, storage,
and Edge Functions without inventing a custom server.

### Authentication

- Support Sign in with Apple.
- Allow a local-only trial before account creation.
- Explain why an account is needed only when the user enables caregiver sync,
  backup, or a paid household feature.
- Support account deletion from inside the app.
- Never require pet health data for analytics or advertising.

### Household model

- An owner creates a household.
- Members join through an expiring universal link or short invite code.
- Roles: owner, caregiver, viewer.
- Permission checks must exist in Postgres RLS, not only in the client.
- Revoked members lose access immediately after sync.
- Audit member joins, removals, and role changes.

### Conflict and double-dose prevention

This is the most important engineering invariant.

1. A dose action writes locally immediately.
2. It enters an idempotent sync outbox.
3. The server accepts the event only against the expected occurrence version.
4. A unique constraint prevents duplicate terminal events for the same
   occurrence.
5. Realtime broadcasts the accepted event to other caregivers.
6. If two people act concurrently, the second receives a designed conflict
   screen showing who logged the dose and when.
7. The user may cancel their pending action or intentionally add a correction;
   the app must never overwrite silently.

Test this using two independent clients and forced offline/reconnect scenarios.

## 6. Medication scheduling engine

Replace the fixed `times: string[]` model with an explicit schedule model.

Required schedule types:

- Daily at one or more times.
- Selected weekdays.
- Every N hours.
- Every N days.
- Weekly or monthly.
- Date-bounded temporary course.
- Taper with phases.
- Cycle schedule: days on / days off.
- PRN / as-needed logging with minimum-interval warning.
- Paused medication.

Required edge cases:

- Daylight-saving transitions.
- User travel across timezones.
- Leap day and month boundaries.
- Dose time edits after occurrences exist.
- Late and early completion windows.
- Duplicate local notification prevention.
- Medication archived while reminders are pending.
- Device clock changed manually.

Use property-based or table-driven tests for recurrence generation. UI code must
never calculate recurrence itself.

## 7. Notifications

Use `expo-notifications`.

Required behavior:

- Request permission only after the user creates the first schedule and sees
  the benefit.
- Schedule locally so reminders work offline.
- Notification actions: Given, Snooze, Skip.
- Deep-link to the exact occurrence.
- Reschedule after medication edits, timezone changes, and app upgrades.
- Show an in-app notification health screen when permissions are disabled.
- Never claim Critical Alerts unless the Apple entitlement is actually granted.
- Use neutral notification copy that does not expose sensitive medication names
  when discreet mode is enabled.

Notification registration and cancellation must be idempotent and fully tested.

## 8. Complete UX flows

### Onboarding

1. Brand moment with the real PawPair icon.
2. Explain shared confirmation, not a list of generic features.
3. Create the first pet with photo or generated portrait.
4. Add the first medication from veterinary instructions.
5. Preview the next scheduled dose.
6. Ask for notifications contextually.
7. Offer caregiver invite after value is established.

Provide Skip and local-only paths. Do not present a paywall before the first
working care plan.

### Today

- Chronological multi-pet timeline.
- Sticky day selector.
- Clear completed, due, upcoming, overdue, skipped, paused, and PRN states.
- One-tap action followed by a short undo window.
- Long-press or overflow menu for notes, reschedule, skip reason, and correction.
- Offline and syncing indicators that do not dominate the screen.
- Empty-day state with useful next action.
- Pull to refresh only when sync exists; do not fake it.

### Add/edit medication

- Pet, name, form, dosage text, veterinary instructions, schedule, start/end
  date, food note, inventory, refill lead time, discreet notification setting.
- Use a native step flow rather than one long form.
- Validate progressively and preserve unfinished drafts.
- Medication and dosage remain user-entered records, never recommendations.
- Support prescription photo attachment but do not extract instructions with
  unreviewed AI.

### Pets

- Add/edit/archive pet.
- Camera or photo-library portrait with crop.
- Medication list, active/paused state, supply health, and next dose.
- Weight, breed, age, and vet details are optional.
- Deleting a pet requires export/archive choices and a destructive confirmation.

### Insights

- Compute real adherence from occurrence and event data.
- Explain denominator and excluded/skipped doses.
- Week/month/custom range.
- Per-pet and per-medication filters.
- Supply forecast based on ledger and schedule.
- Avoid gamifying medically necessary treatment with guilt or punitive streaks.

### Reports

- Generate a professional PDF locally.
- Include pet, medication plan, dose history, adherence definition, notes, and
  date range.
- Clearly label user-entered data.
- Redact caregiver details when requested.
- Preview before share.
- Verify pagination, long medication names, Dynamic Type, and non-English text.

### Profile/settings

- Account and household.
- Notification diagnostics.
- Appearance: system/light/dark.
- Accessibility and Reduce Motion behavior.
- Privacy export and account deletion.
- Subscription management.
- Help, contact, terms, privacy, app version.

## 9. Subscription implementation

Use StoreKit 2 through RevenueCat or an equally maintained abstraction.

Suggested entitlement:

Free:

- One pet.
- Two active medications.
- Core reminders.
- Thirty days of history.

PawPair Plus:

- Unlimited pets and medications.
- Household caregiver sync.
- Full history.
- Advanced schedules.
- Reports.
- Backup and restore.
- Refill forecasting.

Rules:

- The core dose confirmation experience must remain trustworthy when free.
- Never block access to previously entered health records after a subscription
  expires.
- Restore purchases must be visible.
- Paywall copy must state terms and renewal clearly.
- Test StoreKit sandbox purchase, restore, expiration, billing retry, refund,
  offline entitlement cache, and Family Sharing policy.

## 10. AAA component system

Build and document reusable components before multiplying screens:

- `PPButton`: primary, secondary, tonal, destructive, icon-only.
- `PPCard`: plain, elevated, glass, attention.
- `PPPetAvatar`: local/generated/photo variants and fallback monogram.
- `PPDoseCard`: every dose state and density.
- `PPStatusBadge`.
- `PPTimeline`.
- `PPBottomSheet`.
- `PPToast` with undo.
- `PPEmptyState`.
- `PPErrorState`.
- `PPSkeleton`.
- `PPProgressRing`.
- `PPFormField`.
- `PPSegmentedControl`.
- `PPDateStrip`.
- `PPSyncIndicator`.

Create a private design-gallery screen available in development builds. It must
render every component, state, color scheme, and Dynamic Type size. This becomes
the fastest visual regression surface.

## 11. Motion and sound

- Use Reanimated for state transitions that native layout animation cannot
  express cleanly.
- Dose completion: card state morph, check confirmation, subtle success haptic.
- Undo: keep the card visually reversible until the undo window closes.
- Tab transitions remain restrained.
- Avoid continuous ambient animation on the Today screen.
- No celebratory confetti for medical adherence.
- Do not add sound by default.

All motion requires Reduce Motion behavior and must not delay task completion.

## 12. Accessibility and localization

### Accessibility acceptance

- VoiceOver reads dose time, pet, medication, dosage, status, and action in a
  meaningful order.
- Actions have explicit labels such as “Mark Carprofen for Milo as given.”
- Dynamic Type works through accessibility sizes without clipping.
- Bold Text and Increase Contrast remain legible.
- Reduce Transparency has an opaque material fallback.
- Reduce Motion removes nonessential transitions.
- Touch targets are at least 44 × 44 points.
- Contrast meets WCAG AA.
- Screen-reader focus moves correctly after sheets, errors, and confirmation.

### Localization architecture

- Move every user-facing string out of components.
- Start with English but make layout safe for German, French, Spanish,
  Portuguese, Japanese, and right-to-left languages.
- Use locale-aware dates, times, pluralization, numbers, and measurement units.
- Never concatenate translated sentence fragments.
- Generated reports use the selected app locale.

## 13. Privacy, safety, and security

- Write a data inventory before backend work.
- Collect only data required for the feature.
- Encrypt transport and rely on platform encryption at rest.
- Store tokens in SecureStore, never AsyncStorage.
- Apply RLS tests for every Supabase table.
- Remove pet image metadata before upload.
- Add rate limits to invites and report generation.
- Redact sensitive values from logs and crash reports.
- Provide in-app export and deletion.
- Complete Apple privacy nutrition labels from actual behavior.
- Add a clear record-keeping disclaimer in onboarding, settings, medication
  forms, and reports without repeating it on every card.

Do not add medication interaction checking, dose calculation, AI diagnosis, or
“safe to give” claims.

## 14. Testing strategy

### Unit

- Recurrence and occurrence generation.
- DST/timezone behavior.
- Status calculation.
- Adherence denominator.
- Inventory ledger.
- Validation.
- Conflict resolution.
- Subscription feature gating.

### Integration

- SQLite migrations.
- Repository transactions.
- Outbox retry and idempotency.
- Supabase RLS.
- Notification scheduling/cancellation.
- Account creation/deletion.
- Invite acceptance/revocation.
- PDF generation.

### Component

- Every dose state.
- Dynamic Type.
- VoiceOver labels.
- Light/dark/high-contrast variants.
- Loading, empty, error, and offline states.

### End to end

- First launch to first completed dose.
- Create pet and medication.
- Notification action logs the correct occurrence.
- Two caregivers attempt the same dose.
- Offline log then reconnect.
- Edit schedule across DST.
- Low inventory to refill.
- Generate and share report.
- Purchase, restore, expire, and cancel Plus.
- Export and delete account.

Use deterministic clocks and seeded fixtures. Never make tests depend on the
real current time.

### Visual regression

Capture at minimum:

- iPhone SE-sized viewport.
- Current standard iPhone viewport.
- Largest iPhone viewport.
- Light and dark modes.
- Default and accessibility Dynamic Type.
- English and a long-string locale.
- Every design-gallery state.

Compare screenshots intentionally; do not approve broad baseline churn.

## 15. Performance budgets

- No visible blank screen after native launch.
- Today screen should render from local SQLite before network sync.
- Avoid loading full-size portrait assets into small avatars.
- Paginate long history and reports.
- Keep expensive charts off the initial Today path.
- Memoize schedule derivation by date and source revision.
- Profile real devices, not only the browser.
- Audit image, font, and vector-icon bundles before release.
- Import only the icon/font assets actually used.

## 16. Release engineering

- Add `eas.json` with development, preview, and production profiles.
- Add environment validation with no secrets committed.
- Configure bundle identifiers, versioning, signing, associated domains, Sign
  in with Apple, universal links, notifications, and privacy manifests.
- Add CI for install, typecheck, lint, unit tests, integration tests, Expo
  Doctor, and production export.
- Run real-device iOS testing for notifications, haptics, blur, keyboard,
  background transitions, timezone changes, and memory.
- Prepare App Store screenshots from real product states, not mockups that the
  app cannot reproduce.
- Validate `PawPair` trademark and App Store name availability before final
  metadata lock.
- Run an Apple Search Ads discovery test before assuming keyword volume.

## 17. Required implementation order

Do not build everything in one unreviewable pass.

1. Baseline audit and screenshots; document existing behavior.
2. Refactor design tokens, primitives, feature modules, and routing without
   changing behavior.
3. Introduce SQLite schema, migrations, repositories, and deterministic clocks.
4. Replace demo data with onboarding and real local CRUD.
5. Build the complete schedule engine and test edge cases.
6. Implement local notifications and notification diagnostics.
7. Finish Today, medication, pets, history, insights, reports, and settings
   flows including all non-happy states.
8. Add authentication, household model, RLS, sync outbox, and conflict UX.
9. Add subscription entitlements and StoreKit testing.
10. Complete accessibility, localization, dark mode, and Reduce Motion.
11. Add end-to-end, visual, migration, sync, and release tests.
12. Configure EAS, privacy, App Store assets, and production observability.

At each step:

- Keep the app runnable.
- Add tests with the feature.
- Capture relevant screenshots.
- Commit one logical change.
- Push and update the pull request.
- Do not hide failed validation in a later batch.

## 18. Definition of done

The app is complete only when:

- No demo-only data or fake analytics remain in production paths.
- Every visible control performs a complete action or is removed.
- The Today flow works offline, online, and through a sync conflict.
- Notifications work from scheduled delivery through action handling.
- Household invitations and revocation work across two real devices.
- Schedule generation passes timezone and DST tests.
- Inventory derives from transactions and reconciles after corrections.
- Reports contain accurate, localizable data.
- Purchases, restore, expiration, and account deletion are verified.
- VoiceOver and accessibility Dynamic Type pass on every core screen.
- Dark mode and Reduce Motion are intentional.
- No emoji, stock placeholder, remote demo image, or unlicensed asset appears.
- Expo Doctor, typecheck, unit, integration, E2E, visual regression, and
  production iOS build pass.
- Privacy policy, terms, support, data export, deletion, and App Store privacy
  disclosures match actual implementation.
- A fresh user can install, onboard, create a medication, receive a reminder,
  confirm the dose, invite a caregiver, and export a report without developer
  intervention.

## 19. Starter prompt for the next AI agent

```text
You are completing PawPair, an Expo/React Native shared pet medication tracker.
Read docs/AAA-HANDOFF.md, docs/market-research.md, README.md, and the current
implementation before editing. Treat docs/AAA-HANDOFF.md as the acceptance
contract.

First audit the repository and run the existing app. Capture baseline iPhone
screenshots and report concrete gaps against the handoff. Then execute the
"Required implementation order" sequentially. Do not perform a big-bang
rewrite, do not use emoji, do not add remote placeholder assets, and do not
introduce medication advice or dosage calculation.

Preserve PawPair's original pet portraits, app icon, midnight/coral/sage/butter
palette, Fraunces/Manrope typography, warm premium tone, and native iOS feel.
Refactor the monolithic prototype into tested feature modules before adding
backend complexity. Keep the app runnable, commit each logical phase, push it,
and maintain the pull request. A phase is complete only when its acceptance
criteria and proportional tests pass.

Begin with baseline audit and architecture refactor. Continue autonomously until
the complete Definition of Done is satisfied or a definitive external
authentication/account blocker is reached.
```
