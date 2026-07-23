import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";

import { ConfirmationSheet } from "../../components/ConfirmationSheet";
import { colors, shadow } from "../../design";
import {
  hasAnalyticsConsent,
  setAnalyticsConsent,
  trackAnalyticsEvent,
} from "../analytics/service";
import {
  discardPreparedPortableRestore,
  exportPortableBackup,
  pickPortableBackup,
} from "../care/portable-backup";
import type { PetCareState } from "../care/types";
import type { NotificationPermissionState } from "../notifications/types";
import type { CareReminderPrivacy } from "../notifications/care-runtime";
import {
  PortableBackupPasswordSheet,
  type PortableBackupPasswordMode,
} from "./PortableBackupPasswordSheet";

type Props = {
  bottomInset: number;
  careState: PetCareState;
  notificationPermission: NotificationPermissionState;
  onChangeReminderPrivacy: (privacy: CareReminderPrivacy) => Promise<void>;
  onClose: () => void;
  onDeleteAccount: () => Promise<void>;
  onOpenPrivacy: () => void;
  onOpenTerms: () => void;
  onRestoreData: (state: PetCareState) => Promise<void>;
  onToggleReminders: (enabled: boolean) => Promise<void>;
  reminderPrivacy: CareReminderPrivacy;
  remindersEnabled: boolean;
  requestedReminderCount: number;
  scheduledReminderCount: number;
  topInset: number;
};

type PreparedRestore = NonNullable<
  Awaited<ReturnType<typeof pickPortableBackup>>
>;

function SettingsRow({ disabled = false, icon, label, onPress, tone = "default", value }: {
  disabled?: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  tone?: "default" | "danger";
  value?: string;
}) {
  const color = tone === "danger" ? colors.danger : colors.navy;
  return (
    <Pressable
      accessibilityLabel={value ? `${label}, ${value}` : label}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.rowIcon, tone === "danger" && styles.dangerIcon]}>
        <Ionicons color={color} name={icon} size={19} />
      </View>
      <Text style={[styles.rowLabel, tone === "danger" && styles.dangerText]}>
        {label}
      </Text>
      {value && <Text style={styles.rowValue}>{value}</Text>}
      <Ionicons color={colors.muted} name="chevron-forward" size={17} />
    </Pressable>
  );
}

