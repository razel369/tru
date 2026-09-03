import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function readGitOutput(args) {
  try {
    return execFileSync("git", ["-C", root, ...args], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return null;
  }
}
const checks = [];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function readJson(relativePath) {
  return JSON.parse(read(relativePath));
}

function add(name, pass, detail, blocking = true) {
  checks.push({ name, pass: Boolean(pass), blocking, detail });
}

function envFileValue(name) {
  const envPath = path.join(root, ".env");
  if (!fs.existsSync(envPath)) return undefined;
  const line = fs
    .readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .find((entry) => entry.startsWith(`${name}=`));
  return line?.slice(name.length + 1).trim();
}

function pngInfo(relativePath) {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) return null;
  const data = fs.readFileSync(absolutePath);
  const isPng = data.subarray(1, 4).toString("ascii") === "PNG";
  if (!isPng || data.length < 26) return null;
  return {
    width: data.readUInt32BE(16),
    height: data.readUInt32BE(20),
    colorType: data[25],
  };
}

const app = readJson("app.json").expo;
const metadata = readJson("app-store/metadata.en-US.json");
const buildCandidatePath = path.join(
  root,
  "app-store",
  "eas-production-build.json",
);
const buildCandidate = fs.existsSync(buildCandidatePath)
  ? readJson("app-store/eas-production-build.json")
  : null;
const ipaAuditPath = path.join(root, "app-store", "ipa-audit-build27.json");
const ipaAudit = fs.existsSync(ipaAuditPath)
  ? readJson("app-store/ipa-audit-build27.json")
  : null;
const privacy = read("pawpair-site/privacy/index.html");
const terms = read("pawpair-site/terms/index.html");
const support = read("pawpair-site/support/index.html");
const privacyAnswers = read("app-store/privacy-label.md");
const reviewNotes = read("app-store/review-notes.md");
const subscriptionTypes = read("src/features/subscriptions/types.ts");
const ipadOrientations = app.ios?.infoPlist?.["UISupportedInterfaceOrientations~ipad"] ?? [];
const collectedDataTypes = new Set(
  (app.ios?.privacyManifests?.NSPrivacyCollectedDataTypes ?? []).map(
    (entry) => entry.NSPrivacyCollectedDataType,
  ),
);

add("iPhone target platform", app.ios?.supportsTablet === false, `supportsTablet=${app.ios?.supportsTablet}`);
if (app.ios?.supportsTablet) {
  add("iPad multitasking", app.ios?.requireFullScreen === false, `requireFullScreen=${app.ios?.requireFullScreen}`);
  add("iPad orientations", [
    "UIInterfaceOrientationPortrait",
    "UIInterfaceOrientationPortraitUpsideDown",
    "UIInterfaceOrientationLandscapeLeft",
    "UIInterfaceOrientationLandscapeRight",
  ].every((orientation) => ipadOrientations.includes(orientation)), ipadOrientations.join(", "));
}
add("Bundle identifier", app.ios?.bundleIdentifier === "app.pawpair.medtracker", app.ios?.bundleIdentifier);
add(
  "EAS production build candidate",
  buildCandidate?.status === "FINISHED" &&
    buildCandidate?.platform === "IOS" &&
    buildCandidate?.appVersion === metadata.version &&
    Number(buildCandidate?.appBuildVersion) >= 18 &&
    typeof buildCandidate?.id === "string" &&
    typeof buildCandidate?.gitCommitHash === "string",
  buildCandidate
    ? `build=${buildCandidate.appBuildVersion}, commit=${buildCandidate.gitCommitHash}, id=${buildCandidate.id}`
    : "missing until the exact final EAS build is audited",
);
const currentGitCommit = readGitOutput(["rev-parse", "HEAD"]);
const currentCheckoutStatus = readGitOutput([
  "status",
  "--porcelain=v1",
  "--untracked-files=all",
]);
const dirtyEntryCount = currentCheckoutStatus
  ? currentCheckoutStatus.split(/\r?\n/).filter(Boolean).length
  : 0;
