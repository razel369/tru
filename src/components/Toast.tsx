import { useEffect, useRef } from "react";
import { Animated, Easing, Image, StyleSheet, Text } from "react-native";

import { assets, colors, shadow } from "../design";
import { usePrefersReducedMotion } from "../features/accessibility/motion";

interface ToastProps {
  text: string;
  bottomInset: number;
}

/**
 * Soft clay toast above the bottom nav after a dose log or add.
 * Springs up so confirmation feels like a response, not a static banner.
 */
export function Toast({ text, bottomInset }: ToastProps) {
  const reduceMotion = usePrefersReducedMotion();
  const opacity = useRef(new Animated.Value(0)).current;
  const y = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    opacity.setValue(0);
    y.setValue(16);
    if (reduceMotion) {
      opacity.setValue(1);
      y.setValue(0);
      return;
    }
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(y, {
        toValue: 0,
        friction: 7,
        tension: 120,
        useNativeDriver: true,
      }),
    ]).start();
  }, [text, reduceMotion, opacity, y]);

  return (
    <Animated.View
      style={[
        styles.toast,
        {
          bottom: 92 + bottomInset,
          opacity,
          transform: [{ translateY: y }],
        },
      ]}
    >
      <Image
        accessibilityIgnoresInvertColors
        resizeMode="contain"
        source={assets.stickers.heart}
        style={styles.toastArt}
      />
      <Text style={styles.toastText}>{text}</Text>
      <Image
        accessibilityIgnoresInvertColors
        resizeMode="contain"
        source={assets.stickers.check}
        style={styles.toastCheckArt}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    alignItems: "center",
    backgroundColor: colors.ink,
    borderRadius: 999,
    flexDirection: "row",
    gap: 10,
    left: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    position: "absolute",
    right: 18,
    ...shadow.card,
  },
  toastArt: {
    height: 28,
    width: 28,
  },
  toastCheckArt: {
    height: 26,
    width: 26,
  },
  toastText: {
    color: colors.white,
    flex: 1,
    fontFamily: "Nunito_700Bold",
    fontSize: 13,
  },
});
