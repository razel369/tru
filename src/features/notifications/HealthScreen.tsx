import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppHeader } from "../../components/AppHeader";
import { colors } from "../../design";
import {
  buildHealthReport,
  ensurePermission,
  getPermissionState,
  requestPermissionIfNeeded,
} from "./index";
import type { NotificationHealthReport } from "./types";

/**
 * PawPair — notification health screen.
 *
 * docs/AAA-HANDOFF.md §7: "Show an in-app notification health
 * screen when permissions are disabled." Also shows the
 * current schedule count and any failures, so caregivers can
 * see at a glance whether reminders will fire.
 */
interface HealthScreenProps {
  onOpenSettings?: () => void;
  onOpenHousehold?: () => void;
  onOpenPaywall?: () => void;
}

export function HealthScreen({
  onOpenSettings,
  onOpenHousehold,
  onOpenPaywall,
}: HealthScreenProps = {}) {
  const insets = useSafeAreaInsets();
  const [report, setReport] = useState<NotificationHealthReport | null>(null);

  useEffect(() => {
    void refresh();
  }, []);

  async function refresh() {
    const permission = await getPermissionState();
    const next = await buildHealthReport(permission);
    setReport(next);
  }

  async function onAskPermission() {
    await requestPermissionIfNeeded();
    await ensurePermission();
    await refresh();
  }

  if (!report) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + 14 }]}>
        <AppHeader
          actionIcon="refresh-outline"
          eyebrow="REMINDERS"
          onAction={refresh}
          title="Notifications"
        />
        <Text style={styles.body}>Loading…</Text>
      </View>
    );
  }

  const denied = report.permission === "denied";
  const undetermined = report.permission === "undetermined";
  const unsupported = report.permission === "unsupported";

  return (
    <View style={[styles.container, { paddingTop: insets.top + 14 }]}>
      <AppHeader
        actionIcon="refresh-outline"
        eyebrow="REMINDERS"
        onAction={refresh}
        title="Notifications"
      />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: 100 + insets.bottom },
        ]}
      >
        <View style={styles.card}>
          <Text style={styles.label}>PERMISSION</Text>
          <Text
            style={[
              styles.value,
              denied && styles.valueDanger,
            ]}
          >
            {labelFor(report.permission)}
          </Text>
          {denied && (
            <Text style={styles.body}>
              Open the system Settings to grant PawPair notification
              access. Reminders will not fire until then.
            </Text>
          )}
          {undetermined && (
            <Pressable
              onPress={onAskPermission}
              style={styles.primaryButton}
            >
              <Text style={styles.primaryButtonText}>
                Allow notifications
              </Text>
            </Pressable>
          )}
          {unsupported && (
            <Text style={styles.body}>
              Reminders are not available on this platform.
            </Text>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>SCHEDULED REMINDERS</Text>
          <Text style={styles.value}>{report.scheduled}</Text>
          {report.lastRegistrationAtUtc !== null && (
            <Text style={styles.body}>
              Last registration: {report.lastRegistrationAtUtc}
            </Text>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>FAILURES</Text>
          <Text
            style={[
              styles.value,
              report.failures > 0 && styles.valueDanger,
            ]}
          >
            {report.failures}
          </Text>
          <Text style={styles.body}>
            If failures keep growing, the device may be out of
            notification slots. Edit a medication to clear stale
            reminders and trigger a reschedule.
          </Text>
        </View>

        {onOpenSettings && (
          <Pressable onPress={onOpenSettings} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>
              Open app settings
            </Text>
          </Pressable>
        )}
        {onOpenHousehold && (
          <Pressable onPress={onOpenHousehold} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>
              Manage household
            </Text>
          </Pressable>
        )}
        {onOpenPaywall && (
          <Pressable onPress={onOpenPaywall} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>
              Upgrade to PawPair Plus
            </Text>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

function labelFor(
  permission: NotificationHealthReport["permission"],
): string {
  switch (permission) {
    case "granted":
      return "Allowed";
    case "denied":
      return "Denied";
    case "undetermined":
      return "Not yet asked";
    case "unsupported":
      return "Not supported on this device";
  }
}

const styles = StyleSheet.create({
  body: {
    color: colors.muted,
    fontFamily: "Manrope_400Regular",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8,
  },
  card: {
    backgroundColor: colors.paper,
    borderColor: colors.line,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 12,
    padding: 16,
  },
  container: { backgroundColor: colors.background, flex: 1 },
  content: { paddingHorizontal: 18, paddingTop: 8 },
  label: {
    color: colors.muted,
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 9,
    letterSpacing: 1.4,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: colors.coral,
    borderRadius: 16,
    marginTop: 12,
    minHeight: 48,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  primaryButtonText: {
    color: colors.white,
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 13,
  },
  value: {
    color: colors.ink,
    fontFamily: "Fraunces_700Bold",
    fontSize: 22,
    marginTop: 6,
  },
  valueDanger: { color: colors.danger },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: colors.paper,
    borderColor: colors.line,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 12,
    minHeight: 44,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  secondaryButtonText: {
    color: colors.ink,
    fontFamily: "Manrope_700Bold",
    fontSize: 12,
  },
});
