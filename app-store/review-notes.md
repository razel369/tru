# App Review notes

PawPair is a local-first pet care and health-history organizer for iPhone and iPad. No account or sign-in is required, and the core app remains usable without a purchase.

## Suggested free path

1. Create a dog named `Atlas`, breed `Great Dane`, date of birth `2022-05-14`.
2. On Home, review the daily plan and complete a care moment.
3. Open Plan to add or edit a meal, walk, water, medication or custom routine.
4. Open Health to add weight, vaccine, symptom or appointment information.
5. Open Pets to switch companions or edit the active profile.
6. Open Settings to enable optional local reminders, create an encrypted portable backup, restore a selected backup or delete local data.

## PawPair Premium

- Entitlement: `premium`
- Annual product: `app.pawpair.medtracker.premium.annual`
- Monthly product: `app.pawpair.medtracker.premium.monthly`
- Premium unlocks unlimited companion profiles and caregiver handoff tools.
- Open the Premium screen from the sparkle button in Pets, by attempting to add a second pet, or by opening Care handoff while on the free tier.
- Localized duration, renewal price and verified trial eligibility are loaded from the App Store through RevenueCat. If no verified offering loads, purchasing is disabled rather than showing a fallback price.
- `Restore purchases`, `Terms` and `Privacy` remain visible on the paywall.

## Privacy and permissions

- Pet profiles, routines, health records, attachments and reminder state remain in the app sandbox.
- Anonymous product analytics is optional, off by default and controlled from onboarding and Settings. It includes only allowlisted interaction events and anonymous installation identifiers; it never includes pet-care or health data.
- RevenueCat processes anonymous purchase history for subscription functionality, fraud prevention and subscription analytics. It does not receive pet-care data.
- There is no advertising or cross-app tracking.
- Notifications are local and optional. File selection, backup and sharing are user-initiated system actions.
- PawPair is not a veterinary or emergency service.

The internal Motion Lab is development-only and excluded from the production interface. Reduce Motion is respected for nonessential companion animation.
