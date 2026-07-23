# PawPair external launch gates

Everything in this file requires access to Apple or RevenueCat. The repository handles the rest.

## 1. Create the two App Store subscriptions

In App Store Connect, open PawPair > Monetization > Subscriptions.

- Create one subscription group named `PawPair Premium`.
- Confirm the latest Paid Applications Agreement is active before testing purchases.
- Create annual product `app.pawpair.medtracker.premium.annual`.
- Create monthly product `app.pawpair.medtracker.premium.monthly`.
- Set the annual and monthly prices for every intended storefront.
- Add a seven-day introductory free trial to the annual product.
- Complete each product's localization and review screenshot.

## 2. Connect RevenueCat

In RevenueCat Product catalog:

- Import both App Store products.
- Create entitlement `premium` and attach both products.
- Create offering `default` with annual and monthly packages.
- Copy the public iOS SDK key that starts with `appl_`.
- Add it to the EAS `production` environment as `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY`.

Never place an App Store private key or RevenueCat secret API key in `.env`.

## 3. Complete App Privacy in App Store Connect

Use [app-store/privacy-label.md](../app-store/privacy-label.md) exactly:

- Purchases > Purchase History
- Used for App Functionality and Analytics
- Not linked to identity
- Not used for tracking
- Identifiers > User ID and Device ID, used for Analytics, not linked and not tracked
- Usage Data > Product Interaction, used for Analytics, not linked and not tracked

## 4. Complete age rating and medical declaration

- Select `Health and wellness topics`.
- Select `Infrequent Medical or Treatment Information` because PawPair organizes medications, symptoms and vaccines without diagnosing or prescribing.
- Do not select Made for Kids.
- With Health & Fitness as the secondary category, declare that PawPair is not a regulated medical device in the EU/EEA, UK or U.S.

## 5. Add the review contact

In App Store Connect App Review Information, enter a reachable name, email and phone number. No demo account is required.

## 6. Enable and protect anonymous analytics authentication

In the PawPair Supabase project only:

- Open Authentication > Sign In / Providers and enable Anonymous Sign-Ins.
- Verify the native opt-in flow creates an anonymous session and the opt-out flow deletes it.
- Add mobile-compatible bot protection before launch. If CAPTCHA is not yet supported by the native flow, keep anonymous sign-up rate limits conservative, monitor Auth growth and define a scheduled cleanup policy for abandoned anonymous users.
- Do not enable a CAPTCHA challenge that the native client cannot complete; that would break analytics opt-in.

## 7. Publish the synchronized legal site

- Deploy `pawpair-site/`.
- Confirm the public Privacy and Terms pages show **Effective July 23, 2026**.
- Confirm the homepage says optional anonymous analytics is off by default.
- Confirm the Privacy page explains retryable cloud deletion and the 45-day raw-event retention window.

## 8. Final TestFlight check

On one physical iPhone and one iPad:

- Buy annual with a fresh sandbox Apple account and confirm the trial in Apple's sheet.
- Confirm unlimited pets and Care handoff unlock.
- Cancel or expire the sandbox subscription and confirm Premium locks again without hiding existing health records.
- Buy monthly with another sandbox account.
- Delete and reinstall, then use Restore purchases.
- Test airplane mode: the paywall must show no fake price and must not start a purchase.

Record PASS or FAIL beside each item. After these pass, the final build can be selected for App Review.
