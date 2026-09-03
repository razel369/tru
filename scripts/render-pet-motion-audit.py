"""Render every PawPair pet through the same per-eye blink clips as the app."""

from __future__ import annotations

import argparse
import json
import re
from dataclasses import dataclass
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
EXACT_PACKS = ROOT / "src/features/pet-motion/exact-breed-packs.ts"
LOCAL_PACKS = ROOT / "src/features/pet-motion/local-packs.ts"
BLINK_SAFETY = ROOT / "src/features/pet-motion/blink-safety.ts"
VISIBLE_ALPHA = 8
TILE_WIDTH = 320
TILE_HEIGHT = 390
SUBJECT_AREA = (18, 54, 302, 344)
COLS = 5
ROWS = 3


@dataclass(frozen=True)
class Pack:
    key: str
    idle: Path
    half: Path
    closed: Path
    eyes: tuple[float, float, float, float, float]


def font(size: int, bold: bool = False) -> ImageFont.ImageFont:
    candidates = (
        Path("C:/Windows/Fonts/arialbd.ttf")
        if bold
        else Path("C:/Windows/Fonts/arial.ttf"),
        Path("C:/Windows/Fonts/segoeuib.ttf")
        if bold
        else Path("C:/Windows/Fonts/segoeui.ttf"),
    )
    for candidate in candidates:
        if candidate.exists():
            return ImageFont.truetype(str(candidate), size)
    return ImageFont.load_default()


LABEL_FONT = font(16, True)
META_FONT = font(12)
TITLE_FONT = font(24, True)


def asset_path(source_file: Path, value: str) -> Path:
    return (source_file.parent / value).resolve()


def parse_exact_packs() -> list[Pack]:
    source = EXACT_PACKS.read_text(encoding="utf-8")
    pattern = re.compile(
        r'key:\s*"(?P<key>[^"]+)"[\s\S]*?'
        r'idle:\s*require\("(?P<idle>[^"]+)"\)[\s\S]*?'
        r'blinkHalf:\s*require\("(?P<half>[^"]+)"\)[\s\S]*?'
        r'blink:\s*require\("(?P<closed>[^"]+)"\)[\s\S]*?'
        r'eyes:\s*eyePair\((?P<eyes>[^)]+)\)',
    )
    packs: list[Pack] = []
    for match in pattern.finditer(source):
        eyes = tuple(float(value.strip()) for value in match.group("eyes").split(","))
        if len(eyes) != 5:
            continue
        packs.append(
            Pack(
                key=match.group("key"),
                idle=asset_path(EXACT_PACKS, match.group("idle")),
                half=asset_path(EXACT_PACKS, match.group("half")),
                closed=asset_path(EXACT_PACKS, match.group("closed")),
                eyes=eyes,
            )
        )
    return packs


def resolve_local_asset(token: str, constants: dict[str, str]) -> str | None:
    token = token.strip()
    direct = re.fullmatch(r'require\("([^"]+)"\)', token)
    if direct:
        return direct.group(1)
    return constants.get(token)


def find_idle_near(frame: Path) -> Path | None:
    preferred = (
        frame.parent / "idle-luna-style-v1.png",
        frame.parent / "idle-v2.png",
        frame.parent / "idle.png",
    )
    for candidate in preferred:
        if candidate.exists():
            return candidate
    candidates = sorted(
        path
        for path in frame.parent.glob("idle*.png")
        if "chroma" not in path.name and "extracted" not in path.name
    )
    return candidates[0] if candidates else None


def parse_local_packs(existing_keys: set[str]) -> list[Pack]:
    source = LOCAL_PACKS.read_text(encoding="utf-8")
    constants = dict(
        re.findall(r'const\s+([A-Z0-9_]+)\s*=\s*require\("([^"]+)"\);', source)
    )
    pattern = re.compile(
        r'"(?P<key>[^"]+)":\s*blinkSpec\(\s*'
        r'(?P<half>require\("[^"]+"\)|[A-Z0-9_]+)\s*,\s*'
        r'(?P<closed>require\("[^"]+"\)|[A-Z0-9_]+)\s*,\s*'
        r'eyePair\((?P<eyes>[^)]+)\)',
    )
    packs: list[Pack] = []
    for match in pattern.finditer(source):
        key = match.group("key")
        if key in existing_keys:
            continue
        half_value = resolve_local_asset(match.group("half"), constants)
        closed_value = resolve_local_asset(match.group("closed"), constants)
        if not half_value or not closed_value:
            continue
        half = asset_path(LOCAL_PACKS, half_value)
        closed = asset_path(LOCAL_PACKS, closed_value)
        idle = find_idle_near(closed)
        if idle is None:
            continue
        eyes = tuple(float(value.strip()) for value in match.group("eyes").split(","))
        if len(eyes) != 5:
            continue
        packs.append(Pack(key, idle, half, closed, eyes))
    return packs


