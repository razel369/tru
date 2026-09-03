# PawPair App Store Screenshots v3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate modern, high-converting, premium App Store promotional screenshots (iPhone 6.9" and iPad 13") featuring a continuous panoramic gradient flow, iPhone 16 Pro titanium bezels, and 3D floating glass feature badges.

**Architecture:** A Python Pillow script (`scripts/generate-aso-v3.py`) renders an ultra-wide continuous panoramic master canvas for iPhone (6600x2868) and iPad (10320x2752). It draws titanium device mockups, embeds verified production captures, layers floating glassmorphism feature cards and companion stickers, slices into individual 24-bit RGB store assets, and outputs contact sheets. A Node.js verifier (`scripts/verify-aso-v3.mjs`) validates App Store compliance.

**Tech Stack:** Python 3, PIL (Pillow), Node.js, TrueType Fonts (Fraunces & Manrope).

## Global Constraints

- iPhone Screenshot Size: Exactly 1320 x 2868 px per screen (5 screens).
- iPad Screenshot Size: Exactly 2064 x 2752 px per screen (5 screens).
- Color Format: Strictly 24-bit RGB PNG (Zero alpha channel).
- Font Families: `Fraunces_600SemiBold.ttf` for headlines, `Manrope_700Bold.ttf` for eyebrows/chips, `Manrope_500Medium.ttf` for subtitles.
- Source Images: `app-store/screenshots/iphone-6.9-final/` and `app-store/screenshots/ipad-13-final/`.

---

### Task 1: Panoramic Gradient & Frame Rendering Engine

**Files:**
- Create: `scripts/generate-aso-v3.py`
- Test: Verify basic gradient generation and Titanium frame output.

**Interfaces:**
- Produces: `generate_panoramic_background(width, height, stops)`, `draw_device_frame(canvas, x, y, w, h, screen_img, radius, is_phone)`, `draw_floating_badge(canvas, x, y, w, h, title, subtitle, icon_img)`

- [ ] **Step 1: Write helper functions for smooth multi-stop horizontal gradient interpolation**

```python
def create_panoramic_base(width: int, height: int, color_stops: list[tuple[float, tuple[int, int, int]]]) -> Image.Image:
    # Interpolates across width smoothly between color stops
    ...
```

- [ ] **Step 2: Implement Titanium iPhone 16 Pro device frame rendering**
- Outer bezel with rounded corner geometry
- Dynamic Island pill centered at the top
- Screen area inset with subtle glass glint and soft inner edge
- Multi-layer diffuse ambient shadow beneath the frame

- [ ] **Step 3: Implement floating glassmorphism card drawer**
- Rounded rectangle with `rgba(255, 255, 255, 235)` fill
- 1px crisp white highlight stroke
- Crisp text rendering using Manrope Bold and Medium

- [ ] **Step 4: Run smoke test for Task 1 helpers**

Run: `python3 -c "import scripts.generate_aso_v3"`
Expected: Imports successfully without syntax errors.

- [ ] **Step 5: Commit**

```bash
git add scripts/generate-aso-v3.py
git commit -m "feat(aso): add panoramic canvas and titanium mockup frame engine"
```

---

### Task 2: Implement the 5-Screen Storyboard & Compositing

**Files:**
- Modify: `scripts/generate-aso-v3.py`
- Test: Composite all 5 screens on the master panorama.

**Interfaces:**
- Consumes: Production captures from `app-store/screenshots/iphone-6.9-final/` and assets from `assets/`
- Produces: Complete master panorama image (6600 x 2868) with all 5 screens, headlines, device frames, and floating badges.

- [ ] **Step 1: Define screen configurations in `scripts/generate-aso-v3.py`**
- Screen 1: "Never Miss Their Care" + Sunrise Coral + Breakfast done chip + Park walk chip + Milo avatar
- Screen 2: "One Calm Daily Rhythm" + Sage Mint + Joint Support pill chip + 80% On Track progress
- Screen 3: "Vet-Ready In Seconds" + Royal Blue + Health Passport 100% badge + Weight Trend chip
- Screen 4: "Made For Your Pet" + Amber Gold + Breed bubbles + Care Handoff chip
- Screen 5: "Your Data. Your Control." + Jewel Teal + Watch glance complication + Encrypted Zero Tracking badge

