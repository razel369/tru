# PawPair App Store package

This directory contains the release copy, App Store Connect answers and signed-artifact evidence for PawPair 1.0.0.

## Current release state

- Platform: iPhone and iPad
- Version: 1.0.0
- Bundle ID: app.pawpair.medtracker
- EAS project: @razellll/pawpair-pet-med-tracker
- Distribution: App Store
- Submission candidate: none while source and visual QA continue
- Historical build: build 7 uploaded, superseded, and not eligible for review
- Historical signed IPA audit: build 7 passed 27 of 27 checks
- Native iPhone and iPad QA: pending on the final build
- Current ASO artwork: iPhone Model B prepared at 1320x2868; final iPhone and iPad captures must be replaced from the final binary

Build 7 no longer contains the current source and must not be selected for App Review. Keep submission frozen. Create one replacement production build only after source QA is complete, then audit and test that exact binary before screenshots or review submission.

## Files

- metadata.en-US.json: product-page copy and App Store fields
- review-notes.md: reviewer instructions and test path
- privacy-label.md: App Privacy, age-rating and privacy-manifest answers
- screenshot-plan.md: required sizes, shot list and capture gates
- release-evidence.json: current source readiness and submission-gate state
- ipa-audit-build7.json: signed IPA contents, privacy, provisioning and native-module evidence
- ipa-backup-evidence-build7.json: encrypted backup and restore evidence from the signed bundle
- ipa-audit-build6.json: historical comparison evidence only

## Last verified source evidence

The following results predate the current universal-layout, analytics-consent and branding changes. They must be rerun before the final build and are not current release evidence.

- TypeScript: PASS
- Tests: 33 files and 172 tests PASS
- Expo Doctor: 20 of 20 checks PASS
- Motion assets: 67 runtime packs, 201 PNG assets, zero audit issues
- Expo dependency compatibility: PASS
- Production dependency audit: zero high or critical findings; 12 moderate Expo build-toolchain findings have no safe nonbreaking upgrade path

## Build 7 signed IPA evidence

- EAS build ID: f8859acc-d82b-4bc9-9e3f-1ebc7195fa95
- Fingerprint: d4a3885fc378b93e956d85edce77f20d55e0f0b1
- Result: PASS, 27 of 27 checks
- Apple distribution profile: App Store, production, no development devices
- Device families: iPhone and iPad only
- Orientation: iPhone portrait-only; iPad supports portrait and adaptive landscape
- Notification capability: production entitlement present; no background remote-notification mode
- Privacy: historical binary had no tracking or collected data; it does not represent the current optional analytics declaration
- Native modules: notifications, document picker, file system and sharing linked
- Portable backup: format, encrypted-password copy, restore path and sensitive-data warning present in the signed bundle

## Remaining submission sequence

1. Finish source, functional and visual QA while submission remains frozen.
2. Create one final replacement production build after QA passes.
3. Audit and complete native iPhone and iPad QA on that exact binary.
4. Capture fresh native iPhone and 13-inch iPad screenshots from the validated final binary.
5. Confirm the App Store Connect record, numeric Apple ID and review contact phone number.
6. Upload the final build and audited screenshots, complete privacy and age-rating answers, then submit only after explicit approval.
