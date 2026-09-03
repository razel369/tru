import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import { MotionPressable } from "./motion";

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

export function BottomNav({
  active,
  bottomInset,
  onChange,
}: BottomNavProps) {
  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(bottomInset, 8) }]}>
      <View style={styles.bottomNav}>
        <NavItem
          active={active === "today"}
          icon="today"
          label="Today"
          onPress={() => onChange("today")}
        />
        <NavItem
          active={active === "pets"}
          icon="paw"
          label="Pets"
          onPress={() => onChange("pets")}
        />
        <NavItem
          active={active === "insights"}
          icon="stats-chart"
          label="Insights"
          onPress={() => onChange("insights")}
        />
        <NavItem
          active={active === "health"}
          icon="home"
          label="Home"
          onPress={() => onChange("health")}
        />
      </View>
    </View>
  );
}

function NavItem({
  active,
  icon,
  label,
  onPress,
}: {
  active: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <MotionPressable
      accessibilityLabel={label}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.navItem,
        pressed && styles.pressed,
      ]}
    >
      <Ionicons
        color={active ? "#EF7064" : "#9AA5AA"}
        name={icon}
        size={25}
      />
      <Text style={[styles.navLabel, active && styles.navLabelActive]}>
        {label}
      </Text>
      <View style={[styles.activeLine, active && styles.activeLineVisible]} />
    </MotionPressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    backgroundColor: "rgba(255,253,249,0.99)",
    borderTopColor: "rgba(42,65,68,0.08)",
    borderTopWidth: 1,
  },
  bottomNav: {
    height: 82,
    paddingHorizontal: 16,
    paddingTop: 10,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  navItem: {
    flex: 1,
    minHeight: 60,
    alignItems: "center",
    justifyContent: "flex-start",
  },
  pressed: {
    opacity: 0.72,
  },
  navLabel: {
    marginTop: 5,
    color: "#9AA5AA",
    fontFamily: "Nunito_700Bold",
    fontSize: 11,
  },
  navLabelActive: {
    color: "#EF7064",
  },
  activeLine: {
    width: 24,
    height: 3,
    marginTop: 5,
    borderRadius: 2,
    backgroundColor: "transparent",
  },
  activeLineVisible: {
    backgroundColor: "#EF7064",
  },
});
