#!/usr/bin/env python3
"""Composite generated eyelids onto the exact original pet portrait.

The generated image is used only as an eyelid donor. SIFT registration aligns
it to the original portrait, and a feathered pair of eye masks preserves every
pixel outside the authored eye regions.
"""

from __future__ import annotations

import argparse
import hashlib
import importlib.util
import json
import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
AUDIT_PATH = ROOT / "scripts/audit-blink-visual-integrity.py"
REPORT_PATH = ROOT / "app-store/generated-blink-composites.json"


def load_audit_module():
    spec = importlib.util.spec_from_file_location("pawpair_blink_audit", AUDIT_PATH)
    if spec is None or spec.loader is None:
        raise RuntimeError("Could not load blink audit module")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def parse_frame(value: str) -> tuple[str, Path, Path]:
    try:
        key, half, closed = value.split("|", maxsplit=2)
    except ValueError as error:
        raise argparse.ArgumentTypeError(
            "frame must be KEY|HALF_GENERATED_PNG|CLOSED_GENERATED_PNG"
        ) from error
    return key, Path(half).resolve(), Path(closed).resolve()


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def smooth_eye_mask(
    canvas_height: int,
    canvas_width: int,
    eyes: tuple[float, float, float, float, float],
) -> np.ndarray:
    left_x, right_x, y, width, height = eyes
    yy, xx = np.ogrid[:canvas_height, :canvas_width]
    result = np.zeros((canvas_height, canvas_width), dtype=np.float32)

    for left in (left_x, right_x):
        center_x = (left + width / 2) * canvas_width
        center_y = (y + height / 2) * canvas_height
        radius_x = width * canvas_width * 0.5
        radius_y = height * canvas_height * 0.5
        distance = np.sqrt(
            ((xx - center_x) / radius_x) ** 2
            + ((yy - center_y) / radius_y) ** 2
        )
        # Runtime clips the overlay to this same ellipse. Reach exact idle
        # pixels before that boundary so the animated layer cannot reveal a
        # hard oval seam.
        feather = np.clip((0.96 - distance) / 0.3, 0, 1)
        feather = feather * feather * (3 - 2 * feather)
        result = np.maximum(result, feather.astype(np.float32))

    return result


def registration_mask(
    alpha: np.ndarray,
    eyes: tuple[float, float, float, float, float],
) -> np.ndarray:
    height, width = alpha.shape
    left_x, right_x, y, eye_width, eye_height = eyes
    left = max(0, round((left_x - 0.2) * width))
    right = min(width, round((right_x + eye_width + 0.2) * width))
    top = max(0, round((y - 0.14) * height))
    bottom = min(height, round((y + eye_height + 0.22) * height))
    mask = np.zeros((height, width), dtype=np.uint8)
    mask[top:bottom, left:right] = 255
    mask[alpha < 128] = 0

    # Eye appearance differs by design, so exclude it from registration.
    eye_mask = smooth_eye_mask(height, width, eyes)
    mask[eye_mask > 0] = 0
    return mask


def align_generated(
    idle: np.ndarray,
    generated: np.ndarray,
    eyes: tuple[float, float, float, float, float],
) -> tuple[np.ndarray, dict[str, object]]:
    source_rgb = np.clip(idle[..., :3], 0, 255).astype(np.uint8)
    source_gray = cv2.cvtColor(source_rgb, cv2.COLOR_RGB2GRAY)
    generated_gray = cv2.cvtColor(generated, cv2.COLOR_RGB2GRAY)
    sift = cv2.SIFT_create(nfeatures=5000)
    source_keypoints, source_descriptors = sift.detectAndCompute(
        source_gray,
        registration_mask(idle[..., 3], eyes),
    )
    generated_keypoints, generated_descriptors = sift.detectAndCompute(
        generated_gray,
        None,
    )
    if source_descriptors is None or generated_descriptors is None:
        raise RuntimeError("Could not calculate image descriptors")

    matches = cv2.BFMatcher().knnMatch(
        generated_descriptors,
        source_descriptors,
        k=2,
    )
    good_matches = [
        first
        for first, second in matches
        if first.distance < 0.68 * second.distance
    ]
    if len(good_matches) < 16:
        raise RuntimeError(
            f"Only {len(good_matches)} registration matches; at least 16 required"
        )

    generated_points = np.float32(
        [generated_keypoints[item.queryIdx].pt for item in good_matches]
    ).reshape(-1, 1, 2)
    source_points = np.float32(
        [source_keypoints[item.trainIdx].pt for item in good_matches]
    ).reshape(-1, 1, 2)
    matrix, inliers = cv2.estimateAffinePartial2D(
        generated_points,
        source_points,
        method=cv2.RANSAC,
        ransacReprojThreshold=4,
        maxIters=5000,
        confidence=0.999,
        refineIters=20,
    )
    if matrix is None or inliers is None:
        raise RuntimeError("Could not register generated frame")
    inlier_count = int(inliers.sum())
    if inlier_count < 12:
        raise RuntimeError(
            f"Only {inlier_count} registration inliers; at least 12 required"
        )

    height, width = idle.shape[:2]
    aligned = cv2.warpAffine(
        generated,
        matrix,
        (width, height),
        flags=cv2.INTER_LANCZOS4,
        borderMode=cv2.BORDER_REFLECT,
    )
    return aligned, {
        "matches": len(good_matches),
        "inliers": inlier_count,
        "matrix": np.round(matrix, 8).tolist(),
    }


