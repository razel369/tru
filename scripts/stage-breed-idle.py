from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import subprocess
import sys

from PIL import Image


CANVAS_SIZE = (852, 1846)
RENDER_SIZE = (852, 1278)
RENDER_Y = 385


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Register a generated PawPair breed idle frame on the production canvas."
    )
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--out-dir", type=Path, required=True)
    parser.add_argument(
        "--normalize-magenta",
        action="store_true",
        help="Normalize uneven saturated-magenta backgrounds before chroma removal.",
    )
    return parser.parse_args()


def normalize_magenta_background(image: Image.Image) -> tuple[Image.Image, int]:
    """Flatten generated magenta gradients without touching neutral pet colors."""
    normalized: list[tuple[int, int, int]] = []
    changed = 0

    for red, green, blue in image.getdata():
        is_magenta = (
            red >= 175
            and blue >= 130
            and green <= 150
            and min(red, blue) - green >= 45
            and abs(red - blue) <= 140
        )
        if is_magenta:
            normalized.append((255, 0, 255))
            changed += 1
        else:
            normalized.append((red, green, blue))

    output = Image.new("RGB", image.size)
    output.putdata(normalized)
    return output, changed


def alpha_report(path: Path) -> dict[str, object]:
    image = Image.open(path).convert("RGBA")
    alpha = image.getchannel("A")
    pixels = list(alpha.getdata())
    transparent = sum(value < 255 for value in pixels)
    visible = sum(value > 8 for value in pixels)
    corners = [
        alpha.getpixel((0, 0)),
        alpha.getpixel((image.width - 1, 0)),
        alpha.getpixel((0, image.height - 1)),
        alpha.getpixel((image.width - 1, image.height - 1)),
    ]
    return {
        "alphaBBox": alpha.getbbox(),
        "alphaExtrema": alpha.getextrema(),
        "cornerAlpha": corners,
        "height": image.height,
        "transparentRatio": transparent / len(pixels),
        "visibleRatio": visible / len(pixels),
        "width": image.width,
    }


def main() -> None:
    args = parse_args()
    source = args.source.resolve(strict=True)
    out_dir = args.out_dir.resolve()
    out_dir.mkdir(parents=True, exist_ok=True)

    chroma_path = out_dir / "idle-luna-style-v1-chroma.png"
    output_path = out_dir / "idle-luna-style-v1.png"
    report_path = out_dir / "idle-stage-report.json"

    generated = Image.open(source).convert("RGB")
    normalized_pixels = 0
    if args.normalize_magenta:
        generated, normalized_pixels = normalize_magenta_background(generated)
    rendered = generated.resize(RENDER_SIZE, Image.Resampling.LANCZOS)
    canvas = Image.new("RGB", CANVAS_SIZE, (255, 0, 255))
    canvas.paste(rendered, (0, RENDER_Y))
    canvas.save(chroma_path, optimize=True)

    codex_home = Path(os.environ.get("CODEX_HOME", Path.home() / ".codex"))
    helper = codex_home / "skills" / ".system" / "imagegen" / "scripts" / "remove_chroma_key.py"
    subprocess.run(
        [
            sys.executable,
            str(helper),
            "--input",
            str(chroma_path),
            "--out",
            str(output_path),
            "--auto-key",
            "border",
            "--soft-matte",
            "--transparent-threshold",
            "12",
            "--opaque-threshold",
            "220",
            "--despill",
            "--force",
            "--edge-contract",
            "2",
        ],
        check=True,
    )

    report = alpha_report(output_path)
    if report["width"] != CANVAS_SIZE[0] or report["height"] != CANVAS_SIZE[1]:
        raise RuntimeError("Staged image does not use the production canvas.")
    if report["transparentRatio"] < 0.12:
        raise RuntimeError("Staged image does not contain enough transparent canvas.")
    if max(report["cornerAlpha"]) > 8:
        raise RuntimeError("Chroma removal left visible pixels in a canvas corner.")
    if report["alphaBBox"] is None:
        raise RuntimeError("Chroma removal produced an empty image.")

    report_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(
        json.dumps(
            {
                "output": str(output_path),
                "normalizedMagentaPixels": normalized_pixels,
                "report": report,
                "reportPath": str(report_path),
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