add(
  "Current checkout matches signed build",
  currentGitCommit !== null &&
    currentGitCommit === buildCandidate?.gitCommitHash &&
    currentCheckoutStatus === "",
  `HEAD=${currentGitCommit ?? "unavailable"}, build=${buildCandidate?.gitCommitHash ?? "missing"}, dirtyEntries=${dirtyEntryCount}`,
);
add("Export compliance", app.ios?.infoPlist?.ITSAppUsesNonExemptEncryption === false, "ITSAppUsesNonExemptEncryption must be false");
add("Terms URL in metadata", metadata.description.includes(metadata.termsOfUseUrl), metadata.termsOfUseUrl);
add("Privacy URL in metadata", metadata.description.includes(metadata.privacyPolicyUrl), metadata.privacyPolicyUrl);
add("Public privacy describes RevenueCat", privacy.includes("RevenueCat") && privacy.includes("purchase"), "RevenueCat and purchase processing disclosed");
add("Public privacy describes optional analytics", privacy.includes("Supabase") && privacy.includes("off by default") && privacy.includes("turn it off"), "Consent, scope and deletion disclosed");
add("Public terms describe renewal", terms.includes("auto-renewable") && terms.includes("Restore purchases"), "Renewal and restore terms disclosed");
add("Support identity is consistent", support.includes("raz@rmalk.co.il") && !support.includes("rmalka05@gmail.com"), "raz@rmalk.co.il");
add("App Privacy answer includes purchases", privacyAnswers.includes("Purchase History") && privacyAnswers.includes("App Functionality") && privacyAnswers.includes("Analytics"), "RevenueCat minimum disclosure");
add("App Privacy answer includes product analytics", privacyAnswers.includes("User ID") && privacyAnswers.includes("Device ID") && privacyAnswers.includes("Product Interaction"), "Anonymous identifiers and usage declared");
for (const dataType of [
  "NSPrivacyCollectedDataTypeUserID",
  "NSPrivacyCollectedDataTypeDeviceID",
  "NSPrivacyCollectedDataTypeProductInteraction",
  "NSPrivacyCollectedDataTypePurchaseHistory",
]) {
  add(`Privacy manifest ${dataType}`, collectedDataTypes.has(dataType), dataType);
}
add(
  "Review notes include Premium",
  reviewNotes.includes("app.pawpair.medtracker.premium.annual") &&
    reviewNotes.includes("Restore purchases"),
  "Products and restore path documented",
);
add(
  "RevenueCat product IDs",
  /PREMIUM_ANNUAL_PRODUCT_ID\s*=\s*\r?\n?\s*"app\.pawpair\.medtracker\.premium\.annual"/.test(
    subscriptionTypes,
  ) &&
    /PREMIUM_MONTHLY_PRODUCT_ID\s*=\s*\r?\n?\s*"app\.pawpair\.medtracker\.premium\.monthly"/.test(
      subscriptionTypes,
    ),
  "Product identifiers are stable",
);

const apiKey = process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY ?? envFileValue("EXPO_PUBLIC_REVENUECAT_IOS_API_KEY");
const revenueCatKeyConfigured =
  (/^appl_[A-Za-z0-9_-]{8,}$/.test(apiKey ?? "") &&
    !apiKey?.includes("your_public")) ||
  ipaAudit?.archiveChecks?.revenueCatPublicKeyEmbedded === true;
add(
  "RevenueCat production key",
  revenueCatKeyConfigured,
  apiKey
    ? "configured locally"
    : ipaAudit?.archiveChecks?.revenueCatPublicKeyEmbedded
      ? `verified inside signed build ${ipaAudit.release?.buildNumber}`
      : "missing locally and not verified in the signed IPA",
);
add(
  "Signed IPA audit matches build candidate",
  ipaAudit?.release?.buildNumber === buildCandidate?.appBuildVersion &&
    ipaAudit?.release?.gitCommitHash === buildCandidate?.gitCommitHash &&
    ipaAudit?.release?.sha256 === buildCandidate?.sha256 &&
    ipaAudit?.archiveChecks?.macosCodesignDeepStrict === true &&
    ipaAudit?.archiveChecks?.appPrivacyManifest === true &&
    ipaAudit?.archiveChecks?.watchPrivacyManifest === true,
  ipaAudit
    ? `build=${ipaAudit.release?.buildNumber}, commit=${ipaAudit.release?.gitCommitHash}, sha256=${ipaAudit.release?.sha256}`
    : "missing signed IPA audit",
);

const screenshots = [
  "01-never-miss-care.png",
  "02-calm-daily-plan.png",
  "03-health-history-ready.png",
  "04-supported-breeds.png",
  "05-private-by-choice.png",
];
const finalCaptures = [
  "01-home.png",
  "02-plan.png",
  "03-health.png",
  "04-pets.png",
  "05-settings.png",
];
const acceptedIphoneCaptureSizes = new Set([
  "1260x2736",
  "1290x2796",
  "1320x2868",
]);

