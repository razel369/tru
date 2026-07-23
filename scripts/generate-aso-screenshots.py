from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
CANVAS = (1320, 2868)
OUTPUT = ROOT / "app-store" / "aso" / "iphone-6.9" / "default"
MASTER = ROOT / "app-store" / "aso" / "backgrounds" / "pawpair-master.png"

FRAUNCES = (
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

INK = (34, 54, 69, 255)
MUTED = (74, 96, 101, 255)

SCREENS = [
    {
        "slug": "01-pet-care",
        "source": ROOT / "living-pet-home.png",
        "overline": "COMPLETE PET CARE",
        "headline": ["Pet care,", "finally personal"],
        "subtitle": "Everything they need today, in one beautiful place.",
        "accent": (95, 155, 143),
    },
    {
        "slug": "02-daily-plan",
        "source": ROOT / "app-store" / "screenshots" / "iphone-6.9" / "03-plan.png",
        "overline": "DAILY CARE PLANNER",
        "headline": ["Every routine,", "one calm plan"],
        "subtitle": "Meals, walks, medication and daily care, together.",
        "accent": (255, 123, 107),
    },
    {
        "slug": "03-pet-health",
        "source": ROOT / "app-store" / "screenshots" / "iphone-6.9" / "04-health.png",
        "overline": "PET HEALTH TRACKER",
        "headline": ["Their whole", "health story"],
        "subtitle": "Weight, vaccines, medications and vet visits.",
        "accent": (116, 167, 207),
    },
    {
        "slug": "04-every-pet",
        "source": ROOT / "design-pets-after.png",
        "overline": "MULTI-PET CARE",
        "headline": ["Made for", "every pet"],
        "subtitle": "Personalized around every pet in your family.",
        "accent": (230, 197, 107),
    },
    {
        "slug": "05-private",
        "source": ROOT / "app-store" / "screenshots" / "iphone-6.9" / "05-settings.png",
        "overline": "LOCAL-FIRST PRIVACY",
        "headline": ["Private", "by design"],
        "subtitle": "Your care data stays under your control.",
        "accent": (95, 155, 143),
    },
]


def cover(image: Image.Image, target: tuple[int, int]) -> Image.Image:
    ratio = max(target[0] / image.width, target[1] / image.height)
    size = (round(image.width * ratio), round(image.height * ratio))
    resized = image.resize(size, Image.Resampling.LANCZOS)
    left = (resized.width - target[0]) // 2
    top = (resized.height - target[1]) // 2
    return resized.crop((left, top, left + target[0], top + target[1]))


def rounded_image(image: Image.Image, size: tuple[int, int], radius: int) -> Image.Image:
    fitted = cover(image.convert("RGB"), size).convert("RGBA")
    mask = Image.new("L", size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, *size), radius=radius, fill=255)
    fitted.putalpha(mask)
    return fitted


def draw_tracking(
    draw: ImageDraw.ImageDraw,
    position: tuple[int, int],
    text: str,
    font: ImageFont.FreeTypeFont,
    fill: tuple[int, int, int, int],
    tracking: int,
) -> None:
    x, y = position
    for character in text:
        draw.text((x, y), character, font=font, fill=fill)
        x += round(draw.textlength(character, font=font)) + tracking


def make_background(accent: tuple[int, int, int]) -> Image.Image:
    background = cover(Image.open(MASTER).convert("RGB"), CANVAS).convert("RGBA")
    wash = Image.new("RGBA", CANVAS, (*accent, 16))
    background = Image.alpha_composite(background, wash)

    calm = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
    calm_draw = ImageDraw.Draw(calm)
    calm_draw.rounded_rectangle(
        (76, 72, CANVAS[0] - 76, 650),
        radius=72,
        fill=(250, 246, 239, 225),
    )
    calm = calm.filter(ImageFilter.GaussianBlur(8))
    return Image.alpha_composite(background, calm)


