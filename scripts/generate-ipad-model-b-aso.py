from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps


ROOT = Path(__file__).resolve().parents[1]
CANVAS = (2064, 2752)
CAPTURES = ROOT / "app-store" / "screenshots" / "ipad-13-final"
OUTPUT = ROOT / "app-store" / "aso" / "ipad-13" / "model-b"
BACKGROUND = ROOT / "app-store" / "aso" / "backgrounds" / "pawpair-master.png"
FONTS = ROOT / "app-store" / "aso" / "fonts"

CREAM = (255, 248, 231)
INK = (38, 65, 62)
CORAL = (241, 119, 93)
BLUE = (105, 167, 194)
OAT = (228, 199, 151)

SCREENS = [
    {
        "capture": "01-home.png",
        "output": "01-pet-care-ai.png",
        "headline": ("CARE THAT", "FEELS ALIVE"),
        "subtitle": "A calm daily world built around your pet.",
        "accent": CORAL,
    },
    {
        "capture": "02-plan.png",
        "output": "02-daily-care-ai.png",
        "headline": ("EVERY DAY", "STAYS CLEAR"),
        "subtitle": "Meals, walks, medication and routines together.",
        "accent": BLUE,
    },
    {
        "capture": "03-health.png",
        "output": "03-pet-health-ai.png",
        "headline": ("THEIR HEALTH", "IN ONE PLACE"),
        "subtitle": "Weight, vaccines, symptoms and vet visits.",
        "accent": CORAL,
    },
    {
        "capture": "04-pets.png",
        "output": "04-every-pet-ai.png",
        "headline": ("MADE FOR", "EVERY PET"),
        "subtitle": "A personal space for every companion you love.",
        "accent": OAT,
    },
    {
        "capture": "05-settings.png",
        "output": "05-private-ai.png",
        "headline": ("PRIVATE", "BY DESIGN"),
        "subtitle": "Local-first care with choices you control.",
        "accent": BLUE,
    },
]


def font(name: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(FONTS / name), size=size)


def make_background(accent: tuple[int, int, int]) -> Image.Image:
    source = Image.open(BACKGROUND).convert("RGB")
    canvas = ImageOps.fit(
        source,
        CANVAS,
        method=Image.Resampling.LANCZOS,
        centering=(0.5, 0.5),
    ).convert("RGBA")
    canvas = Image.alpha_composite(
        canvas,
        Image.new("RGBA", CANVAS, (255, 250, 239, 72)),
    )

    glow = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    glow_draw.ellipse((-120, 80, 470, 670), fill=(*accent, 74))
    glow_draw.ellipse((1660, 250, 2180, 770), fill=(*OAT, 66))
    glow = glow.filter(ImageFilter.GaussianBlur(8))
    return Image.alpha_composite(canvas, glow)


def puffy_text(
    canvas: Image.Image,
    text: str,
    center: tuple[int, int],
    fill: tuple[int, int, int],
    size: int,
) -> None:
    layer = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    title_font = font("LilitaOne-Regular.ttf", size)
    x, y = center
    draw.text(
        (x + 3, y + 18),
        text,
        anchor="mm",
        font=title_font,
        fill=(208, 151, 111, 170),
        stroke_fill=(208, 151, 111, 170),
        stroke_width=18,
    )
    draw.text(
        (x, y),
        text,
        anchor="mm",
        font=title_font,
        fill=fill,
        stroke_fill=INK,
        stroke_width=10,
    )
    canvas.alpha_composite(layer)