def composite_frame(pack, generated_path: Path, destination: Path):
    idle_image = Image.open(pack.idle).convert("RGBA")
    generated_image = Image.open(generated_path).convert("RGB")
    generated_size = generated_image.size
    if generated_image.size != idle_image.size:
        generated_image = generated_image.resize(
            idle_image.size,
            Image.Resampling.LANCZOS,
        )

    idle = np.asarray(idle_image).astype(np.float32)
    generated = np.asarray(generated_image)
    aligned, registration = align_generated(idle, generated, pack.eyes)
    mask = smooth_eye_mask(idle.shape[0], idle.shape[1], pack.eyes)

    # Match the donor's local fur color to the original around each eye before
    # blending, which prevents a visible oval or color flash during animation.
    ring = (mask > 0.04) & (mask < 0.18) & (idle[..., 3] > 128)
    if np.count_nonzero(ring) >= 64:
        offset = np.median(
            aligned.astype(np.float32)[ring] - idle[..., :3][ring],
            axis=0,
        )
    else:
        offset = np.zeros(3, dtype=np.float32)
    corrected = np.clip(
        aligned.astype(np.float32) - offset.reshape(1, 1, 3),
        0,
        255,
    )

    output = idle.copy()
    blend = mask[..., None]
    output[..., :3] = idle[..., :3] * (1 - blend) + corrected * blend
    output[..., 3] = idle[..., 3]
    output[output[..., 3] == 0, :3] = 0
    destination.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(np.rint(output).astype(np.uint8)).save(
        destination,
        optimize=True,
    )
    return {
        "generatedSize": list(generated_size),
        "generatedSha256": sha256(generated_path),
        "outputSha256": sha256(destination),
        "registration": registration,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--frame",
        action="append",
        type=parse_frame,
        required=True,
        help="KEY|HALF_GENERATED_PNG|CLOSED_GENERATED_PNG",
    )
    args = parser.parse_args()

    module = load_audit_module()
    exact = module.parse_exact_packs()
    packs = {
        pack.key: pack
        for pack in exact + module.parse_local_packs({pack.key for pack in exact})
    }
    results = []

    for key, half_generated, closed_generated in args.frame:
        pack = packs.get(key)
        if pack is None:
            raise KeyError(f"Unknown pet motion key: {key}")
        for path in (half_generated, closed_generated):
            if not path.is_file():
                raise FileNotFoundError(path)

        half_destination = pack.half.with_name("blink-half-v4.png")
        closed_destination = pack.closed.with_name("blink-v4.png")
        half_result = composite_frame(pack, half_generated, half_destination)
        closed_result = composite_frame(pack, closed_generated, closed_destination)
        results.append(
            {
                "key": key,
                "method": "imagegen-eyelid-donor-sift-composite",
                "eyes": list(pack.eyes),
                "half": {
                    "path": str(half_destination.relative_to(ROOT)),
                    **half_result,
                },
                "closed": {
                    "path": str(closed_destination.relative_to(ROOT)),
                    **closed_result,
                },
            }
        )

    payload = {
        "compositeCount": len(results),
        "invariant": "Only feathered eye regions differ from the idle portrait.",
        "frames": results,
    }
    REPORT_PATH.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(json.dumps(payload, indent=2))


if __name__ == "__main__":
    main()
