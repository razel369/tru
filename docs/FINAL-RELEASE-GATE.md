# PawPair Final Release Gate

This is the single go/no-go checklist for the first public iPhone and iPad release.
Do not create or upload another release build until every pre-build item is complete.

## Current verified baseline

- The combined `npm run verify:ci` gate passed end to end.
- ESLint passed with zero warnings.
- TypeScript check passed.
- Expo Doctor passed 20/20 checks.
- Test suite passed 36/36 files and 185/185 tests.
- Pet-motion audit passed for 201 files and 67 asset sets.
- The last recorded production-style iOS export completed with 1,225 modules and 258 exported assets. Repeat this measurement on the final build because the asset set has changed.
- iPhone and iPad support is enabled, including iPad multitasking and all required orientations.
- The privacy manifest declares the analytics, identifiers, product interaction, and purchase-history use.
- Analytics is opt-in, contains no pet or health content, has a 45-day raw-event retention window, and keeps daily aggregate rollups.
- Supabase is active and healthy. Anonymous sign-in, consented analytics insertion, insert-only event access and account deletion passed a disposable production smoke test. The smoke identity and rows were removed.
- Anonymous Auth is limited to 30 sign-ins per hour per IP. A daily 30-day abandoned-user cleanup is active, and restrictive RLS prevents anonymous analytics identities from writing future household or care-sync tables.
- The synchronized privacy, terms, support and homepage are live at `pawpair-site.vercel.app` with the July 23 copy and security headers.
- The EAS production environment contains the RevenueCat iOS public SDK key. RevenueCat's live public API returns offering `default` with the monthly and annual PawPair product identifiers.
- The PawPair app icon and public-site branding are installed.
- Five final iPhone 6.9-inch App Store screenshots exist.
- Local quality checks run in `.github/workflows/quality.yml`.
- The automated launch verifier passes 28 of 33 checks. Its five remaining failures are the final branded iPad screenshots.

## Pre-build gates

- [x] Enable Anonymous Sign-ins in the PawPair Supabase project.
- [x] Approve the 30-per-hour-per-IP anonymous sign-up limit, restrictive cloud-sync RLS and daily 30-day abandoned-user cleanup. Recheck Auth growth after launch.
- [ ] Confirm one real analytics event reaches Supabase after explicit in-app consent.
- [ ] Confirm analytics opt-out and full account deletion succeed from a physical device; also verify the retry state during a forced network failure.
- [ ] Verify RevenueCat entitlement `premium` is attached to both products. Offering `default` is already live.
- [x] Attach `app.pawpair.medtracker.premium.annual` and `app.pawpair.medtracker.premium.monthly` to the default offering.
- [x] Set the production RevenueCat iOS public SDK key in the EAS production environment.
- [ ] Verify the annual product is $39.99/year with a one-week introductory trial.
- [ ] Verify the monthly product is $6.99/month without a trial.
- [ ] Accept the App Store Connect Paid Applications Agreement and complete banking and tax setup.
- [ ] Complete App Privacy using the declarations in `app-store/privacy-label.md`.
- [ ] Complete the age-rating questionnaire with a target of 13+ unless App Store Connect calculates otherwise.
- [ ] Declare that PawPair is not a regulated medical device in every required storefront region.
- [ ] Add review contact details and the notes in `app-store/review-notes.md`.
- [ ] Confirm the support, privacy, and terms URLs in App Store Connect.
- [x] Deploy `pawpair-site/` and confirm the live Privacy and Terms pages show **Effective July 23, 2026**.

Service-level analytics and account deletion have passed against production.
The two remaining analytics checkboxes intentionally require the exact final
binary on physical devices.

## One final build only

After every pre-build gate is complete:

1. Create one production EAS iOS build with build-number auto-increment enabled.
2. Install that exact build on a physical iPhone and a physical iPad.
3. Test first launch, onboarding, breed search, pet switching, care creation/completion, notifications, premium purchase, restore, analytics consent, and account deletion.
4. Capture the final five iPad 13-inch screenshots from that exact build.
5. Generate the branded iPad App Store set with `scripts/generate-ipad-model-b-aso.py`.
6. Run `node scripts/verify-launch-readiness.mjs` and require every check to pass.
7. Inspect the final IPA and App Store device variants using `docs/APP-SIZE-STRATEGY.md`.
8. Upload the same verified build to App Store Connect.

## Submission gates

- [ ] No clipped text or hidden controls on the smallest supported iPhone.
- [ ] No stretched, floating, or incorrectly grounded pet on iPhone or iPad.
- [ ] Breed search remains open and usable with the iOS keyboard visible.
- [ ] Bottom navigation respects the safe area and never covers primary content.
- [ ] Repeated pet taps do not blur, overlap, or queue animations.
- [ ] Notification permission is requested only in context and denial does not block the app.
- [ ] Purchase and restore use the real products and activate the `premium` entitlement.
- [ ] Premium messaging matches the actual shipped benefits.
- [ ] Account deletion removes or anonymizes cloud data as described in the privacy policy.
- [ ] All five iPhone and all five iPad screenshots match the submitted build.
- [ ] Final device variants meet the size gate.
- [ ] App Store Connect reports no missing compliance, privacy, subscription, screenshot, or agreement fields.

## Public release

Use manual release after App Review. Perform a final production smoke test on the approved build before making it publicly available. Do not replace the approved binary unless a release-blocking defect is found.
