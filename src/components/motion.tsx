import { useEffect, useRef } from "react";
import type { PressableProps, StyleProp, ViewStyle } from "react-native";
import { Animated, Easing, Platform, Pressable, StyleSheet } from "react-native";

import { usePrefersReducedMotion } from "../features/accessibility/motion";

const useNativeDriver = Platform.OS !== "web";

export function MotionScreen({
  children,
  motionKey,
}: {
  children: React.ReactNode;
  motionKey: string;
}) {
  const reduceMotion = usePrefersReducedMotion();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(10)).current;
  const previousMotionKey = useRef<string | null>(null);

  useEffect(() => {
    const keyChanged = previousMotionKey.current !== motionKey;
    previousMotionKey.current = motionKey;
    opacity.stopAnimation();
    translateY.stopAnimation();
    if (reduceMotion || !keyChanged) {
      opacity.setValue(1);
      translateY.setValue(0);
      return;
    }
    opacity.setValue(0);
    translateY.setValue(10);
    const animation = Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver,
      }),
    ]);
    animation.start();
    return () => animation.stop();
  }, [motionKey, opacity, reduceMotion, translateY]);

  return (
    <Animated.View style={[styles.screen, { opacity, transform: [{ translateY }] }]}>
      {children}
    </Animated.View>
  );
}

export function MotionReveal({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const reduceMotion = usePrefersReducedMotion();
  const progress = useRef(new Animated.Value(0)).current;
  const hasRevealed = useRef(false);

  useEffect(() => {
    progress.stopAnimation();
    if (reduceMotion || hasRevealed.current) {
      progress.setValue(1);
      hasRevealed.current = true;
      return;
    }
    const animation = Animated.spring(progress, {
      toValue: 1,
      damping: 18,
      stiffness: 240,
      mass: 0.8,
      useNativeDriver,
    });
    animation.start(({ finished }) => {
      if (finished) hasRevealed.current = true;
    });
    return () => animation.stop();
  }, [progress, reduceMotion]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: progress,
          transform: [
            {
              translateY: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [-8, 0],
              }),
            },
            {
              scale: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [0.97, 1],
              }),
            },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

export function MotionPressable({
  style,
  ...props
}: PressableProps) {
  const reduceMotion = usePrefersReducedMotion();
  return (
    <Pressable
      {...props}
      style={(state) => [
        typeof style === "function" ? style(state) : style,
        state.pressed &&
          (reduceMotion ? styles.pressedReduced : styles.pressed),
      ]}
    />
  );
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.84,
    transform: [{ scale: 0.985 }],
  },
  pressedReduced: { opacity: 0.84 },
  screen: { flex: 1 },
});
