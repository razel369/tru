# PawPair App Store Screenshots Design Spec (ASO v3)

**Date:** 2026-09-03  
**Status:** Approved by User  
**Target Markets:** English (US / Global App Store)  
**Target Devices:** iPhone 6.9-inch (1320 x 2868) and iPad 13-inch (2064 x 2752)  
**Style Direction:** Modern Premium Apple Style with Continuous Panoramic Flow  

---

## 1. Executive Summary & Problem Statement

PawPair's current App Store graphics (ASO v2 candidates) suffer from low contrast, muddy beige washes (`#FAF6EF`), generic pill banners, and basic card mockups without realistic device frames. In search results on mobile devices, small screenshots fail to communicate value and significantly hurt conversion rates.

This design specification replaces the legacy artwork with a continuous panoramic 5-screen visual narrative designed to maximize App Store click-through and download conversion.

---

## 2. Visual Foundation & Architecture

### 2.1 Continuous Panoramic Backdrop
- **iPhone Master Canvas:** 6,600 x 2,868 px rendered as a seamless panorama, then sliced into five 1,320 x 2,868 px cards.
- **iPad Master Canvas:** 10,320 x 2,752 px rendered as a seamless panorama, then sliced into five 2,064 x 2,752 px cards.
- **Color Transitions across Panorama:**
  1. **Screen 1 (Home & Companion):** Sunrise Coral (`#FF6B55` to `#FFA07A` with warm ivory ground).
  2. **Screen 2 (Daily Care Plan):** Fresh Sage & Eucalyptus (`#2E8B7A` to `#48C6B0` and crisp clean mint).
  3. **Screen 3 (Health Passport):** Deep Royal & Sky Blue (`#1E62C0` to `#4BA3F5` and ice white).
  4. **Screen 4 (186 Breeds):** Warm Honey & Amber (`#D98200` to `#FFBE53`).
  5. **Screen 5 (Privacy & Watch):** Deep Jewel Teal (`#00796B` to `#00A88F`).
- **Flow Elements:** Subtle ambient glow waves and organic light streams cross card boundaries, encouraging users to swipe through the listing.

### 2.2 Titanium iPhone 16 Pro Device Mockup
- Ultra-slim Natural/Black Titanium bezel (~24px visual bezel on 1,320px width).
- Centered Dynamic Island with glass reflections and sensor detailing.
- Precision screen corner radius (~96px to 108px matching iOS 18+ hardware radii).
- Realistic multi-stage drop shadows (diffuse contact shadow + soft ambient blur).
- Screen inset showcasing pristine native app captures (`01-home.png` through `05-settings.png`).

### 2.3 Typography & Contrast Hierarchy
- **Header Font:** `Fraunces_600SemiBold` (classic, warm editorial serif) scaled to 104pt-112pt with crisp letter spacing.
- **Eyebrow Tag:** `Manrope_700Bold` (28pt) styled inside a frosted-glass translucent pill with soft border (`rgba(255,255,255,0.7)`).
- **Subtitle Font:** `Manrope_500Medium` (32pt) in high-contrast charcoal ink (`rgba(26, 38, 46, 0.88)`).

### 2.4 Floating Glassmorphic UI Callouts (3D Depth)
- Semi-transparent acrylic cards (`rgba(255, 255, 255, 0.92)`) with 1px border highlight and 36px drop blur.
- Positioned strategically over or adjacent to the phone bezel to highlight key features even at small App Store preview scales.

---

## 3. Five-Screen Storyboard & Content Matrix

| Screen | Target File | Eyebrow Badge | Headline (Large) | Subtitle Copy | Floating Callout Badges |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **01** | `01-home.png` | `ALL-IN-ONE CARE` | **Never Miss<br>Their Care** | Meals, walks, meds & more — all in one peaceful place. | • `Breakfast • 8:00 AM Done ✓`<br>• `Next: 12:30 PM Park Walk 🐾`<br>• Milo companion avatar |
| **02** | `02-plan.png` | `INTUITIVE ROUTINE` | **One Calm<br>Daily Rhythm** | Effortless routines. Mark care done with a single tap. | • `Joint Support • 1 tab 💊`<br>• `Care Rhythm • 80% On Track` |
| **03** | `03-health.png` | `PET HEALTH PASSPORT` | **Vet-Ready<br>In Seconds** | Weight trends, vaccines, and medical history in your pocket. | • `Vet-Ready • 100% Profile Depth ★`<br>• `Weight Trend: 27.4 kg (-0.3 kg) 📉` |
| **04** | `04-pets.png` | `186 SUPPORTED BREEDS` | **Made For<br>Your Pet** | Handcrafted companion art for dogs & cats that matches your family. | • Breed avatar bubbles (Golden, Sphynx, Dachshund, Frenchie)<br>• `Care Handoff • Share with Sitter ✨` |
| **05** | `05-settings.png` | `PRIVATE & CONNECTED` | **Your Data.<br>Your Control.** | 100% private by design, encrypted backups & Apple Watch support. | • Apple Watch glance complication: `8:00 PM Meds ⌚`<br>• `End-to-End Encrypted • Zero Tracking 🔒` |

---

## 4. Technical Architecture & Implementation Pipeline

### 4.1 Script Location & Stack
- **Engine Script:** `scripts/generate-aso-v3.py`
- **Language / Libraries:** Python 3 + Pillow (`PIL.Image`, `PIL.ImageDraw`, `PIL.ImageFilter`, `PIL.ImageFont`)
- **Assets Directory:**
  - Source captures: `app-store/screenshots/iphone-6.9-final/` and `app-store/screenshots/ipad-13-final/`
  - Companion & sticker assets: `assets/pawpair-milo.png`, `assets/pawpair-luna.png`, `assets/pawpair-sticker-*.png`
  - Output directories:
    - iPhone: `app-store/aso-v3/iphone-6.9/`
    - iPad: `app-store/aso-v3/ipad-13/`
    - Contact sheets: `app-store/aso-v3/iphone-6.9-contact-sheet.png` and `app-store/aso-v3/ipad-13-contact-sheet.png`

### 4.2 Quality & Compliance Gates
1. **Dimensions:**
   - iPhone: Exactly 1320 x 2868 px.
   - iPad: Exactly 2064 x 2752 px.
2. **Channel Format:** 24-bit RGB PNG (Strictly zero alpha channel, guaranteed by `.convert("RGB")` before saving).
3. **Typography Anti-Aliasing:** High-quality FreeType glyph rasterization at 2x supersampling where applicable.
4. **Automated Verification:**
   - `scripts/verify-aso-v3.mjs` verifying dimensions, color space, aspect ratio, file size, and existence of all 5 screenshots per device class.
