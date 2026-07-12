import { useRef, type ReactNode } from "react";
import {
  Animated,
  Pressable,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";

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
  const scale = useRef(new Animated.Value(1)).current;

  return (
    <Pressable
      {...rest}
      onPressIn={(event) => {
        Animated.spring(scale, {
          toValue: scaleTo,
          friction: 6,
          tension: 220,
          useNativeDriver: true,
        }).start();
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        Animated.spring(scale, {
          toValue: 1,
          friction: 5,
          tension: 180,
          useNativeDriver: true,
        }).start();
        onPressOut?.(event);
      }}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}
