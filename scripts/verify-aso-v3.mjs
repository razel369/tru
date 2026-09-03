import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");
const ASO_V3 = path.join(ROOT, "app-store", "aso-v3");

function readPngHeader(filePath) {
  const buf = fs.readFileSync(filePath);
  if (buf.length < 32 || buf.toString("ascii", 1, 4) !== "PNG") {
    throw new Error(`File is not a valid PNG: ${filePath}`);
  }
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  const bitDepth = buf.readUInt8(24);
  const colorType = buf.readUInt8(25);
  const hasAlpha = colorType === 4 || colorType === 6;

  return {
    width,
    height,
    bitDepth,
    colorType,
    hasAlpha,
    fileSizeKB: Math.round(buf.length / 1024),
  };
}

const REQUIRED_FILES = [
  "01-never-miss-care.png",
  "02-calm-daily-rhythm.png",
  "03-vet-ready-health.png",
  "04-made-for-your-pet.png",
  "05-private-and-connected.png",
];

const CHECKS = [
  {
    target: "iPhone 6.9-inch",
    dir: path.join(ASO_V3, "iphone-6.9"),
    expectedWidth: 1320,
    expectedHeight: 2868,
  },
  {
    target: "iPad 13-inch",
    dir: path.join(ASO_V3, "ipad-13"),
    expectedWidth: 2064,
    expectedHeight: 2752,
  },
];

console.log("🔍 Verifying PawPair ASO v3 Screenshots for App Store Compliance...\n");
let passedAll = true;

for (const check of CHECKS) {
  console.log(`📱 Checking ${check.target} screenshots in: ${path.relative(ROOT, check.dir)}`);
  if (!fs.existsSync(check.dir)) {
    console.error(`  ❌ Directory missing: ${check.dir}`);
    passedAll = false;
    continue;
  }

  for (const filename of REQUIRED_FILES) {
    const filePath = path.join(check.dir, filename);
    if (!fs.existsSync(filePath)) {
      console.error(`  ❌ Missing screenshot: ${filename}`);
      passedAll = false;
      continue;
    }

    try {
      const header = readPngHeader(filePath);
      let filePass = true;

      if (header.width !== check.expectedWidth || header.height !== check.expectedHeight) {
        console.error(
          `  ❌ Dimension mismatch for ${filename}: got ${header.width}x${header.height}, expected ${check.expectedWidth}x${check.expectedHeight}`
        );
        filePass = false;
      }

      if (header.hasAlpha) {
        console.error(
          `  ❌ Alpha channel detected in ${filename} (colorType: ${header.colorType}). App Store rejects PNGs with alpha!`
        );
        filePass = false;
      }

      if (header.fileSizeKB < 400) {
        console.error(`  ❌ File size suspiciously low for ${filename}: ${header.fileSizeKB} KB`);
        filePass = false;
      }

      if (filePass) {
        console.log(
          `  ✓ ${filename} — ${header.width}x${header.height} RGB (No Alpha) [${header.fileSizeKB} KB]`
        );
      } else {
        passedAll = false;
      }
    } catch (err) {
      console.error(`  ❌ Error reading ${filename}: ${err.message}`);
      passedAll = false;
    }
  }
  console.log("");
}

// Check contact sheets
const CONTACT_SHEETS = [
  path.join(ASO_V3, "iphone-6.9-contact-sheet.png"),
  path.join(ASO_V3, "ipad-13-contact-sheet.png"),
];

console.log("📋 Checking Contact Sheets...");
for (const cs of CONTACT_SHEETS) {
  if (fs.existsSync(cs)) {
    const header = readPngHeader(cs);
    console.log(
      `  ✓ ${path.basename(cs)} — ${header.width}x${header.height} RGB [${header.fileSizeKB} KB]`
    );
  } else {
    console.error(`  ❌ Contact sheet missing: ${path.basename(cs)}`);
    passedAll = false;
  }
}

console.log("\n------------------------------------------------------------");
if (passedAll) {
  console.log("🎉 VERIFICATION PASSED: All 10 screenshots & contact sheets meet 100% of App Store requirements!");
  process.exit(0);
} else {
  console.error("❌ VERIFICATION FAILED: Fix the issues above before uploading to App Store Connect.");
  process.exit(1);
}