def parse_disabled_blink_keys() -> set[str]:
    source = BLINK_SAFETY.read_text(encoding="utf-8")
    match = re.search(
        r"DISABLED_AUTHORED_BLINK_KEYS\s*=\s*\[(?P<keys>[\s\S]*?)\]\s*as const",
        source,
    )
    return set(re.findall(r'"([^"]+)"', match.group("keys"))) if match else set()


def label_for(key: str) -> str:
    slug = key.split(":")[-1]
    return " ".join(part.capitalize() for part in slug.split("-"))


def alpha_bbox(image: Image.Image) -> tuple[int, int, int, int] | None:
    alpha = image.getchannel("A")
    return alpha.point(lambda value: 255 if value > VISIBLE_ALPHA else 0).getbbox()


def fit_subject(image: Image.Image) -> Image.Image:
    bbox = alpha_bbox(image)
    if not bbox:
        return image
    cropped = image.crop(bbox)
    target_width = SUBJECT_AREA[2] - SUBJECT_AREA[0]
    target_height = SUBJECT_AREA[3] - SUBJECT_AREA[1]
    scale = min(target_width / cropped.width, target_height / cropped.height)
    return cropped.resize(
        (max(1, round(cropped.width * scale)), max(1, round(cropped.height * scale))),
        Image.Resampling.LANCZOS,
    )


