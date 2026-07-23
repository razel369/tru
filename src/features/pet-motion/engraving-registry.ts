import { GENERATED_EXACT_BREED_PACKS } from "./exact-breed-packs";

export type PetEngravingRegion = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};

type MedallionMeasurement = {
  readonly centerX: number;
  readonly centerY: number;
  readonly width: number;
  readonly height: number;
};

const engravingRegion = ({
  centerX,
  centerY,
  width: measuredWidth,
  height: measuredHeight,
}: MedallionMeasurement): PetEngravingRegion => {
  const width = Math.max(0.07, Math.min(0.1, measuredWidth * 1.05));
  const height = Math.max(0.03, Math.min(0.04, measuredHeight * 0.92));

  return {
    x: centerX - width / 2,
    y: centerY - height / 2,
    width,
    height,
  };
};

// Measured from each transparent idle asset. Per-asset calibration is required:
// pets with the same body rig can wear their medallions at different heights.
const MEDALLIONS = new Map<string, MedallionMeasurement>([
  ["pet:luna", { centerX: 0.460855, centerY: 0.497878, width: 0.079812, height: 0.039545 }],
  ["pet:milo", { centerX: 0.49791, centerY: 0.445873, width: 0.058685, height: 0.028169 }],
  ["breed:dog:golden-retriever", { centerX: 0.49791, centerY: 0.445873, width: 0.058685, height: 0.028169 }],
  ["breed:dog:dachshund", { centerX: 0.479705, centerY: 0.523428, width: 0.079812, height: 0.039003 }],
  ["breed:cat:maine-coon", { centerX: 0.522256, centerY: 0.473495, width: 0.057512, height: 0.027071 }],
  ["breed:cat:sphynx", { centerX: 0.492772, centerY: 0.472863, width: 0.066351, height: 0.029522 }],
  ["breed:dog:chihuahua", { centerX: 0.45147, centerY: 0.512737, width: 0.08558, height: 0.042842 }],
  ["breed:dog:french-bulldog", { centerX: 0.47318, centerY: 0.538839, width: 0.076202, height: 0.035249 }],
  ["breed:dog:border-collie", { centerX: 0.502328, centerY: 0.493152, width: 0.056272, height: 0.02603 }],
  ["breed:dog:great-dane", { centerX: 0.472345, centerY: 0.375374, width: 0.05041, height: 0.023319 }],
  ["breed:dog:pomeranian", { centerX: 0.435426, centerY: 0.521248, width: 0.072685, height: 0.035249 }],
  ["breed:cat:siamese", { centerX: 0.464657, centerY: 0.440312, width: 0.071596, height: 0.034128 }],
  ["breed:dog:labrador-retriever", { centerX: 0.4986, centerY: 0.481559, width: 0.059929, height: 0.028154 }],
  ["breed:dog:german-shepherd", { centerX: 0.496067, centerY: 0.486969, width: 0.052817, height: 0.02546 }],
  ["breed:dog:siberian-husky", { centerX: 0.501601, centerY: 0.49235, width: 0.058685, height: 0.028169 }],
  ["breed:dog:beagle", { centerX: 0.495955, centerY: 0.442106, width: 0.063306, height: 0.029284 }],
  ["breed:dog:standard-poodle", { centerX: 0.499212, centerY: 0.440565, width: 0.057512, height: 0.027627 }],
  ["breed:dog:pembroke-welsh-corgi", { centerX: 0.502159, centerY: 0.556261, width: 0.084408, height: 0.040672 }],
  ["breed:dog:shiba-inu", { centerX: 0.481665, centerY: 0.504666, width: 0.066823, height: 0.032538 }],
  ["breed:dog:samoyed", { centerX: 0.500607, centerY: 0.510494, width: 0.058754, height: 0.027042 }],
  ["breed:cat:persian", { centerX: 0.509463, centerY: 0.466389, width: 0.056272, height: 0.026573 }],
  ["breed:cat:ragdoll", { centerX: 0.522523, centerY: 0.466694, width: 0.058617, height: 0.027115 }],
  ["breed:cat:bengal", { centerX: 0.468805, centerY: 0.43144, width: 0.080891, height: 0.037961 }],
  ["breed:cat:scottish-fold", { centerX: 0.47373, centerY: 0.480468, width: 0.075029, height: 0.035792 }],
]);

GENERATED_EXACT_BREED_PACKS.forEach(({ key, medallion }) => {
  MEDALLIONS.set(key, medallion);
});

export function resolvePetEngraving(
  petKey: string,
): PetEngravingRegion | null {
  const measurement = MEDALLIONS.get(petKey);
  return measurement ? engravingRegion(measurement) : null;
}
