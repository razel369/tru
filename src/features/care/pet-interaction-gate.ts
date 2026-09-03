export type PetInteractionKind = "body" | "care" | "head";

export type PetInteractionGateResult = {
  accepted: boolean;
  lockedUntil: number;
};

const MINIMUM_TOUCH_LOCK_MS: Record<Exclude<PetInteractionKind, "care">, number> =
  {
    body: 760,
    head: 900,
  };

export function acquirePetInteractionGate({
  kind,
  lockedUntil,
  now,
  touchCooldownMs,
}: {
  kind: PetInteractionKind;
  lockedUntil: number;
  now: number;
  touchCooldownMs: number;
}): PetInteractionGateResult {
  if (kind === "care") {
    return { accepted: true, lockedUntil };
  }

  if (now < lockedUntil) {
    return { accepted: false, lockedUntil };
  }

  return {
    accepted: true,
    lockedUntil:
      now + Math.max(touchCooldownMs, MINIMUM_TOUCH_LOCK_MS[kind]),
  };
}
