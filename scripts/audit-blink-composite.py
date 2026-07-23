#!/usr/bin/env python3
"""Render authored blink frames through the same per-eye clips used by the app."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw


def ellipse_mask(width: int, height: int, inset: int = 0) -> Image.Image:
    scale = 4
    mask = Image.new("L", (width * scale, height * scale), 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse(
        (
            inset * scale,
            inset * scale,
            (width - inset) * scale - 1,
            (height - inset) * scale - 1,
        ),
        fill=255,
    )
    return mask.resize((width, height), Image.Resampling.LANCZOS)


def region_pixels(
    size: tuple[int, int],
    left_x: float,
    right_x: float,
    y: float,
    width: float,
    height: float,
) -> list[tuple[int, int, int, int]]:
    canvas_width, canvas_height = size
    box_width = round(canvas_width * width)
    box_height = round(canvas_height * height)
    top = round(canvas_height * y)
    return [
        (round(canvas_width * left_x), top, box_width, box_height),
        (round(canvas_width * right_x), top, box_width, box_height),
    ]


def composite(
    idle: Image.Image,
    frame: Image.Image,
    regions: list[tuple[int, int, int, int]],
) -> Image.Image:
    result = idle.copy()
    for left, top, width, height in regions:
        box = (left, top, left + width, top + height)
        patch = frame.crop(box)
        result.paste(patch, (left, top), ellipse_mask(width, height))
    return result


def frame_metrics(
    idle: Image.Image,
    frame: Image.Image,
    regions: list[tuple[int, int, int, int]],
) -> dict[str, float]:
    idle_rgb = np.asarray(idle)[..., :3].astype(np.float32)
    frame_rgb = np.asarray(frame)[..., :3].astype(np.float32)
    region_deltas: list[float] = []
    seam_deltas: list[float] = []

    for left, top, width, height in regions:
        idle_patch = idle_rgb[top : top + height, left : left + width]
        frame_patch = frame_rgb[top : top + height, left : left + width]
        delta = np.abs(frame_patch - idle_patch).mean(axis=2)
        mask = np.asarray(ellipse_mask(width, height)) > 127
        inner_mask = np.asarray(ellipse_mask(width, height, inset=7)) > 127
        seam_mask = mask & ~inner_mask
        region_deltas.append(float(delta[mask].mean()))
        seam_deltas.append(float(delta[seam_mask].mean()))

    return {
        "mean_eye_delta": round(float(np.mean(region_deltas)), 3),
        "mean_seam_delta": round(float(np.mean(seam_deltas)), 3),
    }


def panel(image: Image.Image, label: str) -> Image.Image:
    background = Image.new("RGB", image.size, (244, 241, 233))
    background.paste(image, mask=image.getchannel("A"))
    scaled = background.resize(
        (round(image.width * 0.48), round(image.height * 0.48)),
        Image.Resampling.LANCZOS,
    )
    output = Image.new("RGB", (scaled.width, scaled.height + 52), (244, 241, 233))
    output.paste(scaled, (0, 52))
    ImageDraw.Draw(output).text((18, 17), label, fill=(43, 38, 32))
    return output


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--idle", required=True, type=Path)
    parser.add_argument("--half", required=True, type=Path)
    parser.add_argument("--closed", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--half-output", type=Path)
    parser.add_argument("--closed-output", type=Path)
    parser.add_argument("--left-x", required=True, type=float)
    parser.add_argument("--right-x", required=True, type=float)
    parser.add_argument("--y", required=True, type=float)
    parser.add_argument("--width", required=True, type=float)
    parser.add_argument("--height", required=True, type=float)
    args = parser.parse_args()

    idle = Image.open(args.idle).convert("RGBA")
    half = Image.open(args.half).convert("RGBA")
    closed = Image.open(args.closed).convert("RGBA")
    if idle.size != half.size or idle.size != closed.size:
        raise ValueError("Idle, half, and closed frames must have identical dimensions")

    regions = region_pixels(
        idle.size,
        args.left_x,
        args.right_x,
        args.y,
        args.width,
        args.height,
    )
    half_composite = composite(idle, half, regions)
    closed_composite = composite(idle, closed, regions)
    for destination, frame in (
        (args.half_output, half_composite),
        (args.closed_output, closed_composite),
    ):
        if destination is not None:
            destination.parent.mkdir(parents=True, exist_ok=True)
            frame.save(destination, optimize=True)
    panels = [panel(idle, "IDLE"), panel(half_composite, "HALF"), panel(closed_composite, "CLOSED")]
    contact_sheet = Image.new(
        "RGB",
        (sum(item.width for item in panels), max(item.height for item in panels)),
        (244, 241, 233),
    )
    cursor = 0
    for item in panels:
        contact_sheet.paste(item, (cursor, 0))
        cursor += item.width
    args.output.parent.mkdir(parents=True, exist_ok=True)
    contact_sheet.save(args.output, quality=95, optimize=True)

    report = {
        "canvas": list(idle.size),
        "regions": [list(region) for region in regions],
        "normalized": {
            "leftX": args.left_x,
            "rightX": args.right_x,
            "y": args.y,
            "width": args.width,
            "height": args.height,
        },
        "half": frame_metrics(idle, half, regions),
        "closed": frame_metrics(idle, closed, regions),
        "halfOutput": str(args.half_output) if args.half_output else None,
        "closedOutput": str(args.closed_output) if args.closed_output else None,
        "output": str(args.output),
    }
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
