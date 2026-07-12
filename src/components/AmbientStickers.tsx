import { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  Image,
  type ImageSourcePropType,
  Platform,
  StyleSheet,
  View,
  type ViewStyle,
} from "react-native";

import { usePrefersReducedMotion } from "../features/accessibility/motion";

export interface AmbientStickerSpec {
  source: ImageSourcePropType;
  size: number;
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
  rotate?: string;
  delay?: number;
  amplitude?: number;
}

interface AmbientStickersProps {
  items: AmbientStickerSpec[];
  style?: ViewStyle;
}

/**
 * Soft floating clay stickers — atmosphere, not chrome.
 */
export function AmbientStickers({ items, style }: AmbientStickersProps) {
  return (
    <View pointerEvents="none" style={[styles.layer, style]}>
      {items.map((item, index) => (
        <FloatingSticker key={index} {...item} />
      ))}
    </View>
  );
}

function FloatingSticker({
  source,
  size,
  top,
  bottom,
  left,
  right,
  rotate = "0deg",
  delay = 0,
  amplitude = 6,
}: AmbientStickerSpec) {
  const reduceMotion = usePrefersReducedMotion();
  const y = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(reduceMotion ? 0.92 : 0)).current;

  useEffect(() => {
    const useNativeDriver = Platform.OS !== "web";
    Animated.timing(opacity, {
      toValue: 0.92,
      duration: reduceMotion ? 0 : 480,
      delay: reduceMotion ? 0 : delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver,
    }).start();

    if (reduceMotion) return;

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(y, {
          toValue: -amplitude,
          duration: 2200 + delay,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver,
        }),
        Animated.timing(y, {
          toValue: amplitude * 0.35,
          duration: 2200 + delay,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [amplitude, delay, opacity, reduceMotion, y]);

  return (
    <Animated.View
      style={[
        styles.sticker,
        {
          top,
          bottom,
          left,
          right,
          width: size,
          height: size,
          opacity,
          transform: [{ translateY: y }, { rotate }],
        },
      ]}
    >
      <Image
        accessibilityIgnoresInvertColors
        resizeMode="contain"
        source={source}
        style={{ width: size, height: size }}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  layer: {
    ...StyleSheet.absoluteFill,
    zIndex: 3,
  },
  sticker: {
    position: "absolute",
  },
});
