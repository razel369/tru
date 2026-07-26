import { Ionicons } from "@expo/vector-icons";
import {
  GlassView,
  isGlassEffectAPIAvailable,
  isLiquidGlassAvailable,
} from "expo-glass-effect";
import { useEffect, useState } from "react";
import {
  AccessibilityInfo,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { colors, shadow } from "../../design";

export type CareTab = "home" | "plan" | "add" | "health" | "pets";

const ITEMS: {
  key: CareTab;
  label: string;
  icon: string;
  activeIcon: string;
}[] = [
  { key: "home", label: "Home", icon: "home-outline", activeIcon: "home" },
  { key: "plan", label: "Plan", icon: "calendar-outline", activeIcon: "calendar" },
  { key: "add", label: "Add", icon: "add", activeIcon: "add" },
  { key: "health", label: "Health", icon: "heart-outline", activeIcon: "heart" },
  { key: "pets", label: "Pets", icon: "paw-outline", activeIcon: "paw" },
];

export function CareBottomNav({
  active,
  bottomInset,
  onChange,
}: {
  active: CareTab;
  bottomInset: number;
  onChange: (tab: CareTab) => void;
}) {
  const [reduceTransparency, setReduceTransparency] = useState(false);

  useEffect(() => {
    if (Platform.OS !== "ios") return;
    let active = true;
    void AccessibilityInfo.isReduceTransparencyEnabled().then((enabled) => {
      if (active) setReduceTransparency(enabled);
    });
    const subscription = AccessibilityInfo.addEventListener(
      "reduceTransparencyChanged",
      setReduceTransparency,
    );
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  const useNativeGlass =
    Platform.OS === "ios" &&
    !reduceTransparency &&
    isGlassEffectAPIAvailable() &&
    isLiquidGlassAvailable();
  const items = (
    <>
      {ITEMS.map((item) => {
        const selected = active === item.key;
        const isAdd = item.key === "add";
        return (
          <Pressable
            accessibilityLabel={item.label}
            accessibilityHint={
              isAdd
                ? "Creates a new care moment"
                : `Opens the ${item.label} tab`
            }
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            key={item.key}
            onPress={() => {
              onChange(item.key);
            }}
            style={({ pressed }) => [
              styles.item,
              isAdd && styles.addItem,
              pressed && (isAdd ? styles.addPressed : styles.pressed),
            ]}
          >
            <View
              style={[
                styles.iconWrap,
                selected && styles.iconWrapActive,
                isAdd && styles.addIconWrap,
              ]}
            >
              <Ionicons
                color={isAdd ? colors.white : selected ? colors.sky : colors.muted}
                name={
                  (selected ? item.activeIcon : item.icon) as keyof typeof Ionicons.glyphMap
                }
                size={isAdd ? 27 : 22}
              />
            </View>
            {!isAdd && (
              <Text style={[styles.label, selected && styles.labelActive]}>
                {item.label}
              </Text>
            )}
          </Pressable>
        );
      })}
    </>
  );

  const surfaceStyle = [
    styles.wrap,
    useNativeGlass ? styles.wrapGlass : styles.wrapFallback,
    { paddingBottom: Math.max(bottomInset, 10) },
  ];

  return useNativeGlass ? (
    <GlassView
      colorScheme="light"
      glassEffectStyle="regular"
      style={surfaceStyle}
      tintColor="rgba(255, 248, 236, 0.18)"
    >
      {items}
    </GlassView>
  ) : (
    <View style={surfaceStyle}>{items}</View>
  );
}

const styles = StyleSheet.create({
  addIconWrap: {
    backgroundColor: colors.coral,
    borderRadius: 24,
    height: 48,
    width: 48,
    ...shadow.fab,
  },
  addItem: { transform: [{ translateY: -16 }] },
  addPressed: {
    opacity: 0.72,
    transform: [{ translateY: -16 }, { scale: 0.97 }],
  },
  iconWrap: {
    alignItems: "center",
    height: 30,
    justifyContent: "center",
    width: 42,
  },
  iconWrapActive: {
    backgroundColor: colors.skySoft,
    borderRadius: 16,
  },
  item: {
    alignItems: "center",
    flex: 1,
    gap: 2,
    justifyContent: "center",
    minHeight: 54,
  },
  label: {
    color: colors.muted,
    fontFamily: "Nunito_700Bold",
    fontSize: 10,
  },
  labelActive: { color: colors.sky },
  pressed: { opacity: 0.72, transform: [{ scale: 0.97 }] },
  wrap: {
    alignItems: "center",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    flexDirection: "row",
    paddingHorizontal: 8,
    paddingTop: 7,
  },
  wrapFallback: {
    backgroundColor: "rgba(255,252,247,0.96)",
    borderColor: "rgba(7,22,58,0.05)",
    borderTopWidth: StyleSheet.hairlineWidth,
    elevation: 8,
    shadowColor: colors.navy,
    shadowOffset: { height: -5, width: 0 },
    shadowOpacity: 0.045,
    shadowRadius: 18,
  },
  wrapGlass: {
    borderColor: "rgba(255,255,255,0.28)",
    borderTopWidth: StyleSheet.hairlineWidth,
    shadowColor: colors.navy,
    shadowOffset: { height: -3, width: 0 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
  },
});
