import { Ionicons } from "@expo/vector-icons";
import { Image, StyleSheet, Text, View } from "react-native";

import { assets, colors, shadow } from "../../design";
import { AmbientStickers } from "../AmbientStickers";
import { PressScale } from "../PressScale";

interface EmptyTodayStateProps {
  onAddMedication: () => void;
}

/** Empty day — Buddy peeks in; clear next action. */
export function EmptyTodayState({ onAddMedication }: EmptyTodayStateProps) {
  return (
    <View style={styles.container}>
      <AmbientStickers
        items={[
          {
            source: assets.stickers.sun,
            size: 44,
            top: -18,
            right: -8,
            rotate: "12deg",
            delay: 80,
          },
          {
            source: assets.stickers.paw,
            size: 36,
            top: 8,
            left: -14,
            rotate: "-14deg",
            delay: 160,
            amplitude: 5,
          },
        ]}
      />
      <Image
        accessibilityLabel="Buddy peeking"
        resizeMode="contain"
        source={assets.emptyBuddyPeek}
        style={styles.buddy}
      />
      <Text style={styles.title}>No doses today</Text>
      <Text style={styles.body}>
        Add a medication to your pet’s plan and it will show up here when it’s
        time.
      </Text>
      <PressScale
        onPress={onAddMedication}
        scaleTo={0.96}
        style={styles.cta}
      >
        <Ionicons color={colors.white} name="add" size={18} />
        <Text style={styles.ctaText}>Add medication</Text>
      </PressScale>
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    color: colors.muted,
    fontFamily: "Nunito_600SemiBold",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
    textAlign: "center",
  },
  buddy: {
    height: 112,
    marginTop: -4,
    width: 112,
  },
  container: {
    alignItems: "center",
    backgroundColor: "rgba(255,252,247,0.97)",
    borderRadius: 28,
    overflow: "visible",
    paddingHorizontal: 22,
    paddingVertical: 20,
    ...shadow.card,
  },
  cta: {
    alignItems: "center",
    backgroundColor: colors.coral,
    borderRadius: 999,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    marginTop: 16,
    minHeight: 52,
    paddingHorizontal: 24,
    ...shadow.fab,
  },
  ctaText: {
    color: colors.white,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 15,
  },
  title: {
    color: colors.ink,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 20,
    marginTop: 4,
  },
});
