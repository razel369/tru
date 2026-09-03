# PawPair App Size Strategy

## Current evidence

- The production-style iOS export is approximately 190 MB.
- The export contains 258 runtime assets.
- Source pet-motion assets are approximately 463 MB; Expo includes only referenced runtime assets in the export.
- Apple permits iOS and iPadOS apps up to 4 GB uncompressed, but App Store device variants above 200 MB receive an over-cellular-download warning.

An Expo export is not the final IPA and is not an App Store-thinned device variant. The release decision must use the final binary evidence, not the source-folder size.

## Version 1 decision

Keep the exact breed assets bundled for the first release. This preserves offline behavior, visual consistency, and animation timing. Do not move breed packs to remote delivery before measuring the final IPA and App Store variants.

## Final size gate

After the single final production build:

1. Record the compressed IPA size.
2. Record the uncompressed installed size.
3. Inspect App Store Connect build metadata for iPhone and iPad device-variant sizes.
4. If every important device variant is at or below 200 MB, ship the bundled architecture.
5. If a device variant exceeds 200 MB, do not submit until the asset plan below is applied and measured again.

## Reduction order if required

Apply reductions in this order so PawPair does not lose visual quality unnecessarily:

1. Remove duplicate and unreachable generated frames.
2. Re-encode oversized PNG assets losslessly or with visually verified near-lossless settings.
3. Share identical transition frames across breeds.
4. Keep the active pet and onboarding packs bundled; download inactive breed packs after selection.
5. Add a versioned asset manifest, checksum validation, retry behavior, cache limits, and a bundled fallback before enabling remote packs.

## Remote-pack acceptance criteria

- A selected pet must never disappear because of network failure.
- The app must always retain at least one complete bundled pet pack.
- Pack downloads must be resumable and checksum-verified.
- Old packs must be evicted by least-recently-used policy without deleting the active pack.
- Analytics may record pack ID, byte count, duration, and result, but never pet name or health/care data.
- App Review must be able to use all core care features without waiting for optional packs.

## Evidence to archive

Store the final IPA size, installed size, device-variant sizes, asset count, and the output of the launch verifier with the release record. This becomes the baseline for every later breed or animation expansion.
