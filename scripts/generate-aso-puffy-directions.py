from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps
import math


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "app-store" / "aso" / "directions-puffy"
OUT.mkdir(parents=True, exist_ok=True)

W, H = 1320, 2868
BACKGROUND = ROOT / "app-store" / "aso" / "backgrounds" / "pawpair-master.png"
SCREENSHOT = ROOT / "living-pet-home.png"
FONTS = ROOT / "app-store" / "aso" / "fonts"

CREAM = (255, 248, 231)
INK = (38, 65, 62)
CORAL = (241, 119, 93)
BLUE = (105, 167, 194)
OAT = (228, 199, 151)


def font(name: str, size: int):
    return ImageFont.truetype(str(FONTS / name), size=size)


def base_canvas():
    bg = Image.open(BACKGROUND).convert("RGB")
    bg = ImageOps.fit(bg, (W, H), method=Image.Resampling.LANCZOS, centering=(0.5, 0.5))
    veil = Image.new("RGBA", (W, H), (255, 250, 239, 72))
    return Image.alpha_composite(bg.convert("RGBA"), veil)


def soft_ellipse(layer, box, fill, blur=0):
    shape = Image.new("RGBA", layer.size, (0, 0, 0, 0))
    ImageDraw.Draw(shape).ellipse(box, fill=fill)
    if blur:
        shape = shape.filter(ImageFilter.GaussianBlur(blur))
    layer.alpha_composite(shape)


def puffy_line(canvas, text, center, font_obj, fill, stroke, shadow, stroke_width=10, shadow_offset=(0, 15)):
    layer = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    x, y = center
    sx, sy = shadow_offset
    draw.text((x + sx, y + sy), text, font=font_obj, anchor="mm", fill=shadow,
              stroke_width=stroke_width + 6, stroke_fill=shadow)
    draw.text((x, y), text, font=font_obj, anchor="mm", fill=fill,
              stroke_width=stroke_width, stroke_fill=stroke)
    canvas.alpha_composite(layer)


def bouncy_line(canvas, text, center_x, baseline_y, font_obj, fill, stroke, shadow):
    widths = [ImageDraw.Draw(Image.new("RGB", (1, 1))).textlength(ch, font=font_obj) for ch in text]
    total = sum(widths) - max(0, len(text) - 1) * 4
    cursor = center_x - total / 2
    for index, (ch, width) in enumerate(zip(text, widths)):
        if ch == " ":
            cursor += width - 4
            continue
        glyph = Image.new("RGBA", (int(width + 70), 220), (0, 0, 0, 0))
        gdraw = ImageDraw.Draw(glyph)
        gdraw.text((glyph.width / 2 + 4, glyph.height / 2 + 12), ch, font=font_obj, anchor="mm",
                   fill=shadow, stroke_width=14, stroke_fill=shadow)
        gdraw.text((glyph.width / 2, glyph.height / 2), ch, font=font_obj, anchor="mm",
                   fill=fill, stroke_width=8, stroke_fill=stroke)
        angle = [-4, 2, -2, 3, -1][index % 5]
        glyph = glyph.rotate(angle, resample=Image.Resampling.BICUBIC, expand=True)
        y = baseline_y + math.sin(index * 1.18) * 10
        canvas.alpha_composite(glyph, (int(cursor - 30), int(y - glyph.height / 2)))
        cursor += width - 4


def realistic_iphone(canvas, x, y, width):
    screen_src = Image.open(SCREENSHOT).convert("RGB")
    height = int(width * 2.168)
    radius = int(width * 0.118)

    shadow = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.rounded_rectangle((x - 18, y + 34, x + width + 18, y + height + 74), radius=radius + 18,
                         fill=(40, 46, 43, 92))
    shadow = shadow.filter(ImageFilter.GaussianBlur(32))
    canvas.alpha_composite(shadow)

    controls = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    cd = ImageDraw.Draw(controls)
    metal_dark = (72, 76, 74, 255)
    metal_light = (184, 181, 173, 255)
    cd.rounded_rectangle((x - 13, y + 375, x + 5, y + 505), radius=9, fill=metal_dark)
    cd.rounded_rectangle((x - 13, y + 550, x + 5, y + 710), radius=9, fill=metal_dark)
    cd.rounded_rectangle((x - 13, y + 735, x + 5, y + 895), radius=9, fill=metal_dark)
    cd.rounded_rectangle((x + width - 5, y + 560, x + width + 14, y + 835), radius=9, fill=metal_light)
    canvas.alpha_composite(controls)

    shell = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    shell_mask = Image.new("L", canvas.size, 0)
    ImageDraw.Draw(shell_mask).rounded_rectangle((x, y, x + width, y + height), radius=radius, fill=255)
    gradient = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    gp = gradient.load()
    for px in range(x, x + width + 1):
        t = (px - x) / width
        light = int(88 + 118 * (1 - abs(t - 0.53) * 2))
        color = (light, light, max(70, light - 10), 255)
        for py in range(y, y + height + 1):
            gp[px, py] = color
    shell = Image.composite(gradient, shell, shell_mask)
    canvas.alpha_composite(shell)

    draw = ImageDraw.Draw(canvas)
    draw.rounded_rectangle((x + 9, y + 9, x + width - 9, y + height - 9), radius=radius - 7,
                           outline=(38, 39, 38, 255), width=9)
    draw.rounded_rectangle((x + 22, y + 22, x + width - 22, y + height - 22), radius=radius - 18,
                           fill=(3, 4, 4, 255))

    inset = 37
    screen_box = (x + inset, y + inset, x + width - inset, y + height - inset)
    screen_w = screen_box[2] - screen_box[0]
    screen_h = screen_box[3] - screen_box[1]
    fitted = ImageOps.fit(screen_src, (screen_w, screen_h), method=Image.Resampling.LANCZOS,
                          centering=(0.5, 0.5))
    screen_mask = Image.new("L", (screen_w, screen_h), 0)
    ImageDraw.Draw(screen_mask).rounded_rectangle((0, 0, screen_w, screen_h), radius=radius - 32, fill=255)
    canvas.paste(fitted, (screen_box[0], screen_box[1]), screen_mask)

    draw = ImageDraw.Draw(canvas)
    island_w, island_h = int(width * 0.29), int(width * 0.074)
    ix = x + width // 2 - island_w // 2
    iy = y + inset + 22
    draw.rounded_rectangle((ix, iy, ix + island_w, iy + island_h), radius=island_h // 2,
                           fill=(3, 3, 3, 255))
    draw.ellipse((ix + island_w - 42, iy + 17, ix + island_w - 20, iy + 39), fill=(14, 23, 28, 255))
    draw.ellipse((ix + island_w - 37, iy + 21, ix + island_w - 26, iy + 32), fill=(31, 65, 78, 205))

    highlight = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    hd = ImageDraw.Draw(highlight)
    hd.arc((x + 3, y + 3, x + width - 3, y + height - 3), 102, 258,
           fill=(255, 255, 247, 138), width=5)
    canvas.alpha_composite(highlight)


