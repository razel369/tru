import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { colors, shadow } from "../../design";
import {
  PORTABLE_BACKUP_MAX_PASSPHRASE_LENGTH,
  PORTABLE_BACKUP_MIN_PASSPHRASE_LENGTH,
} from "../care/portable-backup-encryption";

export type PortableBackupPasswordMode = "create" | "unlock";

type PortableBackupPasswordSheetProps = {
  bottomInset: number;
  errorMessage?: string | null;
  mode: PortableBackupPasswordMode;
  onCancel: () => void;
  onSubmit: (passphrase: string) => Promise<void> | void;
  visible: boolean;
};

type PasswordStrength = {
  color: string;
  label: string;
  level: number;
};

function getPasswordStrength(value: string): PasswordStrength {
  const normalized = value.normalize("NFKC");
  const length = [...normalized.trim()].length;
  const categories = [
    /[a-z]/.test(normalized),
    /[A-Z]/.test(normalized),
    /[0-9]/.test(normalized),
    /[^a-zA-Z0-9\s]/.test(normalized),
  ].filter(Boolean).length;
  let level = 0;
  if (length >= PORTABLE_BACKUP_MIN_PASSPHRASE_LENGTH) level += 1;
  if (length >= 16) level += 1;
  if (length >= 21 || categories >= 3) level += 1;
  if (length >= 26 || (length >= 18 && categories >= 4)) level += 1;

  if (level <= 1) return { color: colors.danger, label: "Needs more", level };
  if (level === 2) return { color: colors.butter, label: "Good", level };
  if (level === 3) return { color: colors.sky, label: "Strong", level };
  return { color: colors.sage, label: "Excellent", level };
}

function PasswordField({
  autoFocus,
  disabled = false,
  inputRef,
  label,
  onChangeText,
  onSubmitEditing,
  returnKeyType,
  value,
}: {
  autoFocus?: boolean;
  disabled?: boolean;
  inputRef?: RefObject<TextInput | null>;
  label: string;
  onChangeText: (value: string) => void;
  onSubmitEditing?: () => void;
  returnKeyType: "done" | "next";
  value: string;
}) {
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (!value) setRevealed(false);
  }, [value]);

  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.inputShell}>
        <Ionicons color={colors.muted} name="key-outline" size={18} />
        <TextInput
          accessibilityLabel={label}
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus={autoFocus}
          editable={!disabled}
          maxLength={PORTABLE_BACKUP_MAX_PASSPHRASE_LENGTH}
          onChangeText={onChangeText}
          onSubmitEditing={onSubmitEditing}
          passwordRules="minlength: 12;"
          placeholder="Enter your private password"
          placeholderTextColor="#A9B1B8"
          returnKeyType={returnKeyType}
          ref={inputRef}
          secureTextEntry={!revealed}
          selectionColor={colors.sky}
          style={styles.input}
          textContentType="password"
          value={value}
        />
        <Pressable
          accessibilityLabel={revealed ? "Hide password" : "Show password"}
          accessibilityRole="button"
          accessibilityState={{ disabled }}
          disabled={disabled}
          hitSlop={10}
          onPress={() => setRevealed((current) => !current)}
          style={({ pressed }) => [
            styles.revealButton,
            disabled && styles.fieldDisabled,
            pressed && !disabled && styles.iconPressed,
          ]}
        >
          <Ionicons
            color={colors.navy}
            name={revealed ? "eye-off-outline" : "eye-outline"}
            size={20}
          />
        </Pressable>
      </View>
    </View>
  );
}

