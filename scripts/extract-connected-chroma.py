"""Extract a transparent pet asset without damaging interior fur colors.

The background matte is limited to key-colored pixels connected to the canvas
border. Interior pixels are always kept opaque, which prevents eye, fur, and
collar holes. Feather RGB is extended from the nearest opaque subject pixel to
avoid colored chroma halos after compositing.
"""

from argparse import ArgumentParser
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image
from scipy.ndimage import distance_transform_edt


def connected_background(candidate: np.ndarray) -> np.ndarray:
    height, width = candidate.shape
    connected = np.zeros((height, width), dtype=np.bool_)
    queue: deque[tuple[int, int]] = deque()

    for x in range(width):
        if candidate[0, x]:
            connected[0, x] = True
            queue.append((0, x))
        if candidate[height - 1, x] and not connected[height - 1, x]:
            connected[height - 1, x] = True
            queue.append((height - 1, x))

    for y in range(height):
        if candidate[y, 0] and not connected[y, 0]:
            connected[y, 0] = True
            queue.append((y, 0))
        if candidate[y, width - 1] and not connected[y, width - 1]:
            connected[y, width - 1] = True
            queue.append((y, width - 1))

    while queue:
        y, x = queue.popleft()
        for next_y, next_x in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
            if (
                0 <= next_y < height
                and 0 <= next_x < width
                and candidate[next_y, next_x]
                and not connected[next_y, next_x]
            ):
                connected[next_y, next_x] = True
                queue.append((next_y, next_x))

    return connected


def extract_connected_chroma(
    source: Path,
    target: Path,
    low: float,
    high: float,
    fringe_distance: float,
) -> None:
    rgb_u8 = np.asarray(Image.open(source).convert("RGB"))
    rgb = rgb_u8.astype(np.float32)
    border = np.concatenate(
        (
            rgb[:6].reshape(-1, 3),
            rgb[-6:].reshape(-1, 3),
            rgb[:, :6].reshape(-1, 3),
            rgb[:, -6:].reshape(-1, 3),
        )
    )
    key = np.median(border, axis=0)
    color_distance = np.sqrt(np.sum((rgb - key) ** 2, axis=2))
    connected = connected_background(color_distance <= high)

    alpha = np.full(color_distance.shape, 255.0, dtype=np.float32)
    matte = np.clip((color_distance - low) / (high - low), 0.0, 1.0)
    alpha[connected] = matte[connected] * 255.0

    inside_distance = distance_transform_edt(alpha > 0.0)
    magenta_excess = np.minimum(rgb[..., 0], rgb[..., 2]) - rgb[..., 1]
    neon_fringe = (
        (inside_distance <= fringe_distance)
        & (rgb[..., 0] >= 125.0)
        & (rgb[..., 2] >= 85.0)
        & (magenta_excess >= 28.0)
    )
    alpha[neon_fringe] = 0.0

    cleaned_rgb = rgb_u8.copy()
    opaque = alpha >= 250.0
    _, nearest = distance_transform_edt(~opaque, return_indices=True)
    feather = connected & (alpha > 0.0) & (alpha < 250.0)
    nearest_rgb = rgb_u8[nearest[0], nearest[1]]
    cleaned_rgb[feather] = nearest_rgb[feather]

    rgba = np.dstack((cleaned_rgb, np.clip(alpha, 0, 255).astype(np.uint8)))
    target.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(rgba).save(target, optimize=True)


def parse_args():
    parser = ArgumentParser()
    parser.add_argument("input", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--low", type=float, default=62.0)
    parser.add_argument("--high", type=float, default=132.0)
    parser.add_argument("--fringe-distance", type=float, default=8.0)
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    extract_connected_chroma(
        args.input,
        args.output,
        args.low,
        args.high,
        args.fringe_distance,
    )
