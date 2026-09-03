import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";

let cachedReduceMotion = false;
let queryGeneration = 0;
let nativeSubscription: { remove: () => void } | null = null;
const subscribers = new Set<() => void>();

function updateReducedMotion(value: boolean) {
  if (cachedReduceMotion === value) return;
  cachedReduceMotion = value;
  subscribers.forEach((subscriber) => subscriber());
}

function startReducedMotionStore() {
  if (nativeSubscription) return;
  const generation = ++queryGeneration;
  nativeSubscription = AccessibilityInfo.addEventListener(
    "reduceMotionChanged",
    updateReducedMotion,
  );
  void AccessibilityInfo.isReduceMotionEnabled()
    .then((value) => {
      if (generation === queryGeneration) updateReducedMotion(value);
    })
    .catch(() => undefined);
}

function subscribeToReducedMotion(subscriber: () => void) {
  subscribers.add(subscriber);
  startReducedMotionStore();
  subscriber();
  return () => {
    subscribers.delete(subscriber);
    if (subscribers.size > 0) return;
    queryGeneration += 1;
    nativeSubscription?.remove();
    nativeSubscription = null;
  };
}

/**
 * docs/AAA-HANDOFF.md §10: "Motion must explain state change.
 * Prefer spring-based 180–320 ms transitions and respect Reduce
 * Motion."
 *
 * Returns the current Reduce Motion preference. All consumers
 * share one native listener and a cached snapshot; the async
 * platform value and later preference changes update together.
 */
export function usePrefersReducedMotion(): boolean {
  const [reduce, setReduce] = useState(cachedReduceMotion);
  useEffect(() => {
    return subscribeToReducedMotion(() => {
      setReduce(cachedReduceMotion);
    });
  }, []);
  return reduce;
}

/**
 * Helper for components that animate. When Reduce Motion is
 * enabled we return zero-duration equivalents. Components can
 * use this to short-circuit their Animated.timing calls.
 */
export function useAnimationDuration(recommendedMs: number): number {
  const reduce = usePrefersReducedMotion();
  return reduce ? 0 : recommendedMs;
}
