import { Ionicons } from "@expo/vector-icons";
import { useRef, type ComponentRef } from "react";
import {
  AccessibilityInfo,
  findNodeHandle,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { colors, shadow } from "../design";
import { tryAcquireSubmissionLock } from "../features/care/submission-lock";

export function ConfirmationSheet({
  visible,
  bottomInset,
  title,
  body,
  confirmLabel,
  onCancel,
  onConfirm,
}: {
  visible: boolean;
  bottomInset: number;
  title: string;
  body: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const titleRef = useRef<ComponentRef<typeof Text>>(null);
  const confirmLock = useRef(false);
  const focusTitle = () => {
    requestAnimationFrame(() => {
      if (Platform.OS === "web") return;
      const node = findNodeHandle(titleRef.current);
      if (node !== null) AccessibilityInfo.setAccessibilityFocus(node);
    });
  };
  const confirm = () => {
    if (!tryAcquireSubmissionLock(confirmLock)) return;
    onConfirm();
  };

  return (
    <Modal
      animationType="fade"
      onRequestClose={onCancel}
      onShow={focusTitle}
      presentationStyle="overFullScreen"
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <View
        accessibilityViewIsModal
        onAccessibilityEscape={onCancel}
        style={styles.overlay}
      >
        <Pressable
          accessibilityElementsHidden
          accessible={false}
          importantForAccessibility="no-hide-descendants"
          onPress={onCancel}
          style={styles.backdrop}
        />
        <View style={[styles.sheet, { paddingBottom: bottomInset + 22 }]}>
          <View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={styles.handle}
          />
          <View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={styles.iconWrap}
          >
            <View pointerEvents="none" style={styles.iconGlow} />
            <Ionicons color={colors.danger} name="trash-outline" size={25} />
          </View>
          <Text style={styles.eyebrow}>CAREFUL CHANGE</Text>
          <Text accessibilityRole="header" ref={titleRef} style={styles.title}>
            {title}
          </Text>
          <Text style={styles.body}>{body}</Text>
          <View style={styles.actions}>
            <Pressable
              accessibilityHint="Closes this confirmation without making changes"
              accessibilityRole="button"
              onPress={onCancel}
              style={({ pressed }) => [styles.cancel, pressed && styles.pressed]}
            >
              <Text style={styles.cancelText}>Keep it</Text>
            </Pressable>
            <Pressable
              accessibilityHint="Applies this permanent change"
              accessibilityRole="button"
              onPress={confirm}
              style={({ pressed }) => [styles.confirm, pressed && styles.pressed]}
            >
              <Text style={styles.confirmText}>{confirmLabel}</Text>
              <Ionicons color={colors.white} name="arrow-forward" size={17} />
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  actions: {
    alignSelf: "stretch",
    flexDirection: "row",
    gap: 10,
    marginTop: 22,
  },
  backdrop: {
    backgroundColor: "rgba(24, 34, 42, 0.48)",
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  body: {
    color: colors.muted,
    fontFamily: "Nunito_700Bold",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 7,
    maxWidth: 330,
    textAlign: "center",
  },
  cancel: {
    alignItems: "center",
    backgroundColor: colors.background,
    borderColor: colors.line,
    borderRadius: 17,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 50,
  },
  cancelText: {
    color: colors.navy,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 13,
  },
  confirm: {
    alignItems: "center",
    backgroundColor: colors.danger,
    borderRadius: 17,
    flex: 1.35,
    flexDirection: "row",
    gap: 7,
    justifyContent: "center",
    minHeight: 50,
  },
  confirmText: {
    color: colors.white,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 13,
  },
  eyebrow: {
    color: colors.danger,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 9,
    letterSpacing: 1.1,
    marginTop: 12,
  },
  handle: {
    backgroundColor: colors.line,
    borderRadius: 3,
    height: 5,
    marginBottom: 18,
    width: 42,
  },
  iconGlow: {
    backgroundColor: "rgba(255,255,255,0.66)",
    borderRadius: 22,
    height: 44,
    position: "absolute",
    transform: [{ rotate: "12deg" }],
    width: 44,
  },
  iconWrap: {
    alignItems: "center",
    backgroundColor: "rgba(255, 117, 102, 0.13)",
    borderRadius: 31,
    height: 62,
    justifyContent: "center",
    overflow: "hidden",
    width: 62,
  },
  overlay: { flex: 1, justifyContent: "flex-end" },
  pressed: { opacity: 0.82, transform: [{ scale: 0.985 }] },
  sheet: {
    alignItems: "center",
    backgroundColor: colors.paper,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 22,
    paddingTop: 11,
    ...shadow.card,
  },
  title: {
    color: colors.ink,
    fontFamily: "Fredoka_600SemiBold",
    fontSize: 26,
    lineHeight: 31,
    marginTop: 3,
    textAlign: "center",
  },
});
