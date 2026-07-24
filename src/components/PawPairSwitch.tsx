import * as Haptics from "expo-haptics";
import { Pressable, StyleSheet, View } from "react-native";

import { colors } from "../design";

export function PawPairSwitch({
  accessibilityLabel,
  disabled = false,
  onValueChange,
  value,
}: {
  accessibilityLabel: string;
  disabled?: boolean;
  onValueChange: (value: boolean) => void;
  value: boolean;
}) {
  const toggle = () => {
    if (disabled) return;
    void Haptics.selectionAsync().catch(() => undefined);
    onValueChange(!value);
  };

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      disabled={disabled}
      hitSlop={6}
      onPress={toggle}
      style={({ pressed }) => [
        styles.touchTarget,
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.track, value ? styles.trackOn : styles.trackOff]}>
        <View
          style={[
            styles.thumb,
            value ? styles.thumbOn : styles.thumbOff,
          ]}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.78 },
  thumb: {
    backgroundColor: colors.white,
    borderRadius: 13,
    height: 26,
    position: "absolute",
    top: 3,
    width: 26,
  },
  thumbOff: {
    left: 3,
    shadowColor: colors.ink,
    shadowOffset: { height: 1, width: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
  },
  thumbOn: {
    right: 3,
    shadowColor: colors.ink,
    shadowOffset: { height: 1, width: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 2,
  },
  touchTarget: {
    alignItems: "center",
    height: 44,
    justifyContent: "center",
    width: 56,
  },
  track: {
    borderRadius: 16,
    height: 32,
    position: "relative",
    width: 52,
  },
  trackOff: {
    backgroundColor: colors.line,
    borderColor: "rgba(37, 40, 36, 0.08)",
    borderWidth: 1,
  },
  trackOn: { backgroundColor: colors.sage },
});
