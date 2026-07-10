import { Ionicons } from "@expo/vector-icons";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppHeader } from "../../components/AppHeader";
import { colors } from "../../design";

interface SettingsScreenProps {
  onExportData: () => void;
  onDeleteAccount: () => void;
}

/**
 * PawPair — settings screen.
 *
 * docs/AAA-HANDOFF.md §13:
 * - Privacy: provide in-app export and deletion.
 * - Support, contact, terms, privacy, app version.
 *
 * Each row is a pressable that fires the matching callback.
 * Confirmations for destructive actions are shown with
 * Alert.alert so the user can back out.
 */
export function SettingsScreen({
  onExportData,
  onDeleteAccount,
}: SettingsScreenProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.container, { paddingTop: insets.top + 14 }]}>
      <AppHeader
        actionIcon="settings-outline"
        eyebrow="ACCOUNT"
        title="Settings"
      />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: 100 + insets.bottom },
        ]}
      >
        <Section title="YOUR DATA">
          <Row
            icon="download-outline"
            label="Export care data"
            onPress={onExportData}
            subtitle="Download a JSON copy of every pet, medication, and dose log."
          />
          <Row
            danger
            icon="trash-outline"
            label="Delete account"
            onPress={() => {
              Alert.alert(
                "Delete account?",
                "This removes every pet, medication, and dose log from this device. Other caregivers will lose access. This action cannot be undone.",
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Delete",
                    style: "destructive",
                    onPress: onDeleteAccount,
                  },
                ],
              );
            }}
            subtitle="Removes every pet, medication, and dose log on this device."
          />
        </Section>

        <Section title="SUPPORT">
          <Row icon="help-circle-outline" label="Help & FAQ" onPress={() => undefined} />
          <Row
            icon="mail-outline"
            label="Contact support"
            onPress={() => undefined}
            subtitle="raz@rmalk.co.il"
          />
        </Section>

        <Section title="LEGAL">
          <Row
            icon="document-text-outline"
            label="Terms of service"
            onPress={() => undefined}
          />
          <Row
            icon="shield-checkmark-outline"
            label="Privacy policy"
            onPress={() => undefined}
          />
        </Section>

        <Text style={styles.version}>PawPair 0.1.0</Text>
      </ScrollView>
    </View>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );
}

function Row({
  icon,
  label,
  subtitle,
  onPress,
  danger,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  subtitle?: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable onPress={onPress} style={styles.row}>
      <Ionicons
        color={danger ? colors.danger : colors.ink}
        name={icon}
        size={18}
      />
      <View style={styles.flex}>
        <Text
          style={[
            styles.rowLabel,
            danger && styles.rowLabelDanger,
          ]}
        >
          {label}
        </Text>
        {subtitle && <Text style={styles.rowSubtitle}>{subtitle}</Text>}
      </View>
      <Ionicons color={colors.muted} name="chevron-forward" size={18} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: colors.background, flex: 1 },
  content: { paddingHorizontal: 18, paddingTop: 8 },
  flex: { flex: 1 },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowLabel: {
    color: colors.ink,
    fontFamily: "Manrope_700Bold",
    fontSize: 14,
  },
  rowLabelDanger: { color: colors.danger },
  rowSubtitle: {
    color: colors.muted,
    fontFamily: "Manrope_400Regular",
    fontSize: 11,
    marginTop: 2,
  },
  section: { marginBottom: 18 },
  sectionCard: {
    backgroundColor: colors.paper,
    borderColor: colors.line,
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
  },
  sectionTitle: {
    color: colors.muted,
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 9,
    letterSpacing: 1.4,
    marginBottom: 6,
    marginLeft: 4,
  },
  version: {
    color: colors.muted,
    fontFamily: "Manrope_600SemiBold",
    fontSize: 11,
    marginTop: 24,
    textAlign: "center",
  },
});
