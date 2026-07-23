# Pet motion asset system

## Scale strategy

Every breed gets one production-quality transparent `idle.png` asset. Breathing,
weight shift, touch response, care response, entrance, and time-of-day pacing are
procedural and shared by every breed.

Only optional expression plates are generated after the base asset is approved:

- `blink.png`: same canvas, pose, lighting, collar, tag, and silhouette; eyes closed only.
- `blink-half.png`: same canvas with eyelids at the exact halfway position.
- `attention.png`: same canvas and grounded feet; a very small attentive head change.
- `happy.png`: same canvas and grounded feet; a restrained happy expression.
- `sleepy.png`: personalized tier only unless product data justifies wider coverage.

This creates three delivery tiers:

1. `base`: one transparent pet asset plus the shared procedural engine.
2. `expressive`: base plus blink, attention, and happy plates for common breeds.
3. `personalized`: a generated pack tied to the user's actual pet.

## File contract

```text
assets/pet-motion/<pet-key>/idle.png
assets/pet-motion/<pet-key>/blink.png
assets/pet-motion/<pet-key>/attention.png
assets/pet-motion/<pet-key>/happy.png
assets/pet-motion/<pet-key>/sleepy.png
```

All frames in a pack must be `1024x1536`, use native transparency, preserve the
same full-body scale and canvas coordinates, and keep the paws on the same pixel
row. No background, floor, shadow, text, watermark, sticker, prop, or crop is
allowed. The shared stage supplies the room and contact grounding.

## Base extraction prompt

```text
Use case: background-extraction
Asset type: full-body mobile pet animation base plate
Primary request: isolate the exact pet from the input image as a clean full-body cutout on a native transparent background
Input image: Image 1 is the identity, breed, coat, face, collar, tag, proportions, pose, and lighting reference
Composition: centered portrait canvas with generous padding; preserve the complete ears, fur, paws, and tail; paws aligned to a consistent ground row
Constraints: preserve identity and anatomy exactly; preserve the collar and tag; native transparent background; no floor; no cast shadow; no contact shadow; no reflection; no text; no watermark
Avoid: room fragments, furniture, checkerboard backgrounds, green fringe, white halo, cropped fur, changed face, changed coat color, changed pose
```

## Expression edit prompt

```text
Use case: precise-object-edit
Asset type: aligned pet animation expression plate
Primary request: create <STATE> by changing only <EXACT MICRO EXPRESSION>
Input image: Image 1 is the approved transparent idle plate and must remain pixel-aligned
Constraints: preserve the exact canvas, full-body position, paw row, silhouette, anatomy, coat, collar, tag, lighting, transparency, and all unchanged pixels; native transparent background; no shadow; no text; no watermark
Avoid: body movement, scale change, crop change, identity drift, background pixels, extra limbs, changed accessories
```

## Built-in generation path

Pet plates are generated with the built-in image model on a flat chroma-key
background, so this workflow does not require an API key. The generated source
is copied into `tmp/imagegen/`, then converted locally with:

```powershell
python "$HOME/.codex/skills/.system/imagegen/scripts/remove_chroma_key.py" `
  --input tmp/imagegen/<pet-key>-<state>-chroma.png `
  --out assets/pet-motion/<pet-key>/<state>.png `
  --auto-key border `
  --soft-matte `
  --transparent-threshold 12 `
  --opaque-threshold 220 `
  --despill `
  --edge-contract 1
```

The CLI true-transparency route remains an optional fallback only when a specific
fur or feather asset cannot pass edge QA through the built-in chroma workflow.

## Approved pilot assets

- Shared stage: `assets/pet-motion/stages/warm-room-v1.png`
- Luna idle: `assets/pet-motion/pet-luna/idle-v2.png`
- Luna half blink: `assets/pet-motion/pet-luna/blink-half.png`
- Luna blink: `assets/pet-motion/pet-luna/blink.png`
