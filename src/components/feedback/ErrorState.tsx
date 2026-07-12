import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, shadow } from "../../design";

interface ErrorStateProps {
  title: string;
  body: string;
  onRetry?: () => void;
  retryLabel?: string;
}

/** Soft clay error state for load failures. */
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
    fontFamily: "Nunito_600SemiBold",
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
    paddingHorizontal: 32,
    textAlign: "center",
  },
  container: {
    alignItems: "center",
    paddingBottom: 32,
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  cta: {
    alignItems: "center",
    backgroundColor: colors.coral,
    borderRadius: 999,
    marginTop: 20,
    minHeight: 48,
    paddingHorizontal: 22,
    paddingVertical: 12,
    ...shadow.fab,
  },
  ctaText: {
    color: colors.white,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 13,
  },
  title: {
    color: colors.ink,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 20,
    letterSpacing: -0.3,
    marginTop: 12,
  },
});
