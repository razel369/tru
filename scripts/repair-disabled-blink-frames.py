#!/usr/bin/env python3
"""Repair selected authored blink frames by feathering their eyes into idle art."""

from __future__ import annotations

import importlib.util
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
AUDIT_PATH = ROOT / "scripts/audit-blink-visual-integrity.py"
OUTPUT = ROOT / "app-store/authored-blink-repairs.json"
REPAIR_KEYS = {
    "breed:cat:bengal",
    "breed:cat:birman",
    "breed:cat:maine-coon",
    "breed:cat:persian",
    "breed:dog:chihuahua",
    "breed:dog:havanese",
    "breed:dog:pug",
    "breed:dog:shih-tzu",
    "breed:dog:yorkshire-terrier",
}


def load_audit_module():
    spec = importlib.util.spec_from_file_location("pawpair_blink_audit", AUDIT_PATH)
    if spec is None or spec.loader is None:
        raise RuntimeError("Could not load blink audit module")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def smoothstep(edge0: float, edge1: float, value: np.ndarray) -> np.ndarray:
    normalized = np.clip((value - edge0) / (edge1 - edge0), 0, 1)
    return normalized * normalized * (3 - 2 * normalized)


def repair_frame(module, pack, frame_path: Path, destination: Path) -> None:
    idle_image = Image.open(pack.idle).convert("RGBA")
    authored_image = module.contain_to(
        Image.open(frame_path).convert("RGBA"),
        idle_image.size,
    )
    idle = np.asarray(idle_image).astype(np.float32)
    authored = np.asarray(authored_image).astype(np.float32)
    output = idle.copy()
    canvas_width, canvas_height = idle_image.size
    left_x, right_x, y, width, height = pack.eyes
    pixel_width = max(3, round(canvas_width * width))
    pixel_height = max(3, round(canvas_height * height))
    top = max(0, round(canvas_height * y))

    for normalized_left in (left_x, right_x):
        left = max(0, round(canvas_width * normalized_left))
        right = min(canvas_width, left + pixel_width)
        bottom = min(canvas_height, top + pixel_height)
        region_width = right - left
        region_height = bottom - top
        if region_width < 3 or region_height < 3:
            raise ValueError(f"Invalid eye region for {pack.key}")

        idle_patch = idle[top:bottom, left:right]
        authored_patch = authored[top:bottom, left:right]
        yy, xx = np.mgrid[0:region_height, 0:region_width]
        radius = np.sqrt(
            ((xx + 0.5 - region_width / 2) / (region_width / 2)) ** 2
            + ((yy + 0.5 - region_height / 2) / (region_height / 2)) ** 2
        )

        # Estimate the source-frame color drift from the fur ring around the eye.
        # Removing this median offset preserves the authored eyelid while matching
        # the pet's real coat color in the idle portrait.
        ring = (radius >= 0.7) & (radius <= 0.92)
        visible = (idle_patch[..., 3] > 16) & (authored_patch[..., 3] > 16)
        sample = ring & visible
        if np.count_nonzero(sample) >= 24:
            color_offset = np.median(
                authored_patch[..., :3][sample] - idle_patch[..., :3][sample],
                axis=0,
            )
        else:
            color_offset = np.zeros(3, dtype=np.float32)

        corrected_rgb = np.clip(
            authored_patch[..., :3] - color_offset.reshape(1, 1, 3),
            0,
            255,
        )
        # Keep the authored eye fully visible at the center, then transition to
        # the exact idle pixels before the runtime clip boundary. This removes
        # hard oval seams and prevents a green/magenta flash during the blink.
        blend = 1 - smoothstep(0.58, 0.9, radius)
        blend *= visible.astype(np.float32)
        blend = blend[..., None]
        output_patch = output[top:bottom, left:right]
        output_patch[..., :3] = (
            corrected_rgb * blend + idle_patch[..., :3] * (1 - blend)
        )
        output_patch[..., 3] = idle_patch[..., 3]

    destination.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(np.rint(output).astype(np.uint8)).save(
        destination,
        optimize=True,
    )


def main() -> None:
    module = load_audit_module()
    exact = module.parse_exact_packs()
    packs = exact + module.parse_local_packs({pack.key for pack in exact})
    repaired = []

    for pack in packs:
        if pack.key not in REPAIR_KEYS:
            continue
        half_source = pack.half.with_name("blink-half-v2.png")
        closed_source = pack.closed.with_name("blink-v2.png")
        half_destination = pack.half.with_name("blink-half-v3.png")
        closed_destination = pack.closed.with_name("blink-v3.png")
        repair_frame(module, pack, half_source, half_destination)
        repair_frame(module, pack, closed_source, closed_destination)
        repaired.append(
            {
                "key": pack.key,
                "method": "authored-v2-color-corrected-feather",
                "half": str(half_destination.relative_to(ROOT)),
                "closed": str(closed_destination.relative_to(ROOT)),
                "eyes": list(pack.eyes),
            }
        )

    missing = sorted(REPAIR_KEYS - {item["key"] for item in repaired})
    payload = {
        "repairedCount": len(repaired),
        "missingKeys": missing,
        "frames": repaired,
    }
    OUTPUT.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(json.dumps(payload, indent=2))
    if missing:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