def contain_to(image: Image.Image, size: tuple[int, int]) -> Image.Image:
    if image.size == size:
        return image
    scale = min(size[0] / image.width, size[1] / image.height)
    resized = image.resize(
        (round(image.width * scale), round(image.height * scale)),
        Image.Resampling.LANCZOS,
    )
    result = Image.new("RGBA", size, (0, 0, 0, 0))
    result.alpha_composite(
        resized,
        ((size[0] - resized.width) // 2, (size[1] - resized.height) // 2),
    )
    return result


def ellipse_mask(width: int, height: int) -> Image.Image:
    scale = 4
    mask = Image.new("L", (width * scale, height * scale), 0)
    ImageDraw.Draw(mask).ellipse(
        (0, 0, width * scale - 1, height * scale - 1),
        fill=255,
    )
    return mask.resize((width, height), Image.Resampling.LANCZOS)


def composite_state(
    idle: Image.Image,
    overlay: Image.Image,
    eyes: tuple[float, float, float, float, float],
) -> Image.Image:
    frame = contain_to(overlay, idle.size)
    result = idle.copy()
    canvas_width, canvas_height = idle.size
    left_x, right_x, y, width, height = eyes
    pixel_width = max(3, round(canvas_width * width))
    pixel_height = max(3, round(canvas_height * height))
    top = max(0, round(canvas_height * y))
    for normalized_x in (left_x, right_x):
        left = max(0, round(canvas_width * normalized_x))
        right = min(canvas_width, left + pixel_width)
        bottom = min(canvas_height, top + pixel_height)
        patch_width = right - left
        patch_height = bottom - top
        if patch_width < 3 or patch_height < 3:
            continue
        patch = frame.crop((left, top, right, bottom))
        clipped = patch.copy()
        clipped.putalpha(
            ImageChops.multiply(
                patch.getchannel("A"),
                ellipse_mask(patch_width, patch_height),
            )
        )
        result.alpha_composite(clipped, (left, top))
    return result


def tile_for(label: str, image: Image.Image, status: str, issue: bool) -> Image.Image:
    tile = Image.new("RGBA", (TILE_WIDTH, TILE_HEIGHT), "#FFF8EC")
    draw = ImageDraw.Draw(tile)
    draw.rectangle((0, 0, TILE_WIDTH // 2, TILE_HEIGHT), fill="#07163A")
    draw.rectangle((TILE_WIDTH // 2, 0, TILE_WIDTH, TILE_HEIGHT), fill="#FFF8EC")
    fitted = fit_subject(image)
    x = SUBJECT_AREA[0] + (SUBJECT_AREA[2] - SUBJECT_AREA[0] - fitted.width) // 2
    y = SUBJECT_AREA[3] - fitted.height
    tile.alpha_composite(fitted, (x, y))
    footer_color = "#C43D32" if issue else "#243258"
    draw.rectangle((0, 344, TILE_WIDTH, TILE_HEIGHT), fill="#FFFDF8")
    draw.text((14, 350), label, font=LABEL_FONT, fill=footer_color)
    draw.text((14, 372), status, font=META_FONT, fill=footer_color)
    return tile


def render_sheet(
    entries: list[dict[str, object]],
    output: Path,
    mode: str,
    page: int,
) -> None:
    canvas = Image.new(
        "RGBA",
        (COLS * TILE_WIDTH, ROWS * TILE_HEIGHT + 48),
        "#F0E8D9",
    )
    draw = ImageDraw.Draw(canvas)
    draw.text(
        (18, 10),
        f"PawPair exhaustive pet audit - {mode} - page {page}",
        font=TITLE_FONT,
        fill="#111D47",
    )
    for index, entry in enumerate(entries):
        tile = tile_for(
            str(entry["label"]),
            entry[f"{mode}Image"],
            str(entry["status"]),
            bool(entry["issues"]),
        )
        x = (index % COLS) * TILE_WIDTH
        y = 48 + (index // COLS) * TILE_HEIGHT
        canvas.alpha_composite(tile, (x, y))
    output.parent.mkdir(parents=True, exist_ok=True)
    canvas.convert("RGB").save(output, quality=95)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--output",
        default="docs/audits/2026-07-24-pet-motion-exhaustive",
    )
    args = parser.parse_args()
    output_dir = ROOT / args.output
    output_dir.mkdir(parents=True, exist_ok=True)
    exact = parse_exact_packs()
    packs = exact + parse_local_packs({pack.key for pack in exact})
    disabled_keys = parse_disabled_blink_keys()
    entries: list[dict[str, object]] = []

    for pack in sorted(packs, key=lambda item: item.key):
        missing = [
            str(path)
            for path in (pack.idle, pack.half, pack.closed)
            if not path.exists()
        ]
        issues = ["missing assets"] if missing else []
        if missing:
            continue
        idle = Image.open(pack.idle).convert("RGBA")
        disabled = pack.key in disabled_keys
        half = (
            idle.copy()
            if disabled
            else composite_state(
                idle,
                Image.open(pack.half).convert("RGBA"),
                pack.eyes,
            )
        )
        closed = (
            idle.copy()
            if disabled
            else composite_state(
                idle,
                Image.open(pack.closed).convert("RGBA"),
                pack.eyes,
            )
        )
        entries.append(
            {
                "key": pack.key,
                "label": label_for(pack.key),
                "disabled": disabled,
                "eyes": list(pack.eyes),
                "issues": issues,
                "missing": missing,
                "status": "static - blink disabled safely" if disabled else "runtime eye clips rendered",
                "idleImage": idle,
                "halfImage": half,
                "blinkImage": closed,
            }
        )

    for mode in ("idle", "half", "blink"):
        for offset in range(0, len(entries), COLS * ROWS):
            page = offset // (COLS * ROWS) + 1
            render_sheet(
                entries[offset : offset + COLS * ROWS],
                output_dir / f"{mode}-{page:02d}.jpg",
                mode,
                page,
            )

    report_rows = [
        {
            key: value
            for key, value in entry.items()
            if key not in {"idleImage", "halfImage", "blinkImage"}
        }
        for entry in entries
    ]
    issue_count = sum(len(row["issues"]) for row in report_rows)
    report = {
        "assetCount": len(entries),
        "activeBlinkCount": len(entries) - len(disabled_keys),
        "disabledBlinkCount": len(disabled_keys),
        "issueCount": issue_count,
        "rows": report_rows,
    }
    (output_dir / "report.json").write_text(
        json.dumps(report, indent=2) + "\n",
        encoding="utf-8",
    )
    print(
        json.dumps(
            {
                "output": str(output_dir),
                "assetCount": report["assetCount"],
                "activeBlinkCount": report["activeBlinkCount"],
                "disabledBlinkCount": report["disabledBlinkCount"],
                "issueCount": report["issueCount"],
            },
            indent=2,
        )
    )
    if issue_count:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
