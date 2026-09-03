#!/usr/bin/env python3
"""Remove chroma-key color spill from transparent pet cutout edges."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
from PIL import Image


def dilate(mask: np.ndarray) -> np.ndarray:
    padded = np.pad(mask, 1, mode="constant", constant_values=False)
    result = np.zeros_like(mask)
    height, width = mask.shape
    for y_offset in range(3):
        for x_offset in range(3):
            result |= padded[y_offset : y_offset + height, x_offset : x_offset + width]
    return result


def neighbor_average(values: np.ndarray, resolved: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    padded_values = np.pad(values, ((1, 1), (1, 1), (0, 0)), mode="constant")
    padded_resolved = np.pad(resolved, 1, mode="constant", constant_values=False)
    height, width = resolved.shape
    total = np.zeros_like(values, dtype=np.float32)
    count = np.zeros((height, width), dtype=np.float32)

    for y_offset in range(3):
        for x_offset in range(3):
            if y_offset == 1 and x_offset == 1:
                continue
            neighbor_mask = padded_resolved[
                y_offset : y_offset + height,
                x_offset : x_offset + width,
            ]
            total += padded_values[
                y_offset : y_offset + height,
                x_offset : x_offset + width,
            ] * neighbor_mask[..., None]
            count += neighbor_mask

    return total, count


def clean_edges(
    source: Path,
    destination: Path,
    preview: Path | None,
    edge_radius: int,
    all_boundary: bool,
) -> dict[str, object]:
    image = Image.open(source).convert("RGBA")
    pixels = np.asarray(image).copy()
    rgb = pixels[..., :3].astype(np.float32)
    alpha = pixels[..., 3]
    visible = alpha > 0

    red = rgb[..., 0]
    green = rgb[..., 1]
    blue = rgb[..., 2]
    magenta_spill = (
        (red > 145)
        & (red > green + 20)
        & (blue > green + 8)
    )
    green_spill = (
        (green > 105)
        & (green > np.maximum(red, blue) + 1)
    )

    near_transparency = ~visible
    for _ in range(edge_radius):
        near_transparency = dilate(near_transparency)
    boundary = visible & near_transparency
    chroma_boundary = near_transparency
    for _ in range(edge_radius):
        chroma_boundary = dilate(chroma_boundary)
    chroma_boundary &= visible
    # Only rebuild pixels that are both chroma-dominant and close to real
    # transparency. Treating every semi-transparent fur pixel as contamination
    # destroys fine coat detail and creates opaque-looking patches.
    target = visible & (
        (chroma_boundary & (magenta_spill | green_spill))
        | (boundary & all_boundary)
    )
    resolved = visible & ~target
    working = rgb.copy()

    for _ in range(max(18, edge_radius * 6)):
        total, count = neighbor_average(working, resolved)
        newly_resolved = target & ~resolved & (count > 0)
        if not np.any(newly_resolved):
            break
        working[newly_resolved] = total[newly_resolved] / count[newly_resolved, None]
        resolved |= newly_resolved

    cleaned_count = int(np.count_nonzero(target & resolved))
    remaining_count = int(np.count_nonzero(target & ~resolved))
    rgb[target & resolved] = working[target & resolved]
    residual_green = (
        target
        & (rgb[..., 1] > 105)
        & (rgb[..., 1] > np.maximum(rgb[..., 0], rgb[..., 2]) + 1)
    )
    rgb[..., 1][residual_green] = np.maximum(
        rgb[..., 0][residual_green],
        rgb[..., 2][residual_green],
    )
    residual_yellow_green = (
        target
        & (rgb[..., 1] > rgb[..., 2] + 20)
        & (rgb[..., 0] < rgb[..., 1] + 40)
    )
    rgb[..., 1][residual_yellow_green] = (
        rgb[..., 2][residual_yellow_green]
        + 0.55
        * (
            rgb[..., 0][residual_yellow_green]
            - rgb[..., 2][residual_yellow_green]
        )
    )

    pixels[..., :3] = np.clip(np.rint(rgb), 0, 255).astype(np.uint8)
    pixels[~visible, :3] = 0
    output = Image.fromarray(pixels)
    destination.parent.mkdir(parents=True, exist_ok=True)
    output.save(destination, optimize=True)

    if preview is not None:
        preview.parent.mkdir(parents=True, exist_ok=True)
        background = Image.new("RGBA", output.size, (244, 241, 233, 255))
        background.alpha_composite(output)
        background.convert("RGB").save(preview, quality=94, optimize=True)

    return {
        "source": str(source),
        "destination": str(destination),
        "size": list(output.size),
        "target_edge_pixels": int(np.count_nonzero(target)),
        "cleaned_edge_pixels": cleaned_count,
        "unresolved_edge_pixels": remaining_count,
        "transparent_pixels": int(np.count_nonzero(~visible)),
        "edge_radius": edge_radius,
        "all_boundary": all_boundary,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--preview", type=Path)
    parser.add_argument("--edge-radius", type=int, default=3)
    parser.add_argument("--all-boundary", action="store_true")
    args = parser.parse_args()
    if args.edge_radius < 1 or args.edge_radius > 12:
        parser.error("--edge-radius must be between 1 and 12")
    print(
        json.dumps(
            clean_edges(
                args.input,
                args.output,
                args.preview,
                args.edge_radius,
                args.all_boundary,
            ),
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