export function SettingsScreen({
  bottomInset,
  careState,
  notificationPermission,
  onChangeReminderPrivacy,
  onClose,
  onDeleteAccount,
  onOpenPrivacy,
  onOpenTerms,
  onRestoreData,
  onToggleReminders,
  reminderPrivacy,
  remindersEnabled,
  requestedReminderCount,
  scheduledReminderCount,
  topInset,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [backupPasswordError, setBackupPasswordError] = useState<string | null>(null);
  const [backupPasswordMode, setBackupPasswordMode] =
    useState<PortableBackupPasswordMode | null>(null);
  const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false);
  const [preparedRestore, setPreparedRestore] = useState<PreparedRestore | null>(null);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false);
  const [settingsNotice, setSettingsNotice] = useState<{
    text: string;
    tone: "error" | "success";
  } | null>(null);
  const busyRef = useRef(false);
  const pendingPassphrase = useRef<((passphrase: string | null) => void) | null>(null);

  useEffect(() => {
    let active = true;
    void hasAnalyticsConsent().then((enabled) => {
      if (active) setAnalyticsEnabled(enabled);
    });
    return () => {
      active = false;
    };
  }, []);

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

  const toggleAnalytics = async (enabled: boolean) => {
    if (busy) return;
    const previous = analyticsEnabled;
    setAnalyticsEnabled(enabled);
    setSettingsNotice(null);
    try {
      await setAnalyticsConsent(enabled);
      if (enabled) {
        await trackAnalyticsEvent("screen_view", {
          screen: "settings_analytics_enabled",
        });
      }
      setSettingsNotice({
        text: enabled
          ? "Anonymous product analytics are on."
          : "Anonymous product analytics are off and this installation was removed.",
        tone: "success",
      });
    } catch {
      setAnalyticsEnabled(previous);
      setSettingsNotice({
        text: "That privacy choice could not be saved. Please try again.",
        tone: "error",
      });
    }
  };
  const appVersion = Constants.expoConfig?.version ?? "1.0.0";
  const permissionCopy =
    notificationPermission === "denied"
      ? "Permission is off in iOS Settings"
      : notificationPermission === "unsupported"
        ? "Available on iPhone"
        : remindersEnabled
          ? `${scheduledReminderCount} local reminders scheduled`
          : "Off until you choose to enable it";

  const showSettingsMessage = (
    title: string,
    message: string,
    tone: "error" | "success" = "error",
  ) => {
    if (Platform.OS === "web") {
      setSettingsNotice({ text: `${title}. ${message}`, tone });
      return;
    }
    Alert.alert(title, message);
  };

  const toggleReminders = async (enabled: boolean) => {
    if (!beginBusy()) return;
    try {
      await onToggleReminders(enabled);
    } catch (error) {
      showSettingsMessage(
        "Reminders could not be updated",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      endBusy();
    }
  };

  const changeReminderPrivacy = async (privacy: CareReminderPrivacy) => {
    if (privacy === reminderPrivacy || !beginBusy()) return;
    try {
      await onChangeReminderPrivacy(privacy);
    } catch (error) {
      showSettingsMessage(
        "Lock screen privacy could not be updated",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      endBusy();
    }
  };

  const createBackup = () => {
    if (busyRef.current || backupPasswordMode !== null) return;
    setBackupPasswordError(null);
    setBackupPasswordMode("create");
  };

  const createEncryptedBackup = async (passphrase: string) => {
    if (!beginBusy()) {
      throw new Error("Another settings action is still finishing.");
    }
    try {
      const result = await exportPortableBackup(careState, { passphrase });
      setBackupPasswordMode(null);
      showSettingsMessage(
        "Encrypted backup created",
        `${result.fileName} includes ${careState.pets.length} pet${
          careState.pets.length === 1 ? "" : "s"
        } and ${result.attachmentCount} medical file${
          result.attachmentCount === 1 ? "" : "s"
        }. You will need this password to restore it.`,
        "success",
      );
    } catch (error) {
      throw error instanceof Error ? error : new Error("Backup could not be created. Please try again.");
    } finally {
      endBusy();
    }
  };

  const requestBackupPassphrase = (errorMessage?: string) =>
    new Promise<string | null>((resolve) => {
      pendingPassphrase.current?.(null);
      pendingPassphrase.current = resolve;
      setBackupPasswordError(errorMessage ?? null);
      setBackupPasswordMode("unlock");
    });

  const submitBackupPassword = async (passphrase: string) => {
    if (backupPasswordMode === "create") {
      await createEncryptedBackup(passphrase);
      return;
    }

    const resolve = pendingPassphrase.current;
    if (!resolve) {
      setBackupPasswordError("Choose the encrypted backup again to unlock it.");
      return;
    }
    pendingPassphrase.current = null;
    resolve(passphrase);
  };

  const cancelBackupPassword = () => {
    pendingPassphrase.current?.(null);
    pendingPassphrase.current = null;
    setBackupPasswordError(null);
    setBackupPasswordMode(null);
    endBusy();
  };

  const restoreBackup = async () => {
    if (!beginBusy()) return;
    try {
      const prepared = await pickPortableBackup({
        requestPassphrase: requestBackupPassphrase,
      });
      pendingPassphrase.current = null;
      setBackupPasswordError(null);
      setBackupPasswordMode(null);
      if (!prepared) return;
      setPreparedRestore(prepared);
    } catch (error) {
      pendingPassphrase.current = null;
      setBackupPasswordError(null);
      setBackupPasswordMode(null);
      showSettingsMessage(
        "Backup could not be opened",
        error instanceof Error ? error.message : "The selected file is not a valid PawPair backup.",
      );
    } finally {
      pendingPassphrase.current?.(null);
      pendingPassphrase.current = null;
      setBackupPasswordError(null);
      setBackupPasswordMode(null);
      endBusy();
    }
  };

  const cancelPreparedRestore = () => {
    const prepared = preparedRestore;
    setPreparedRestore(null);
    if (!prepared || !beginBusy()) return;
    void discardPreparedPortableRestore(prepared)
      .catch(() =>
        showSettingsMessage(
          "Temporary restore files need cleanup",
          "PawPair kept your current data. Temporary files will be cleaned up the next time the app starts.",
        ),
      )
      .finally(endBusy);
  };

  const confirmPreparedRestore = () => {
    const prepared = preparedRestore;
    setPreparedRestore(null);
    if (!prepared || !beginBusy()) return;
    void onRestoreData(prepared.state)
      .then(() => {
        showSettingsMessage(
          "Backup restored",
          "PawPair is ready with the restored care history.",
          "success",
        );
        onClose();
      })
      .catch(async (error: unknown) => {
        try {
          await discardPreparedPortableRestore(prepared);
        } catch {
          // Startup cleanup provides a second chance without masking the restore error.
        }
        showSettingsMessage(
          "Restore could not be completed",
          error instanceof Error ? error.message : "Current data was kept unchanged.",
        );
      })
      .finally(endBusy);
  };

  const deleteAccount = () => {
    if (busyRef.current) return;
    setDeleteConfirmationOpen(true);
  };

  const confirmDeleteAccount = () => {
    setDeleteConfirmationOpen(false);
    if (!beginBusy()) return;
    void onDeleteAccount()
      .catch((error: unknown) =>
        showSettingsMessage(
          "Account could not be deleted",
          error instanceof Error ? error.message : "Please try again.",
        ),
      )
      .finally(endBusy);
  };

  const contactSupport = async () => {
    if (!beginBusy()) return;
    const url = `mailto:raz@rmalk.co.il?subject=${encodeURIComponent(
      `PawPair ${appVersion} Support`,
    )}`;
    try {
      if (!(await Linking.canOpenURL(url))) {
        throw new Error("No email app is available on this device.");
      }
      await Linking.openURL(url);
    } catch (error) {
      showSettingsMessage(
        "Support email could not be opened",
        error instanceof Error
          ? error.message
          : "Email raz@rmalk.co.il for support.",
      );
    } finally {
      endBusy();
    }
  };

  return (
    <View style={[styles.screen, { paddingTop: topInset }]}>
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="Close settings"
          accessibilityRole="button"
          accessibilityState={{ disabled: busy }}
          disabled={busy}
          onPress={onClose}
          style={[styles.back, busy && styles.disabled]}
        >
          <Ionicons color={colors.ink} name="arrow-back" size={21} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>PAWPAIR ON THIS DEVICE</Text>
          <Text style={styles.title}>Settings</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: bottomInset + 34 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Ionicons color={colors.sage} name="shield-checkmark" size={25} />
          </View>
          <View style={styles.flex}>
            <Text style={styles.heroTitle}>Private by design</Text>
            <Text style={styles.heroCopy}>
              Care data stays in this app's protected iOS sandbox unless you
              deliberately share an export.
            </Text>
          </View>
        </View>

        {settingsNotice && (
          <Pressable
            accessibilityLabel="Dismiss settings message"
            accessibilityRole="button"
            onPress={() => setSettingsNotice(null)}
            style={[
              styles.notice,
              settingsNotice.tone === "error"
                ? styles.noticeError
                : styles.noticeSuccess,
            ]}
          >
            <Ionicons
              color={settingsNotice.tone === "error" ? colors.danger : colors.sage}
              name={
                settingsNotice.tone === "error"
                  ? "alert-circle-outline"
                  : "checkmark-circle-outline"
              }
              size={17}
            />
            <Text style={styles.noticeText}>{settingsNotice.text}</Text>
          </Pressable>
        )}

        <Text style={styles.sectionLabel}>CARE REMINDERS</Text>
        <View style={styles.card}>
          <View style={styles.reminderRow}>
            <View style={styles.rowIcon}>
              <Ionicons color={colors.navy} name="notifications-outline" size={19} />
            </View>
            <View style={styles.flex}>
              <Text style={styles.rowLabel}>Local reminders</Text>
              <Text style={styles.rowDetail}>
                {remindersEnabled &&
                requestedReminderCount > scheduledReminderCount
                  ? `${scheduledReminderCount} of ${requestedReminderCount} highest-priority reminders scheduled (iOS limit)`
                  : permissionCopy}
              </Text>
            </View>
            <Switch
              accessibilityLabel="Local care reminders"
              accessibilityState={{
                checked: remindersEnabled,
                disabled: busy || notificationPermission === "unsupported",
              }}
              disabled={busy || notificationPermission === "unsupported"}
              ios_backgroundColor={colors.line}
              onValueChange={(value) => void toggleReminders(value)}
              style={styles.reminderSwitch}
              trackColor={{ false: colors.line, true: colors.sage }}
              value={remindersEnabled}
            />
          </View>
          <View style={styles.dividerFull} />
          <View style={styles.privacyBlock}>
            <View style={styles.privacyHeading}>
              <Ionicons color={colors.navy} name="eye-off-outline" size={17} />
              <View style={styles.flex}>
                <Text style={styles.privacyTitle}>Lock screen detail</Text>
                <Text style={styles.privacyCopy}>
                  Choose what a reminder may reveal while your phone is locked.
                </Text>
              </View>
            </View>
            <View style={styles.privacyOptions}>
              {(["private", "detailed"] as const).map((privacy) => {
                const selected = reminderPrivacy === privacy;
                return (
                  <Pressable
                    accessibilityLabel={
                      privacy === "private"
                        ? "Private reminders, pet name only"
                        : "Detailed reminders, show care details"
                    }
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected, disabled: busy }}
                    disabled={busy}
                    key={privacy}
                    onPress={() => void changeReminderPrivacy(privacy)}
                    style={[
                      styles.privacyOption,
                      selected && styles.privacyOptionSelected,
                    ]}
                  >
                    <Ionicons
                      color={selected ? colors.white : colors.navy}
                      name={privacy === "private" ? "lock-closed" : "reader-outline"}
                      size={15}
                    />
                    <View style={styles.flex}>
                      <Text style={[styles.privacyOptionTitle, selected && styles.privacyOptionTitleSelected]}>
                        {privacy === "private" ? "Private" : "Detailed"}
                      </Text>
                      <Text style={[styles.privacyOptionCopy, selected && styles.privacyOptionCopySelected]}>
                        {privacy === "private" ? "Pet name only" : "Show care details"}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
          {notificationPermission === "denied" && (
            <Pressable
              accessibilityLabel="Open iOS notification settings"
              accessibilityRole="button"
              onPress={() =>
                void Linking.openSettings().catch(() =>
                  Alert.alert(
                    "Settings could not be opened",
                    "Open the iOS Settings app and choose PawPair.",
                  ),
                )
              }
              style={styles.settingsButton}
            >
              <Text style={styles.settingsButtonText}>Open iOS Settings</Text>
            </Pressable>
          )}
        </View>

        <Text style={styles.sectionLabel}>PRIVACY & IMPROVEMENT</Text>
        <View style={styles.card}>
          <View style={styles.reminderRow}>
            <View style={styles.rowIcon}>
              <Ionicons color={colors.navy} name="analytics-outline" size={20} />
            </View>
            <View style={styles.flex}>
              <Text style={styles.rowLabel}>Anonymous product analytics</Text>
              <Text style={styles.rowDetail}>
                Helps improve flows and reliability. Never includes pet details, care notes, or health information.
              </Text>
            </View>
            <Switch
              accessibilityLabel="Anonymous product analytics"
              accessibilityState={{ checked: analyticsEnabled, disabled: busy }}
              disabled={busy}
              ios_backgroundColor={colors.line}
              onValueChange={(enabled) => void toggleAnalytics(enabled)}
              style={styles.reminderSwitch}
              trackColor={{ false: colors.line, true: colors.sage }}
              value={analyticsEnabled}
            />
          </View>
        </View>

        <Text style={styles.sectionLabel}>YOUR DATA</Text>
        <View style={styles.card}>
          <SettingsRow
            disabled={busy}
            icon="archive-outline"
            label="Create portable backup"
            onPress={createBackup}
            value="Encrypted"
          />
          <View style={styles.divider} />
          <SettingsRow
            disabled={busy}
            icon="cloud-upload-outline"
            label="Restore from backup"
            onPress={() => void restoreBackup()}
          />
          <View style={styles.divider} />
          <SettingsRow
            disabled={busy}
            icon="trash-outline"
            label="Delete account and data"
            onPress={deleteAccount}
            tone="danger"
          />
        </View>
        <View style={styles.backupNotice}>
          <Ionicons color={colors.navy} name="lock-closed-outline" size={16} />
          <Text style={styles.backupNoticeText}>
            Portable backups are encrypted with a password only you know.
            PawPair never stores the password, so keep it somewhere safe.
          </Text>
        </View>

        <Text style={styles.sectionLabel}>LEGAL & SUPPORT</Text>
        <View style={styles.card}>
          <SettingsRow disabled={busy} icon="shield-checkmark-outline" label="Privacy Policy" onPress={onOpenPrivacy} />
          <View style={styles.divider} />
          <SettingsRow disabled={busy} icon="document-text-outline" label="Terms of Service" onPress={onOpenTerms} />
          <View style={styles.divider} />
          <SettingsRow
            disabled={busy}
            icon="mail-outline"
            label="Contact support"
            onPress={() => void contactSupport()}
          />
        </View>

        <View style={styles.versionCard}>
          <View style={styles.versionMark}>
            <Ionicons color={colors.coral} name="paw" size={19} />
          </View>
          <View>
            <Text style={styles.versionTitle}>PawPair {appVersion}</Text>
            <Text style={styles.versionCopy}>Local-first iPhone &amp; iPad release</Text>
          </View>
        </View>
      </ScrollView>
      <PortableBackupPasswordSheet
        bottomInset={bottomInset}
        errorMessage={backupPasswordError}
        mode={backupPasswordMode ?? "create"}
        onCancel={cancelBackupPassword}
        onSubmit={submitBackupPassword}
        visible={backupPasswordMode !== null}
      />
      <ConfirmationSheet
        body="Your anonymous PawPair cloud account, analytics identifiers, pets, care history, health records and local files will be deleted. App Store purchase history stays with Apple and can be restored. This cannot be undone."
        bottomInset={bottomInset}
        confirmLabel="Delete account"
        onCancel={() => setDeleteConfirmationOpen(false)}
        onConfirm={confirmDeleteAccount}
        title="Delete your PawPair account?"
        visible={deleteConfirmationOpen}
      />
      <ConfirmationSheet
        body={
          preparedRestore
            ? `${preparedRestore.petCount} pet${preparedRestore.petCount === 1 ? "" : "s"}, ${preparedRestore.recordCount} health record${preparedRestore.recordCount === 1 ? "" : "s"} and ${preparedRestore.attachmentCount} medical file${preparedRestore.attachmentCount === 1 ? "" : "s"} will replace the current data on this device.`
            : ""
        }
        bottomInset={bottomInset}
        confirmLabel="Replace and restore"
        onCancel={cancelPreparedRestore}
        onConfirm={confirmPreparedRestore}
        title="Replace this device's PawPair data?"
        visible={preparedRestore !== null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  back: { alignItems: "center", backgroundColor: colors.paper, borderRadius: 22, height: 44, justifyContent: "center", width: 44, ...shadow.subtle },
  backupNotice: { alignItems: "flex-start", backgroundColor: colors.skySoft, borderRadius: 17, flexDirection: "row", gap: 9, marginHorizontal: 18, marginTop: 10, padding: 12 },
  backupNoticeText: { color: colors.navy, flex: 1, fontFamily: "Nunito_600SemiBold", fontSize: 10, lineHeight: 15 },
  card: { backgroundColor: colors.paper, borderColor: colors.line, borderRadius: 23, borderWidth: 1, marginHorizontal: 18, overflow: "hidden" },
  dangerIcon: { backgroundColor: "rgba(255,117,102,0.10)" },
  dangerText: { color: colors.danger },
  divider: { backgroundColor: colors.line, height: StyleSheet.hairlineWidth, marginLeft: 62 },
  dividerFull: { backgroundColor: colors.line, height: StyleSheet.hairlineWidth },
  disabled: { opacity: 0.45 },
  eyebrow: { color: colors.navy, fontFamily: "Nunito_800ExtraBold", fontSize: 9, letterSpacing: 1.1 },
  flex: { flex: 1 },
  header: { alignItems: "center", flexDirection: "row", gap: 12, paddingBottom: 15, paddingHorizontal: 18, paddingTop: 10 },
  headerCopy: { flex: 1 },
  hero: { alignItems: "center", backgroundColor: colors.sageSoft, borderRadius: 24, flexDirection: "row", gap: 12, marginHorizontal: 18, padding: 16 },
  heroCopy: { color: colors.muted, fontFamily: "Nunito_600SemiBold", fontSize: 11, lineHeight: 16, marginTop: 2 },
  heroIcon: { alignItems: "center", backgroundColor: colors.paper, borderRadius: 23, height: 46, justifyContent: "center", width: 46 },
  heroTitle: { color: colors.ink, fontFamily: "Nunito_800ExtraBold", fontSize: 14 },
  notice: { alignItems: "center", borderRadius: 17, flexDirection: "row", gap: 8, marginHorizontal: 18, marginTop: 12, minHeight: 44, paddingHorizontal: 12, paddingVertical: 10 },
  noticeError: { backgroundColor: colors.coralSoft },
  noticeSuccess: { backgroundColor: colors.sageSoft },
  noticeText: { color: colors.ink, flex: 1, fontFamily: "Nunito_700Bold", fontSize: 10, lineHeight: 15 },
  pressed: { opacity: 0.68 },
  privacyBlock: { gap: 11, padding: 13 },
  privacyCopy: { color: colors.muted, fontFamily: "Nunito_600SemiBold", fontSize: 10, lineHeight: 15, marginTop: 2 },
  privacyHeading: { alignItems: "flex-start", flexDirection: "row", gap: 9 },
  privacyOption: { alignItems: "center", backgroundColor: colors.background, borderColor: colors.line, borderRadius: 15, borderWidth: 1, flex: 1, flexDirection: "row", gap: 8, minHeight: 54, paddingHorizontal: 10 },
  privacyOptionCopy: { color: colors.muted, fontFamily: "Nunito_600SemiBold", fontSize: 8.5, marginTop: 1 },
  privacyOptionCopySelected: { color: "rgba(255,255,255,0.76)" },
  privacyOptionSelected: { backgroundColor: colors.navy, borderColor: colors.navy },
  privacyOptionTitle: { color: colors.ink, fontFamily: "Nunito_800ExtraBold", fontSize: 11 },
  privacyOptionTitleSelected: { color: colors.white },
  privacyOptions: { flexDirection: "row", gap: 8 },
  privacyTitle: { color: colors.ink, fontFamily: "Nunito_800ExtraBold", fontSize: 12 },
  reminderRow: { alignItems: "center", flexDirection: "row", gap: 10, minHeight: 76, paddingHorizontal: 13 },
  reminderSwitch: { minHeight: 44, minWidth: 44 },
  row: { alignItems: "center", flexDirection: "row", gap: 10, minHeight: 61, paddingHorizontal: 13 },
  rowDetail: { color: colors.muted, fontFamily: "Nunito_600SemiBold", fontSize: 10, marginTop: 2 },
  rowIcon: { alignItems: "center", backgroundColor: colors.skySoft, borderRadius: 18, height: 38, justifyContent: "center", width: 38 },
  rowLabel: { color: colors.ink, flex: 1, fontFamily: "Nunito_800ExtraBold", fontSize: 13 },
  rowValue: { color: colors.muted, fontFamily: "Nunito_700Bold", fontSize: 10 },
  screen: { backgroundColor: colors.background, flex: 1 },
  sectionLabel: { color: colors.navy, fontFamily: "Nunito_800ExtraBold", fontSize: 9, letterSpacing: 1.1, marginBottom: 8, marginHorizontal: 21, marginTop: 20 },
  settingsButton: { alignItems: "center", backgroundColor: colors.skySoft, borderRadius: 14, justifyContent: "center", marginBottom: 12, marginHorizontal: 13, minHeight: 44 },
  settingsButtonText: { color: colors.navy, fontFamily: "Nunito_800ExtraBold", fontSize: 12 },
  title: { color: colors.ink, fontFamily: "Fredoka_600SemiBold", fontSize: 29, lineHeight: 33 },
  versionCard: { alignItems: "center", flexDirection: "row", gap: 10, marginHorizontal: 20, marginTop: 21 },
  versionCopy: { color: colors.muted, fontFamily: "Nunito_600SemiBold", fontSize: 10 },
  versionMark: { alignItems: "center", backgroundColor: "rgba(255,117,102,0.10)", borderRadius: 17, height: 34, justifyContent: "center", width: 34 },
  versionTitle: { color: colors.ink, fontFamily: "Nunito_800ExtraBold", fontSize: 11 },
});
