import { Ionicons } from "@expo/vector-icons";
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppHeader } from "../../components/AppHeader";
import { colors, shadow } from "../../design";

const SUPPORT_EMAIL = "raz@rmalk.co.il";

interface SettingsScreenProps {
  onExportData: () => void;
  onDeleteAccount: () => void;
  onOpenPrivacy: () => void;
  onOpenTerms: () => void;
}

/**
 * Settings — export, delete, support, and live legal documents.
 */
export function SettingsScreen({
  onExportData,
  onDeleteAccount,
  onOpenPrivacy,
  onOpenTerms,
}: SettingsScreenProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.container, { paddingTop: insets.top + 14 }]}>
      <AppHeader accent="pill" eyebrow="ACCOUNT" title="Settings" />
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
            subtitle="Share a JSON copy of every pet, medication, and dose log."
          />
          <Row
            danger
            icon="trash-outline"
            label="Delete account"
            onPress={() => {
              Alert.alert(
                "Delete account?",
                "This removes every pet, medication, and dose log from this device. This action cannot be undone.",
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
          <Row
            icon="mail-outline"
            label="Contact support"
            onPress={() => {
              void Linking.openURL(`mailto:${SUPPORT_EMAIL}`);
            }}
            subtitle={SUPPORT_EMAIL}
          />
        </Section>

        <Section title="LEGAL">
          <Row
            icon="document-text-outline"
            label="Terms of service"
            onPress={onOpenTerms}
          />
          <Row
            icon="shield-checkmark-outline"
            label="Privacy policy"
            onPress={onOpenPrivacy}
          />
        </Section>

        <Text style={styles.disclaimer}>
          PawPair helps you track doses. It does not provide veterinary advice.
        </Text>
        <Text style={styles.version}>PawPair 0.1.0 · Local-first</Text>
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
        <Text style={[styles.rowLabel, danger && styles.rowLabelDanger]}>
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
  disclaimer: {
    color: colors.muted,
    fontFamily: "Nunito_600SemiBold",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 18,
    textAlign: "center",
  },
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
    fontFamily: "Nunito_700Bold",
    fontSize: 14,
  },
  rowLabelDanger: { color: colors.danger },
  rowSubtitle: {
    color: colors.muted,
    fontFamily: "Nunito_600SemiBold",
    fontSize: 11,
    marginTop: 2,
  },
  section: { marginBottom: 18 },
  sectionCard: {
    backgroundColor: colors.paper,
    borderRadius: 24,
    overflow: "hidden",
    ...shadow.card,
  },
  sectionTitle: {
    color: colors.sky,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 10,
    letterSpacing: 1.4,
    marginBottom: 6,
    marginLeft: 4,
  },
  version: {
    color: colors.muted,
    fontFamily: "Nunito_600SemiBold",
    fontSize: 11,
    marginTop: 10,
    textAlign: "center",
  },
});
