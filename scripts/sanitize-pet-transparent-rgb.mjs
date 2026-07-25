import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { PNG } from "pngjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const motionRoot = path.join(root, "assets", "pet-motion");
const motionRegistryRoot = path.join(root, "src", "features", "pet-motion");

function collectSourceFiles(directory) {
  const sourceFiles = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const candidate = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      sourceFiles.push(...collectSourceFiles(candidate));
    } else if (
      entry.isFile() &&
      [".ts", ".tsx"].includes(path.extname(entry.name))
    ) {
      sourceFiles.push(candidate);
    }
  }
  return sourceFiles;
}

const files = Array.from(
  new Set(
    collectSourceFiles(motionRegistryRoot).flatMap((sourcePath) => {
      const source = fs.readFileSync(sourcePath, "utf8");
      const pattern =
        /require\(\s*["']([^"']*assets[\\/]pet-motion[\\/][^"']+\.png)["']\s*\)/g;
      return Array.from(source.matchAll(pattern), (match) =>
        path.resolve(path.dirname(sourcePath), match[1]),
      );
    }),
  ),
)
  .filter((filePath) => filePath.startsWith(`${motionRoot}${path.sep}`))
  .sort();

if (files.length === 0) {
  throw new Error("No registered runtime pet-motion PNG assets were found.");
}

let changedFileCount = 0;
let sanitizedPixelCount = 0;
const changedFiles = [];

for (const filePath of files) {
  const png = PNG.sync.read(fs.readFileSync(filePath));
  let changedPixels = 0;

  for (let index = 0; index < png.data.length; index += 4) {
    const alpha = png.data[index + 3];
    if (
      alpha !== 0 ||
      (png.data[index] === 0 &&
        png.data[index + 1] === 0 &&
        png.data[index + 2] === 0)
    ) {
      continue;
    }

    png.data[index] = 0;
    png.data[index + 1] = 0;
    png.data[index + 2] = 0;
    changedPixels += 1;
  }

  if (changedPixels === 0) continue;
  fs.writeFileSync(filePath, PNG.sync.write(png));
  changedFileCount += 1;
  sanitizedPixelCount += changedPixels;
  changedFiles.push({
    file: path.relative(root, filePath),
    sanitizedPixels: changedPixels,
  });
}

console.log(
  JSON.stringify(
    {
      registeredFileCount: files.length,
      changedFileCount,
      sanitizedPixelCount,
      changedFiles,
    },
    null,
    2,
  ),
);
