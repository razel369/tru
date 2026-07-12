import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { AppHeader } from "../../components/AppHeader";
import { colors, shadow } from "../../design";
import {
  getPermissionState,
  requestPermissionIfNeeded,
} from "./permission";
import { buildHealthReport, ensurePermission } from "./service";
import type { NotificationHealthReport } from "./types";

/**
 * Home / account — household first, reminders as a section.
 */
interface HealthScreenProps {
  onOpenSettings?: () => void;
  onOpenPaywall?: () => void;
}

export function HealthScreen({
  onOpenSettings,
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

  const denied = report?.permission === "denied";
  const undetermined = report?.permission === "undetermined";
  const healthy =
    report?.permission === "granted" && (report?.failures ?? 0) === 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top + 14 }]}>
      <AppHeader
        accent="heart"
        actionIcon="settings-outline"
        eyebrow="YOUR HOME"
        onAction={onOpenSettings}
        title="Home"
      />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: 100 + insets.bottom },
        ]}
      >
        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <Ionicons color={colors.sky} name="people" size={26} />
          </View>
          <View style={styles.flex}>
            <Text style={styles.heroKicker}>THIS DEVICE</Text>
            <Text style={styles.heroTitle}>You’re the caregiver here</Text>
            <Text style={styles.heroCopy}>
              Doses you log stay on this phone. This launch build is local-first.
            </Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>REMINDERS</Text>
        {!report ? (
          <Text style={styles.body}>Loading reminder status…</Text>
        ) : (
          <>
            <View style={[styles.card, healthy && styles.cardHealthy]}>
              <Text style={styles.label}>STATUS</Text>
              <Text style={[styles.value, denied && styles.valueDanger]}>
                {labelFor(report.permission)}
              </Text>
              <Text style={styles.body}>
                {healthy
                  ? `${report.scheduled} reminders scheduled.`
                  : "Keep reminders on so you don’t miss a dose."}
              </Text>
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
              {denied && (
                <Text style={styles.body}>
                  Open system Settings to grant notification access.
                </Text>
              )}
            </View>

            <View style={styles.rowCards}>
              <View style={[styles.card, styles.halfCard]}>
                <Text style={styles.label}>SCHEDULED</Text>
                <Text style={styles.value}>{report.scheduled}</Text>
              </View>
              <View style={[styles.card, styles.halfCard]}>
                <Text style={styles.label}>FAILURES</Text>
                <Text
                  style={[
                    styles.value,
                    report.failures > 0 && styles.valueDanger,
                  ]}
                >
                  {report.failures}
                </Text>
              </View>
            </View>
          </>
        )}

        {onOpenSettings && (
          <Pressable onPress={onOpenSettings} style={styles.linkCard}>
            <View style={styles.linkIcon}>
              <Ionicons color={colors.ink} name="settings-outline" size={20} />
            </View>
            <View style={styles.flex}>
              <Text style={styles.linkTitle}>App settings</Text>
              <Text style={styles.linkCopy}>Language, account, export</Text>
            </View>
            <Ionicons color={colors.muted} name="chevron-forward" size={18} />
          </Pressable>
        )}
        {onOpenPaywall && (
          <Pressable onPress={onOpenPaywall} style={styles.upgradeCard}>
            <Ionicons color={colors.white} name="sparkles" size={18} />
            <Text style={styles.upgradeText}>PawPair Plus (coming soon)</Text>
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
      return "Reminders on";
    case "denied":
      return "Reminders blocked";
    case "undetermined":
      return "Not enabled yet";
    case "unsupported":
      return "Not supported here";
  }
}

const styles = StyleSheet.create({
  body: {
    color: colors.muted,
    fontFamily: "Nunito_600SemiBold",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
  },
  card: {
    backgroundColor: colors.paper,
    borderRadius: 28,
    marginBottom: 12,
    padding: 18,
    ...shadow.card,
  },
  cardHealthy: {
    backgroundColor: colors.sageSoft,
  },
  container: { backgroundColor: colors.background, flex: 1 },
  content: { paddingHorizontal: 18, paddingTop: 8 },
  flex: { flex: 1 },
  halfCard: { flex: 1 },
  heroCard: {
    alignItems: "center",
    backgroundColor: colors.skySoft,
    borderRadius: 30,
    flexDirection: "row",
    gap: 14,
    marginBottom: 16,
    padding: 18,
    ...shadow.card,
  },
  heroCopy: {
    color: colors.muted,
    fontFamily: "Nunito_600SemiBold",
    fontSize: 13,
    marginTop: 4,
  },
  heroIcon: {
    alignItems: "center",
    backgroundColor: colors.paper,
    borderRadius: 22,
    height: 52,
    justifyContent: "center",
    width: 52,
  },
  heroKicker: {
    color: colors.sky,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 10,
    letterSpacing: 1.2,
  },
  heroTitle: {
    color: colors.ink,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 20,
    letterSpacing: -0.3,
    marginTop: 3,
  },
  label: {
    color: colors.sky,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 10,
    letterSpacing: 1.4,
  },
  linkCard: {
    alignItems: "center",
    backgroundColor: colors.paper,
    borderRadius: 24,
    flexDirection: "row",
    gap: 12,
    marginBottom: 10,
    padding: 14,
    ...shadow.subtle,
  },
  linkCopy: {
    color: colors.muted,
    fontFamily: "Nunito_600SemiBold",
    fontSize: 12,
    marginTop: 2,
  },
  linkIcon: {
    alignItems: "center",
    backgroundColor: colors.skySoft,
    borderRadius: 16,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  linkTitle: {
    color: colors.ink,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 14,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: colors.coral,
    borderRadius: 999,
    marginTop: 12,
    minHeight: 52,
    paddingHorizontal: 16,
    paddingVertical: 12,
    ...shadow.fab,
  },
  primaryButtonText: {
    color: colors.white,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 14,
  },
  rowCards: { flexDirection: "row", gap: 10 },
  sectionLabel: {
    color: colors.sky,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 10,
    letterSpacing: 1.4,
    marginBottom: 10,
    marginTop: 8,
  },
  upgradeCard: {
    alignItems: "center",
    backgroundColor: colors.sky,
    borderRadius: 999,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    marginTop: 8,
    minHeight: 52,
    paddingHorizontal: 18,
    ...shadow.card,
  },
  upgradeText: {
    color: colors.white,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 14,
  },
  value: {
    color: colors.ink,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 22,
    letterSpacing: -0.3,
    marginTop: 6,
  },
  valueDanger: { color: colors.danger },
});
