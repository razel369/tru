import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";

import { colors } from "../design";
import { usePrefersReducedMotion } from "../features/accessibility/motion";

interface HeartBurstProps {
  /** Bump this to replay the burst. */
  trigger: number;
}

const HEARTS = [
  { x: -28, y: -36, size: 14, delay: 0 },
  { x: 8, y: -48, size: 18, delay: 40 },
  { x: 32, y: -28, size: 12, delay: 80 },
  { x: -8, y: -58, size: 11, delay: 60 },
  { x: 22, y: -42, size: 15, delay: 100 },
] as const;

/**
 * Short heart pop for "dose given" moments — presence, not fireworks.
 */
export function HeartBurst({ trigger }: HeartBurstProps) {
  const reduceMotion = usePrefersReducedMotion();
  const hearts = useMemo(
    () =>
      HEARTS.map(() => ({
        opacity: new Animated.Value(0),
        y: new Animated.Value(0),
        scale: new Animated.Value(0.4),
      })),
    [],
  );

  useEffect(() => {
    if (trigger === 0) return;
    if (reduceMotion) return;

    const anims = hearts.map((heart, index) => {
      heart.opacity.setValue(0);
      heart.y.setValue(0);
      heart.scale.setValue(0.4);
      const delay = HEARTS[index]?.delay ?? 0;
      return Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(heart.opacity, {
            toValue: 1,
            duration: 120,
            useNativeDriver: true,
          }),
          Animated.timing(heart.scale, {
            toValue: 1,
            duration: 220,
            easing: Easing.out(Easing.back(1.4)),
            useNativeDriver: true,
          }),
          Animated.timing(heart.y, {
            toValue: HEARTS[index]?.y ?? -40,
            duration: 520,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(heart.opacity, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
      ]);
    });

    Animated.parallel(anims).start();
  }, [trigger, reduceMotion, hearts]);

  if (trigger === 0 || reduceMotion) return null;

  return (
    <View pointerEvents="none" style={styles.wrap}>
      {hearts.map((heart, index) => (
        <Animated.View
          key={index}
          style={[
            styles.heart,
            {
              left: "50%",
              marginLeft: HEARTS[index]?.x ?? 0,
              opacity: heart.opacity,
              transform: [
                { translateY: heart.y },
                { scale: heart.scale },
              ],
            },
          ]}
        >
          <Ionicons
            color={colors.coral}
            name="heart"
            size={HEARTS[index]?.size ?? 14}
          />
        </Animated.View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  heart: {
    position: "absolute",
    top: "42%",
  },
  wrap: {
    ...StyleSheet.absoluteFill,
    zIndex: 20,
  },
});
