import type { ImageSourcePropType } from "react-native";
import { Image, StyleSheet, Text, View } from "react-native";

import { colors } from "../design";

interface LoadingScreenProps {
  icon: ImageSourcePropType;
}

/**
 * Brand-marked loading state shown while custom fonts load.
 * Extracted verbatim from App.tsx in stage 2.
 */
export function LoadingScreen({ icon }: LoadingScreenProps) {
  return (
    <View style={styles.loadingScreen}>
      <Image source={icon} style={styles.loadingMark} />
      <Text style={styles.loadingWordmark}>PawPair</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingMark: {
    borderRadius: 18,
    height: 54,
    transform: [{ rotate: "-5deg" }],
    width: 54,
  },
  loadingScreen: {
    alignItems: "center",
    backgroundColor: colors.background,
    flex: 1,
    gap: 14,
    justifyContent: "center",
  },
  loadingWordmark: {
    color: colors.ink,
    fontFamily: "Fraunces_700Bold",
    fontSize: 24,
  },
});
