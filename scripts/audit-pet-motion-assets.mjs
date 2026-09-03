import { readFile, readdir } from "node:fs/promises";
import { basename, dirname, extname, join, resolve } from "node:path";

import pngjs from "pngjs";

const { PNG } = pngjs;

const root = resolve(process.argv[2] ?? "assets/pet-motion");
const ALPHA_VISIBLE = 8;
const MIN_TRANSPARENT_RATIO = 0.12;
const MAX_CORNER_VISIBLE_RATIO = 0.01;
const MAX_FULL_FRAME_BOUNDS_SHIFT = 4;

function visibleBounds(data, width, height, channels) {
  let left = width;
  let right = -1;
  let top = height;
  let bottom = -1;
  let visiblePixels = 0;
  let transparentPixels = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha = data[(y * width + x) * channels + channels - 1];
      if (alpha <= ALPHA_VISIBLE) {
        transparentPixels += 1;
        continue;
      }
      visiblePixels += 1;
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
    }
  }

  return {
    bottom,
    height: bottom >= top ? bottom - top + 1 : 0,
    left,
    right,
    top,
    transparentRatio: transparentPixels / (width * height),
    visiblePixels,
    width: right >= left ? right - left + 1 : 0,
  };
}

function cornerVisibleRatio(data, width, height, channels) {
  const sampleSize = Math.max(4, Math.min(24, Math.floor(Math.min(width, height) * 0.025)));
  let visible = 0;
  let sampled = 0;
  const corners = [
    [0, 0],
    [width - sampleSize, 0],
    [0, height - sampleSize],
    [width - sampleSize, height - sampleSize],
  ];

  corners.forEach(([startX, startY]) => {
    for (let y = startY; y < startY + sampleSize; y += 1) {
      for (let x = startX; x < startX + sampleSize; x += 1) {
        const alpha = data[(y * width + x) * channels + channels - 1];
        sampled += 1;
        if (alpha > ALPHA_VISIBLE) visible += 1;
      }
    }
  });

  return sampled === 0 ? 0 : visible / sampled;
}

async function inspectPng(path) {
  const decoded = PNG.sync.read(await readFile(path), { skipRescale: true });
  const channels = 4;
  const bounds = visibleBounds(
    decoded.data,
    decoded.width,
    decoded.height,
    channels,
  );
  let hasTransparency = false;
  for (let index = 3; index < decoded.data.length; index += channels) {
    if (decoded.data[index] < 255) {
      hasTransparency = true;
      break;
    }
  }

  return {
    bounds,
    cornerVisibleRatio: cornerVisibleRatio(
      decoded.data,
      decoded.width,
      decoded.height,
      channels,
    ),
    hasAlpha: hasTransparency,
    height: decoded.height,
    path,
    width: decoded.width,
  };
}

function boundsShift(first, second) {
  return Math.max(
    Math.abs(first.left - second.left),
    Math.abs(first.right - second.right),
    Math.abs(first.top - second.top),
    Math.abs(first.bottom - second.bottom),
  );
}

async function collectRuntimePngPaths(directory) {
  const paths = new Set();
  const entries = await readdir(directory, { withFileTypes: true });

  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      const nested = await collectRuntimePngPaths(path);
      nested.forEach((item) => paths.add(item));
      continue;
    }
    if (!entry.isFile() || ![".ts", ".tsx"].includes(extname(entry.name))) {
      continue;
    }
    const source = await readFile(path, "utf8");
    const pattern = /require\(\s*["']([^"']*assets[\\/]pet-motion[\\/][^"']+\.png)["']\s*\)/g;
    for (const match of source.matchAll(pattern)) {
      paths.add(resolve(dirname(path), match[1]));
    }
  }

  return paths;
}

