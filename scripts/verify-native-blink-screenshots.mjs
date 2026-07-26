import fs from "node:fs";

import { PNG } from "pngjs";

const [baselinePath, blinkPath, outputPath] = process.argv.slice(2);
if (!baselinePath || !blinkPath || !outputPath) {
  console.error(
    "Usage: node scripts/verify-native-blink-screenshots.mjs <baseline.png> <blink.png> <result.json>",
  );
  process.exit(2);
}

const baseline = PNG.sync.read(fs.readFileSync(baselinePath));
const blink = PNG.sync.read(fs.readFileSync(blinkPath));
if (baseline.width !== blink.width || baseline.height !== blink.height) {
  throw new Error("Blink screenshots have different dimensions.");
}

let changedPixels = 0;
let minX = baseline.width;
let minY = baseline.height;
let maxX = -1;
let maxY = -1;
for (let index = 0; index < baseline.data.length; index += 4) {
  const delta =
    Math.abs(baseline.data[index] - blink.data[index]) +
    Math.abs(baseline.data[index + 1] - blink.data[index + 1]) +
    Math.abs(baseline.data[index + 2] - blink.data[index + 2]);
  if (delta < 24) continue;
  const pixel = index / 4;
  const x = pixel % baseline.width;
  const y = Math.floor(pixel / baseline.width);
  changedPixels += 1;
  minX = Math.min(minX, x);
  minY = Math.min(minY, y);
  maxX = Math.max(maxX, x);
  maxY = Math.max(maxY, y);
}

const changedPixelRatio =
  changedPixels / Math.max(1, baseline.width * baseline.height);
const changedWidth = changedPixels > 0 ? maxX - minX + 1 : 0;
const changedHeight = changedPixels > 0 ? maxY - minY + 1 : 0;
const changedCenterX = changedPixels > 0 ? (minX + maxX) / 2 : 0;
const localizedToEyeBand =
  changedPixels > 0 &&
  changedWidth <= baseline.width * 0.45 &&
  changedHeight <= baseline.height * 0.25 &&
  changedCenterX >= baseline.width * 0.2 &&
  changedCenterX <= baseline.width * 0.8 &&
  minY >= baseline.height * 0.04 &&
  maxY <= baseline.height * 0.6;
const result = {
  status:
    changedPixels >= 40 &&
    changedPixelRatio <= 0.02 &&
    localizedToEyeBand
      ? "visible"
      : "invalid",
  changedPixels,
  changedPixelRatio,
  localizedToEyeBand,
  bounds:
    changedPixels > 0
      ? { minX, minY, maxX, maxY }
      : null,
};
fs.writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));
if (result.status !== "visible") process.exit(1);