def add_device(canvas: Image.Image, source: Path, accent: tuple[int, int, int]) -> None:
    screen_size = (884, 1922)
    screen_x = (CANVAS[0] - screen_size[0]) // 2
    screen_y = 796
    frame_pad = 24
    frame_box = (
        screen_x - frame_pad,
        screen_y - frame_pad,
        screen_x + screen_size[0] + frame_pad,
        screen_y + screen_size[1] + frame_pad,
    )

    shadow = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow)
    shadow_draw.rounded_rectangle(
        (frame_box[0] + 8, frame_box[1] + 25, frame_box[2] + 8, frame_box[3] + 25),
        radius=84,
        fill=(38, 42, 39, 95),
    )
    shadow = shadow.filter(ImageFilter.GaussianBlur(34))
    canvas.alpha_composite(shadow)

    draw = ImageDraw.Draw(canvas)
    draw.rounded_rectangle(frame_box, radius=84, fill=(238, 237, 232, 255))
    draw.rounded_rectangle(
        (frame_box[0] + 8, frame_box[1] + 8, frame_box[2] - 8, frame_box[3] - 8),
        radius=76,
        outline=(255, 255, 255, 220),
        width=5,
    )
    draw.rounded_rectangle(
        (screen_x - 9, screen_y - 9, screen_x + screen_size[0] + 9, screen_y + screen_size[1] + 9),
        radius=68,
        fill=(26, 31, 34, 255),
    )

    screenshot = rounded_image(Image.open(source), screen_size, 58)
    canvas.alpha_composite(screenshot, (screen_x, screen_y))

    side_x = frame_box[0] - 5
    draw.rounded_rectangle((side_x, screen_y + 260, side_x + 7, screen_y + 430), radius=4, fill=(*accent, 210))
    draw.rounded_rectangle((side_x, screen_y + 470, side_x + 7, screen_y + 610), radius=4, fill=(186, 184, 177, 255))


def render(entry: dict[str, object]) -> Path:
    accent = entry["accent"]
    assert isinstance(accent, tuple)
    canvas = make_background(accent)
    draw = ImageDraw.Draw(canvas)

    overline_font = ImageFont.truetype(str(MANROPE_BOLD), 29)
    headline_font = ImageFont.truetype(str(FRAUNCES), 91)
    subtitle_font = ImageFont.truetype(str(MANROPE_MEDIUM), 31)

    draw_tracking(draw, (116, 118), str(entry["overline"]), overline_font, (*accent, 255), 5)
    y = 174
    for line in entry["headline"]:
        draw.text((110, y), str(line), font=headline_font, fill=INK)
        y += 92
    draw.text((114, 388), str(entry["subtitle"]), font=subtitle_font, fill=MUTED)

    pill_text = "PAWPAIR"
    pill_font = ImageFont.truetype(str(MANROPE_BOLD), 23)
    pill_width = round(draw.textlength(pill_text, font=pill_font)) + 62
    pill_box = (CANVAS[0] - 110 - pill_width, 112, CANVAS[0] - 110, 168)
    draw.rounded_rectangle(pill_box, radius=28, fill=(*accent, 36), outline=(*accent, 96), width=2)
    draw.text((pill_box[0] + 31, pill_box[1] + 12), pill_text, font=pill_font, fill=(*accent, 255))

    source = entry["source"]
    assert isinstance(source, Path)
    add_device(canvas, source, accent)

    output = OUTPUT / f"{entry['slug']}.png"
    canvas.convert("RGB").save(output, quality=96)
    return output


def make_contact_sheet(outputs: list[Path]) -> Path:
    thumb_size = (360, 782)
    sheet = Image.new("RGB", (1260, 1760), (244, 238, 229))
    draw = ImageDraw.Draw(sheet)
    label_font = ImageFont.truetype(str(MANROPE_BOLD), 26)
    for index, output in enumerate(outputs):
        x = 60 + (index % 3) * 400
        y = 80 + (index // 3) * 830
        thumb = cover(Image.open(output).convert("RGB"), thumb_size)
        sheet.paste(thumb, (x, y))
        draw.text((x, y + thumb_size[1] + 14), output.stem, font=label_font, fill=INK)
    path = OUTPUT.parent / "default-contact-sheet.png"
    sheet.save(path, quality=94)
    return path


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    outputs = [render(entry) for entry in SCREENS]
    contact_sheet = make_contact_sheet(outputs)
    manifest = {
        "canvas": {"width": CANVAS[0], "height": CANVAS[1]},
        "background": str(MASTER.relative_to(ROOT)),
        "contactSheet": str(contact_sheet.relative_to(ROOT)),
        "screens": [
            {
                "file": str(output.relative_to(ROOT)),
                "source": str(entry["source"].relative_to(ROOT)),
                "overline": entry["overline"],
                "headline": entry["headline"],
            }
            for output, entry in zip(outputs, SCREENS)
        ],
    }
    (OUTPUT.parent / "manifest.json").write_text(
        json.dumps(manifest, indent=2) + "\n",
        encoding="utf-8",
    )
    print(contact_sheet)


if __name__ == "__main__":
    main()
