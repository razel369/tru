import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "../../design";

interface ErrorStateProps {
  title: string;
  body: string;
  onRetry?: () => void;
  retryLabel?: string;
}

/**
 * Generic error state. Used by screens that fail to load
 * (network, permission denial, missing data). The retry action
 * is optional — for non-recoverable states we render the
 * message without a button.
 */
export function ErrorState({
  title,
  body,
  onRetry,
  retryLabel = "Try again",
}: ErrorStateProps) {
  return (
    <View style={styles.container}>
      <Ionicons color={colors.danger} name="alert-circle" size={36} />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
      {onRetry && (
        <Pressable onPress={onRetry} style={styles.cta}>
          <Text style={styles.ctaText}>{retryLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    color: colors.muted,
    fontFamily: "Manrope_400Regular",
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
    paddingHorizontal: 32,
    textAlign: "center",
  },
  container: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 32,
  },
  cta: {
    alignItems: "center",
    backgroundColor: colors.coral,
    borderRadius: 16,
    marginTop: 20,
    minHeight: 44,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  ctaText: {
    color: colors.white,
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 13,
  },
  title: {
    color: colors.ink,
    fontFamily: "Fraunces_700Bold",
    fontSize: 20,
    marginTop: 12,
  },
});
