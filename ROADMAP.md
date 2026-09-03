# PawPair — Roadmap to App Store

The repository is at commit `1dcabac` on `cursor/raintank-planner-7a02`.
Production surface is on disk; the last 12 stages ship foundation,
engine, UX, household, sync, conflict, subscriptions, a11y,
i18n, and release config. The next priorities are below.

## Priority 1 — Quick wins (< 1 hour each)

These are small, surgical changes the next engineer can land
without holding the rest of the codebase in their head.

1. **README.md**: one-paragraph product description, the demo
   script, a single screenshot from `docs/baseline-screenshots/`,
   and a "Run locally" block that copies the relevant commands.
   ~15 minutes.

2. **CHANGELOG.md**: copy the 29 commit messages into a
   Keep-a-Changelog file with the stage headings. 30 min.

3. **Visual regression baseline**: capture
   `docs/baseline-screenshots/*.png` for every screen in
   `src/features/*` by running the web bundle in headless
   Chromium and saving the rendered DOM. The commits ship
   stage-specific screenshots (Today, Onboarding, AfterStage*)
   but not for the 7 new screens. 30 min.

4. **Terms of service**: copy the privacy structure into a
   short Terms file (no-advice disclaimer, refund policy,
   Family Sharing rules, account deletion). 20 min.

5. **Dark theme wiring in App.tsx**: wrap the App in
   `ThemeProvider` from `src/design/ThemeProvider.tsx`. The
   provider is built and the dark palette is defined; the
   host never imported it. 5 minutes.

6. **i18n switch in App.tsx**: read the device locale via
   `Intl.DateTimeFormat` resolved through `expo-localization`,
   then `setLocale(he | en)` from `src/features/i18n/i18n.ts`.
   5 minutes.

## Priority 2 — Real backends (4 to 6 hours)

7. **Supabase project**: create the project, copy the env
   vars, set `EXPO_PUBLIC_SUPABASE_URL` and
   `EXPO_PUBLIC_SUPABASE_ANON_KEY` in `.env.local`. The
   client already exports `household` and `syncOutbox` modules
   with a swappable backend; the only work is `makeSupabaseAuth`
   and `makeSupabaseOutbox` adapters. ~2 hours.

8. **Supabase schema**: paste the tables from
   `src/data/database/schema-v1.sql.ts` into a Supabase
   migration. Add the RLS policies called out in
   `docs/AAA-HANDOFF.md §5`. ~1 hour.

9. **EAS Build profiles**: `eas.json` is in place; the next
   step is to run `eas build --profile production` on iOS and
   Android, then `eas submit`. Apple requires a Privacy
   Manifest; the `PRIVACY.md` file is the source. ~2 hours.

10. **StoreKit production**: install `expo-iap` or move to
    RevenueCat, wire `makeStoreKitBackend()` in App.tsx, and
    replace the swappable stub. Sandbox test plan per
    `docs/AAA-HANDOFF.md §9`. ~3 hours.

## Priority 3 — Polish (1 to 2 hours each)

11. **Accessibility audit**: open the app on a real iPhone,
    turn on VoiceOver, and verify every interactive control
    has a label. The 5-tab bottom nav is the biggest risk
    because the icons are decorative. ~2 hours.

12. **Visual regression with image diffing**: commit
    `docs/baseline-screenshots/` as the baseline. Add a
    Playwright job that diffs each render against the
    baseline. ~2 hours.

13. **Long-press menu wiring**: MedicationCard and PetMenu
    exist but the only long-press wiring is the navigation
    handler; the sheet itself is not yet mounted. The host
    needs to render `<MedicationMenu visible ... />` and
    `<PetMenu visible ... />` as overlays from the same
    handlers. ~30 min.

14. **Schedule editor wiring**: ScheduleEditor reads the
    `times` field and shows Pause. Wire it from the
    medication edit screen with a callback that toggles a
    `paused` flag on the medication. Add a migration to
    `medications.paused` in the schema. ~1 hour.

15. **Conflict banner in Today**: the conflict detector and
    the banner component exist. Wire `detectConflict` from
    `logDose` and show `ConflictBanner` when the result is
    non-null. ~45 min.

## Priority 4 — Future features (1+ day each)

16. **Universal-link household invites**: replace the
    in-memory invite token with a real Supabase function
    that signs a JWT. The short-code path stays for offline
    signups. ~1 day.

17. **Refill forecasting** (Plus tier): compute days-of-supply
    per medication from the dose log and emit a notification
    when below threshold. ~1 day.

18. **Backup and restore** (Plus tier): JSON export/import
    round-trip. The export side ships in stage 7e; the
    import side is the new code. ~1 day.

19. **iPad layout**: the current screens assume a phone
    width. A simple two-column split (Today on the left,
    Schedule / Insights on the right) is enough to satisfy
    Apple. ~1 day.

20. **Apple Watch companion**: the notification service
    already exposes `recordDelivery()`. The watch app would
    live in a separate Expo project and call into the
    iOS-side shared module. ~3 days.

## Recommended first commit

If you have 30 minutes today, do priority 1 item 5
(ThemeProvider) plus item 6 (i18n switch). That closes the
two open switches in App.tsx and lands the smallest
user-visible change the repository can ship.

## How to run

```bash
cd C:\Users\rmalk\Projects\tru
npm install
npm test
npx expo start --web
```

The web bundle boots at `http://localhost:8081`. The first
launch goes through the onboarding welcome screen. The
bottom nav has five tabs: Today, Pets, +, Insights, Health.
Health now surfaces the navigation to Settings, Household,
and the Paywall.
