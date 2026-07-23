#!/usr/bin/env python3
"""Suggest tighter authored blink clips while preserving visible eyelid motion."""

from __future__ import annotations

import importlib.util
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
AUDIT_PATH = ROOT / "scripts/audit-blink-visual-integrity.py"
OUTPUT = ROOT / "app-store/blink-eye-region-suggestions.json"
BEFORE = ROOT / "app-store/blink-eye-regions-before.jpg"
AFTER = ROOT / "app-store/blink-eye-regions-after.jpg"


def load_audit_module():
    spec = importlib.util.spec_from_file_location("pawpair_blink_audit", AUDIT_PATH)
    if spec is None or spec.loader is None:
        raise RuntimeError("Could not load blink audit module")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def score(metrics: dict[str, float], area_ratio: float, shift: float) -> float:
    seam = metrics["halfSeamDelta"] / 34 + metrics["closedSeamDelta"] / 38
    return seam + (1 - area_ratio) * 0.12 + abs(shift) * 0.8


def issues_for(metrics: dict[str, float]) -> list[str]:
    issues: list[str] = []
    if metrics["halfEyeDelta"] < 4:
        issues.append("half-blink-too-subtle")
    if metrics["closedEyeDelta"] < 6:
        issues.append("closed-blink-too-subtle")
    if metrics["halfClosedDelta"] < 3:
        issues.append("half-and-closed-too-similar")
    if metrics["halfSeamDelta"] > 34:
        issues.append("half-blink-seam-risk")
    if metrics["closedSeamDelta"] > 38:
        issues.append("closed-blink-seam-risk")
    return issues


def prepare(module, pack):
    idle_image = Image.open(pack.idle).convert("RGBA")
    half_image = module.contain_to(Image.open(pack.half).convert("RGBA"), idle_image.size)
    closed_image = module.contain_to(Image.open(pack.closed).convert("RGBA"), idle_image.size)
    return {
        "size": idle_image.size,
        "idle": np.asarray(idle_image)[..., :3].astype(np.float32),
        "half": np.asarray(half_image)[..., :3].astype(np.float32),
        "closed": np.asarray(closed_image)[..., :3].astype(np.float32),
    }


