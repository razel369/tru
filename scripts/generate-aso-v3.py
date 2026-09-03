#!/usr/bin/env python3
"""
PawPair ASO v3 Generator
Generates high-converting, premium App Store promotional screenshots
with a continuous panoramic gradient flow, sleek iPhone 16 Pro Titanium frames,
and 3D floating glassmorphism feature badges.
"""

from __future__ import annotations

import math
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageChops

ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT / "app-store" / "aso-v3"
IPHONE_DIR = OUTPUT_DIR / "iphone-6.9"
IPAD_DIR = OUTPUT_DIR / "ipad-13"
ASSETS_DIR = ROOT / "assets"

# Fonts
FRAUNCES_SEMIBOLD = (
    ROOT
    / "node_modules"
    / "@expo-google-fonts"
    / "fraunces"
    / "600SemiBold"
    / "Fraunces_600SemiBold.ttf"
)
MANROPE_BOLD = (
    ROOT
    / "node_modules"
    / "@expo-google-fonts"
    / "manrope"
    / "700Bold"
    / "Manrope_700Bold.ttf"
)
MANROPE_MEDIUM = (
    ROOT
    / "node_modules"
    / "@expo-google-fonts"
    / "manrope"
    / "500Medium"
    / "Manrope_500Medium.ttf"
)

# Palettes & Configuration for the 5 screens
SCREENS_CONFIG = [
    {
        "id": 1,
        "slug": "01-never-miss-care",
        "source_iphone": "01-home.png",
        "source_ipad": "01-home.png",
        "eyebrow": "ALL-IN-ONE CARE",
        "headline": ["Never Miss", "Their Care"],
        "subtitle": "Meals, walks, meds & more — all in one peaceful place.",
        # Sunset Coral / Terracotta / Warm Peach
        "color_top": (255, 118, 92),
        "color_mid": (255, 168, 138),
        "color_bottom": (253, 246, 240),
        "accent": (235, 94, 68),
        "floating_badges": [
            {
                "type": "pill_status",
                "pos_norm": (0.46, 0.27),
                "icon": "check",
                "title": "Breakfast • 8:00 AM",
                "status": "Completed ✓",
                "accent": (46, 155, 95),
            },
            {
                "type": "card_stat",
                "pos_norm": (0.06, 0.62),
                "icon": "paw",
                "title": "Next Routine",
                "subtitle": "12:30 PM Park Walk",
                "accent": (235, 94, 68),
            },
        ],
    },
    {
        "id": 2,
        "slug": "02-calm-daily-rhythm",
        "source_iphone": "02-plan.png",
        "source_ipad": "02-plan.png",
        "eyebrow": "INTUITIVE ROUTINE",
        "headline": ["One Calm", "Daily Rhythm"],
        "subtitle": "Effortless routines. Mark care done with a single tap.",
        # Fresh Sage & Mint
        "color_top": (44, 142, 122),
        "color_mid": (92, 192, 168),
        "color_bottom": (244, 252, 249),
        "accent": (36, 148, 126),
        "floating_badges": [
            {
                "type": "pill_status",
                "pos_norm": (0.06, 0.28),
                "icon": "pill",
                "title": "Joint Support • 1 tab",
                "status": "Given with food",
                "accent": (235, 110, 80),
            },
            {
                "type": "card_stat",
                "pos_norm": (0.45, 0.63),
                "icon": "check",
                "title": "Daily Rhythm",
                "subtitle": "80% Completed Today",
                "accent": (36, 148, 126),
            },
        ],
    },
    {
        "id": 3,
        "slug": "03-vet-ready-health",
        "source_iphone": "03-health.png",
        "source_ipad": "03-health.png",
        "eyebrow": "PET HEALTH PASSPORT",
        "headline": ["Vet-Ready", "In Seconds"],
        "subtitle": "Weight trends, vaccines, and medical history in your pocket.",
        # Royal Sky Blue
        "color_top": (32, 104, 198),
        "color_mid": (90, 168, 248),
        "color_bottom": (242, 248, 254),
        "accent": (30, 110, 215),
        "floating_badges": [
            {
                "type": "pill_status",
                "pos_norm": (0.44, 0.27),
                "icon": "star",
                "title": "Vet-Ready Passport",
                "status": "100% Profile Depth ★",
                "accent": (30, 110, 215),
            },
            {
                "type": "card_stat",
                "pos_norm": (0.06, 0.60),
                "icon": "trend",
                "title": "Weight Trend",
                "subtitle": "27.4 kg (-0.3 kg)",
                "accent": (46, 155, 95),
            },
        ],
    },
    {
        "id": 4,
        "slug": "04-made-for-your-pet",
        "source_iphone": "04-pets.png",
        "source_ipad": "04-pets.png",
        "eyebrow": "186 SUPPORTED BREEDS",
        "headline": ["Made For", "Your Pet"],
        "subtitle": "Handcrafted companion art for dogs & cats that matches your family.",
        # Warm Honey Amber
        "color_top": (218, 134, 16),
        "color_mid": (250, 192, 88),
        "color_bottom": (255, 250, 242),
        "accent": (212, 128, 10),
        "floating_badges": [
            {
                "type": "pill_status",
                "pos_norm": (0.46, 0.27),
                "icon": "paw",
                "title": "186 Breeds",
                "status": "Personal Companion Art",
                "accent": (212, 128, 10),
            },
            {
                "type": "card_stat",
                "pos_norm": (0.06, 0.62),
                "icon": "share",
                "title": "Care Handoff",
                "subtitle": "Share with Sitter ✨",
                "accent": (36, 148, 126),
            },
        ],
    },
    {
        "id": 5,
        "slug": "05-private-and-connected",
        "source_iphone": "05-settings.png",
        "source_ipad": "05-settings.png",
        "eyebrow": "PRIVATE & CONNECTED",
        "headline": ["Your Data.", "Your Control."],
        "subtitle": "100% private by design, encrypted backups & Apple Watch support.",
        # Jewel Teal
        "color_top": (10, 125, 112),
        "color_mid": (52, 182, 166),
        "color_bottom": (242, 252, 250),
        "accent": (10, 125, 112),
        "floating_badges": [
            {
                "type": "pill_status",
                "pos_norm": (0.45, 0.27),
                "icon": "watch",
                "title": "Apple Watch",
                "status": "8:00 PM Meds ⌚",
                "accent": (10, 125, 112),
            },
            {
                "type": "card_stat",
                "pos_norm": (0.06, 0.62),
                "icon": "lock",
                "title": "Zero Tracking",
                "subtitle": "End-to-End Encrypted 🔒",
                "accent": (30, 110, 215),
            },
        ],
    },
]


