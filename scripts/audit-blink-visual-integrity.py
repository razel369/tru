#!/usr/bin/env python3
"""Audit authored blink eye clips for visible motion and boundary stability."""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
EXACT_PACKS = ROOT / "src/features/pet-motion/exact-breed-packs.ts"
LOCAL_PACKS = ROOT / "src/features/pet-motion/local-packs.ts"
BLINK_SAFETY = ROOT / "src/features/pet-motion/blink-safety.ts"
OUTPUT = ROOT / "app-store/blink-visual-integrity.json"


@dataclass(frozen=True)
class Pack:
    key: str
    idle: Path
    half: Path
    closed: Path
    eyes: tuple[float, float, float, float, float]


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
    preferred = [
        frame.parent / "idle-luna-style-v1.png",
        frame.parent / "idle-v2.png",
        frame.parent / "idle.png",
    ]
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
    if not match:
        return set()
    return set(re.findall(r'"([^"]+)"', match.group("keys")))


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


def ellipse(width: int, height: int, inset: int = 0) -> np.ndarray:
    mask = Image.new("L", (width, height), 0)
    ImageDraw.Draw(mask).ellipse(
        (inset, inset, width - inset - 1, height - inset - 1),
        fill=255,
    )
    return np.asarray(mask) > 127


def measure(pack: Pack) -> dict[str, object]:
    missing = [str(path) for path in (pack.idle, pack.half, pack.closed) if not path.exists()]
    if missing:
        return {"key": pack.key, "issues": ["missing-assets"], "missing": missing}

    idle_image = Image.open(pack.idle).convert("RGBA")
    half_image = contain_to(Image.open(pack.half).convert("RGBA"), idle_image.size)
    closed_image = contain_to(Image.open(pack.closed).convert("RGBA"), idle_image.size)
    idle = np.asarray(idle_image)[..., :3].astype(np.float32)
    half = np.asarray(half_image)[..., :3].astype(np.float32)
    closed = np.asarray(closed_image)[..., :3].astype(np.float32)
    canvas_width, canvas_height = idle_image.size
    left_x, right_x, y, width, height = pack.eyes
    pixel_width = max(3, round(canvas_width * width))
    pixel_height = max(3, round(canvas_height * height))
    top = round(canvas_height * y)
    regions = [
        (round(canvas_width * left_x), top, pixel_width, pixel_height),
        (round(canvas_width * right_x), top, pixel_width, pixel_height),
    ]

    half_eye: list[float] = []
    closed_eye: list[float] = []
    half_seam: list[float] = []
    closed_seam: list[float] = []
    half_closed_gap: list[float] = []
    for left, region_top, region_width, region_height in regions:
        right = min(canvas_width, left + region_width)
        bottom = min(canvas_height, region_top + region_height)
        left = max(0, left)
        region_top = max(0, region_top)
        region_width = right - left
        region_height = bottom - region_top
        if region_width < 3 or region_height < 3:
            continue
        eye_mask = ellipse(region_width, region_height)
        inset = max(2, min(7, min(region_width, region_height) // 7))
        inner = ellipse(region_width, region_height, inset)
        seam = eye_mask & ~inner
        idle_patch = idle[region_top:bottom, left:right]
        half_patch = half[region_top:bottom, left:right]
        closed_patch = closed[region_top:bottom, left:right]
        half_delta = np.abs(half_patch - idle_patch).mean(axis=2)
        closed_delta = np.abs(closed_patch - idle_patch).mean(axis=2)
        state_delta = np.abs(closed_patch - half_patch).mean(axis=2)
        half_eye.append(float(half_delta[eye_mask].mean()))
        closed_eye.append(float(closed_delta[eye_mask].mean()))
        half_seam.append(float(half_delta[seam].mean()))
        closed_seam.append(float(closed_delta[seam].mean()))
        half_closed_gap.append(float(state_delta[inner].mean()))

    if len(half_eye) != 2:
        return {"key": pack.key, "issues": ["invalid-eye-regions"], "regions": regions}

    metrics = {
        "halfEyeDelta": round(float(np.mean(half_eye)), 3),
        "closedEyeDelta": round(float(np.mean(closed_eye)), 3),
        "halfClosedDelta": round(float(np.mean(half_closed_gap)), 3),
        "halfSeamDelta": round(float(np.mean(half_seam)), 3),
        "closedSeamDelta": round(float(np.mean(closed_seam)), 3),
    }
    issues: list[str] = []
    if metrics["halfEyeDelta"] < 4.0:
        issues.append("half-blink-too-subtle")
    if metrics["closedEyeDelta"] < 6.0:
        issues.append("closed-blink-too-subtle")
    if metrics["halfClosedDelta"] < 3.0:
        issues.append("half-and-closed-too-similar")
    if metrics["halfSeamDelta"] > 34.0:
        issues.append("half-blink-seam-risk")
    if metrics["closedSeamDelta"] > 38.0:
        issues.append("closed-blink-seam-risk")
    return {
        "key": pack.key,
        "canvas": list(idle_image.size),
        "regions": [list(region) for region in regions],
        "metrics": metrics,
        "issues": issues,
    }


def main() -> None:
    exact = parse_exact_packs()
    packs = exact + parse_local_packs({pack.key for pack in exact})
    disabled_keys = parse_disabled_blink_keys()
    active_packs = [pack for pack in packs if pack.key not in disabled_keys]
    unknown_disabled_keys = sorted(
        disabled_keys - {pack.key for pack in packs},
    )
    results = [measure(pack) for pack in active_packs]
    issues = [result for result in results if result.get("issues")]
    payload = {
        "packCount": len(packs),
        "activePackCount": len(active_packs),
        "disabledPackCount": len(disabled_keys),
        "disabledKeys": sorted(disabled_keys),
        "unknownDisabledKeys": unknown_disabled_keys,
        "issueCount": len(issues),
        "passingCount": len(results) - len(issues),
        "issues": issues,
        "results": results,
    }
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(
        json.dumps(
            {
                "output": str(OUTPUT),
                "packCount": payload["packCount"],
                "activePackCount": payload["activePackCount"],
                "disabledPackCount": payload["disabledPackCount"],
                "passingCount": payload["passingCount"],
                "issueCount": payload["issueCount"],
                "unknownDisabledKeys": unknown_disabled_keys,
                "issues": [
                    {"key": item["key"], "issues": item["issues"]}
                    for item in issues
                ],
            },
            indent=2,
        )
    )
    if issues or unknown_disabled_keys:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
