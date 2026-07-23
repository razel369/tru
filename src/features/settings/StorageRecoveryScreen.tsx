import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { colors, shadow } from "../../design";
import {
  discardPreparedPortableRestore,
  pickPortableBackup,
} from "../care/portable-backup";
import type { PetCareState } from "../care/types";
import { PortableBackupPasswordSheet } from "./PortableBackupPasswordSheet";

export function StorageRecoveryScreen({
  bottomInset,
  onReset,
  onRestore,
  topInset,
}: {
  bottomInset: number;
  onReset: () => Promise<{ warning: string | null }>;
  onRestore: (state: PetCareState) => Promise<void>;
  topInset: number;
}) {
  const [busy, setBusy] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const busyRef = useRef(false);
  const pendingPassphrase = useRef<
    ((passphrase: string | null) => void) | null
  >(null);

  useEffect(
    () => () => {
      busyRef.current = false;
      pendingPassphrase.current?.(null);
      pendingPassphrase.current = null;
    },
    [],
  );
  const beginBusy = () => {
    if (busyRef.current) return false;
    busyRef.current = true;
    setBusy(true);
    return true;
  };
  const endBusy = () => {
    busyRef.current = false;
    setBusy(false);
  };

  const requestPassphrase = (errorMessage?: string) =>
    new Promise<string | null>((resolve) => {
      pendingPassphrase.current?.(null);
      pendingPassphrase.current = resolve;
      setPasswordError(errorMessage ?? null);
      setPasswordVisible(true);
    });

  const cancelPassword = () => {
    pendingPassphrase.current?.(null);
    pendingPassphrase.current = null;
    setPasswordError(null);
    setPasswordVisible(false);
    endBusy();
  };

  const submitPassword = (passphrase: string) => {
    const resolve = pendingPassphrase.current;
    if (!resolve) {
      setPasswordError("Choose the encrypted backup again to unlock it.");
      return;
    }
    pendingPassphrase.current = null;
    resolve(passphrase);
  };

  const restoreBackup = async () => {
    if (!beginBusy()) return;
    try {
      const prepared = await pickPortableBackup({
        requestPassphrase,
      });
      pendingPassphrase.current = null;
      setPasswordError(null);
      setPasswordVisible(false);
      if (!prepared) return;

      try {
        await onRestore(prepared.state);
      } catch (error) {
        await discardPreparedPortableRestore(prepared);
        throw error;
      }
      Alert.alert(
        "Backup restored",
        "Your pets, care history and medical files are available again.",
      );
    } catch (error) {
      Alert.alert(
        "Backup could not be restored",
        error instanceof Error
          ? error.message
          : "The selected file could not be opened safely.",
      );
    } finally {
      pendingPassphrase.current?.(null);
      pendingPassphrase.current = null;
      setPasswordError(null);
      setPasswordVisible(false);
      endBusy();
    }
  };

  const confirmReset = () => {
    if (busyRef.current) return;
    Alert.alert(
      "Start with an empty PawPair?",
      "Unreadable local data and medical files will be permanently removed. Restore a backup first if you have one.",
      [
        { style: "cancel", text: "Keep data" },
        {
          onPress: () => {
            if (!beginBusy()) return;
            void onReset()
              .then(({ warning }) => {
                if (!warning) return;
                Alert.alert(
                  "PawPair reset with a cleanup warning",
                  warning,
                );
              })
              .catch((error: unknown) =>
                Alert.alert(
                  "PawPair could not reset local data",
                  error instanceof Error ? error.message : "Please try again.",
                ),
              )
              .finally(endBusy);
          },
          style: "destructive",
          text: "Erase and start fresh",
        },
      ],
    );
  };

  return (
    <View style={styles.screen}>
      <View pointerEvents="none" style={styles.glow} />
      <ScrollView
        bounces={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: bottomInset + 24, paddingTop: topInset + 24 },
        ]}
        showsVerticalScrollIndicator={false}
        style={styles.scroll}
      >
        <View style={styles.content}>
        <View style={styles.iconWrap}>
          <Ionicons color={colors.navy} name="shield-checkmark-outline" size={34} />
        </View>
        <Text style={styles.eyebrow}>YOUR DATA IS STILL PROTECTED</Text>
        <Text accessibilityRole="header" style={styles.title}>
          PawPair needs your help
        </Text>
        <Text style={styles.body}>
          This device's care data could not be opened safely. PawPair stopped
          before changing or replacing anything.
        </Text>

        <View style={styles.card}>
          <View style={styles.cardRow}>
            <View style={styles.stepIcon}>
              <Ionicons color={colors.sage} name="archive-outline" size={19} />
            </View>
            <View style={styles.flex}>
              <Text style={styles.cardTitle}>Restore your portable backup</Text>
              <Text style={styles.cardBody}>
                Encrypted backups include pet profiles, care history and saved
                medical documents.
              </Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.cardRow}>
            <View style={[styles.stepIcon, styles.lockIcon]}>
              <Ionicons color={colors.navy} name="lock-closed-outline" size={18} />
            </View>
            <View style={styles.flex}>
              <Text style={styles.cardTitle}>Nothing is overwritten</Text>
              <Text style={styles.cardBody}>
                PawPair keeps the unreadable local data untouched until a
                restore succeeds or you explicitly erase it.
              </Text>
            </View>
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: busy }}
          disabled={busy}
          onPress={() => void restoreBackup()}
          style={({ pressed }) => [
            styles.primary,
            busy && styles.disabled,
            pressed && styles.pressed,
          ]}
        >
          <Ionicons color={colors.white} name="cloud-upload-outline" size={20} />
          <Text style={styles.primaryText}>
            {busy ? "Opening backup..." : "Restore from backup"}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: busy }}
          disabled={busy}
          onPress={confirmReset}
          style={({ pressed }) => [
            styles.secondary,
            busy && styles.disabled,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.secondaryText}>Start fresh instead</Text>
        </Pressable>
        <Text style={styles.footnote}>
          Do not reinstall the app before choosing an option. Reinstalling can
          remove local recovery data.
        </Text>
        </View>
      </ScrollView>

      <PortableBackupPasswordSheet
        bottomInset={bottomInset}
        errorMessage={passwordError}
        mode="unlock"
        onCancel={cancelPassword}
        onSubmit={submitPassword}
        visible={passwordVisible}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    color: colors.muted,
    fontFamily: "Nunito_700Bold",
    fontSize: 15,
    lineHeight: 22,
    marginTop: 10,
    maxWidth: 390,
    textAlign: "center",
  },
  card: {
    alignSelf: "stretch",
    backgroundColor: colors.paper,
    borderColor: colors.line,
    borderRadius: 24,
    borderWidth: 1,
    marginTop: 28,
    paddingHorizontal: 17,
    ...shadow.card,
  },
  cardBody: {
    color: colors.muted,
    fontFamily: "Nunito_600SemiBold",
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },
  cardRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
    paddingVertical: 17,
  },
  cardTitle: {
    color: colors.ink,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 14,
  },
  content: { alignItems: "center", width: "100%" },
  disabled: { opacity: 0.55 },
  divider: { backgroundColor: colors.line, height: 1 },
  eyebrow: {
    color: colors.sage,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 10,
    letterSpacing: 1.25,
    marginTop: 20,
  },
  flex: { flex: 1 },
  footnote: {
    color: colors.muted,
    fontFamily: "Nunito_600SemiBold",
    fontSize: 11,
    lineHeight: 16,
    marginTop: 15,
    maxWidth: 350,
    textAlign: "center",
  },
  glow: {
    backgroundColor: colors.sageSoft,
    borderRadius: 180,
    height: 300,
    opacity: 0.65,
    position: "absolute",
    right: -110,
    top: -95,
    width: 300,
  },
  iconWrap: {
    alignItems: "center",
    backgroundColor: colors.sageSoft,
    borderColor: colors.white,
    borderRadius: 36,
    borderWidth: 6,
    height: 72,
    justifyContent: "center",
    width: 72,
    ...shadow.subtle,
  },
  lockIcon: { backgroundColor: colors.skySoft },
  pressed: { opacity: 0.86, transform: [{ scale: 0.985 }] },
  primary: {
    alignItems: "center",
    alignSelf: "stretch",
    backgroundColor: colors.navy,
    borderRadius: 19,
    flexDirection: "row",
    gap: 9,
    justifyContent: "center",
    marginTop: 22,
    minHeight: 56,
    ...shadow.subtle,
  },
  primaryText: {
    color: colors.white,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 15,
  },
  screen: {
    backgroundColor: colors.background,
    flex: 1,
    overflow: "hidden",
  },
  scroll: { flex: 1 },
  scrollContent: {
    alignItems: "center",
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 22,
  },
  secondary: {
    alignItems: "center",
    alignSelf: "stretch",
    borderColor: colors.line,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: "center",
    marginTop: 10,
    minHeight: 50,
  },
  secondaryText: {
    color: colors.danger,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 13,
  },
  stepIcon: {
    alignItems: "center",
    backgroundColor: colors.sageSoft,
    borderRadius: 17,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  title: {
    color: colors.ink,
    fontFamily: "Fredoka_600SemiBold",
    fontSize: 34,
    lineHeight: 40,
    marginTop: 5,
    textAlign: "center",
  },
});
