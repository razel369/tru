# App Store screenshot plan

Apple accepts one to ten screenshots per device class. Images must be PNG or JPEG with no alpha channel.

## Required master sets

- iPhone 6.9-inch portrait: 1260 x 2736, 1290 x 2796, or 1320 x 2868 px
- iPad 13-inch portrait: 2064 x 2752 px
- Apple Watch Ultra 3 portrait: 422 x 514 px

Providing the highest-resolution accepted set lets App Store Connect scale it for smaller devices when the interface is equivalent.

## Current status

The existing generated candidates predate the current care, health, identity, notification and motion work. They are reference material only and must not be uploaded.

Capture the final sets from the exact audited source commit after source lock. The native CI injects a validated showcase state only into the simulator data containers; the production first launch remains empty and user-defined. Do not create another screenshot pass from the web preview or from a historical IPA.

## Five-shot story

1. Home: Milo centered, fully visible and grounded in the room, with no text or navigation covering the companion.
2. Daily plan: meals, walks, water, medication and custom care in a calm chronological rhythm.
3. Health: weight trend and an understandable ongoing/resolved health timeline without medical claims.
4. Pets: Milo and Luna shown only with their exact breed models and consistent proportions.
5. Settings and privacy: local reminders, Apple Watch connection, protected backup and delete controls.

The Apple Watch set uses the same care plan and shows the glanceable Today overview with a real next action. Empty-state captures remain QA evidence, not product-page artwork.

## Capture rules

- Use native iPhone and iPad captures from the final production binary.
- Use the validated Milo and Luna showcase profiles and consistent routine, health and completed-state data across the set.
- Keep notification banners, debug tools, browser chrome, email addresses and other personal information out of frame.
- Do not add marketing claims that are not visible in the app.
- Keep the animal unobstructed, correctly proportioned, sharply rendered and visibly touching the floor in every Home capture.
- Verify every layout independently; never stretch or crop an iPhone capture into an iPad size.
- Confirm native status-bar fidelity, safe areas, bottom navigation clearance and text wrapping on the source device.
- Export without transparency and inspect every file at 100 percent before upload.
