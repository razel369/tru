import { useEffect, useRef, type ReactNode } from "react";
import {
  Animated,
  Platform,
  Pressable,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { usePrefersReducedMotion } from "../features/accessibility/motion";

const USE_NATIVE_DRIVER = Platform.OS !== "web";

interface PressScaleProps extends Omit<PressableProps, "style"> {
  children: ReactNode;
  scaleTo?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Tiny press feedback so clay UI feels tactile instead of flat.
 */
export function PressScale({
  children,
  scaleTo = 0.94,
  style,
  onPressIn,
  onPressOut,
  ...rest
}: PressScaleProps) {
  const reduceMotion = usePrefersReducedMotion();
  const scale = useRef(new Animated.Value(1)).current;
  const activeAnimation = useRef<ReturnType<typeof Animated.spring> | null>(
    null,
  );

  useEffect(() => {
    if (reduceMotion) {
      activeAnimation.current?.stop();
      activeAnimation.current = null;
      scale.setValue(1);
    }
    return () => {
      activeAnimation.current?.stop();
      activeAnimation.current = null;
    };
  }, [reduceMotion, scale]);

  const animateScale = (toValue: number, returning: boolean) => {
    activeAnimation.current?.stop();
    activeAnimation.current = null;
    if (reduceMotion) {
      scale.setValue(1);
      return;
    }
    const animation = Animated.spring(scale, {
      toValue,
      friction: returning ? 5 : 6,
      tension: returning ? 180 : 220,
      useNativeDriver: USE_NATIVE_DRIVER,
    });
    activeAnimation.current = animation;
    animation.start(() => {
      if (activeAnimation.current === animation) {
        activeAnimation.current = null;
      }
    });
  };

  return (
    <Pressable
      {...rest}
      onPressIn={(event) => {
        animateScale(scaleTo, false);
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        animateScale(1, true);
        onPressOut?.(event);
      }}
    >
      {({ pressed }) => (
        <Animated.View
          style={[
            style,
            {
              opacity: reduceMotion && pressed ? 0.84 : 1,
              transform: [{ scale }],
            },
          ]}
        >
          {children}
        </Animated.View>
      )}
    </Pressable>
  );
}