async function auditPack(directory, runtimePaths = null) {
  const entries = await readdir(directory, { withFileTypes: true });
  const pngNames = entries
    .filter(
      (entry) =>
        entry.isFile() &&
        entry.name.toLowerCase().endsWith(".png") &&
        !entry.name.toLowerCase().includes("-chroma") &&
        (!runtimePaths || runtimePaths.has(resolve(directory, entry.name))),
    )
    .map((entry) => entry.name)
    .sort();
  const inspected = await Promise.all(
    pngNames.map((name) => inspectPng(join(directory, name))),
  );
  const idle = inspected.find((item) => basename(item.path).startsWith("idle"));
  const blinkHalf = inspected.find((item) =>
    /^blink-half(?:-v\d+)?\.png$/i.test(basename(item.path)),
  );
  const blink = inspected.find((item) =>
    /^blink(?:-v\d+)?\.png$/i.test(basename(item.path)),
  );
  const issues = [];

  if (!idle) {
    issues.push({ file: null, message: "Motion pack has no idle PNG reference." });
  }
  if (!blinkHalf) {
    issues.push({
      file: null,
      message: "Motion pack has no registered blink-half transition frame.",
    });
  }
  if (!blink) {
    issues.push({
      file: null,
      message: "Motion pack has no registered closed-eye blink frame.",
    });
  }

  inspected.forEach((item) => {
    const file = basename(item.path);
    const isBlinkFrame = /^blink(?:-|\.)/i.test(file);
    const requiresTransparency = true;
    if (requiresTransparency && !item.hasAlpha) {
      issues.push({ file, message: "PNG has no real alpha channel." });
    }
    if (
      requiresTransparency &&
      item.bounds.transparentRatio < MIN_TRANSPARENT_RATIO
    ) {
      issues.push({
        file,
        message: `Only ${(item.bounds.transparentRatio * 100).toFixed(1)}% of the canvas is transparent; likely a white or checkerboard background.`,
      });
    }
    if (
      requiresTransparency &&
      item.cornerVisibleRatio > MAX_CORNER_VISIBLE_RATIO
    ) {
      issues.push({
        file,
        message: "Visible pixels reach the canvas corners; background cleanup is incomplete.",
      });
    }
    if (!idle || item === idle) return;
    if (item.width !== idle.width || item.height !== idle.height) {
      issues.push({
        file,
        message: `Canvas ${item.width}x${item.height} does not match idle ${idle.width}x${idle.height}.`,
      });
      return;
    }
    // Blink frames are rendered only inside the authored combined-eye clip.
    // Their full-pet silhouette can differ from idle without moving the eyes.
    if (isBlinkFrame) return;

    const coverageRatio =
      idle.bounds.visiblePixels === 0
        ? 0
        : item.bounds.visiblePixels / idle.bounds.visiblePixels;
    if (
      item.hasAlpha &&
      coverageRatio >= 0.55 &&
      boundsShift(item.bounds, idle.bounds) > MAX_FULL_FRAME_BOUNDS_SHIFT
    ) {
      issues.push({
        file,
        message: "Full-frame state is not registered to the idle silhouette within 4 pixels.",
      });
    }
  });

  return {
    files: inspected.length,
    issues,
    pack: basename(directory),
  };
}

const rootEntries = await readdir(root, { withFileTypes: true });
const rootIsPack = rootEntries.some(
  (entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".png"),
);
const runtimePaths = rootIsPack
  ? null
  : await collectRuntimePngPaths(resolve("src/features/pet-motion"));
if (!rootIsPack && runtimePaths.size === 0) {
  throw new Error("No registered pet-motion PNG assets were found.");
}
const directories = rootIsPack
  ? [root]
  : Array.from(
      new Set(
        Array.from(runtimePaths)
          .filter((path) => path.startsWith(`${root}\\`) || path.startsWith(`${root}/`))
          .filter((path) => basename(dirname(path)) !== "stages")
          .map((path) => dirname(path)),
      ),
    ).sort();
const results = [];
for (const directory of directories) {
  results.push(await auditPack(directory, runtimePaths));
}
const issueCount = results.reduce((total, result) => total + result.issues.length, 0);
const fileCount = results.reduce((total, result) => total + result.files, 0);

console.log(
  JSON.stringify(
    {
      fileCount,
      issueCount,
      assetSetCount: results.length,
      results: results.filter((result) => result.issues.length > 0),
      root,
    },
    null,
    2,
  ),
);

if (issueCount > 0) process.exitCode = 1;
