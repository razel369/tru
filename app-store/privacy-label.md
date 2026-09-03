# App Privacy and rating answers

## App Privacy

Select `Yes, we collect data from this app` because PawPair offers optional anonymous product analytics and RevenueCat processes purchase history for PawPair Premium.

Declare:

- Data type: `Purchases` > `Purchase History`
- Purposes: `App Functionality` and `Analytics`
- Linked to identity: `No`
- Used for tracking: `No`
- Data type: `Identifiers` > `User ID`
- Purposes: `Analytics`
- Linked to identity: `No`
- Used for tracking: `No`
- Data type: `Identifiers` > `Device ID`
- Purposes: `Analytics`
- Linked to identity: `No`
- Used for tracking: `No`
- Data type: `Usage Data` > `Product Interaction`
- Purposes: `Analytics`
- Linked to identity: `No`
- Used for tracking: `No`

Product analytics is off by default and begins only after the user explicitly opts in. PawPair sends an anonymous Supabase user ID, installation ID, app/platform metadata and allowlisted interaction events. It never sends pet names, breeds, care notes, health records, medical attachments, contact details or free text. Turning analytics off removes that installation and its events from PawPair's analytics project.

The purchase answer assumes PawPair continues using RevenueCat's anonymous App User ID, does not call `logIn`, does not attach email/name/phone customer attributes, and does not enable advertising or attribution integrations. Revisit the answer before enabling any such feature.

Pet profiles, care routines, health records, medical attachments and contact details are processed only on the device and are not collected by PawPair or RevenueCat. User-directed exports and file selections are not uploaded to PawPair.

## Privacy manifest

- `NSPrivacyTracking`: false
- App-level collected data types: `User ID`, `Device ID`, `Product Interaction` and `Purchase History`; all are non-tracking and not linked to identity.
- The final signed IPA must be audited for RevenueCat's SDK privacy manifest and aggregate privacy report.
- File timestamps: `C617.1`, used by local app storage and file-management dependencies
- User defaults: `CA92.1`, used for preferences and local reminder state
- System boot time: `35F9.1`, used by React Native timing dependencies

## Permissions and system access

- Notifications: optional local care reminders; requested contextually after opt-in
- Files: only files explicitly selected through the system document picker
- Camera, Photos, Location, Contacts, Microphone, Bluetooth and HealthKit: not requested

## Age rating

Expected Apple global result: `13+`, subject to App Store Connect's current questionnaire and regional calculation.

- Health and wellness topics: `Yes`
- Medical or Treatment Information: `Infrequent`, because PawPair organizes user-entered medications, symptoms, vaccines and appointments but does not diagnose, prescribe or recommend treatment
- Advertising, messaging, social media, gambling, contests, unrestricted web access and user-generated social content: `No`
- Made for Kids: `No`
- Override to a higher rating: `Not Applicable`

Because `Health & Fitness` is the secondary category, complete Apple's Regulated Medical Devices declaration for the EU/EEA, UK and U.S. Select that PawPair is not a regulated medical device in each region. PawPair does not diagnose, prevent, monitor or treat disease and does not interface with regulated medical hardware.

## Medical and export compliance

- PawPair is not a regulated medical device and does not diagnose, monitor or treat animals.
- `ITSAppUsesNonExemptEncryption` is false. Confirm it in the final signed IPA.
