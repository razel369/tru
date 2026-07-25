import { resolvePetSubjectFraming } from "./subject-framing.generated";

export function resolvePetStagePlacement(
  key: string,
  {
    maxScale = 1.85,
    minScale = 0.82,
    targetCenterX = 0.5,
    targetFeetY = 0.93,
    targetSubjectHeight = 0.72,
  }: {
    maxScale?: number;
    minScale?: number;
    targetCenterX?: number;
    targetFeetY?: number;
    targetSubjectHeight?: number;
  } = {},
) {
  const framing = resolvePetSubjectFraming(key);
  const scale = Math.max(
    minScale,
    Math.min(maxScale, targetSubjectHeight / framing.subjectHeight),
  );
  const renderedCenterX = 0.5 + scale * (framing.centerX - 0.5);
  const renderedFeetY = 0.5 + scale * (framing.feetY - 0.5);

  return {
    framing,
    scale,
    translateXRatio: targetCenterX - renderedCenterX,
    translateYRatio: targetFeetY - renderedFeetY,
  };
}
