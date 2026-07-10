import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import { colors } from "../../design";

interface OfflineBannerProps {
  visible: boolean;
}

/**
 * Per docs/AAA-HANDOFF.md §8: "Offline and syncing indicators
 * that do not dominate the screen." A subtle top banner that
 * shows when the device is offline so caregivers know that
 * cloud-side caregiver sync is paused. The local data layer
 * continues to work.
 */
export function OfflineBanner({ visible }: OfflineBannerProps) {
  if (!visible) return null;
  return (
    <View style={styles.banner}>
      <Ionicons color={colors.ink} name="cloud-offline-outline" size={14} />
      <Text style={styles.text}>
        Offline — local data still works, sync will resume.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    alignItems: "center",
    backgroundColor: colors.butterSoft,
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
    paddingVertical: 6,
  },
  text: {
    color: colors.ink,
    fontFamily: "Manrope_700Bold",
    fontSize: 11,
  },
});
