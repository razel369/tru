# PawPair App Privacy Checklist

Last audited: July 22, 2026

This checklist matches the current PawPair implementation and privacy policy:

- Pet profiles, routines, health records, attachments, veterinarian details, reminders, backups, and exports stay on the device or leave only through an explicit iOS share/export action.
- Anonymous product analytics is off by default and starts only after consent.
- RevenueCat uses anonymous App User IDs. PawPair does not attach an email address, name, phone number, or other real-world identity.
- PawPair has no advertising SDK, IDFA use, data broker sharing, or cross-app tracking.

## App Store Connect Answers

Select **Yes, we collect data from this app**.

Select only these data types:

| Data type | Purposes | Linked to identity | Used for tracking |
| --- | --- | --- | --- |
| Purchases > Purchase History | Analytics; App Functionality | No | No |
| Identifiers > User ID | Analytics; App Functionality | No | No |
| Identifiers > Device ID | Analytics | No | No |
| Usage Data > Product Interaction | Analytics | No | No |

Do not select Contact Info, Health & Fitness, Financial Info, Location, Sensitive Info, Contacts, User Content, Browsing History, Search History, Diagnostics, Surroundings, Body, or Other Data.

## Why These Answers Are Accurate

**Purchase History** covers RevenueCat receipt validation, entitlement delivery, fraud prevention, subscription status, and subscription analytics.

**User ID** covers the anonymous RevenueCat App User ID and anonymous Supabase analytics user ID.

**Device ID** covers the random installation identifier used only after analytics consent. It is not IDFA and is not used for advertising.

**Product Interaction** covers allowlisted screen views, onboarding progress, and purchase-flow outcomes sent only after analytics consent.

The collected data is not linked to a real-world identity because PawPair has no named account, does not collect contact information, and uses anonymous service identifiers. None of the data is used for tracking.

## URLs

- Privacy Policy URL: `https://pawpair-site.vercel.app/privacy/`
- User Privacy Choices URL: `https://pawpair-site.vercel.app/privacy/`
- Support URL: `https://pawpair-site.vercel.app/support/`

## Re-audit Triggers

Revisit these answers before submission if PawPair adds login, cloud sync, user-uploaded media, crash reporting, advertising, attribution, location, contacts, email collection, or any new analytics event containing free text or pet-care content.

## Sources

- Apple App Privacy Details: https://developer.apple.com/app-store/app-privacy-details/
- Apple Manage App Privacy: https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy/
- RevenueCat Apple App Privacy: https://www.revenuecat.com/docs/platform-resources/apple-platform-resources/apple-app-privacy
- PawPair Privacy Policy: https://pawpair-site.vercel.app/privacy/
