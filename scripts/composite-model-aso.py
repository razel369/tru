from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "app-store" / "aso" / "iphone-6.9" / "model-b"
TARGET_SIZE = (1320, 2868)

SCREENS = [
    ("01-pet-care-ai-source.png", ROOT / "living-pet-home.png", "01-pet-care-ai.png"),
    ("02-daily-care-ai-source.png", ROOT / "app-store" / "screenshots" / "iphone-6.9" / "03-plan.png", "02-daily-care-ai.png"),
    ("03-pet-health-ai-source.png", ROOT / "app-store" / "screenshots" / "iphone-6.9" / "04-health.png", "03-pet-health-ai.png"),
    ("04-every-pet-ai-source.png", ROOT / "app-store" / "aso" / "ui-sources" / "pets-full-models.png", "04-every-pet-ai.png"),
    ("05-private-ai-source.png", ROOT / "app-store" / "screenshots" / "iphone-6.9" / "05-settings.png", "05-private-ai.png"),
]


def chroma_mask(image):
    pixels = image.load()
    mask = Image.new("L", image.size, 0)
    mask_pixels = mask.load()
    xs, ys = [], []
    for y in range(image.height):
        for x in range(image.width):
            red, green, blue, _ = pixels[x, y]
            if green > 145 and green > red * 1.55 and green > blue * 1.55:
                mask_pixels[x, y] = 255
                xs.append(x)
                ys.append(y)
    if not xs:
        raise RuntimeError("No chroma screen detected")
    return mask.filter(ImageFilter.MaxFilter(3)), (min(xs), min(ys), max(xs) + 1, max(ys) + 1)


def composite(marketing_path, ui_path, output_path):
    marketing = Image.open(marketing_path).convert("RGBA")
    ui = Image.open(ui_path).convert("RGB")
    mask, bbox = chroma_mask(marketing)
    screen_size = (bbox[2] - bbox[0], bbox[3] - bbox[1])
    screen = Image.new("RGBA", screen_size, (249, 245, 237, 255))
    fitted_ui = ImageOps.contain(
        ui,
        screen_size,
        method=Image.Resampling.LANCZOS,
    ).convert("RGBA")
    safe_x = (screen_size[0] - fitted_ui.width) // 2
    safe_y = (screen_size[1] - fitted_ui.height) // 2
    screen.alpha_composite(fitted_ui, (safe_x, safe_y))
    insert = Image.new("RGBA", marketing.size, (0, 0, 0, 0))
    insert.paste(screen, (bbox[0], bbox[1]))
    merged = Image.composite(insert, marketing, mask).convert("RGB")
    final = ImageOps.fit(merged, TARGET_SIZE, method=Image.Resampling.LANCZOS, centering=(0.5, 0.5))
    final.save(output_path, quality=97, subsampling=0)
    return final


OUT.mkdir(parents=True, exist_ok=True)
rendered = []
for marketing_name, ui_path, output_name in SCREENS:
    rendered.append((output_name, composite(OUT / marketing_name, ui_path, OUT / output_name)))

thumb_width = 300
thumb_height = round(TARGET_SIZE[1] * thumb_width / TARGET_SIZE[0])
gap = 24
label_height = 54
sheet = Image.new("RGB", (gap * 4 + thumb_width * 3, gap * 3 + (thumb_height + label_height) * 2), (242, 238, 228))
draw = ImageDraw.Draw(sheet)
font = ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", 24)
labels = ["01 HERO", "02 DAILY CARE", "03 PET HEALTH", "04 EVERY PET", "05 PRIVACY"]
for index, ((_, image), label) in enumerate(zip(rendered, labels)):
    row, column = divmod(index, 3)
    x = gap + column * (thumb_width + gap)
    y = gap + row * (thumb_height + label_height + gap)
    draw.text((x + thumb_width / 2, y + 18), label, font=font, fill=(38, 65, 62), anchor="mm")
    sheet.paste(image.resize((thumb_width, thumb_height), Image.Resampling.LANCZOS), (x, y + label_height))
sheet.save(OUT / "model-b-contact-sheet.png", quality=95, subsampling=0)
