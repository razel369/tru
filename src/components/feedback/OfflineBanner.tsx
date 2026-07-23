import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import { colors } from "../../design";
import { useOnlineStatus } from "./useOnlineStatus";

interface OfflineBannerProps {
  visible: boolean;
}

export function OfflineBanner({ visible }: OfflineBannerProps) {
  if (!visible) return null;
  return (
    <View accessibilityRole="alert" style={styles.banner}>
      <View style={styles.statusDot} />
      <Ionicons color={colors.ink} name="cloud-offline-outline" size={14} />
      <Text style={styles.text}>
        Offline / care updates stay safely on this device.
      </Text>
    </View>
  );
}

export function AutoOfflineBanner() {
  const online = useOnlineStatus();
  return <OfflineBanner visible={!online} />;
}

const styles = StyleSheet.create({
  banner: {
    alignItems: "center",
    backgroundColor: colors.butterSoft,
    borderBottomColor: colors.line,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 7,
    justifyContent: "center",
    minHeight: 32,
    paddingHorizontal: 14,
    paddingVertical: 7,
    zIndex: 50,
  },
  statusDot: {
    backgroundColor: colors.coral,
    borderRadius: 4,
    height: 7,
    width: 7,
  },
  text: {
    color: colors.ink,
    fontFamily: "Nunito_700Bold",
    fontSize: 10,
  },
});
