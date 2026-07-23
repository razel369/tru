import { spawnSync } from "node:child_process";
import path from "node:path";

const npmCli = process.env.npm_execpath;
if (!npmCli) {
  console.error("npm_execpath is unavailable. Run this script through npm run verify:ci.");
  process.exit(1);
}

const npxCli = path.join(path.dirname(npmCli), "npx-cli.js");

const steps = [
  { label: "ESLint", cli: npmCli, args: ["run", "lint"] },
  { label: "TypeScript", cli: npmCli, args: ["run", "typecheck"] },
  { label: "Vitest", cli: npmCli, args: ["test"] },
  { label: "Motion asset audit", cli: npmCli, args: ["run", "audit:motion-assets"] },
  { label: "Expo Doctor", cli: npxCli, args: ["--yes", "expo-doctor"] },
];

for (const step of steps) {
  console.log(`\n=== ${step.label} ===`);
  const result = spawnSync(process.execPath, [step.cli, ...step.args], {
    cwd: process.cwd(),
    env: process.env,
    stdio: "inherit",
    shell: false,
  });

  if (result.error) {
    console.error(`${step.label} could not start: ${result.error.message}`);
    process.exit(1);
  }

  if (result.status !== 0) {
    console.error(`${step.label} failed with exit code ${result.status ?? "unknown"}.`);
    process.exit(result.status ?? 1);
  }
}

console.log("\nAll PawPair CI quality gates passed.");
