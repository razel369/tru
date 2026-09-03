# PawPair onboarding and pet presentation audit

Audit date: 2026-07-24  
Viewport: 390 × 844  
Scope: onboarding, first home, pet framing, breed selection, settings switches,
and touch/blink behavior.

## Outcome

The launch flow now reaches a concrete first win before exposing the full product.
Pet canvases share one measured framing system, the add/edit breed picker no
longer depends on input focus, native-looking switches are consistent, and eye
overlays render as one synchronized plane.

## Before

1. The welcome message was abstract and asked for analytics consent before value
   was demonstrated.
2. Onboarding contained five stages, six care-focus choices with three defaults,
   and a Premium decision before the first home.
3. The first home exposed six tasks, progress, next-up, add, and five tabs at once.
4. Breed art used profile multipliers plus inconsistent transparent canvas bounds.
5. Twenty-five idle assets contained detectable chroma on alpha edges; twelve
   retained color in fully transparent pixels.
6. The add/edit breed list was an inline focus-driven menu inside a ScrollView.
7. Two independent eye clips could be interrupted while the native driver was
   committing a touch reaction.

Evidence:

- `01-welcome-before.png`
- `02b-cat-default-before.png`
- `04-focus-before.png`
- `05-premium-before.png`
- `06-first-home-before.png`

## After

1. Onboarding is four stages: promise, identity, essential details, first win.
2. Analytics remains available in Settings; Premium is not a gate to first value.
3. The first home reveals one context-relevant task under “Start here”. The full
   plan appears after the first completion.
4. Sixty-eight pet keys now use generated alpha-bound measurements for subject
   height, center, and floor alignment.
5. All 66 displayed idle cutouts pass the chroma-edge audit.
6. Add/edit breed selection uses a full-screen searchable FlatList and closes only
   through an explicit close or selection.
7. Both eyes render through one tight overlay plane, and touch no longer cancels
   a blink mid-frame.

Evidence:

- `07-welcome-after.png`
- `08-cat-normalized-after.png`
- `09-dog-normalized-after.png`
- `11-ready-after.png`
- `12-first-home-after.png`
- `14-breed-picker-after.png`
- `15-switches-after.png`
- `17-blink-touch-after.png`
- `20-yorkshire-clean-after.png`

## Health

| Area | Before | After |
| --- | --- | --- |
| First-run clarity | Poor | Good |
| Cognitive load | Poor | Good |
| Pet proportions | Inconsistent | Measured and normalized |
| Chroma integrity | Failing | 66/66 passing |
| Breed picker stability | Fragile | Stable in browser flow |
| Switch consistency | Mixed native rendering | Unified component |
| Blink/touch compositing | Race-prone | Single synchronized plane |

## Verification

- ESLint: passed
- TypeScript: passed
- Vitest: 185/185 passed
- Motion assets: 201 files, 0 issues
- Chroma audit: 66 files, 0 issues
- Expo Doctor: 20/20 passed
- Browser journey: onboarding, first home, edit pet, breed search and selection,
  Settings switches, and blink-during-touch inspected at 390 × 844

## Remaining native gate

The browser verifies layout and behavior logic but cannot replace a physical iOS
pass for keyboard presentation, native notification permission, haptics, modal
transitions, GPU compositing, and performance. A new iOS build should be treated
as the next candidate only after that device matrix passes.
