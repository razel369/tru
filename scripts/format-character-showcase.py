#!/usr/bin/env python3
"""
PawPair App Store Character-First Showcase Formatter
Scales, frames, and exports the 5 generated character screenshots into official
App Store Connect dimensions for iPhone 6.9" (1320x2868) and iPad 13" (2064x2752),
strictly in 24-bit RGB PNG format without alpha.
"""

from pathlib import Path
from PIL import Image

SOURCE_DIR = Path("/Users/raz/.cursor/projects/empty-window/assets")
PROJECT_ROOT = Path("/Users/raz/Documents/Codex/2026-08-19/new-chat-3/work/pawpair-release")
OUTPUT_BASE = PROJECT_ROOT / "app-store" / "character-showcase"

IPHONE_DIR = OUTPUT_BASE / "iphone-6.9"
IPAD_DIR = OUTPUT_BASE / "ipad-13"

IPHONE_DIR.mkdir(parents=True, exist_ok=True)
IPAD_DIR.mkdir(parents=True, exist_ok=True)

SCREENS = [
    {
        "src": "pawpair_screen1_golden_milo.png",
        "name": "01-golden-milo-daily-care.png",
        "title": "Never Miss Their Care (Golden Retriever)",
    },
    {
        "src": "pawpair_screen2_frenchie_routine.png",
        "name": "02-frenchie-smart-routine.png",
        "title": "One Calm Daily Rhythm (French Bulldog)",
    },
    {
        "src": "pawpair_screen3_siamese_health.png",
        "name": "03-siamese-health-passport.png",
        "title": "Vet-Ready In Seconds (Siamese Cat)",
    },
    {
        "src": "pawpair_screen4_breeds_personalization.png",
        "name": "04-dachshund-186-breeds.png",
        "title": "Made For Your Exact Pet (186 Breeds)",
    },
    {
        "src": "pawpair_screen5_pomeranian_privacy_watch.png",
        "name": "05-pomeranian-privacy-watch.png",
        "title": "Your Data. Your Control. (Pomeranian & Watch)",
    },
]

def make_vertical_gradient(top_color: tuple[int, int, int], bot_color: tuple[int, int, int], target_size: tuple[int, int]) -> Image.Image:
    """Ultra-fast vertical gradient creation via 1x2 image scaling."""
    grad = Image.new("RGB", (1, 2))
    grad.putpixel((0, 0), top_color)
    grad.putpixel((0, 1), bot_color)
    return grad.resize(target_size, Image.Resampling.BILINEAR)

def fit_to_canvas(image: Image.Image, target_size: tuple[int, int]) -> Image.Image:
    """
    Fits image to target dimensions while maintaining aspect ratio,
    seamlessly extending top and bottom background tones if necessary.
    """
    target_w, target_h = target_size
    target_aspect = target_w / target_h
    img_aspect = image.width / image.height

    if abs(target_aspect - img_aspect) < 0.01:
        return image.resize(target_size, Image.Resampling.LANCZOS).convert("RGB")

    # If the target is taller (e.g. iPhone 1320x2868 vs 1024x1536)
    if img_aspect > target_aspect:
        # Scale to fill height and crop width centered
        scale_h = target_h / image.height
        new_w = round(image.width * scale_h)
        new_h = target_h
        resized = image.resize((new_w, new_h), Image.Resampling.LANCZOS)
        x_offset = (new_w - target_w) // 2
        return resized.crop((x_offset, 0, x_offset + target_w, target_h)).convert("RGB")
    else:
        # Target is wider (e.g. iPad 2064x2752 vs 1024x1536)
        scale_w = target_w / image.width
        scaled_w = target_w
        scaled_h = round(image.height * scale_w)
        scaled_img = image.resize((scaled_w, scaled_h), Image.Resampling.LANCZOS)

        if scaled_h <= target_h:
            top_pixels = [scaled_img.getpixel((x, 0)) for x in range(0, scaled_w, 30)]
            bot_pixels = [scaled_img.getpixel((x, scaled_h - 1)) for x in range(0, scaled_w, 30)]
            avg_top = tuple(sum(p[i] for p in top_pixels) // len(top_pixels) for i in range(3))
            avg_bot = tuple(sum(p[i] for p in bot_pixels) // len(bot_pixels) for i in range(3))

            canvas = make_vertical_gradient(avg_top, avg_bot, target_size)
            y_offset = (target_h - scaled_h) // 2
            canvas.paste(scaled_img, (0, y_offset))
            return canvas.convert("RGB")
        else:
            scale_h = target_h / image.height
            new_w = round(image.width * scale_h)
            resized = image.resize((new_w, target_h), Image.Resampling.LANCZOS)
            x_offset = (new_w - target_w) // 2
            return resized.crop((x_offset, 0, x_offset + target_w, target_h)).convert("RGB")

def main():
    print("🚀 Formatting PawPair Character-First Showcase for App Store Connect...")
    
    iphone_images = []
    ipad_images = []

    for item in SCREENS:
        src_path = SOURCE_DIR / item["src"]
        if not src_path.exists():
            print(f"❌ Missing {src_path}")
            continue

        orig = Image.open(src_path).convert("RGB")
        print(f"\nProcessing: {item['title']}...")

        # 1. iPhone 6.9" (1320 x 2868)
        iphone_canvas = fit_to_canvas(orig, (1320, 2868))
        out_iphone = IPHONE_DIR / item["name"]
        iphone_canvas.save(out_iphone, "PNG", optimize=True)
        print(f"  ✓ Saved iPhone 6.9\": {out_iphone.name} ({out_iphone.stat().st_size // 1024} KB)")
        iphone_images.append(iphone_canvas)

        # 2. iPad 13" (2064 x 2752)
        ipad_canvas = fit_to_canvas(orig, (2064, 2752))
        out_ipad = IPAD_DIR / item["name"]
        ipad_canvas.save(out_ipad, "PNG", optimize=True)
        print(f"  ✓ Saved iPad 13\": {out_ipad.name} ({out_ipad.stat().st_size // 1024} KB)")
        ipad_images.append(ipad_canvas)

    # 3. Generate Contact Sheets
    if iphone_images:
        contact_w = 6600
        contact_h = 2868
        sheet = Image.new("RGB", (contact_w, contact_h))
        for idx, img in enumerate(iphone_images):
            sheet.paste(img, (idx * 1320, 0))
        
        # Save scaled contact sheet
        preview_w = 3300
        preview_h = 1434
        preview_sheet = sheet.resize((preview_w, preview_h), Image.Resampling.LANCZOS)
        preview_path = OUTPUT_BASE / "character-showcase-iphone-contact-sheet.png"
        preview_sheet.save(preview_path, "PNG", optimize=True)
        print(f"\n📋 Saved iPhone Contact Sheet: {preview_path.name}")

    if ipad_images:
        contact_w = 10320
        contact_h = 2752
        sheet = Image.new("RGB", (contact_w, contact_h))
        for idx, img in enumerate(ipad_images):
            sheet.paste(img, (idx * 2064, 0))

        preview_w = 3440
        preview_h = 917
        preview_sheet = sheet.resize((preview_w, preview_h), Image.Resampling.LANCZOS)
        preview_path = OUTPUT_BASE / "character-showcase-ipad-contact-sheet.png"
        preview_sheet.save(preview_path, "PNG", optimize=True)
        print(f"📋 Saved iPad Contact Sheet: {preview_path.name}")

    print("\n🎉 Character showcase formatting complete!")

if __name__ == "__main__":
    main()
