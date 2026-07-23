import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
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

add("Universal iPhone and iPad target", app.ios?.supportsTablet === true, `supportsTablet=${app.ios?.supportsTablet}`);
add("iPad multitasking", app.ios?.requireFullScreen === false, `requireFullScreen=${app.ios?.requireFullScreen}`);
add("iPad orientations", [
  "UIInterfaceOrientationPortrait",
  "UIInterfaceOrientationPortraitUpsideDown",
  "UIInterfaceOrientationLandscapeLeft",
  "UIInterfaceOrientationLandscapeRight",
].every((orientation) => ipadOrientations.includes(orientation)), ipadOrientations.join(", "));
add("Bundle identifier", app.ios?.bundleIdentifier === "app.pawpair.medtracker", app.ios?.bundleIdentifier);
add("Build number", Number(app.ios?.buildNumber) >= 8, `build=${app.ios?.buildNumber}`);
add("Export compliance", app.ios?.infoPlist?.ITSAppUsesNonExemptEncryption === false, "ITSAppUsesNonExemptEncryption must be false");
add("Metadata build matches", String(metadata.build) === String(app.ios?.buildNumber), `metadata=${metadata.build}, app=${app.ios?.buildNumber}`);
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
add("RevenueCat production key", /^appl_[A-Za-z0-9_-]{8,}$/.test(apiKey ?? "") && !apiKey?.includes("your_public"), apiKey ? "configured" : "missing; EAS production environment may still provide it");

const screenshots = [
  "01-pet-care-ai.png",
  "02-daily-care-ai.png",
  "03-pet-health-ai.png",
  "04-every-pet-ai.png",
  "05-private-ai.png",
];
for (const file of screenshots) {
  const relativePath = `app-store/aso/iphone-6.9/model-b/${file}`;
  const info = pngInfo(relativePath);
  add(`Screenshot ${file}`, info?.width === 1320 && info?.height === 2868 && info?.colorType !== 4 && info?.colorType !== 6, info ? `${info.width}x${info.height}, colorType=${info.colorType}` : "missing");
}

for (const file of screenshots) {
  const relativePath = `app-store/aso/ipad-13/model-b/${file}`;
  const info = pngInfo(relativePath);
  add(`iPad screenshot ${file}`, info?.width === 2064 && info?.height === 2752 && info?.colorType !== 4 && info?.colorType !== 6, info ? `${info.width}x${info.height}, colorType=${info.colorType}` : "missing");
}

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