def option_a():
    canvas = base_canvas()
    soft_ellipse(canvas, (92, 115, 345, 368), (241, 119, 93, 86), 2)
    soft_ellipse(canvas, (1010, 330, 1260, 580), (105, 167, 194, 78), 2)
    f = font("Fredoka-Variable.ttf", 142)
    puffy_line(canvas, "Pet care,", (W // 2, 224), f, CREAM, INK, (218, 160, 118, 180), 10, (0, 18))
    puffy_line(canvas, "finally personal.", (W // 2, 408), f, CORAL, INK, (218, 160, 118, 180), 10, (0, 18))
    puffy_line(canvas, "A daily world built around your pet", (W // 2, 565), font("Baloo2-Variable.ttf", 48), INK,
               CREAM, (0, 0, 0, 0), 3, (0, 0))
    realistic_iphone(canvas, 190, 690, 940)
    return canvas


def option_b():
    canvas = base_canvas()
    soft_ellipse(canvas, (-90, 350, 320, 760), (105, 167, 194, 92), 2)
    soft_ellipse(canvas, (1040, 95, 1325, 380), (241, 119, 93, 96), 2)
    f = font("LilitaOne-Regular.ttf", 155)
    bouncy_line(canvas, "PET CARE", W // 2, 225, f, CREAM, INK, (241, 119, 93, 255))
    bouncy_line(canvas, "FEELS ALIVE", W // 2, 402, f, CORAL, INK, (228, 199, 151, 255))
    puffy_line(canvas, "Plans, health and personality in one place", (W // 2, 555), font("Baloo2-Variable.ttf", 45),
               INK, CREAM, (0, 0, 0, 0), 3, (0, 0))
    realistic_iphone(canvas, 155, 675, 1010)
    return canvas


def option_c():
    canvas = base_canvas()
    title_card = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    td = ImageDraw.Draw(title_card)
    td.rounded_rectangle((92, 108, 1228, 610), radius=112, fill=(255, 248, 231, 218),
                         outline=(255, 255, 255, 190), width=6)
    title_card = title_card.filter(ImageFilter.GaussianBlur(0.4))
    canvas.alpha_composite(title_card)
    f = font("Baloo2-Variable.ttf", 154)
    puffy_line(canvas, "More than care.", (W // 2, 265), f, INK, CREAM, (105, 167, 194, 150), 8, (0, 16))
    puffy_line(canvas, "It's their little world.", (W // 2, 438), font("Fredoka-Variable.ttf", 104), CORAL,
               CREAM, (228, 199, 151, 180), 8, (0, 14))
    realistic_iphone(canvas, 178, 680, 965)
    return canvas


OPTIONS = [
    ("A-soft-frosting.png", option_a),
    ("B-balloon-pop.png", option_b),
    ("C-puffy-premium.png", option_c),
]


rendered = []
for filename, factory in OPTIONS:
    image = factory().convert("RGB")
    path = OUT / filename
    image.save(path, quality=96, subsampling=0)
    rendered.append((filename, image))

thumb_w = 420
thumb_h = round(H * thumb_w / W)
sheet = Image.new("RGB", (thumb_w * 3 + 80, thumb_h + 150), (242, 238, 228))
sheet_draw = ImageDraw.Draw(sheet)
labels = ["A  SOFT FROSTING", "B  BALLOON POP", "C  PUFFY PREMIUM"]
label_font = font("Baloo2-Variable.ttf", 34)
for idx, ((_, image), label) in enumerate(zip(rendered, labels)):
    x = 20 + idx * (thumb_w + 20)
    sheet_draw.text((x + thumb_w / 2, 38), label, font=label_font, anchor="mm", fill=INK)
    sheet.paste(image.resize((thumb_w, thumb_h), Image.Resampling.LANCZOS), (x, 95))
sheet.save(OUT / "puffy-directions-contact-sheet.png", quality=95, subsampling=0)