def measure_cached(module, prepared, eyes):
    canvas_width, canvas_height = prepared["size"]
    left_x, right_x, y, width, height = eyes
    pixel_width = max(3, round(canvas_width * width))
    pixel_height = max(3, round(canvas_height * height))
    top = round(canvas_height * y)
    values = {name: [] for name in ("halfEye", "closedEye", "gap", "halfSeam", "closedSeam")}
    for left in (round(canvas_width * left_x), round(canvas_width * right_x)):
        right = min(canvas_width, left + pixel_width)
        bottom = min(canvas_height, top + pixel_height)
        safe_left = max(0, left)
        safe_top = max(0, top)
        region_width = right - safe_left
        region_height = bottom - safe_top
        eye_mask = module.ellipse(region_width, region_height)
        inset = max(2, min(7, min(region_width, region_height) // 7))
        inner = module.ellipse(region_width, region_height, inset)
        seam = eye_mask & ~inner
        idle = prepared["idle"][safe_top:bottom, safe_left:right]
        half = prepared["half"][safe_top:bottom, safe_left:right]
        closed = prepared["closed"][safe_top:bottom, safe_left:right]
        half_delta = np.abs(half - idle).mean(axis=2)
        closed_delta = np.abs(closed - idle).mean(axis=2)
        gap = np.abs(closed - half).mean(axis=2)
        values["halfEye"].append(float(half_delta[eye_mask].mean()))
        values["closedEye"].append(float(closed_delta[eye_mask].mean()))
        values["gap"].append(float(gap[inner].mean()))
        values["halfSeam"].append(float(half_delta[seam].mean()))
        values["closedSeam"].append(float(closed_delta[seam].mean()))
    return {
        "halfEyeDelta": round(float(np.mean(values["halfEye"])), 3),
        "closedEyeDelta": round(float(np.mean(values["closedEye"])), 3),
        "halfClosedDelta": round(float(np.mean(values["gap"])), 3),
        "halfSeamDelta": round(float(np.mean(values["halfSeam"])), 3),
        "closedSeamDelta": round(float(np.mean(values["closedSeam"])), 3),
    }


def candidate_eyes(
    eyes: tuple[float, float, float, float, float],
    width_scale: float,
    height_scale: float,
    shift: float,
) -> tuple[float, float, float, float, float]:
    left_x, right_x, y, width, height = eyes
    next_width = width * width_scale
    next_height = height * height_scale
    center_offset_x = (width - next_width) / 2
    center_offset_y = (height - next_height) / 2
    return (
        left_x + center_offset_x,
        right_x + center_offset_x,
        y + center_offset_y + height * shift,
        next_width,
        next_height,
    )


def optimize(module, pack):
    baseline = module.measure(pack)
    prepared = prepare(module, pack)
    baseline_metrics = measure_cached(module, prepared, pack.eyes)
    if not baseline_metrics:
        return None
    best = (score(baseline_metrics, 1, 0), pack.eyes, baseline_metrics)
    for width_scale in (0.72, 0.78, 0.84, 0.9, 0.96):
        for height_scale in (0.68, 0.74, 0.8, 0.86, 0.92):
            area_ratio = width_scale * height_scale
            for shift in (-0.08, -0.04, 0, 0.04, 0.08):
                eyes = candidate_eyes(pack.eyes, width_scale, height_scale, shift)
                metrics = measure_cached(module, prepared, eyes)
                if metrics["halfEyeDelta"] < max(4, baseline_metrics["halfEyeDelta"] * 0.62):
                    continue
                if metrics["closedEyeDelta"] < max(6, baseline_metrics["closedEyeDelta"] * 0.62):
                    continue
                if metrics["halfClosedDelta"] < max(3, baseline_metrics["halfClosedDelta"] * 0.55):
                    continue
                candidate_score = score(metrics, area_ratio, shift)
                if candidate_score < best[0]:
                    best = (candidate_score, eyes, metrics)
    return {
        "key": pack.key,
        "before": {
            "eyes": list(pack.eyes),
            "metrics": baseline_metrics,
            "issues": baseline["issues"],
        },
        "after": {
            "eyes": [round(value, 6) for value in best[1]],
            "metrics": best[2],
            "issues": issues_for(best[2]),
        },
    }


def ellipse_mask(width: int, height: int) -> Image.Image:
    scale = 4
    mask = Image.new("L", (width * scale, height * scale), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, width * scale - 1, height * scale - 1), fill=255)
    return mask.resize((width, height), Image.Resampling.LANCZOS)


def regions(size, eyes):
    canvas_width, canvas_height = size
    left_x, right_x, y, width, height = eyes
    pixel_width = round(canvas_width * width)
    pixel_height = round(canvas_height * height)
    top = round(canvas_height * y)
    return [
        (round(canvas_width * left_x), top, pixel_width, pixel_height),
        (round(canvas_width * right_x), top, pixel_width, pixel_height),
    ]


def composite(module, pack, eyes, frame_path):
    idle = Image.open(pack.idle).convert("RGBA")
    frame = module.contain_to(Image.open(frame_path).convert("RGBA"), idle.size)
    output = idle.copy()
    for left, top, width, height in regions(idle.size, eyes):
        box = (left, top, left + width, top + height)
        output.paste(frame.crop(box), (left, top), ellipse_mask(width, height))
    return output


def tile(module, pack, eyes, label):
    half = composite(module, pack, eyes, pack.half)
    closed = composite(module, pack, eyes, pack.closed)
    boxes = regions(half.size, eyes)
    left = max(0, min(box[0] for box in boxes) - 42)
    top = max(0, min(box[1] for box in boxes) - 42)
    right = min(half.width, max(box[0] + box[2] for box in boxes) + 42)
    bottom = min(half.height, max(box[1] + box[3] for box in boxes) + 42)
    half_crop = half.crop((left, top, right, bottom))
    closed_crop = closed.crop((left, top, right, bottom))
    preview = Image.new("RGBA", (half_crop.width * 2 + 8, half_crop.height), (244, 241, 233, 255))
    preview.alpha_composite(half_crop, (0, 0))
    preview.alpha_composite(closed_crop, (half_crop.width + 8, 0))
    preview.thumbnail((342, 142), Image.Resampling.LANCZOS)
    output = Image.new("RGB", (360, 180), (244, 241, 233))
    output.paste(preview.convert("RGB"), ((360 - preview.width) // 2, 30))
    ImageDraw.Draw(output).text((10, 9), label, fill=(42, 38, 32))
    return output


def sheet(tiles, path):
    columns = 4
    rows = (len(tiles) + columns - 1) // columns
    output = Image.new("RGB", (columns * 360, rows * 180), (244, 241, 233))
    for index, item in enumerate(tiles):
        output.paste(item, ((index % columns) * 360, (index // columns) * 180))
    output.save(path, quality=95, optimize=True)


def main() -> None:
    module = load_audit_module()
    exact = module.parse_exact_packs()
    packs = exact + module.parse_local_packs({pack.key for pack in exact})
    flagged = [pack for pack in packs if module.measure(pack).get("issues")]
    suggestions = [result for pack in flagged if (result := optimize(module, pack))]
    payload = {
        "suggestionCount": len(suggestions),
        "remainingIssueCount": sum(bool(item["after"]["issues"]) for item in suggestions),
        "suggestions": suggestions,
    }
    OUTPUT.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    pack_by_key = {pack.key: pack for pack in flagged}
    sheet(
        [
            tile(module, pack_by_key[item["key"]], tuple(item["before"]["eyes"]), item["key"])
            for item in suggestions
        ],
        BEFORE,
    )
    sheet(
        [
            tile(module, pack_by_key[item["key"]], tuple(item["after"]["eyes"]), item["key"])
            for item in suggestions
        ],
        AFTER,
    )
    print(
        json.dumps(
            {
                "output": str(OUTPUT),
                "beforePreview": str(BEFORE),
                "afterPreview": str(AFTER),
                "suggestionCount": payload["suggestionCount"],
                "remainingIssueCount": payload["remainingIssueCount"],
                "suggestions": [
                    {
                        "key": item["key"],
                        "eyes": item["after"]["eyes"],
                        "issues": item["after"]["issues"],
                    }
                    for item in suggestions
                ],
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
