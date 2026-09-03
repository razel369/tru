# PawPair

PawPair is a local-first pet care planner for iPhone and iPad. It combines daily routines, health records, encrypted portable backups, local reminders and optional Premium features in one companion-centered experience.

## Quick start

```bash
npm ci
npm run verify:ci
npx expo start
```

Use `npx expo start --web` for a fast layout preview. Notifications, RevenueCat purchases, document sharing, secure storage and final safe-area behavior must be verified in a native iOS build.

## Current verified baseline

- Expo SDK 57 and React Native 0.86
- Expo Doctor: 20/20
- TypeScript strict check: passed
- ESLint: zero warnings
- Tests: 36 files, 184 tests
- Pet motion audit: 201 files, 67 asset sets, zero issues
- SQLite is authoritative for pet-care data
- Anonymous Supabase analytics is optional and off by default
- RevenueCat paywall fails closed when verified App Store pricing is unavailable
- iPhone and iPad targets are configured

The app is not ready to submit until every item in [`docs/FINAL-RELEASE-GATE.md`](./docs/FINAL-RELEASE-GATE.md) passes.

## Commands

```bash
npm run lint
npm run typecheck
npm test
npm run audit:motion-assets
npm run verify:ci
node scripts/verify-launch-readiness.mjs
```

`verify:ci` covers checks that can run without Apple or RevenueCat credentials. `verify-launch-readiness` is the final release gate and intentionally fails while external configuration or App Store assets are missing.

## Architecture

- `App.tsx`: app entry, fonts, theme, safe-area and error boundaries
- `src/features/care`: active Home, Plan, Quick Add, Health and Pets experience
- `src/data/database`: SQLite schema, migrations and recovery
- `src/features/notifications`: local iOS reminder scheduling and actions
- `src/features/subscriptions`: RevenueCat products, entitlement cache and paywall
- `src/features/analytics`: consented anonymous Supabase analytics
- `src/features/settings`: legal documents, encrypted backup and account deletion
- `src/features/pet-motion`: exact breed motion packs and validation
- `supabase`: migrations and the authenticated delete-account Edge Function
- `app-store`: App Store metadata, review notes and screenshot sources

## Privacy and safety

- Pet profiles, care routines, health records and medical files remain local.
- Product analytics is off until explicit consent and excludes pet or health content.
- Disabling analytics must confirm cloud deletion before local retry identity is removed.
- Portable backups are encrypted with a user-selected password.
- PawPair is an organizer and reminder tool, not veterinary advice or a medical device.

See [`PRIVACY.md`](./PRIVACY.md) and [`TERMS.md`](./TERMS.md).

## Release documentation

- [`docs/FINAL-RELEASE-GATE.md`](./docs/FINAL-RELEASE-GATE.md): single go/no-go checklist
- [`docs/LAUNCH-OWNER-TASKS.md`](./docs/LAUNCH-OWNER-TASKS.md): Apple, RevenueCat and Supabase owner actions
- [`docs/APP-SIZE-STRATEGY.md`](./docs/APP-SIZE-STRATEGY.md): IPA and asset-size gate
- [`docs/PREMIUM-LAUNCH.md`](./docs/PREMIUM-LAUNCH.md): products, offering and paywall behavior
- [`docs/ANALYTICS-OPERATING-GUIDE.md`](./docs/ANALYTICS-OPERATING-GUIDE.md): analytics verification and queries

Support: raz@rmalk.co.il
