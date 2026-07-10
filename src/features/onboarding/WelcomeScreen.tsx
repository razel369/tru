import { Ionicons } from "@expo/vector-icons";
import type { ImageSourcePropType } from "react-native";
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors } from "../../design";

interface WelcomeScreenProps {
  appIcon: ImageSourcePropType;
  onStart: () => void;
  onSkip: () => void;
}

/**
 * Stage 4, step 1: brand moment.
 *
 * Per docs/AAA-HANDOFF.md §8: "Brand moment with the real PawPair
 * icon. Explain shared confirmation, not a list of generic
 * features." This screen does not pitch features; it sets the
 * tone and the primary CTA.
 */
export function WelcomeScreen({ appIcon, onStart, onSkip }: WelcomeScreenProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.container, { paddingTop: insets.top + 24 }]}>
      <View style={styles.brand}>
        <Image source={appIcon} style={styles.brandIcon} />
        <Text style={styles.brandName}>PawPair</Text>
        <Text style={styles.brandTagline}>
          Shared confirmation for every dose.
        </Text>
      </View>

      <View style={styles.illustrationCard}>
        <View style={styles.illustrationRow}>
          <View style={[styles.avatar, styles.avatarCoral]}>
            <Text style={styles.avatarText}>M</Text>
          </View>
          <View style={[styles.avatar, styles.avatarSage]}>
            <Text style={styles.avatarText}>A</Text>
          </View>
          <View style={styles.avatarSync}>
            <Ionicons color={colors.sage} name="sync" size={18} />
          </View>
        </View>
        <Text style={styles.illustrationTitle}>No more “Did someone already give it?”</Text>
        <Text style={styles.illustrationCopy}>
          Everyone in your home sees the same answer, instantly. The
          medication stays in your hands — not in group chat.
        </Text>
      </View>

      <View style={styles.cta}>
        <Pressable onPress={onStart} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Add my first pet</Text>
          <Ionicons color={colors.white} name="arrow-forward" size={18} />
        </Pressable>
        <Pressable onPress={onSkip} style={styles.skipButton}>
          <Text style={styles.skipText}>Continue with demo data</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: "center",
    borderColor: colors.paper,
    borderRadius: 22,
    borderWidth: 2,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  avatarCoral: { backgroundColor: colors.coral },
  avatarSage: { backgroundColor: colors.sage, marginLeft: -10 },
  avatarSync: {
    alignItems: "center",
    backgroundColor: colors.paper,
    borderRadius: 13,
    bottom: -6,
    height: 26,
    justifyContent: "center",
    marginLeft: -10,
    position: "relative",
    right: -10,
    width: 26,
  },
  avatarText: { color: colors.white, fontFamily: "Manrope_800ExtraBold", fontSize: 14 },
  brand: { alignItems: "center", marginTop: 24 },
  brandIcon: {
    borderRadius: 18,
    height: 72,
    transform: [{ rotate: "-4deg" }],
    width: 72,
  },
  brandName: {
    color: colors.ink,
    fontFamily: "Fraunces_700Bold",
    fontSize: 36,
    marginTop: 16,
  },
  brandTagline: {
    color: colors.muted,
    fontFamily: "Manrope_600SemiBold",
    fontSize: 12,
    marginTop: 6,
  },
  container: {
    backgroundColor: colors.background,
    flex: 1,
    paddingHorizontal: 24,
  },
  cta: { marginBottom: 32 },
  illustrationCard: {
    backgroundColor: colors.paper,
    borderColor: colors.line,
    borderRadius: 24,
    marginTop: 40,
    padding: 24,
  },
  illustrationCopy: {
    color: colors.muted,
    fontFamily: "Manrope_400Regular",
    fontSize: 13,
    lineHeight: 20,
    marginTop: 12,
  },
  illustrationRow: {
    alignItems: "center",
    flexDirection: "row",
    marginBottom: 18,
  },
  illustrationTitle: {
    color: colors.ink,
    fontFamily: "Fraunces_700Bold",
    fontSize: 22,
    lineHeight: 28,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: colors.coral,
    borderRadius: 18,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 56,
    paddingHorizontal: 18,
  },
  primaryButtonText: {
    color: colors.white,
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 14,
  },
  skipButton: {
    alignItems: "center",
    marginTop: 16,
    minHeight: 44,
    paddingVertical: 12,
  },
  skipText: {
    color: colors.muted,
    fontFamily: "Manrope_700Bold",
    fontSize: 12,
  },
});
