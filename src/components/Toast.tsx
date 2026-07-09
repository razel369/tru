import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import { colors } from "../design";

interface ToastProps {
  text: string;
  bottomInset: number;
}

/**
 * Confirming toast shown above the bottom nav for ~2.6s after a
 * successful dose log or medication add. Extracted verbatim from
 * App.tsx in stage 2.
 */
export function Toast({ text, bottomInset }: ToastProps) {
  return (
    <View style={[styles.toast, { bottom: 92 + bottomInset }]}>
      <View style={styles.toastCheck}>
        <Ionicons color={colors.white} name="checkmark" size={15} />
      </View>
      <Text style={styles.toastText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  toast: {
    alignItems: "center",
    backgroundColor: colors.ink,
    borderRadius: 16,
    flexDirection: "row",
    gap: 9,
    left: 18,
    paddingHorizontal: 16,
    paddingVertical: 13,
    position: "absolute",
    right: 18,
    shadowColor: colors.ink,
    shadowOffset: { height: 8, width: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
  },
  toastCheck: {
    alignItems: "center",
    backgroundColor: colors.sage,
    borderRadius: 12,
    height: 22,
    justifyContent: "center",
    width: 22,
  },
  toastText: {
    color: colors.white,
    flex: 1,
    fontFamily: "Manrope_700Bold",
    fontSize: 12,
  },
});
