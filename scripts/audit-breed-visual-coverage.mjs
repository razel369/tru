import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relativePath) =>
  fs.readFileSync(path.join(projectRoot, relativePath), "utf8");

const breedSource = read("src/data/pet-breeds.ts");
const visualRegistrySource = read("src/features/pet-visuals/registry.ts");
const motionPackSource = read("src/features/pet-motion/local-packs.ts");
const generatedPackSource = read(
  "src/features/pet-motion/exact-breed-packs.ts",
);

const slug = (value) =>
  value
    .trim()
    .toLocaleLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const parseCatalog = (factory, species) =>
  [
    ...breedSource.matchAll(
      new RegExp(factory + '\\("([^"]+)"(?:,\\s*"([^"]+)")?\\)', "g"),
    ),
  ].map(([, name, visualProfile]) => ({
    species,
    name,
    visualProfile:
      visualProfile ?? (species === "cat" ? "cat-compact" : "dog-standard"),
    catalogKey: "breed:" + species + ":" + (slug(name) || "mixed"),
  }));

const aliases = new Map(
  [
    ...visualRegistrySource.matchAll(
      /"(breed:[^"]+)":\s*"((?:breed|pet):[^"]+)"/g,
    ),
  ].map(
    ([, from, to]) => [from, to],
  ),
);

const visualAssetKeys = new Set(
  [
    ...(visualRegistrySource + "\n" + generatedPackSource).matchAll(
      /"(breed:(?:dog|cat):[^"]+)"/g,
    ),
  ].map(([, key]) => key),
);

const motionPackKeys = new Set(
  [
    ...(motionPackSource + "\n" + generatedPackSource).matchAll(
      /"((?:(?:breed:(?:dog|cat))|pet):[^"]+)"/g,
    ),
  ].map(([, key]) => key),
);

const rows = [...parseCatalog("dog", "dog"), ...parseCatalog("cat", "cat")].map(
  (breed) => {
    const resolvedKey = aliases.get(breed.catalogKey) ?? breed.catalogKey;
    const hasVisual = visualAssetKeys.has(resolvedKey);
    const hasMotion = motionPackKeys.has(resolvedKey);
    const identityMatched = !resolvedKey.startsWith("pet:");
    return {
      ...breed,
      resolvedKey,
      hasVisual,
      hasMotion,
      identityMatched,
      status:
        hasVisual && hasMotion && identityMatched ? "exact" : "fallback",
    };
  },
);

const exact = rows.filter((row) => row.status === "exact");
const fallback = rows.filter((row) => row.status === "fallback");
const pickerUnsafe = rows.filter(
  (row) => row.hasVisual && (!row.hasMotion || !row.identityMatched),
);
const bySpecies = Object.fromEntries(
  ["dog", "cat"].map((species) => {
    const speciesRows = rows.filter((row) => row.species === species);
    const speciesExact = speciesRows.filter((row) => row.status === "exact");
    return [
      species,
      {
        total: speciesRows.length,
        exact: speciesExact.length,
        fallback: speciesRows.length - speciesExact.length,
        exactPercent: Number(
          ((speciesExact.length / speciesRows.length) * 100).toFixed(2),
        ),
      },
    ];
  }),
);

const report = {
  generatedAt: new Date().toISOString(),
  summary: {
    total: rows.length,
    exact: exact.length,
    fallback: fallback.length,
    pickerUnsafe: pickerUnsafe.length,
    exactPercent: Number(((exact.length / rows.length) * 100).toFixed(2)),
  },
  bySpecies,
  exact,
  fallback,
  pickerUnsafe,
};

const outputPath = path.join(projectRoot, "app-store", "breed-visual-coverage.json");
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(report, null, 2) + "\n");
process.stdout.write(
  JSON.stringify({ outputPath, ...report.summary, bySpecies }, null, 2) + "\n",
);

if (process.argv.includes("--strict") && fallback.length > 0) {
  process.exitCode = 1;
}

if (process.argv.includes("--picker-strict") && pickerUnsafe.length > 0) {
  console.error(
    "A breed picker entry can resolve to a missing or mismatched companion.",
  );
  process.exitCode = 1;
}
