# PawPair App Store package

This directory contains the release copy, App Store Connect answers and signed-artifact evidence for PawPair 1.0.0.

## Current release state

- Platform: iPhone and iPad
- Version: 1.0.0
- Bundle ID: app.pawpair.medtracker
- EAS project: @razellll/pawpair-pet-med-tracker
- Distribution: App Store
- Submission candidate: Build 27 from commit `25d28cc9ed3452ad394a73bd9ff7139f02ea31bb`
- Apple upload: accepted and processing under submission `8cb1f7ae-c226-4c57-847b-5088a9b9ec6f`
- Historical builds: all builds through Build 25 are superseded and must not be selected for App Review
- Signed IPA audit: Build 27 passes archive, signature, privacy, RevenueCat and Apple Watch checks
- Native QA: iPhone, iPad and Apple Watch pass from the same source commit; deterministic blink and repeated-touch stability pass
- Current ASO artwork: five branded iPhone screenshots at 1320x2868 and five branded iPad screenshots at 2064x2752 pass the automated verifier

Build 27 is the only current submission candidate. Keep review submission frozen until Apple finishes processing the binary and App Store Connect account, privacy, age-rating, subscription and review-contact gates are verified.

## Files

- metadata.en-US.json: product-page copy and App Store fields
- review-notes.md: reviewer instructions and test path
- privacy-label.md: App Privacy, age-rating and privacy-manifest answers
- screenshot-plan.md: required sizes, shot list and capture gates
- release-evidence.json: current source readiness and submission-gate state
- ipa-audit-build27.json: current signed IPA, native QA, RevenueCat, Watch and Apple-upload evidence
- eas-production-build.json: exact current build, commit, artifact and checksum
- ipa-audit-build7.json: historical signed IPA contents, privacy, provisioning and native-module evidence
- ipa-backup-evidence-build7.json: encrypted backup and restore evidence from the signed bundle
- ipa-audit-build6.json: historical comparison evidence only

## Last verified source evidence

- TypeScript: PASS
- Tests: 47 files and 231 tests PASS
- Expo Doctor: 20 of 20 checks PASS
- Motion assets: 68 active runtime packs, 201 PNG assets, zero audit issues
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

1. Wait for Apple to finish processing Build 27 and verify it appears in TestFlight.
2. Confirm agreements, banking, tax, App Privacy, age rating, regulated-medical-device answers, subscriptions and review contact in App Store Connect.
3. Upload the five audited iPhone and five audited iPad screenshots.
4. Select Build 27 for version 1.0.0.
5. Run the final gate again and submit for review only when every blocking check passes.
