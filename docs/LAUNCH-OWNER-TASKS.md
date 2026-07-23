# PawPair external launch gates

Everything in this file requires access to Apple or RevenueCat. The repository handles the rest.

## Verified on July 23, 2026

- EAS production contains the RevenueCat iOS public SDK key.
- RevenueCat offering `default` returns the annual and monthly PawPair packages.
- Supabase anonymous sign-in, consented analytics insertion and account deletion pass against production.
- Supabase limits anonymous sign-ins to 30 per hour per IP and runs a daily 30-day abandoned-user cleanup.
- The public Privacy, Terms, Support and homepage deployment is current.
- App Store Connect still requires an interactive Apple sign-in before the remaining Apple-side fields can be audited or changed.

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
- Confirm entitlement `premium` is attached to both products. The live
  offering and product identifiers are already verified.
- The EAS `production` environment already contains
  `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY`.

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

- Anonymous Sign-Ins are enabled.
- The production service path creates a consented analytics identity, accepts an allowlisted event and deletes the account. Repeat opt-in and opt-out on the exact final binary.
- The current mobile-safe abuse policy is 30 anonymous sign-ins per hour per IP, restrictive RLS for non-analytics tables, and daily cleanup of abandoned anonymous users older than 30 days.
- Do not enable a CAPTCHA challenge that the native client cannot complete; that would break analytics opt-in.

## 7. Publish the synchronized legal site

- `pawpair-site/` is deployed to `https://pawpair-site.vercel.app/`.
- The public Privacy and Terms pages show **Effective July 23, 2026**.
- The homepage says optional anonymous analytics is off by default.
- The Privacy page explains retryable cloud deletion and the 45-day raw-event retention window.

## 8. Final TestFlight check

On one physical iPhone and one iPad:

- Buy annual with a fresh sandbox Apple account and confirm the trial in Apple's sheet.
- Confirm unlimited pets and Care handoff unlock.
- Cancel or expire the sandbox subscription and confirm Premium locks again without hiding existing health records.
- Buy monthly with another sandbox account.
- Delete and reinstall, then use Restore purchases.
- Test airplane mode: the paywall must show no fake price and must not start a purchase.

Record PASS or FAIL beside each item. After these pass, the final build can be selected for App Review.
