# ADR-006: Pet Visual System

## Status

Accepted for the design prototype.

## Context

PawPair must represent any dog or cat breed, mixed breeds, and user-defined breeds while keeping every pet grounded in the approved home scene. The current Luna implementation is a one-off integrated image and cannot scale through name-based conditions.

The system must also support a personalized collar engraving, user-specific generated assets, offline-safe fallbacks, and visual upgrades without rewriting the home screen.

## Decision

Use a data-driven visual resolver with four lookup levels:

1. User-specific generated scene (`pet:<id>:scene:<revision>`).
2. Built-in pet asset (`pet:<id>`), used by demo pets.
3. Breed fallback (`breed:<species>:<breed-slug>`).
4. Species or runtime fallback.

Every pet is assigned a body profile. Profiles define normalized scale, width, horizontal anchor, and paw baseline. Final personalized visuals use a full integrated scene, matching Luna's room, light, floor contact, and reserved UI areas. Anchored transparent cutouts are a loading and failure fallback, not the final quality target.

Persist only stable asset keys and generation status on the pet. Keep React Native image sources in the runtime registry so storage remains serializable and remote assets can be cached or revised independently.

## Components

- `pet-breeds.ts`: breed-to-body-profile classification and normalized layout values.
- `registry.ts`: versioned local and downloaded asset registry.
- `resolver.ts`: deterministic personalized, breed, species, and fallback selection.
- `Pet.visual`: serializable identity, status, revision, profile, and engraving metadata.
- `createPetVisualGenerationRequest`: renderer-independent generation contract and quality gates.

## Non-functional requirements

- Switching pets must not trigger network work on the interaction path.
- A missing or failed personalized asset must always resolve to a visible fallback.
- Asset revisions must be replaceable without changing pet records.
- The selected pet's visual, name, breed, and schedule must change atomically.
- Generated scenes must reserve the existing header and medication-card safe areas.
- Final scenes must show the full body with paws visibly touching the same floor plane as Luna.

## Alternatives considered

- One hand-positioned asset per breed: simple initially, but brittle for mixed breeds, coat variants, and user photos.
- Runtime cutout compositing only: cheaper in storage, but shadows, floor contact, and lighting remain visibly inconsistent.
- Generate a complete scene on every switch: visually strong, but slow, expensive, and unusable offline.

## Consequences

- Positive: Any breed or custom value can enter the same pipeline.
- Positive: Personalized scenes can reach Luna quality without special-casing pet names.
- Positive: Breed assets can be added gradually while every pet retains a fallback.
- Negative: Personalized generation is asynchronous and requires caching plus status handling.
- Negative: Full scenes consume more storage than transparent cutouts.

## Failure handling

- `processing`: keep the previous or breed fallback visible.
- `failed`: display the fallback and allow regeneration.
- Missing registry entry: resolve by breed, then species, then supplied runtime image.
- Outdated asset: register a higher revision and invalidate the old cached file after the new asset is ready.
