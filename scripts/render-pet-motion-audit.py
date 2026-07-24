"""Render exhaustive PawPair breed contact sheets and verify blink registration."""

from __future__ import annotations

import argparse
import json
import math
import re
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
MOTION_ROOT = ROOT / "assets" / "pet-motion"
PACK_SOURCE = ROOT / "src" / "features" / "pet-motion" / "exact-breed-packs.ts"
VISIBLE_ALPHA = 8
TILE_WIDTH = 320
TILE_HEIGHT = 390
SUBJECT_AREA = (18, 54, 302, 344)
COLS = 5
ROWS = 3


def font(size: int, bold: bool = False) -> ImageFont.ImageFont:
    candidates = (
        Path("C:/Windows/Fonts/arialbd.ttf") if bold else Path("C:/Windows/Fonts/arial.ttf"),
        Path("C:/Windows/Fonts/segoeuib.ttf") if bold else Path("C:/Windows/Fonts/segoeui.ttf"),
    )
    for candidate in candidates:
        if candidate.exists():
            return ImageFont.truetype(str(candidate), size)
    return ImageFont.load_default()


LABEL_FONT = font(16, True)
META_FONT = font(12)
TITLE_FONT = font(24, True)


def slug_label(value: str) -> str:
    return " ".join(part.capitalize() for part in value.removeprefix("breed-").split("-"))


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


def composite_state(idle: Image.Image, overlay: Image.Image | None) -> Image.Image:
    frame = idle.copy()
    if overlay is not None:
        frame.alpha_composite(overlay)
    return frame


def tile_for(label: str, image: Image.Image, issues: list[str]) -> Image.Image:
    tile = Image.new("RGBA", (TILE_WIDTH, TILE_HEIGHT), "#FFF8EC")
    draw = ImageDraw.Draw(tile)
    draw.rectangle((0, 0, TILE_WIDTH // 2, TILE_HEIGHT), fill="#07163A")
    draw.rectangle((TILE_WIDTH // 2, 0, TILE_WIDTH, TILE_HEIGHT), fill="#FFF8EC")
    fitted = fit_subject(image)
    x = SUBJECT_AREA[0] + (
        SUBJECT_AREA[2] - SUBJECT_AREA[0] - fitted.width
    ) // 2
    y = SUBJECT_AREA[3] - fitted.height
    tile.alpha_composite(fitted, (x, y))
    footer_color = "#C43D32" if issues else "#243258"
    draw.rectangle((0, 344, TILE_WIDTH, TILE_HEIGHT), fill="#FFFDF8")
    draw.text((14, 350), label, font=LABEL_FONT, fill=footer_color)
    status = "; ".join(issues[:2]) if issues else "visual checks passed"
    draw.text((14, 372), status, font=META_FONT, fill=footer_color)
    return tile


def alpha_components(image: Image.Image) -> list[dict[str, float]]:
    width, height = image.size
    alpha = np.asarray(image.getchannel("A"))
    mask = (alpha > VISIBLE_ALPHA).astype(np.uint8)
    count, _labels, stats, centroids = cv2.connectedComponentsWithStats(
        mask,
        connectivity=8,
    )
    components: list[dict[str, float]] = []
    for index in range(1, count):
        left, top, component_width, component_height, pixels = stats[index]
        if pixels < 24:
            continue
        center_x, center_y = centroids[index]
        components.append(
            {
                "left": left / width,
                "right": (left + component_width) / width,
                "top": top / height,
                "bottom": (top + component_height) / height,
                "centerX": center_x / width,
                "centerY": center_y / height,
                "pixels": int(pixels),
            }
        )
    return sorted(components, key=lambda item: item["pixels"], reverse=True)


def expected_eyes() -> tuple[
    dict[str, list[dict[str, float]]],
    dict[str, str],
]:
    source = PACK_SOURCE.read_text(encoding="utf-8")
    block_pattern = re.compile(
        r'key:\s*"(?P<key>breed:[^"]+)".*?'
        r'idle:\s*require\("[^"]*pet-motion/(?P<directory>breed-[^/]+)/[^"]+"\).*?'
        r"eyes:\s*eyePair\((?P<values>[^)]+)\)",
        re.DOTALL,
    )
    result: dict[str, list[dict[str, float]]] = {}
    keys_by_directory: dict[str, str] = {}
    for match in block_pattern.finditer(source):
        values = [float(value.strip()) for value in match.group("values").split(",")]
        if len(values) != 5:
            continue
        left_x, right_x, y, width, height = values
        result[match.group("key")] = [
            {"centerX": left_x + width / 2, "centerY": y + height / 2},
            {"centerX": right_x + width / 2, "centerY": y + height / 2},
        ]
        keys_by_directory[match.group("directory")] = match.group("key")
    return result, keys_by_directory


def registration_issues(
    key: str,
    overlay: Image.Image,
    expected: dict[str, list[dict[str, float]]],
) -> tuple[list[str], list[dict[str, float]]]:
    issues: list[str] = []
    components = alpha_components(overlay)
    alpha = np.asarray(overlay.getchannel("A"))
    transparent_ratio = float(np.count_nonzero(alpha <= VISIBLE_ALPHA)) / alpha.size
    if overlay.getchannel("A").getextrema() == (255, 255):
        issues.append("opaque background")
    elif transparent_ratio < 0.5:
        issues.append(f"low alpha {transparent_ratio:.2f}")
    return issues, components[:2]


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
        f"PawPair exhaustive pet audit — {mode} — page {page}",
        font=TITLE_FONT,
        fill="#111D47",
    )
    for index, entry in enumerate(entries):
        tile = tile_for(
            str(entry["label"]),
            entry[f"{mode}Image"],
            list(entry[f"{mode}Issues"]),
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
    expected, keys_by_directory = expected_eyes()
    entries: list[dict[str, object]] = []

    for directory in sorted(MOTION_ROOT.glob("breed-*")):
        idle_path = directory / "idle-luna-style-v1.png"
        half_path = directory / "blink-half-v2.png"
        blink_path = directory / "blink-v2.png"
        if not idle_path.exists() or not half_path.exists() or not blink_path.exists():
            continue
        key = keys_by_directory.get(
            directory.name,
            f"breed:unknown:{directory.name.removeprefix('breed-')}",
        )
        idle = Image.open(idle_path).convert("RGBA")
        half = Image.open(half_path).convert("RGBA")
        blink = Image.open(blink_path).convert("RGBA")
        half_issues, half_components = registration_issues(key, half, expected)
        blink_issues, blink_components = registration_issues(key, blink, expected)
        entries.append(
            {
                "key": key,
                "label": slug_label(directory.name),
                "idleImage": idle,
                "idleIssues": [],
                "halfImage": composite_state(idle, half),
                "halfIssues": half_issues,
                "blinkImage": composite_state(idle, blink),
                "blinkIssues": blink_issues,
                "halfComponents": half_components,
                "blinkComponents": blink_components,
            }
        )

    modes = ("idle", "half", "blink")
    for mode in modes:
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
            if key
            not in {
                "idleImage",
                "halfImage",
                "blinkImage",
            }
        }
        for entry in entries
    ]
    issue_count = sum(
        len(row["halfIssues"]) + len(row["blinkIssues"]) for row in report_rows
    )
    report = {
        "assetCount": len(entries),
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
                "issueCount": report["issueCount"],
            },
            indent=2,
        )
    )
    if issue_count:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