export function PortableBackupPasswordSheet({
  bottomInset,
  errorMessage,
  mode,
  onCancel,
  onSubmit,
  visible,
}: PortableBackupPasswordSheetProps) {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const confirmationInput = useRef<TextInput>(null);
  const confirmInputAction = useRef<(() => void) | null>(null);
  const strength = useMemo(() => getPasswordStrength(password), [password]);
  const passwordLength = [...password.normalize("NFKC").trim()].length;
  const longEnough =
    passwordLength >= PORTABLE_BACKUP_MIN_PASSPHRASE_LENGTH;
  const passwordsMatch = mode === "unlock" || password === confirmation;
  const canSubmit = longEnough && passwordsMatch && !submitting;
  const shownError = localError ?? errorMessage ?? null;

  useEffect(() => {
    if (!visible) {
      submittingRef.current = false;
      setPassword("");
      setConfirmation("");
      setLocalError(null);
      setSubmitting(false);
    }
  }, [visible]);

  useEffect(() => {
    submittingRef.current = false;
    setPassword("");
    setConfirmation("");
    setLocalError(null);
    setSubmitting(false);
  }, [mode]);

  const submit = async () => {
    if (submittingRef.current) return;
    if (!longEnough) {
      setLocalError(
        `Use at least ${PORTABLE_BACKUP_MIN_PASSPHRASE_LENGTH} characters. A short memorable phrase works well.`,
      );
      return;
    }
    if (!passwordsMatch) {
      setLocalError("The two passwords do not match yet.");
      return;
    }

    setLocalError(null);
    submittingRef.current = true;
    setSubmitting(true);
    try {
      await onSubmit(password);
    } catch (error) {
      setLocalError(
        error instanceof Error
          ? error.message
          : "PawPair could not unlock this backup.",
      );
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };
  confirmInputAction.current = submit;

  const cancel = () => {
    if (submitting) return;
    setPassword("");
    setConfirmation("");
    setLocalError(null);
    onCancel();
  };

  const isCreate = mode === "create";

  return (
    <Modal
      animationType="fade"
      onRequestClose={cancel}
      presentationStyle="overFullScreen"
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardView}
      >
        <View accessibilityViewIsModal style={styles.overlay}>
          <Pressable
            accessibilityLabel="Dismiss backup password"
            accessibilityRole="button"
            accessibilityState={{ disabled: submitting }}
            disabled={submitting}
            onPress={cancel}
            style={styles.backdrop}
          />
          <View style={[styles.sheet, { paddingBottom: bottomInset + 18 }]}>
            <Pressable
              accessibilityLabel="Close backup password"
              accessibilityRole="button"
              accessibilityState={{ disabled: submitting }}
              disabled={submitting}
              hitSlop={8}
              onPress={cancel}
              style={({ pressed }) => [
                styles.closeButton,
                pressed && !submitting && styles.iconPressed,
              ]}
            >
              <Ionicons color={colors.navy} name="close" size={21} />
            </Pressable>
            <View style={styles.handle} />
            <ScrollView
              bounces={false}
              contentContainerStyle={styles.content}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.iconWrap}>
                <View pointerEvents="none" style={styles.iconGlow} />
                <Ionicons
                  color={colors.sage}
                  name={isCreate ? "shield-checkmark-outline" : "lock-open-outline"}
                  size={27}
                />
              </View>
              <Text style={styles.eyebrow}>
                {isCreate ? "PRIVATE BY DESIGN" : "ENCRYPTED BACKUP"}
              </Text>
              <Text style={styles.title}>
                {isCreate ? "Protect this backup" : "Unlock your backup"}
              </Text>
              <Text style={styles.body}>
                {isCreate
                  ? "Your password encrypts health records and attachments before they leave this device. PawPair never stores it."
                  : "Enter the password used when this backup was created. It stays on this device."}
              </Text>

              <View style={styles.form}>
                <PasswordField
                  autoFocus
                  disabled={submitting}
                  label="Backup password"
                  onChangeText={(value) => {
                    setPassword(value);
                    setLocalError(null);
                  }}
                  onSubmitEditing={() => {
                    if (isCreate) confirmationInput.current?.focus();
                    else void submit();
                  }}
                  returnKeyType={isCreate ? "next" : "done"}
                  value={password}
                />

                {isCreate ? (
                  <PasswordField
                    disabled={submitting}
                    inputRef={confirmationInput}
                    label="Confirm password"
                    onChangeText={(value) => {
                      setConfirmation(value);
                      setLocalError(null);
                    }}
                    onSubmitEditing={() => {
                      void confirmInputAction.current?.();
                    }}
                    returnKeyType="done"
                    value={confirmation}
                  />
                ) : null}

                {isCreate ? (
                  <View style={styles.strengthBlock}>
                    <View style={styles.strengthHeader}>
                      <Text style={styles.strengthLabel}>Password strength</Text>
                      <Text
                        accessibilityLiveRegion="polite"
                        style={[styles.strengthValue, { color: strength.color }]}
                      >
                        {strength.label}
                      </Text>
                    </View>
                    <View
                      accessibilityLabel={`Password strength: ${strength.label}`}
                      accessibilityRole="progressbar"
                      style={styles.strengthTrack}
                    >
                      {[1, 2, 3, 4].map((segment) => (
                        <View
                          key={segment}
                          style={[
                            styles.strengthSegment,
                            segment <= strength.level && {
                              backgroundColor: strength.color,
                            },
                          ]}
                        />
                      ))}
                    </View>
                    <View style={styles.requirements}>
                      <View style={styles.requirementRow}>
                        <Ionicons
                          color={longEnough ? colors.sage : colors.muted}
                          name={longEnough ? "checkmark-circle" : "ellipse-outline"}
                          size={16}
                        />
                        <Text
                          style={[
                            styles.requirementText,
                            longEnough && styles.requirementMet,
                          ]}
                        >
                          {PORTABLE_BACKUP_MIN_PASSPHRASE_LENGTH}+ characters
                        </Text>
                      </View>
                      <View style={styles.requirementRow}>
                        <Ionicons
                          color={
                            confirmation && passwordsMatch
                              ? colors.sage
                              : colors.muted
                          }
                          name={
                            confirmation && passwordsMatch
                              ? "checkmark-circle"
                              : "ellipse-outline"
                          }
                          size={16}
                        />
                        <Text
                          style={[
                            styles.requirementText,
                            confirmation &&
                              passwordsMatch &&
                              styles.requirementMet,
                          ]}
                        >
                          Passwords match
                        </Text>
                      </View>
                    </View>
                  </View>
                ) : null}

                {shownError ? (
                  <View
                    accessibilityLiveRegion="assertive"
                    accessibilityRole="alert"
                    style={styles.errorBox}
                  >
                    <Ionicons
                      color={colors.danger}
                      name="alert-circle-outline"
                      size={18}
                    />
                    <Text style={styles.errorText}>{shownError}</Text>
                  </View>
                ) : null}
              </View>

              <View style={styles.privacyNote}>
                <Ionicons color={colors.navy} name="information-circle" size={18} />
                <Text style={styles.privacyText}>
                  There is no password reset. Keep this password somewhere only you can access.
                </Text>
              </View>

              <View style={styles.actions}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ disabled: submitting }}
                  disabled={submitting}
                  onPress={cancel}
                  style={({ pressed }) => [
                    styles.cancelButton,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.cancelText}>Not now</Text>
                </Pressable>
                <Pressable
                  accessibilityHint={
                    isCreate
                      ? "Encrypts and prepares the portable backup"
                      : "Decrypts the selected portable backup"
                  }
                  accessibilityRole="button"
                  accessibilityState={{ disabled: !canSubmit }}
                  disabled={!canSubmit}
                  onPress={() => void submit()}
                  style={({ pressed }) => [
                    styles.submitButton,
                    !canSubmit && styles.submitDisabled,
                    pressed && canSubmit && styles.pressed,
                  ]}
                >
                  <Ionicons
                    color={colors.white}
                    name={submitting ? "hourglass-outline" : "lock-closed-outline"}
                    size={18}
                  />
                  <Text style={styles.submitText}>
                    {submitting
                      ? isCreate
                        ? "Encrypting..."
                        : "Unlocking..."
                      : isCreate
                        ? "Create secure backup"
                        : "Unlock backup"}
                  </Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  actions: {
    alignSelf: "stretch",
    flexDirection: "row",
    gap: 10,
    marginTop: 20,
  },
  backdrop: {
    backgroundColor: "rgba(24, 34, 42, 0.5)",
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
    maxWidth: 350,
    textAlign: "center",
  },
  cancelButton: {
    alignItems: "center",
    backgroundColor: colors.background,
    borderColor: colors.line,
    borderRadius: 17,
    borderWidth: 1,
    flex: 0.8,
    justifyContent: "center",
    minHeight: 52,
  },
  cancelText: {
    color: colors.navy,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 13,
  },
  closeButton: {
    alignItems: "center",
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: 20,
    borderWidth: 1,
    height: 40,
    justifyContent: "center",
    position: "absolute",
    right: 16,
    top: 12,
    width: 40,
    zIndex: 2,
    ...shadow.subtle,
  },
  content: {
    alignItems: "center",
    paddingBottom: 4,
  },
  errorBox: {
    alignItems: "flex-start",
    backgroundColor: "rgba(201, 92, 92, 0.1)",
    borderColor: "rgba(201, 92, 92, 0.22)",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  errorText: {
    color: colors.danger,
    flex: 1,
    fontFamily: "Nunito_700Bold",
    fontSize: 12,
    lineHeight: 17,
  },
  eyebrow: {
    color: colors.sage,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 9,
    letterSpacing: 1.15,
    marginTop: 12,
  },
  fieldGroup: { gap: 7 },
  fieldDisabled: { opacity: 0.5 },
  fieldLabel: {
    color: colors.ink,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 12,
    marginLeft: 2,
  },
  form: {
    alignSelf: "stretch",
    gap: 14,
    marginTop: 21,
  },
  handle: {
    alignSelf: "center",
    backgroundColor: colors.line,
    borderRadius: 3,
    height: 5,
    marginBottom: 14,
    width: 42,
  },
  iconGlow: {
    backgroundColor: "rgba(255,255,255,0.72)",
    borderRadius: 23,
    height: 46,
    position: "absolute",
    transform: [{ rotate: "11deg" }],
    width: 46,
  },
  iconPressed: { opacity: 0.62, transform: [{ scale: 0.92 }] },
  iconWrap: {
    alignItems: "center",
    backgroundColor: colors.sageSoft,
    borderRadius: 32,
    height: 64,
    justifyContent: "center",
    overflow: "hidden",
    width: 64,
  },
  input: {
    color: colors.ink,
    flex: 1,
    fontFamily: "Nunito_700Bold",
    fontSize: 15,
    minHeight: 50,
    paddingVertical: 0,
  },
  inputShell: {
    alignItems: "center",
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 9,
    minHeight: 52,
    paddingLeft: 14,
    paddingRight: 7,
    ...shadow.subtle,
  },
  keyboardView: { flex: 1 },
  overlay: { flex: 1, justifyContent: "flex-end" },
  pressed: { opacity: 0.84, transform: [{ scale: 0.985 }] },
  privacyNote: {
    alignItems: "flex-start",
    alignSelf: "stretch",
    backgroundColor: colors.skySoft,
    borderRadius: 14,
    flexDirection: "row",
    gap: 8,
    marginTop: 15,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  privacyText: {
    color: colors.navy,
    flex: 1,
    fontFamily: "Nunito_700Bold",
    fontSize: 11,
    lineHeight: 16,
  },
  requirementMet: { color: colors.sage },
  requirementRow: { alignItems: "center", flexDirection: "row", gap: 6 },
  requirementText: {
    color: colors.muted,
    fontFamily: "Nunito_700Bold",
    fontSize: 11,
  },
  requirements: { flexDirection: "row", gap: 16, marginTop: 9 },
  revealButton: {
    alignItems: "center",
    borderRadius: 12,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  sheet: {
    backgroundColor: colors.paper,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    maxHeight: "92%",
    paddingHorizontal: 22,
    paddingTop: 11,
    ...shadow.card,
  },
  strengthBlock: {
    backgroundColor: colors.background,
    borderRadius: 15,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  strengthHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  strengthLabel: {
    color: colors.muted,
    fontFamily: "Nunito_700Bold",
    fontSize: 11,
  },
  strengthSegment: {
    backgroundColor: colors.line,
    borderRadius: 4,
    flex: 1,
    height: 5,
  },
  strengthTrack: { flexDirection: "row", gap: 5, marginTop: 7 },
  strengthValue: {
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 11,
  },
  submitButton: {
    alignItems: "center",
    backgroundColor: colors.sage,
    borderRadius: 17,
    flex: 1.6,
    flexDirection: "row",
    gap: 7,
    justifyContent: "center",
    minHeight: 52,
    ...shadow.subtle,
  },
  submitDisabled: { opacity: 0.4 },
  submitText: {
    color: colors.white,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 13,
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
