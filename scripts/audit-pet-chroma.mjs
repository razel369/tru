import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { PNG } from "pngjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const motionRoot = path.join(root, "assets", "pet-motion");
const files = [];

for (const directory of fs.readdirSync(motionRoot, { withFileTypes: true })) {
  if (!directory.isDirectory()) continue;
  const candidate = path.join(
    motionRoot,
    directory.name,
    "idle-luna-style-v1.png",
  );
  if (fs.existsSync(candidate)) files.push(candidate);
}

const results = files.map((filePath) => {
  const png = PNG.sync.read(fs.readFileSync(filePath));
  let coloredTransparent = 0;
  let semiTransparent = 0;
  let chromaEdge = 0;

  for (let index = 0; index < png.data.length; index += 4) {
    const red = png.data[index];
    const green = png.data[index + 1];
    const blue = png.data[index + 2];
    const alpha = png.data[index + 3];

    if (alpha === 0 && (red !== 0 || green !== 0 || blue !== 0)) {
      coloredTransparent += 1;
    }
    if (alpha <= 0 || alpha >= 252) continue;

    semiTransparent += 1;
    const magenta =
      red > 145 && red > green + 20 && blue > green + 8;
    const greenScreen =
      green > 90 && green > red + 20 && green > blue + 15;
    if (magenta || greenScreen) chromaEdge += 1;
  }

  const chromaEdgePercent =
    (chromaEdge / Math.max(1, semiTransparent)) * 100;
  const issues = [];
  if (coloredTransparent > 0) issues.push("colored-transparent-pixels");
  if (chromaEdge > 10 && chromaEdgePercent > 0.25) {
    issues.push("chroma-edge-spill");
  }

  return {
    file: path.relative(root, filePath),
    coloredTransparent,
    chromaEdge,
    chromaEdgePercent: Number(chromaEdgePercent.toFixed(3)),
    issues,
  };
});

const failures = results.filter((result) => result.issues.length > 0);
console.log(
  JSON.stringify(
    {
      fileCount: results.length,
      issueCount: failures.length,
      issues: failures,
    },
    null,
    2,
  ),
);

if (failures.length > 0) process.exitCode = 1;
