import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "../design";

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
  onAdd: () => void;
}

/**
 * Bottom tab bar with a centered coral FAB. Extracted verbatim
 * from App.tsx in stage 2. The fourth "Profile" item is non-functional
 * per docs/AAA-HANDOFF.md §2 (Profile tab is intentionally non-functional).
 */
export function BottomNav({
  active,
  bottomInset,
  onChange,
  onAdd,
}: BottomNavProps) {
  return (
    <BlurView
      intensity={88}
      style={[
        styles.bottomNav,
        { paddingBottom: Math.max(bottomInset, 10) },
      ]}
      tint="light"
    >
      <NavItem
        active={active === "today"}
        icon="home-outline"
        label="Today"
        onPress={() => onChange("today")}
      />
      <NavItem
        active={active === "pets"}
        icon="paw-outline"
        label="Pets"
        onPress={() => onChange("pets")}
      />
      <Pressable onPress={onAdd} style={styles.navAdd}>
        <LinearGradient
          colors={["#F28A70", "#E96D58"]}
          style={styles.navAddGradient}
        >
          <Ionicons name="add" size={27} color={colors.white} />
        </LinearGradient>
      </Pressable>
      <NavItem
        active={active === "insights"}
        icon="stats-chart-outline"
        label="Insights"
        onPress={() => onChange("insights")}
      />
      <NavItem
        active={active === "health"}
        icon="notifications-outline"
        label="Health"
        onPress={() => onChange("health")}
      />
    </BlurView>
  );
}

interface NavItemProps {
  active: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}

function NavItem({ active, icon, label, onPress }: NavItemProps) {
  return (
    <Pressable onPress={onPress} style={styles.navItem}>
      <View style={[styles.navIconWrap, active && styles.navIconWrapActive]}>
        <Ionicons
          color={active ? colors.coral : "#97A1A6"}
          name={
            active
              ? (icon.replace("-outline", "") as keyof typeof Ionicons.glyphMap)
              : icon
          }
          size={21}
        />
      </View>
      <Text style={[styles.navLabel, active && styles.navLabelActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bottomNav: {
    alignItems: "flex-end",
    backgroundColor: "rgba(255,253,249,0.82)",
    borderTopColor: "rgba(231,226,217,0.78)",
    borderTopWidth: 1,
    flexDirection: "row",
    overflow: "visible",
    paddingHorizontal: 8,
    paddingTop: 8,
  },
  navAdd: {
    alignItems: "center",
    flex: 1,
    marginTop: -24,
  },
  navAddGradient: {
    alignItems: "center",
    borderColor: colors.paper,
    borderRadius: 25,
    borderWidth: 4,
    height: 54,
    justifyContent: "center",
    shadowColor: colors.coral,
    shadowOffset: { height: 6, width: 0 },
    shadowOpacity: 0.26,
    shadowRadius: 8,
    width: 54,
  },
  navIconWrap: {
    alignItems: "center",
    borderRadius: 11,
    height: 29,
    justifyContent: "center",
    width: 39,
  },
  navIconWrapActive: { backgroundColor: colors.coralSoft },
  navItem: { alignItems: "center", flex: 1, gap: 2 },
  navLabel: { color: "#97A1A6", fontFamily: "Manrope_700Bold", fontSize: 8 },
  navLabelActive: { color: colors.coral },
});
