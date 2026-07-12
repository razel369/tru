import type { ImageSourcePropType } from "react-native";
import { Image, StyleSheet, Text, View } from "react-native";

import { colors } from "../design";

interface LoadingScreenProps {
  icon: ImageSourcePropType;
}

/** Brand-marked loading state while custom fonts load. */
export function LoadingScreen({ icon }: LoadingScreenProps) {
  return (
    <View style={styles.loadingScreen}>
      <Image source={icon} style={styles.loadingMark} />
      <View style={styles.wordmark}>
        <Text style={styles.wordPaw}>Paw</Text>
        <Text style={styles.wordPair}>Pair</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingMark: {
    borderRadius: 22,
    height: 64,
    width: 64,
  },
  loadingScreen: {
    alignItems: "center",
    backgroundColor: colors.background,
    flex: 1,
    gap: 16,
    justifyContent: "center",
  },
  wordmark: {
    flexDirection: "row",
  },
  wordPair: {
    color: colors.coral,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 28,
    letterSpacing: -0.6,
  },
  wordPaw: {
    color: colors.sky,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 28,
    letterSpacing: -0.6,
  },
});
