import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "../design";

interface AppHeaderProps {
  eyebrow: string;
  title: string;
  actionIcon?: keyof typeof Ionicons.glyphMap;
  onAction?: () => void;
}

/**
 * Section header with eyebrow + Fraunces title + optional action button.
 * Used at the top of Pets, Insights, and other secondary screens.
 * Extracted verbatim from App.tsx in stage 2.
 */
export function AppHeader({
  eyebrow,
  title,
  actionIcon,
  onAction,
}: AppHeaderProps) {
  return (
    <View style={styles.appHeader}>
      <View style={styles.flex}>
        <Text style={styles.sectionKicker}>{eyebrow}</Text>
        <Text style={styles.pageTitle}>{title}</Text>
      </View>
      {actionIcon && (
        <Pressable onPress={onAction} style={styles.headerAction}>
          <Ionicons name={actionIcon} size={21} color={colors.ink} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  appHeader: {
    alignItems: "center",
    flexDirection: "row",
    marginBottom: 24,
  },
  flex: { flex: 1 },
  headerAction: {
    alignItems: "center",
    backgroundColor: colors.paper,
    borderColor: colors.line,
    borderRadius: 15,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  pageTitle: {
    color: colors.ink,
    fontFamily: "Fraunces_700Bold",
    fontSize: 32,
    letterSpacing: -0.7,
    marginTop: 2,
  },
  sectionKicker: {
    color: colors.muted,
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 9,
    letterSpacing: 1.4,
  },
});
