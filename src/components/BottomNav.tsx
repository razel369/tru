import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef } from "react";
import {
  Animated,
  Image,
  type ImageSourcePropType,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { assets, colors, shadow } from "../design";
import { usePrefersReducedMotion } from "../features/accessibility/motion";

type Screen =
  | "today"
  | "pets"
  | "insights"
  | "add"
  | "health"
  | "settings"
  | "paywall"
  | "household"
  | "add-pet"
  | "edit-pet"
  | "pet-menu"
  | "report";

interface BottomNavProps {
  active: Screen;
  bottomInset: number;
  onChange: (screen: Screen) => void;
  onAdd?: () => void;
}

/**
 * Soft floating tab bar — clay stickers peek above the active tab.
 */
export function BottomNav({
  active,
  bottomInset,
  onChange,
}: BottomNavProps) {
  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(bottomInset, 12) }]}>
      <View style={styles.bottomNav}>
        <NavItem
          active={active === "today"}
          icon="home"
          label="Today"
          onPress={() => onChange("today")}
          sticker={assets.stickers.paw}
        />
        <NavItem
          active={active === "pets"}
          icon="paw"
          label="Pets"
          onPress={() => onChange("pets")}
          sticker={assets.stickers.bone}
        />
        <NavItem
          active={active === "insights"}
          icon="stats-chart"
          label="Insights"
          onPress={() => onChange("insights")}
          sticker={assets.stickers.sun}
        />
        <NavItem
          active={active === "health"}
          icon="people"
          label="Home"
          onPress={() => onChange("health")}
          sticker={assets.stickers.heart}
        />
      </View>
    </View>
  );
}

interface NavItemProps {
  active: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  sticker: ImageSourcePropType;
}

function NavItem({ active, icon, label, onPress, sticker }: NavItemProps) {
  const reduceMotion = usePrefersReducedMotion();
  const scale = useRef(new Animated.Value(active ? 1.08 : 1)).current;
  const press = useRef(new Animated.Value(1)).current;
  const stickerY = useRef(new Animated.Value(active ? 0 : 8)).current;
  const stickerOpacity = useRef(new Animated.Value(active ? 1 : 0)).current;

  useEffect(() => {
    if (reduceMotion) {
      scale.setValue(active ? 1.08 : 1);
      stickerY.setValue(0);
      stickerOpacity.setValue(active ? 1 : 0);
      return;
    }
    Animated.spring(scale, {
      toValue: active ? 1.12 : 1,
      friction: 6,
      tension: 160,
      useNativeDriver: true,
    }).start();
    Animated.parallel([
      Animated.spring(stickerY, {
        toValue: active ? 0 : 10,
        friction: 7,
        tension: 140,
        useNativeDriver: true,
      }),
      Animated.timing(stickerOpacity, {
        toValue: active ? 1 : 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();
  }, [active, reduceMotion, scale, stickerOpacity, stickerY]);

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      onPressIn={() => {
        if (reduceMotion) return;
        Animated.spring(press, {
          toValue: 0.9,
          friction: 7,
          tension: 220,
          useNativeDriver: true,
        }).start();
      }}
      onPressOut={() => {
        if (reduceMotion) return;
        Animated.spring(press, {
          toValue: 1,
          friction: 5,
          tension: 180,
          useNativeDriver: true,
        }).start();
      }}
      style={styles.navItem}
    >
      <Animated.View
        style={{
          alignItems: "center",
          gap: 3,
          transform: [{ scale: Animated.multiply(scale, press) }],
        }}
      >
        <Animated.View
          style={{
            height: 22,
            marginBottom: -2,
            opacity: stickerOpacity,
            transform: [{ translateY: stickerY }],
          }}
        >
          <Image
            accessibilityIgnoresInvertColors
            resizeMode="contain"
            source={sticker}
            style={styles.navSticker}
          />
        </Animated.View>
        <Ionicons
          color={active ? colors.sky : "#A8B2BA"}
          name={icon}
          size={24}
        />
        <Text style={[styles.navLabel, active && styles.navLabelActive]}>
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bottomNav: {
    alignItems: "center",
    backgroundColor: "rgba(255,252,247,0.96)",
    borderRadius: 30,
    flexDirection: "row",
    marginHorizontal: 18,
    paddingBottom: 10,
    paddingHorizontal: 6,
    paddingTop: 8,
    ...shadow.card,
  },
  navItem: {
    alignItems: "center",
    flex: 1,
    gap: 3,
  },
  navLabel: {
    color: "#A8B2BA",
    fontFamily: "Nunito_700Bold",
    fontSize: 11,
  },
  navLabelActive: {
    color: colors.sky,
  },
  navSticker: {
    height: 22,
    width: 22,
  },
  wrap: {
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
  },
});