for (const file of finalCaptures) {
  const relativePath = `app-store/screenshots/iphone-6.9-final/${file}`;
  const info = pngInfo(relativePath);
  add(
    `Final iPhone capture ${file}`,
    Boolean(
      info &&
        acceptedIphoneCaptureSizes.has(`${info.width}x${info.height}`),
    ) &&
      info?.colorType !== 4 &&
      info?.colorType !== 6,
    info
      ? `${info.width}x${info.height}, colorType=${info.colorType}`
      : "missing",
  );
}

for (const file of screenshots) {
  const sourceFile = finalCaptures[screenshots.indexOf(file)];
  const sourcePath = path.join(
    root,
    `app-store/screenshots/iphone-6.9-final/${sourceFile}`,
  );
  const relativePath = `app-store/aso-v2/iphone-6.9/${file}`;
  const absolutePath = path.join(root, relativePath);
  const info = pngInfo(relativePath);
  const fresh =
    fs.existsSync(sourcePath) &&
    fs.existsSync(absolutePath) &&
    fs.statSync(absolutePath).mtimeMs >= fs.statSync(sourcePath).mtimeMs;
  add(
    `Screenshot ${file}`,
    fresh &&
      info?.width === 1320 &&
      info?.height === 2868 &&
      info?.colorType !== 4 &&
      info?.colorType !== 6,
    !fs.existsSync(sourcePath)
      ? "stale until exact final capture exists and compositor reruns"
      : info
        ? `${info.width}x${info.height}, colorType=${info.colorType}, fresh=${fresh}`
        : "missing",
  );
}

if (app.ios?.supportsTablet) {
  for (const file of finalCaptures) {
    const relativePath = `app-store/screenshots/ipad-13-final/${file}`;
    const info = pngInfo(relativePath);
    add(
      `Final iPad capture ${file}`,
      info?.width === 2064 &&
        info?.height === 2752 &&
        info?.colorType !== 4 &&
        info?.colorType !== 6,
      info
        ? `${info.width}x${info.height}, colorType=${info.colorType}`
        : "missing",
    );
  }

  for (const file of screenshots) {
    const sourceFile = finalCaptures[screenshots.indexOf(file)];
    const sourcePath = path.join(
      root,
      `app-store/screenshots/ipad-13-final/${sourceFile}`,
    );
    const relativePath = `app-store/aso-v2/ipad-13/${file}`;
    const absolutePath = path.join(root, relativePath);
    const info = pngInfo(relativePath);
    const fresh =
      fs.existsSync(sourcePath) &&
      fs.existsSync(absolutePath) &&
      fs.statSync(absolutePath).mtimeMs >= fs.statSync(sourcePath).mtimeMs;
    add(
      `iPad screenshot ${file}`,
      fresh &&
        info?.width === 2064 &&
        info?.height === 2752 &&
        info?.colorType !== 4 &&
        info?.colorType !== 6,
      !fs.existsSync(sourcePath)
        ? "stale until exact final capture exists and compositor reruns"
        : info
          ? `${info.width}x${info.height}, colorType=${info.colorType}, fresh=${fresh}`
          : "missing",
    );
  }
}

const watchScreenshotPath =
  "app-store/screenshots/watch-ultra-3-final/01-today.png";
const watchScreenshot = pngInfo(watchScreenshotPath);
add(
  "Final Apple Watch screenshot",
  watchScreenshot?.width === 422 &&
    watchScreenshot?.height === 514 &&
    watchScreenshot?.colorType !== 4 &&
    watchScreenshot?.colorType !== 6,
  watchScreenshot
    ? `${watchScreenshot.width}x${watchScreenshot.height}, colorType=${watchScreenshot.colorType}`
    : "missing",
);

const iconPath = app.icon?.replace(/^\.\//, "");
const icon = iconPath ? pngInfo(iconPath) : null;
add("App icon", icon?.width === 1024 && icon?.height === 1024 && icon?.colorType !== 4 && icon?.colorType !== 6, icon ? `${icon.width}x${icon.height}, colorType=${icon.colorType}` : "missing");

const failed = checks.filter((check) => !check.pass);
const blockers = failed.filter((check) => check.blocking);
const report = {
  generatedAt: new Date().toISOString(),
  status: blockers.length === 0 ? "PASS" : "BLOCKED",
  passed: checks.length - failed.length,
  total: checks.length,
  blockerCount: blockers.length,
  checks,
};

fs.writeFileSync(
  path.join(root, "app-store", "launch-readiness.json"),
  `${JSON.stringify(report, null, 2)}\n`,
);
console.log(JSON.stringify(report, null, 2));
process.exitCode = blockers.length === 0 ? 0 : 1;
