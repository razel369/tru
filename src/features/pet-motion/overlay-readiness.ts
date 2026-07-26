export type PetMotionOverlayState = "blinkHalf" | "blink";

type OverlayCounts = Record<PetMotionOverlayState, number>;
type OverlayLoads = Record<PetMotionOverlayState, ReadonlySet<number>>;

export type PetMotionOverlayReadiness = {
  expected: OverlayCounts;
  failed: boolean;
  loaded: OverlayLoads;
  packKey: string;
};

export type PetMotionOverlayLoadResult = {
  readiness: PetMotionOverlayReadiness;
  status: "failed" | "ready" | "stale" | "waiting";
};

function normalizedCount(value: number) {
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

export function createPetMotionOverlayReadiness(
  packKey: string,
  expected: OverlayCounts,
): PetMotionOverlayReadiness {
  return {
    expected: {
      blink: normalizedCount(expected.blink),
      blinkHalf: normalizedCount(expected.blinkHalf),
    },
    failed: false,
    loaded: {
      blink: new Set(),
      blinkHalf: new Set(),
    },
    packKey,
  };
}

export function isPetMotionOverlayReady(
  readiness: PetMotionOverlayReadiness,
) {
  if (readiness.failed) return false;
  return (["blinkHalf", "blink"] as const).every(
    (state) =>
      readiness.expected[state] === 0 ||
      readiness.loaded[state].size >= readiness.expected[state],
  );
}

export function recordPetMotionOverlayLoad(
  readiness: PetMotionOverlayReadiness,
  {
    index,
    packKey,
    state,
    succeeded,
  }: {
    index: number;
    packKey: string;
    state: PetMotionOverlayState;
    succeeded: boolean;
  },
): PetMotionOverlayLoadResult {
  if (readiness.packKey !== packKey) {
    return { readiness, status: "stale" };
  }

  if (
    !succeeded ||
    index < 0 ||
    index >= readiness.expected[state]
  ) {
    const next = { ...readiness, failed: true };
    return { readiness: next, status: "failed" };
  }

  if (readiness.failed) {
    return { readiness, status: "failed" };
  }

  const loadedState = new Set(readiness.loaded[state]);
  loadedState.add(index);
  const next: PetMotionOverlayReadiness = {
    ...readiness,
    loaded: {
      ...readiness.loaded,
      [state]: loadedState,
    },
  };

  return {
    readiness: next,
    status: isPetMotionOverlayReady(next) ? "ready" : "waiting",
  };
}