def fit_capture(source: Path, size: tuple[int, int]) -> Image.Image:
    capture = Image.open(source).convert("RGB")
    fitted = ImageOps.contain(capture, size, method=Image.Resampling.LANCZOS)
    screen = Image.new("RGB", size, (247, 241, 232))
    screen.paste(
        fitted,
        ((size[0] - fitted.width) // 2, (size[1] - fitted.height) // 2),
    )
    return screen


def add_ipad(canvas: Image.Image, source: Path) -> None:
    x, y = 254, 654
    width, height = 1556, 2075
    radius = 86

    shadow = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow)
    shadow_draw.rounded_rectangle(
        (x - 24, y + 36, x + width + 24, y + height + 62),
        radius=radius + 24,
        fill=(38, 46, 43, 96),
    )
    canvas.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(38)))

    frame = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
    frame_draw = ImageDraw.Draw(frame)
    frame_draw.rounded_rectangle(
        (x, y, x + width, y + height),
        radius=radius,
        fill=(189, 187, 179, 255),
        outline=(255, 255, 249, 220),
        width=8,
    )
    frame_draw.rounded_rectangle(
        (x + 15, y + 15, x + width - 15, y + height - 15),
        radius=radius - 12,
        fill=(24, 27, 27, 255),
    )
    canvas.alpha_composite(frame)

    inset = 34
    screen_size = (width - inset * 2, height - inset * 2)
    screen = fit_capture(source, screen_size)
    mask = Image.new("L", screen_size, 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        (0, 0, screen_size[0], screen_size[1]),
        radius=radius - 29,
        fill=255,
    )
    canvas.paste(screen, (x + inset, y + inset), mask)

    detail = ImageDraw.Draw(canvas)
    camera_x = x + width // 2
    camera_y = y + 17
    detail.ellipse(
        (camera_x - 7, camera_y - 7, camera_x + 7, camera_y + 7),
        fill=(8, 13, 15, 255),
    )
    detail.ellipse(
        (camera_x - 3, camera_y - 3, camera_x + 3, camera_y + 3),
        fill=(31, 65, 78, 220),
    )


def render(entry: dict[str, object]) -> Path:
    capture = CAPTURES / str(entry["capture"])
    if not capture.exists():
        raise FileNotFoundError(
            f"Missing final iPad capture: {capture}. Capture the final binary first."
        )

    accent = entry["accent"]
    assert isinstance(accent, tuple)
    headline = entry["headline"]
    assert isinstance(headline, tuple)
    canvas = make_background(accent)

    badge_draw = ImageDraw.Draw(canvas)
    badge_font = font("Baloo2-Variable.ttf", 34)
    badge_draw.rounded_rectangle(
        (804, 62, 1260, 132),
        radius=35,
        fill=(255, 248, 231, 225),
        outline=(*accent, 145),
        width=3,
    )
    badge_draw.text(
        (1032, 96),
        "PAWPAIR  |  IPAD",
        anchor="mm",
        font=badge_font,
        fill=INK,
    )

    puffy_text(canvas, str(headline[0]), (CANVAS[0] // 2, 246), CREAM, 154)
    puffy_text(canvas, str(headline[1]), (CANVAS[0] // 2, 420), accent, 154)

    subtitle_font = font("Baloo2-Variable.ttf", 44)
    badge_draw.text(
        (CANVAS[0] // 2, 548),
        str(entry["subtitle"]),
        anchor="mm",
        font=subtitle_font,
        fill=INK,
    )

    add_ipad(canvas, capture)
    output = OUTPUT / str(entry["output"])
    canvas.convert("RGB").save(output, quality=97, subsampling=0)
    return output


def contact_sheet(paths: list[Path]) -> None:
    thumb_width = 360
    thumb_height = round(CANVAS[1] * thumb_width / CANVAS[0])
    gap = 28
    label_height = 56
    sheet = Image.new(
        "RGB",
        (gap * 4 + thumb_width * 3, gap * 3 + (thumb_height + label_height) * 2),
        (242, 238, 228),
    )
    draw = ImageDraw.Draw(sheet)
    label_font = font("Baloo2-Variable.ttf", 28)
    for index, path in enumerate(paths):
        row, column = divmod(index, 3)
        x = gap + column * (thumb_width + gap)
        y = gap + row * (thumb_height + label_height + gap)
        draw.text(
            (x + thumb_width // 2, y + 20),
            path.stem,
            anchor="mm",
            font=label_font,
            fill=INK,
        )
        image = Image.open(path).convert("RGB")
        sheet.paste(
            image.resize((thumb_width, thumb_height), Image.Resampling.LANCZOS),
            (x, y + label_height),
        )
    sheet.save(OUTPUT / "model-b-contact-sheet.png", quality=95, subsampling=0)


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    paths = [render(entry) for entry in SCREENS]
    contact_sheet(paths)
    print(f"Generated {len(paths)} iPad App Store screenshots in {OUTPUT}")


if __name__ == "__main__":
    main()
