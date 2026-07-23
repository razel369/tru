import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

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
  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(bottomInset, 10) }]}>
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
    </View>
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
    backgroundColor: "rgba(255,252,247,0.94)",
    elevation: 8,
    flexDirection: "row",
    paddingHorizontal: 8,
    paddingTop: 7,
    shadowColor: colors.navy,
    shadowOffset: { height: -5, width: 0 },
    shadowOpacity: 0.045,
    shadowRadius: 18,
  },
});
