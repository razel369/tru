import { useEffect, useRef } from "react";
import { Animated, Easing, Platform, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { colors, shadow } from "../design";
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
  const isSkip = /skipped|restored/i.test(text);
  const isRemoval = /removed/i.test(text);
  const accent = isRemoval
    ? colors.danger
    : isSkip
      ? colors.butter
      : colors.coral;
  const icon = isRemoval ? "trash-outline" : isSkip ? "remove" : "heart";

  useEffect(() => {
    opacity.stopAnimation();
    y.stopAnimation();
    opacity.setValue(0);
    y.setValue(16);
    if (reduceMotion) {
      opacity.setValue(1);
      y.setValue(0);
      return;
    }
    const animation = Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: Platform.OS !== "web",
      }),
      Animated.spring(y, {
        toValue: 0,
        friction: 7,
        tension: 120,
        useNativeDriver: Platform.OS !== "web",
      }),
    ]);
    animation.start();
    return () => animation.stop();
  }, [text, reduceMotion, opacity, y]);

  return (
    <Animated.View
      accessibilityLabel={text}
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
      accessible
      importantForAccessibility="yes"
      pointerEvents="none"
      style={[
        styles.toast,
        {
          bottom: 92 + bottomInset,
          opacity,
          transform: [{ translateY: y }],
        },
      ]}
    >
      <View style={styles.toastIcon}>
        <Ionicons color={accent} name={icon} size={16} />
      </View>
      <Text style={styles.toastText}>{text}</Text>
      <Ionicons color="#9FC7A9" name="checkmark-circle" size={20} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    alignItems: "center",
    backgroundColor: colors.ink,
    borderRadius: 999,
    flexDirection: "row",
    gap: 9,
    left: 30,
    paddingHorizontal: 12,
    paddingVertical: 10,
    position: "absolute",
    right: 30,
    ...shadow.card,
  },
  toastIcon: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 14,
    height: 28,
    justifyContent: "center",
    width: 28,
  },
  toastText: {
    color: colors.white,
    flex: 1,
    fontFamily: "Nunito_700Bold",
    fontSize: 12,
    lineHeight: 16,
  },
});
