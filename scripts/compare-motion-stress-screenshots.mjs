import fs from "node:fs";
import path from "node:path";

import { PNG } from "pngjs";

const [baselinePath, stressedPath, outputPath] = process.argv.slice(2);

if (!baselinePath || !stressedPath) {
  console.error(
    "Usage: node scripts/compare-motion-stress-screenshots.mjs <baseline.png> <stressed.png> [result.json]",
  );
  process.exit(1);
}

const baseline = PNG.sync.read(fs.readFileSync(baselinePath));
const stressed = PNG.sync.read(fs.readFileSync(stressedPath));

if (
  baseline.width !== stressed.width ||
  baseline.height !== stressed.height
) {
  console.error("Motion screenshots have different dimensions.");
  process.exit(1);
}

// Motion Lab keeps the inspected companion inside the central portion of its
// fixed-height preview. This crop excludes the status bar, QA labels, controls,
// and the optional stress-status row so the comparison measures pet pixels.
const crop = {
  left: Math.floor(baseline.width * 0.22),
  right: Math.ceil(baseline.width * 0.78),
  top: Math.floor(baseline.height * 0.18),
  bottom: Math.ceil(baseline.height * 0.56),
};

let comparedChannels = 0;
let totalDelta = 0;
let changedPixels = 0;
let comparedPixels = 0;
let maxChannelDelta = 0;

for (let y = crop.top; y < crop.bottom; y += 1) {
  for (let x = crop.left; x < crop.right; x += 1) {
    const offset = (y * baseline.width + x) * 4;
    let pixelChanged = false;

    for (let channel = 0; channel < 4; channel += 1) {
      const delta = Math.abs(
        baseline.data[offset + channel] - stressed.data[offset + channel],
      );
      totalDelta += delta;
      comparedChannels += 1;
      maxChannelDelta = Math.max(maxChannelDelta, delta);
      if (delta > 2) pixelChanged = true;
    }

    comparedPixels += 1;
    if (pixelChanged) changedPixels += 1;
  }
}

const result = {
  baseline: path.resolve(baselinePath),
  changedPixelRatio: changedPixels / comparedPixels,
  changedPixels,
  comparedPixels,
  crop,
  dimensions: { height: baseline.height, width: baseline.width },
  maxChannelDelta,
  meanChannelDelta: totalDelta / comparedChannels,
  stressed: path.resolve(stressedPath),
};

console.log(JSON.stringify(result, null, 2));

if (outputPath) {
  fs.writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`);
}

if (result.changedPixelRatio > 0.002 || result.meanChannelDelta > 0.25) {
  console.error(
    "Pet artwork changed after the repeated-tap stress sequence.",
  );
  process.exit(1);
}

console.log("Pet artwork remained pixel-stable after repeated taps.");
