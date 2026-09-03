import { Ionicons } from "@expo/vector-icons";
import { Image, StyleSheet, Text, View } from "react-native";

import { assets, colors, shadow } from "../design";
import { PressScale } from "./PressScale";

interface AppHeaderProps {
  eyebrow: string;
  title: string;
  actionIcon?: keyof typeof Ionicons.glyphMap;
  onAction?: () => void;
  /** Soft clay accent beside the title. */
  accent?: "sun" | "paw" | "plant" | "heart" | "pill";
}

/**
 * Clay section header — Nunito wordmark energy for secondary screens.
 */
export function AppHeader({
  eyebrow,
  title,
  actionIcon,
  onAction,
  accent = "paw",
}: AppHeaderProps) {
  const accentSource = assets.stickers[accent];

  return (
    <View style={styles.appHeader}>
      <View style={styles.flex}>
        <View style={styles.kickerRow}>
          <Text style={styles.sectionKicker}>{eyebrow}</Text>
          <Image
            accessibilityIgnoresInvertColors
            resizeMode="contain"
            source={accentSource}
            style={styles.accent}
          />
        </View>
        <Text style={styles.pageTitle}>{title}</Text>
      </View>
      {actionIcon ? (
        <PressScale
          accessibilityLabel={title + " action"}
          onPress={onAction}
          style={styles.headerAction}
        >
          <Ionicons color={colors.ink} name={actionIcon} size={21} />
        </PressScale>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  accent: {
    height: 22,
    marginLeft: 4,
    marginTop: -2,
    width: 22,
  },
  appHeader: {
    alignItems: "center",
    flexDirection: "row",
    marginBottom: 22,
  },
  flex: { flex: 1 },
  headerAction: {
    alignItems: "center",
    backgroundColor: colors.paper,
    borderRadius: 22,
    height: 46,
    justifyContent: "center",
    width: 46,
    ...shadow.subtle,
  },
  kickerRow: {
    alignItems: "center",
    flexDirection: "row",
  },
  pageTitle: {
    color: colors.ink,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 32,
    letterSpacing: -0.9,
    marginTop: 2,
  },
  sectionKicker: {
    color: colors.sky,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 10,
    letterSpacing: 1.5,
  },
});