- [ ] **Step 2: Render headlines, eyebrows, and typography with high contrast**
- Draw frosted glass eyebrow pill
- Draw two-line Fraunces 600 SemiBold headline
- Draw Manrope Medium subtitle

- [ ] **Step 3: Composite device mockups and floating badges at exact coordinates**
- Place each phone mockup at calculated horizontal offsets: `i * 1320 + offset_x`
- Add floating glass chips overlapping phone borders for 3D depth

- [ ] **Step 4: Verify compositing executes without errors**

Run: `python3 scripts/generate-aso-v3.py --preview`
Expected: Preview generation completes and reports dimensions.

- [ ] **Step 5: Commit**

```bash
git add scripts/generate-aso-v3.py
git commit -m "feat(aso): implement 5-screen panoramic storyboard composition"
```

---

### Task 3: Automated Slicing, iPad Adaptation & Clean RGB-24 Export

**Files:**
- Modify: `scripts/generate-aso-v3.py`
- Test: Verify output directories `app-store/aso-v3/iphone-6.9/` and `app-store/aso-v3/ipad-13/`.

**Interfaces:**
- Produces:
  - Five 1320x2868 PNGs in `app-store/aso-v3/iphone-6.9/`
  - Five 2064x2752 PNGs in `app-store/aso-v3/ipad-13/`
  - `app-store/aso-v3/iphone-6.9-contact-sheet.png`
  - `app-store/aso-v3/ipad-13-contact-sheet.png`

- [ ] **Step 1: Implement precision slicing loop for iPhone (1320 x 2868)**
- Slice `01-never-miss-care.png` through `05-private-control.png`
- Convert to RGB (guarantee zero alpha channel)

- [ ] **Step 2: Implement iPad 13" layout adaptation (2064 x 2752)**
- Scale panoramic gradient to 10320 x 2752
- Embed iPad captures (`ipad-13-final/01-home.png` etc.) into iPad Pro frame
- Slice into five 2064 x 2752 RGB PNGs

- [ ] **Step 3: Generate unified contact sheets for rapid visual review**
- Downsample and assemble side-by-side contact sheet for immediate inspection

- [ ] **Step 4: Run full generation pipeline**

Run: `python3 scripts/generate-aso-v3.py`
Expected: 10 screenshots + 2 contact sheets generated in `app-store/aso-v3/`.

- [ ] **Step 5: Commit**

```bash
git add scripts/generate-aso-v3.py
git commit -m "feat(aso): add iPad generation, slicing, and contact sheet output"
```

---

### Task 4: Automated Verification Script & Visual QA

**Files:**
- Create: `scripts/verify-aso-v3.mjs`
- Test: Run verification check on all output files.

**Interfaces:**
- Consumes: Output files in `app-store/aso-v3/`
- Produces: CLI exit code 0 on PASS, 1 on FAIL with detailed error list.

- [ ] **Step 1: Write `scripts/verify-aso-v3.mjs` to validate App Store requirements**
- 5 files in `app-store/aso-v3/iphone-6.9/` with dimensions 1320x2868
- 5 files in `app-store/aso-v3/ipad-13/` with dimensions 2064x2752
- Ensure NO alpha channel in any of the PNGs
- Minimum file size > 500KB (ensures uncorrupted render)

- [ ] **Step 2: Run verification script**

Run: `node scripts/verify-aso-v3.mjs`
Expected: PASS - All 10 screenshots and contact sheets verified.

- [ ] **Step 3: Visual inspection via Read tool**
- Inspect `iphone-6.9-contact-sheet.png` and `ipad-13-contact-sheet.png` to confirm stunning visual quality.

- [ ] **Step 4: Commit**

```bash
git add scripts/verify-aso-v3.mjs app-store/aso-v3
git commit -m "feat(aso): complete ASO v3 screenshot set and verification gate"
```
