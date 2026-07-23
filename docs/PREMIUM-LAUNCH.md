# PawPair Premium launch plan

## Offer

- Free: one pet, today's care, core completion, basic reminders and continued access to previously entered health records.
- Premium: unlimited pet profiles and caregiver handoffs. Existing health records, reminders and encrypted portable backups remain available on the free tier.
- Primary package: annual with a seven-day introductory trial.
- Initial price hypothesis: USD 39.99 per year.
- Anchor package: USD 6.99 per month without a trial.
- RevenueCat prices and localized strings always override the design-preview values.
- The paywall never advertises a trial unless RevenueCat reports the current iOS user as eligible. Apple's purchase sheet remains authoritative.

## RevenueCat dashboard

1. Create entitlement `premium`.
2. Create App Store products `app.pawpair.medtracker.premium.annual` and `app.pawpair.medtracker.premium.monthly` in one subscription group.
3. Attach both products to entitlement `premium`.
4. Create offering `default` with annual and monthly packages.
5. Add a seven-day free trial to the annual product in App Store Connect.
6. Enable Billing Grace Period in App Store Connect.
7. Add the public iOS SDK key to `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY`.
8. Build an Expo development build or TestFlight build; Expo Go cannot perform native App Store purchases.
9. In App Store Connect App Privacy, disclose Purchase History for App Functionality and Analytics, not linked to identity and not used for tracking while anonymous IDs remain in use.

## Conversion system

- Value-first entry: a dismissible offer after the first completed care moment.
- Context gates: second pet and care handoff.
- Annual is selected by default, but monthly remains visible to avoid a deceptive forced choice.
- Trial timeline states what opens today, when the reminder appears and the exact renewal price.
- No trial toggle. The trial belongs to the annual App Store package.
- Restore, Terms and Privacy remain visible on the purchase surface.
- If RevenueCat configuration or verified App Store pricing is unavailable, purchase is disabled and no fallback price is shown.

## Experiment sequence

1. Baseline: earned paywall after first care completion plus context gates.
2. Test headline: family organization vs. health confidence.
3. Test annual price: USD 39.99 vs. USD 49.99 while keeping monthly fixed.
4. Test timing: first completion vs. second session.
5. Only after retention is proven, test a post-onboarding hard-paywall variant through a separate RevenueCat offering.

## Metrics

- Paywall view to trial start.
- Download to paid by day 35.
- Trial to paid.
- Day-zero trial cancellation.
- Refund rate.
- Paid retention at day 30 and month 3.
- Conversion by entry point and RevenueCat offering.

The 8-10% paid target is a product target, not a promise. RevenueCat's 2026 report places the median day-35 download-to-paid rate at 10.7% for hard paywalls and 2.1% for freemium. PawPair should only move toward a harder gate if activation and paid retention show that the first-session value is strong enough.
