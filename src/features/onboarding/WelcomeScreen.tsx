import { Ionicons } from "@expo/vector-icons";
import type { ImageSourcePropType } from "react-native";
import {
  Image,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AmbientStickers } from "../../components/AmbientStickers";
import { PressScale } from "../../components/PressScale";
import { assets, colors, shadow } from "../../design";

interface WelcomeScreenProps {
  appIcon: ImageSourcePropType;
  onStart: () => void;
  onSkip?: () => void;
  companionImage?: ImageSourcePropType;
  heroScene?: ImageSourcePropType;
}

/**
 * Brand moment — full-bleed companion scene + warm shared-care promise.
 */
export function WelcomeScreen({
  appIcon,
  onStart,
  onSkip,
  companionImage,
  heroScene,
}: WelcomeScreenProps) {
  const insets = useSafeAreaInsets();
  const hero = heroScene ?? companionImage ?? appIcon;

  return (
    <View style={styles.root}>
      <Image resizeMode="cover" source={hero} style={styles.sceneBleed} />
      <AmbientStickers
        items={[
          {
            source: assets.stickers.heart,
            size: 48,
            top: insets.top + 72,
            right: 18,
            rotate: "10deg",
            delay: 60,
          },
          {
            source: assets.stickers.bone,
            size: 44,
            top: insets.top + 140,
            left: 12,
            rotate: "-12deg",
            delay: 140,
          },
          {
            source: assets.stickers.bubble,
            size: 52,
            bottom: 210,
            right: 8,
            rotate: "6deg",
            delay: 200,
            amplitude: 7,
          },
          {
            source: assets.stickers.paw,
            size: 38,
            bottom: 250,
            left: 16,
            rotate: "-8deg",
            delay: 100,
          },
        ]}
      />
      <View style={[styles.overlay, { paddingTop: insets.top + 16 }]}>
        <View style={styles.brand}>
          <View style={styles.wordmark}>
            <Text style={styles.wordPaw}>Paw</Text>
            <Text style={styles.wordPair}>Pair</Text>
            <Image
              accessibilityIgnoresInvertColors
              resizeMode="contain"
              source={assets.stickers.paw}
              style={styles.wordPawIcon}
            />
          </View>
          <Text style={styles.brandTagline}>
            Know if today’s dose was given — on this phone.
          </Text>
        </View>

        <View style={styles.speechBubble}>
          <Image
            accessibilityIgnoresInvertColors
            resizeMode="contain"
            source={assets.stickers.heart}
            style={styles.speechHeart}
          />
          <Text style={styles.speechText}>
            No more guessing “Did I already give it?”
          </Text>
        </View>

        <View
          style={[styles.cta, { paddingBottom: Math.max(insets.bottom, 20) }]}
        >
          <View style={styles.illustrationCard}>
            <View style={styles.illustrationRow}>
              <Image
                accessibilityIgnoresInvertColors
                resizeMode="contain"
                source={assets.stickers.pill}
                style={styles.leadSticker}
              />
              <View style={[styles.avatar, styles.avatarCoral]}>
                <Text style={styles.avatarText}>M</Text>
              </View>
              <View style={[styles.avatar, styles.avatarSky]}>
                <Text style={styles.avatarText}>A</Text>
              </View>
              <View style={styles.avatarSync}>
                <Ionicons color={colors.sage} name="heart" size={16} />
              </View>
            </View>
            <Text style={styles.illustrationCopy}>
              Log each dose once. You’ll always see what was given and when.
              Household sync comes later.
            </Text>
          </View>

          <PressScale onPress={onStart} scaleTo={0.96} style={styles.primaryButton}>
            <Ionicons color={colors.white} name="heart" size={18} />
            <Text style={styles.primaryButtonText}>Add my first pet</Text>
          </PressScale>
          {onSkip ? (
            <PressScale onPress={onSkip} style={styles.skipButton}>
              <Text style={styles.skipText}>Continue with demo data</Text>
            </PressScale>
          ) : null}
        </View>
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
  avatarSky: { backgroundColor: colors.sky, marginLeft: -10 },
  avatarSync: {
    alignItems: "center",
    backgroundColor: colors.paper,
    borderRadius: 13,
    height: 26,
    justifyContent: "center",
    marginLeft: -8,
    width: 26,
    ...shadow.subtle,
  },
  avatarText: {
    color: colors.white,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 14,
  },
  brand: { alignItems: "center", marginTop: 8 },
  brandTagline: {
    color: "rgba(42,58,74,0.78)",
    fontFamily: "Nunito_700Bold",
    fontSize: 14,
    marginTop: 8,
    textAlign: "center",
  },
  cta: { marginTop: "auto" },
  illustrationCard: {
    backgroundColor: "rgba(255,252,247,0.96)",
    borderRadius: 28,
    marginBottom: 16,
    padding: 20,
    ...shadow.card,
  },
  illustrationCopy: {
    color: colors.muted,
    fontFamily: "Nunito_600SemiBold",
    fontSize: 14,
    lineHeight: 21,
    marginTop: 12,
  },
  illustrationRow: {
    alignItems: "center",
    flexDirection: "row",
  },
  leadSticker: {
    height: 40,
    marginRight: 8,
    width: 40,
  },
  overlay: {
    flex: 1,
    paddingHorizontal: 22,
    zIndex: 4,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: colors.coral,
    borderRadius: 999,
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
    minHeight: 58,
    paddingHorizontal: 18,
    ...shadow.fab,
  },
  primaryButtonText: {
    color: colors.white,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 16,
  },
  root: {
    backgroundColor: "#C9B59A",
    flex: 1,
    overflow: "hidden",
  },
  sceneBleed: {
    ...StyleSheet.absoluteFill,
    height: "100%",
    width: "100%",
  },
  skipButton: {
    alignItems: "center",
    marginTop: 12,
    minHeight: 44,
    paddingVertical: 12,
  },
  skipText: {
    color: colors.ink,
    fontFamily: "Nunito_700Bold",
    fontSize: 13,
    opacity: 0.72,
  },
  speechBubble: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: "rgba(255,252,247,0.96)",
    borderRadius: 26,
    marginTop: 18,
    paddingHorizontal: 20,
    paddingVertical: 14,
    ...shadow.card,
  },
  speechHeart: {
    height: 28,
    marginBottom: 6,
    width: 28,
  },
  speechText: {
    color: colors.ink,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 16,
    textAlign: "center",
  },
  wordmark: {
    alignItems: "flex-start",
    flexDirection: "row",
  },
  wordPair: {
    color: colors.coral,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 42,
    letterSpacing: -1.2,
  },
  wordPaw: {
    color: colors.sky,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 42,
    letterSpacing: -1.2,
  },
  wordPawIcon: {
    height: 28,
    marginLeft: 2,
    marginTop: -6,
    width: 28,
  },
});
