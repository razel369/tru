/**
 * In-app Privacy Policy text for Settings.
 * Keep aligned with the public policy used in App Store Connect.
 */
export const PRIVACY_POLICY = `PawPair Privacy Policy

Last updated: July 23, 2026

PawPair is a local-first pet care planner for iPhone and iPad. This policy describes the current release.

1. Information stored on your device
PawPair stores the information you choose to enter, including:
- Pet names, species, breeds, ages and visual preferences
- Care routines, schedules, completion history and caregiver notes
- Medication and appointment care moments
- Health records, weight entries, symptoms, vaccine details and vet visits
- Medical documents or images you attach
- Optional veterinarian, emergency contact, microchip, diet and allergy details
- App preferences, including whether local reminders are enabled

The app stores this care information inside its iOS app sandbox. PawPair does not upload pet profiles, care routines, health records, medical files, contact details or backup contents for product analytics.

2. Optional anonymous product analytics
Analytics is off by default. If you explicitly enable it, PawPair creates an anonymous Supabase user and installation identifier and may send:
- App version, platform, locale and time zone
- Anonymous screen and feature events
- Onboarding, reminder, backup and subscription-flow events
- Normalized reliability events without free text

Analytics never includes pet names, breeds, care content, medication details, health information, medical files, contact information or backup contents. PawPair does not use advertising SDKs, track you across other companies' apps or websites, sell personal information or use analytics for targeted advertising.

You can turn analytics off in Settings at any time. PawPair only confirms removal after Supabase accepts deletion of the installation record. If the service is temporarily unavailable, the app keeps the local deletion identity and asks you to try again so it can complete the cloud deletion.

3. Local notifications
If you grant notification permission, PawPair asks iOS to schedule reminders on your device. A reminder can include a pet name and care title. You can turn reminders off in PawPair or revoke notification permission in iOS Settings. Delivery is controlled by iOS and is not guaranteed.

4. Sharing and exports
PawPair only shares information when you start an export or use the iOS share sheet. Available actions include:
- A portable .pawpair backup containing your care data and included medical files
- A vet brief as text or PDF
- An individual medical attachment

Portable backups created by the current release are encrypted with a password you choose before export. PawPair does not store, transmit or recover that password. A backup cannot be restored without it. Anyone who obtains both the backup and its password may be able to read the included pet, health and contact information, so keep both private and separate. PawPair can still restore compatible legacy backups that were created before encrypted export was introduced. Deleting data from PawPair does not delete copies you previously exported or shared.

5. Retention and deletion
Local information remains on the device until you remove a record, remove a pet, use Settings > Delete account and data, or uninstall the app. Raw consented analytics events are retained for up to 45 full UTC days. Aggregated metrics that no longer contain event-level records may be retained longer to understand product performance.

Settings > Delete account and data removes the anonymous PawPair cloud account, PawPair-controlled analytics identifiers and events, the local database, medical attachments, preferences and compatible legacy PawPair storage from that device. The app does not clear local care data until the active cloud account deletion succeeds or it verifies that no PawPair cloud account exists. This action cannot be undone unless you previously created a backup. It does not delete copies you exported, Apple's transaction records or records Apple must retain. App Store purchases can be restored through Apple after deletion.

6. Support messages
If you contact support by email, your email provider sends the message and any information you choose to include. PawPair does not automatically attach your care data or medical files.

7. Premium subscriptions and RevenueCat
If you view, purchase or restore PawPair Premium, RevenueCat processes an anonymous app user identifier, product and offering identifiers, purchase receipts, subscription status, store, platform and limited device or app metadata needed to validate and manage the subscription. Apple processes the payment and App Store account information. PawPair does not send pet profiles, care routines, health records, medical files, contact details or backup contents to RevenueCat.

RevenueCat acts as PawPair's subscription infrastructure provider. Its processing is governed by RevenueCat's privacy terms. Apple processes App Store purchases under Apple's own privacy policy.

RevenueCat retains subscription records as needed to validate purchases, prevent fraud and provide subscription analytics. To request deletion of PawPair-controlled subscription data, contact raz@rmalk.co.il. Apple may retain transaction records under its own legal and accounting obligations.

8. Supabase and other third parties
Supabase provides the anonymous authentication and optional analytics database. It processes the anonymous user identifier, installation identifier and the limited analytics fields described above. RevenueCat and Apple process subscription information as described in section 7. PawPair does not send care data to advertising partners. Apple may process App Store, device backup, crash or diagnostic information under Apple's own terms and privacy policies when you use Apple services or choose to share diagnostics with Apple.

9. Children
PawPair is intended for adult pet caregivers and is not directed to children under 13.

10. Veterinary disclaimer
PawPair organizes information and reminders. It does not diagnose, treat or provide veterinary advice. Contact a licensed veterinarian for medical decisions and seek emergency veterinary care when an animal is in distress.

11. Changes
If a future release adds care-data cloud sync, advertising or other data practices, this policy and the App Store privacy disclosure will be updated before those practices go live.

12. Contact
Privacy questions: raz@rmalk.co.il
`;