def lerp_color(c1: tuple[int, int, int], c2: tuple[int, int, int], t: float) -> tuple[int, int, int]:
    """Linearly interpolate between two RGB colors."""
    t = max(0.0, min(1.0, t))
    return (
        round(c1[0] + (c2[0] - c1[0]) * t),
        round(c1[1] + (c2[1] - c1[1]) * t),
        round(c1[2] + (c2[2] - c1[2]) * t),
    )


def build_panoramic_background(total_width: int, height: int, num_screens: int = 5) -> Image.Image:
    """
    Renders a unified, continuous panoramic gradient canvas where colors
    flow smoothly horizontally between screens and vertically from top to bottom.
    """
    canvas = Image.new("RGBA", (total_width, height))
    screen_width = total_width // num_screens

    # Base gradient calculation
    base = Image.new("RGBA", (total_width, height))
    draw = ImageDraw.Draw(base)

    col_tops = []
    col_mids = []
    col_bots = []

    for x in range(total_width):
        screen_idx = min(x // screen_width, num_screens - 1)
        next_screen_idx = min(screen_idx + 1, num_screens - 1)
        local_t = (x - (screen_idx * screen_width)) / float(screen_width)
        smooth_t = (1 - math.cos(local_t * math.pi)) / 2.0

        c_top_cur = SCREENS_CONFIG[screen_idx]["color_top"]
        c_top_nxt = SCREENS_CONFIG[next_screen_idx]["color_top"]
        col_tops.append(lerp_color(c_top_cur, c_top_nxt, smooth_t))

        c_mid_cur = SCREENS_CONFIG[screen_idx]["color_mid"]
        c_mid_nxt = SCREENS_CONFIG[next_screen_idx]["color_mid"]
        col_mids.append(lerp_color(c_mid_cur, c_mid_nxt, smooth_t))

        c_bot_cur = SCREENS_CONFIG[screen_idx]["color_bottom"]
        c_bot_nxt = SCREENS_CONFIG[next_screen_idx]["color_bottom"]
        col_bots.append(lerp_color(c_bot_cur, c_bot_nxt, smooth_t))

    for x in range(total_width):
        t_col = col_tops[x]
        m_col = col_mids[x]
        b_col = col_bots[x]
        h_mid = int(height * 0.42)

        for y_step in range(64):
            y_start = (y_step * height) // 64
            y_end = ((y_step + 1) * height) // 64
            y_midpoint = (y_start + y_end) / 2.0

            if y_midpoint < h_mid:
                frac = y_midpoint / float(h_mid)
                color = lerp_color(t_col, m_col, frac)
            else:
                frac = (y_midpoint - h_mid) / float(height - h_mid)
                color = lerp_color(m_col, b_col, frac)

            draw.rectangle([x, y_start, x, y_end], fill=(*color, 255))

    # Ambient light layer
    light_layer = Image.new("RGBA", (total_width, height), (0, 0, 0, 0))
    light_draw = ImageDraw.Draw(light_layer)

    for i in range(num_screens):
        cx = int((i + 0.5) * screen_width)
        accent = SCREENS_CONFIG[i]["accent"]

        light_draw.ellipse(
            [cx - screen_width // 2, -height // 8, cx + screen_width // 2, height // 3],
            fill=(255, 255, 255, 45),
        )

        if i < num_screens - 1:
            seam_x = (i + 1) * screen_width
            next_accent = SCREENS_CONFIG[i + 1]["accent"]
            blend_accent = lerp_color(accent, next_accent, 0.5)

            light_draw.ellipse(
                [seam_x - screen_width // 3, int(height * 0.45), seam_x + screen_width // 3, int(height * 0.85)],
                fill=(*blend_accent, 40),
            )
            light_draw.ellipse(
                [seam_x - screen_width // 4, int(height * 0.15), seam_x + screen_width // 4, int(height * 0.35)],
                fill=(255, 255, 255, 30),
            )

    blur_radius = max(24, total_width // 100)
    light_layer = light_layer.filter(ImageFilter.GaussianBlur(blur_radius))
    canvas = Image.alpha_composite(base, light_layer)

    return canvas


def draw_titanium_iphone_frame(
    screen_capture: Image.Image,
    target_width: int,
    target_height: int,
) -> Image.Image:
    """
    Renders an ultra-modern iPhone 16 Pro mockup frame around the native screenshot capture.
    Features sleek Titanium bezel, subtle glass edge reflections, dynamic island, and rounded corners.
    """
    bezel_thickness = 22
    outer_radius = 114
    inner_radius = outer_radius - bezel_thickness

    mockup = Image.new("RGBA", (target_width, target_height), (0, 0, 0, 0))
    mockup_draw = ImageDraw.Draw(mockup)

    titanium_dark = (36, 38, 42, 255)
    titanium_border = (64, 68, 74, 255)
    mockup_draw.rounded_rectangle(
        [0, 0, target_width - 1, target_height - 1],
        radius=outer_radius,
        fill=titanium_dark,
        outline=titanium_border,
        width=3,
    )

    inner_w = target_width - (bezel_thickness * 2)
    inner_h = target_height - (bezel_thickness * 2)
    resized_screen = screen_capture.resize((inner_w, inner_h), Image.Resampling.LANCZOS).convert("RGBA")

    mask = Image.new("L", (inner_w, inner_h), 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        [0, 0, inner_w - 1, inner_h - 1],
        radius=inner_radius,
        fill=255,
    )
    resized_screen.putalpha(mask)
    mockup.alpha_composite(resized_screen, (bezel_thickness, bezel_thickness))

    # Dynamic Island Pill
    di_width = int(inner_w * 0.31)
    di_height = int(inner_h * 0.038)
    di_x = (target_width - di_width) // 2
    di_y = bezel_thickness + int(inner_h * 0.015)

    di_mask = Image.new("RGBA", (target_width, target_height), (0, 0, 0, 0))
    di_draw = ImageDraw.Draw(di_mask)
    di_draw.rounded_rectangle(
        [di_x, di_y, di_x + di_width, di_y + di_height],
        radius=di_height // 2,
        fill=(0, 0, 0, 255),
    )
    lens_r = di_height // 4
    di_draw.ellipse(
        [di_x + di_width - di_height + 4, di_y + (di_height // 2) - lens_r, di_x + di_width - 4, di_y + (di_height // 2) + lens_r],
        fill=(18, 28, 45, 180),
    )
    mockup.alpha_composite(di_mask)

    # Glass glint
    glint = Image.new("RGBA", (target_width, target_height), (0, 0, 0, 0))
    glint_draw = ImageDraw.Draw(glint)
    glint_draw.rounded_rectangle(
        [bezel_thickness, bezel_thickness, target_width - bezel_thickness - 1, target_height - bezel_thickness - 1],
        radius=inner_radius,
        outline=(255, 255, 255, 45),
        width=2,
    )
    mockup.alpha_composite(glint)

    return mockup


def draw_ipad_frame(
    screen_capture: Image.Image,
    target_width: int,
    target_height: int,
) -> Image.Image:
    """
    Renders an iPad Pro frame with thin uniform bezels and aluminum chassis.
    """
    bezel = 32
    outer_radius = 56
    inner_radius = outer_radius - bezel // 2

    mockup = Image.new("RGBA", (target_width, target_height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(mockup)

    draw.rounded_rectangle(
        [0, 0, target_width - 1, target_height - 1],
        radius=outer_radius,
        fill=(32, 34, 38, 255),
        outline=(60, 64, 70, 255),
        width=3,
    )

    inner_w = target_width - bezel * 2
    inner_h = target_height - bezel * 2
    screen_resized = screen_capture.resize((inner_w, inner_h), Image.Resampling.LANCZOS).convert("RGBA")

    mask = Image.new("L", (inner_w, inner_h), 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        [0, 0, inner_w - 1, inner_h - 1],
        radius=inner_radius,
        fill=255,
    )
    screen_resized.putalpha(mask)
    mockup.alpha_composite(screen_resized, (bezel, bezel))

    glint = Image.new("RGBA", (target_width, target_height), (0, 0, 0, 0))
    ImageDraw.Draw(glint).rounded_rectangle(
        [bezel, bezel, target_width - bezel - 1, target_height - bezel - 1],
        radius=inner_radius,
        outline=(255, 255, 255, 40),
        width=2,
    )
    mockup.alpha_composite(glint)

    return mockup


def create_drop_shadow(image: Image.Image, blur_radius: int = 50, offset_y: int = 40, opacity: int = 90) -> Image.Image:
    """
    Generates a realistic multi-radius ambient drop shadow beneath an RGBA graphic.
    """
    alpha = image.split()[-1]
    w, h = image.size
    pad = blur_radius * 2

    shadow_canvas = Image.new("RGBA", (w + pad * 2, h + pad * 2), (0, 0, 0, 0))
    shadow_shape = Image.new("RGBA", (w, h), (18, 26, 32, opacity))
    shadow_shape.putalpha(alpha)

    shadow_canvas.alpha_composite(shadow_shape, (pad, pad + offset_y))
    blurred = shadow_canvas.filter(ImageFilter.GaussianBlur(blur_radius))
    return blurred


def draw_floating_badge(
    badge_data: dict,
    scale_factor: float = 1.0,
) -> Image.Image:
    """
    Generates an ultra-crisp floating glassmorphic UI card with 3D depth,
    subtle white glass gradient, and drop shadow.
    """
    title_font = ImageFont.truetype(str(MANROPE_BOLD), int(29 * scale_factor))
    sub_font = ImageFont.truetype(str(MANROPE_MEDIUM), int(25 * scale_factor))

    title_text = badge_data.get("title", "")
    sub_text = badge_data.get("subtitle", badge_data.get("status", ""))
    accent = badge_data.get("accent", (40, 120, 220))

    dummy = ImageDraw.Draw(Image.new("RGBA", (1, 1)))
    w_title = dummy.textlength(title_text, font=title_font)
    w_sub = dummy.textlength(sub_text, font=sub_font)
    text_w = max(w_title, w_sub)

    card_h = int(116 * scale_factor)
    icon_box_size = int(66 * scale_factor)
    padding_x = int(30 * scale_factor)
    card_w = int(padding_x * 2 + icon_box_size + int(20 * scale_factor) + text_w + int(18 * scale_factor))
    corner_r = card_h // 2

    card = Image.new("RGBA", (card_w, card_h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(card)

    draw.rounded_rectangle(
        [0, 0, card_w - 1, card_h - 1],
        radius=corner_r,
        fill=(255, 255, 255, 246),
        outline=(255, 255, 255, 255),
        width=int(2 * scale_factor),
    )

    icon_x = padding_x
    icon_y = (card_h - icon_box_size) // 2
    draw.rounded_rectangle(
        [icon_x, icon_y, icon_x + icon_box_size, icon_y + icon_box_size],
        radius=int(18 * scale_factor),
        fill=(*accent, 34),
        outline=(*accent, 70),
        width=int(1.5 * scale_factor),
    )

    icon_type = badge_data.get("icon", "check")
    ic_cx = icon_x + icon_box_size // 2
    ic_cy = icon_y + icon_box_size // 2
    ic_r = icon_box_size // 4

    if icon_type == "check":
        pts = [
            (ic_cx - ic_r, ic_cy),
            (ic_cx - ic_r // 3, ic_cy + ic_r * 2 // 3),
            (ic_cx + ic_r, ic_cy - ic_r * 2 // 3),
        ]
        draw.line(pts, fill=accent, width=int(4 * scale_factor), joint="curve")
    elif icon_type == "pill":
        draw.ellipse([ic_cx - ic_r, ic_cy - ic_r, ic_cx + ic_r, ic_cy + ic_r], fill=accent)
    elif icon_type == "paw":
        draw.ellipse([ic_cx - ic_r, ic_cy - ic_r // 2, ic_cx + ic_r, ic_cy + ic_r], fill=accent)
        draw.ellipse([ic_cx - ic_r, ic_cy - ic_r - 4, ic_cx - ic_r // 2, ic_cy - ic_r // 2 - 4], fill=accent)
        draw.ellipse([ic_cx + ic_r // 2, ic_cy - ic_r - 4, ic_cx + ic_r, ic_cy - ic_r // 2 - 4], fill=accent)
    elif icon_type == "star":
        draw.ellipse([ic_cx - ic_r, ic_cy - ic_r, ic_cx + ic_r, ic_cy + ic_r], fill=accent)
    elif icon_type == "lock":
        draw.rectangle([ic_cx - ic_r, ic_cy - ic_r // 4, ic_cx + ic_r, ic_cy + ic_r], fill=accent)
        draw.arc([ic_cx - ic_r * 3 // 4, ic_cy - ic_r, ic_cx + ic_r * 3 // 4, ic_cy], 180, 0, fill=accent, width=int(3 * scale_factor))
    elif icon_type == "watch":
        draw.rounded_rectangle([ic_cx - ic_r, ic_cy - ic_r, ic_cx + ic_r, ic_cy + ic_r], radius=int(6 * scale_factor), fill=accent)
    else:
        draw.ellipse([ic_cx - ic_r, ic_cy - ic_r, ic_cx + ic_r, ic_cy + ic_r], fill=accent)

    text_x = icon_x + icon_box_size + int(18 * scale_factor)
    draw.text(
        (text_x, int(22 * scale_factor)),
        title_text,
        font=title_font,
        fill=(24, 34, 42, 255),
    )
    draw.text(
        (text_x, int(64 * scale_factor)),
        sub_text,
        font=sub_font,
        fill=(*accent, 240) if "status" in badge_data else (90, 104, 114, 255),
    )

    pad = int(36 * scale_factor)
    total_w = card_w + pad * 2
    total_h = card_h + pad * 2
    res = Image.new("RGBA", (total_w, total_h), (0, 0, 0, 0))

    shadow_box = Image.new("RGBA", (card_w, card_h), (20, 32, 44, 55))
    shadow_mask = Image.new("L", (card_w, card_h), 0)
    ImageDraw.Draw(shadow_mask).rounded_rectangle([0, 0, card_w - 1, card_h - 1], radius=corner_r, fill=255)
    shadow_box.putalpha(shadow_mask)

    shadow_full = Image.new("RGBA", (total_w, total_h), (0, 0, 0, 0))
    shadow_full.alpha_composite(shadow_box, (pad, pad + int(12 * scale_factor)))
    shadow_full = shadow_full.filter(ImageFilter.GaussianBlur(int(22 * scale_factor)))

    res.alpha_composite(shadow_full)
    res.alpha_composite(card, (pad, pad))
    return res


def create_circular_pet_avatar(img_path: Path, diameter: int = 140) -> Image.Image:
    """Creates a beautiful circular pet avatar chip with white border and drop shadow."""
    if not img_path.exists():
        return Image.new("RGBA", (1, 1), (0, 0, 0, 0))

    pet_img = Image.open(img_path).convert("RGBA")
    # Resize keeping aspect ratio
    ratio = max(diameter / pet_img.width, diameter / pet_img.height)
    new_w, new_h = round(pet_img.width * ratio), round(pet_img.height * ratio)
    pet_resized = pet_img.resize((new_w, new_h), Image.Resampling.LANCZOS)
    left = (new_w - diameter) // 2
    top = (new_h - diameter) // 2
    cropped = pet_resized.crop((left, top, left + diameter, top + diameter))

    # Mask to circle
    mask = Image.new("L", (diameter, diameter), 0)
    ImageDraw.Draw(mask).ellipse([0, 0, diameter - 1, diameter - 1], fill=255)
    cropped.putalpha(mask)

    # Border
    chip = Image.new("RGBA", (diameter, diameter), (0, 0, 0, 0))
    chip.alpha_composite(cropped)
    ImageDraw.Draw(chip).ellipse([0, 0, diameter - 1, diameter - 1], outline=(255, 255, 255, 255), width=4)

    # Wrap in drop shadow
    pad = 28
    res = Image.new("RGBA", (diameter + pad * 2, diameter + pad * 2), (0, 0, 0, 0))
    shadow = Image.new("RGBA", (diameter, diameter), (20, 30, 40, 75))
    shadow.putalpha(mask)
    res.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(16)), (pad, pad + 8))
    res.alpha_composite(chip, (pad, pad))
    return res


def render_eyebrow_pill(text: str, accent: tuple[int, int, int], scale: float = 1.0) -> Image.Image:
    """
    Renders an elegant, premium frosted glass pill for the category eyebrow.
    """
    font = ImageFont.truetype(str(MANROPE_BOLD), int(26 * scale))
    dummy = ImageDraw.Draw(Image.new("RGBA", (1, 1)))

    spaced_text = "  ".join(text)
    text_w = dummy.textlength(spaced_text, font=font)

    pad_x = int(36 * scale)
    pad_y = int(14 * scale)
    pill_w = int(text_w + pad_x * 2)
    pill_h = int(36 * scale + pad_y * 2)

    pill = Image.new("RGBA", (pill_w, pill_h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(pill)

    draw.rounded_rectangle(
        [0, 0, pill_w - 1, pill_h - 1],
        radius=pill_h // 2,
        fill=(255, 255, 255, 215),
        outline=(255, 255, 255, 240),
        width=int(1.5 * scale),
    )

    draw.text(
        (pad_x, pad_y + int(2 * scale)),
        spaced_text,
        font=font,
        fill=(*accent, 255),
    )

    return pill


def render_all_iphone_screenshots() -> tuple[list[Path], Path]:
    """
    Generates all 5 iPhone 6.9" screenshots from a seamless panoramic canvas.
    """
    print("🎨 Generating iPhone 6.9\" Panoramic Master Canvas (6600 x 2868)...")
    IPHONE_DIR.mkdir(parents=True, exist_ok=True)

    screen_w = 1320
    screen_h = 2868
    total_w = screen_w * 5

    panorama = build_panoramic_background(total_w, screen_h, num_screens=5)

    headline_font = ImageFont.truetype(str(FRAUNCES_SEMIBOLD), 112)
    subtitle_font = ImageFont.truetype(str(MANROPE_MEDIUM), 34)

    for i, cfg in enumerate(SCREENS_CONFIG):
        screen_x = i * screen_w
        print(f"  📱 Compositing Screen {i+1}: {cfg['headline'][0]} {cfg['headline'][1]}...")

        # Eyebrow Pill
        eyebrow = render_eyebrow_pill(cfg["eyebrow"], cfg["accent"], scale=1.0)
        panorama.alpha_composite(eyebrow, (screen_x + 96, 140))

        # Hero Headline
        draw = ImageDraw.Draw(panorama)
        y_text = 240
        for line in cfg["headline"]:
            draw.text((screen_x + 98, y_text + 4), line, font=headline_font, fill=(0, 0, 0, 45))
            draw.text((screen_x + 96, y_text), line, font=headline_font, fill=(20, 32, 40, 255))
            y_text += 120

        # Subtitle
        draw.text(
            (screen_x + 98, y_text + 20),
            cfg["subtitle"],
            font=subtitle_font,
            fill=(60, 78, 88, 235),
        )

        # Phone Mockup
        src_path = ROOT / "app-store" / "screenshots" / "iphone-6.9-final" / cfg["source_iphone"]
        raw_screen = Image.open(src_path)

        phone_w = 1140
        phone_h = int(phone_w * (2868 / 1320))
        phone_x = screen_x + (screen_w - phone_w) // 2
        phone_y = 660

        mockup = draw_titanium_iphone_frame(raw_screen, phone_w, phone_h)

        shadow = create_drop_shadow(mockup, blur_radius=58, offset_y=42, opacity=110)
        pad = 116
        panorama.alpha_composite(shadow, (phone_x - pad, phone_y - pad))
        panorama.alpha_composite(mockup, (phone_x, phone_y))

        # Special Decorative Elements per screen:
        # Screen 1: Add cute Milo companion circular badge
        if i == 0 and (ASSETS_DIR / "pawpair-milo.png").exists():
            milo_avatar = create_circular_pet_avatar(ASSETS_DIR / "pawpair-milo.png", diameter=130)
            panorama.alpha_composite(milo_avatar, (screen_x + screen_w - 240, 470))

        # Screen 4: Add Breed Avatars floating around to showcase 186 breeds
        if i == 3:
            breeds = [
                ASSETS_DIR / "pawpair-luna.png",
                ASSETS_DIR / "pawpair-milo.png",
            ]
            for b_idx, b_path in enumerate(breeds):
                if b_path.exists():
                    b_avatar = create_circular_pet_avatar(b_path, diameter=110)
                    bx = screen_x + screen_w - 200 - (b_idx * 90)
                    by = 480 + (b_idx * 30)
                    panorama.alpha_composite(b_avatar, (bx, by))

        # Floating UI Callout Badges
        for badge_cfg in cfg["floating_badges"]:
            norm_x, norm_y = badge_cfg["pos_norm"]
            badge_img = draw_floating_badge(badge_cfg, scale_factor=1.0)
            bx = screen_x + int(norm_x * screen_w)
            by = int(norm_y * screen_h)
            panorama.alpha_composite(badge_img, (bx, by))

    # Slice into individual 1320 x 2868 RGB PNGs
    generated_files = []
    print("✂️  Slicing panorama into 5 pristine 24-bit RGB files...")
    for i, cfg in enumerate(SCREENS_CONFIG):
        screen_x = i * screen_w
        card = panorama.crop((screen_x, 0, screen_x + screen_w, screen_h))

        rgb_card = card.convert("RGB")
        out_file = IPHONE_DIR / f"{cfg['slug']}.png"
        rgb_card.save(out_file, "PNG", optimize=True)
        generated_files.append(out_file)
        print(f"  ✓ Saved {out_file.name} ({out_file.stat().st_size // 1024} KB)")

    # Contact Sheet
    contact_w = 3300
    contact_h = int(contact_w * (screen_h / total_w))
    contact_sheet = panorama.resize((contact_w, contact_h), Image.Resampling.LANCZOS).convert("RGB")
    contact_file = OUTPUT_DIR / "iphone-6.9-contact-sheet.png"
    contact_sheet.save(contact_file, "PNG", optimize=True)
    print(f"📋 Generated iPhone Contact Sheet: {contact_file.name}")

    return generated_files, contact_file


def render_all_ipad_screenshots() -> tuple[list[Path], Path]:
    """
    Generates all 5 iPad 13\" (2064 x 2752) screenshots with panoramic gradient and iPad Pro framing.
    """
    print("\n🎨 Generating iPad 13\" Panoramic Master Canvas (10320 x 2752)...")
    IPAD_DIR.mkdir(parents=True, exist_ok=True)

    screen_w = 2064
    screen_h = 2752
    total_w = screen_w * 5

    panorama = build_panoramic_background(total_w, screen_h, num_screens=5)

    headline_font = ImageFont.truetype(str(FRAUNCES_SEMIBOLD), 126)
    subtitle_font = ImageFont.truetype(str(MANROPE_MEDIUM), 40)

    for i, cfg in enumerate(SCREENS_CONFIG):
        screen_x = i * screen_w
        print(f"  📱 Compositing iPad Screen {i+1}: {cfg['headline'][0]} {cfg['headline'][1]}...")

        eyebrow = render_eyebrow_pill(cfg["eyebrow"], cfg["accent"], scale=1.35)
        panorama.alpha_composite(eyebrow, (screen_x + 130, 130))

        draw = ImageDraw.Draw(panorama)
        y_text = 240
        for line in cfg["headline"]:
            draw.text((screen_x + 134, y_text + 4), line, font=headline_font, fill=(0, 0, 0, 45))
            draw.text((screen_x + 130, y_text), line, font=headline_font, fill=(20, 32, 40, 255))
            y_text += 136

        draw.text(
            (screen_x + 130, y_text + 24),
            cfg["subtitle"],
            font=subtitle_font,
            fill=(60, 78, 88, 235),
        )

        src_path = ROOT / "app-store" / "screenshots" / "ipad-13-final" / cfg["source_ipad"]
        raw_screen = Image.open(src_path)

        ipad_w = 1760
        ipad_h = int(ipad_w * (2752 / 2064))
        ipad_x = screen_x + (screen_w - ipad_w) // 2
        ipad_y = 660

        mockup = draw_ipad_frame(raw_screen, ipad_w, ipad_h)
        shadow = create_drop_shadow(mockup, blur_radius=64, offset_y=44, opacity=100)
        pad = 128
        panorama.alpha_composite(shadow, (ipad_x - pad, ipad_y - pad))
        panorama.alpha_composite(mockup, (ipad_x, ipad_y))

        for badge_cfg in cfg["floating_badges"]:
            norm_x, norm_y = badge_cfg["pos_norm"]
            badge_img = draw_floating_badge(badge_cfg, scale_factor=1.2)
            bx = screen_x + int(norm_x * screen_w)
            by = int(norm_y * screen_h)
            panorama.alpha_composite(badge_img, (bx, by))

    generated_files = []
    print("✂️  Slicing iPad panorama into 5 pristine 24-bit RGB files...")
    for i, cfg in enumerate(SCREENS_CONFIG):
        screen_x = i * screen_w
        card = panorama.crop((screen_x, 0, screen_x + screen_w, screen_h))

        rgb_card = card.convert("RGB")
        out_file = IPAD_DIR / f"{cfg['slug']}.png"
        rgb_card.save(out_file, "PNG", optimize=True)
        generated_files.append(out_file)
        print(f"  ✓ Saved {out_file.name} ({out_file.stat().st_size // 1024} KB)")

    contact_w = 3440
    contact_h = int(contact_w * (screen_h / total_w))
    contact_sheet = panorama.resize((contact_w, contact_h), Image.Resampling.LANCZOS).convert("RGB")
    contact_file = OUTPUT_DIR / "ipad-13-contact-sheet.png"
    contact_sheet.save(contact_file, "PNG", optimize=True)
    print(f"📋 Generated iPad Contact Sheet: {contact_file.name}")

    return generated_files, contact_file


def main():
    print("🚀 Starting PawPair ASO v3 Generator Pipeline...\n")
    render_all_iphone_screenshots()
    render_all_ipad_screenshots()
    print("\n🎉 ASO v3 Pipeline Completed Successfully!")


if __name__ == "__main__":
    main()
