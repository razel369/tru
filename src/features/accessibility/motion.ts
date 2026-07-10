import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";

/**
 * docs/AAA-HANDOFF.md §10: "Motion must explain state change.
 * Prefer spring-based 180–320 ms transitions and respect Reduce
 * Motion."
 *
 * Returns the current Reduce Motion preference. The initial
 * value comes from AccessibilityInfo.isReduceMotionEnabled so
 * the first render matches the user's setting; subsequent
 * changes are picked up via the change listener.
 */
export function usePrefersReducedMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled().then((value: boolean) => {
      if (active) setReduce(value);
    });
    const sub = AccessibilityInfo.addEventListener(
      "reduceMotionChanged" as never,
      ((event: { reduceMotionEnabled: boolean }) => {
        setReduce(event.reduceMotionEnabled);
      }) as never,
    );
    return () => {
      active = false;
      sub.remove();
    };
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
