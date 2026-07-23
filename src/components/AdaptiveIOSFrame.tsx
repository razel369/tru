import type { PropsWithChildren } from "react";
import { Platform, StyleSheet, useWindowDimensions, View } from "react-native";

export function AdaptiveIOSFrame({ children }: PropsWithChildren) {
  const { width } = useWindowDimensions();
  const isNativeIPad = Platform.OS === "ios" && Platform.isPad;
  const isWebTabletPreview = Platform.OS === "web" && width >= 768;
  const useReadingWidth =
    (isNativeIPad || isWebTabletPreview) && width >= 760;

  return (
    <View style={styles.canvas}>
      <View style={[styles.app, useReadingWidth && styles.tablet]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  app: {
    alignSelf: "center",
    backgroundColor: "#F7F1E8",
    flex: 1,
    overflow: "hidden",
    width: "100%",
  },
  canvas: { backgroundColor: "#E9DFD2", flex: 1, width: "100%" },
  tablet: {
    borderLeftColor: "rgba(42, 55, 72, 0.06)",
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightColor: "rgba(42, 55, 72, 0.06)",
    borderRightWidth: StyleSheet.hairlineWidth,
    maxWidth: 744,
  },
});
