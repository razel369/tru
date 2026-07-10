import { Ionicons } from "@expo/vector-icons";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppHeader } from "../../components/AppHeader";
import { colors } from "../../design";
import type { DoseLog, Pet } from "../../types";
import { renderReport } from "./report";

interface ReportScreenProps {
  pets: Pet[];
  logs: DoseLog[];
  onClose: () => void;
}

/**
 * PawPair — vet-ready report preview.
 *
 * docs/AAA-HANDOFF.md §8 "Reports":
 * - "Generate a professional PDF locally."
 * - "Verify pagination, long medication names, Dynamic Type,
 *    and non-English text."
 * - "Preview before share."
 *
 * Stage 7d ships the renderer (HTML) and stage 12-final ships
 * the PDF pipeline. This screen is the in-app preview: it
 * renders the same HTML payload as a styled preview that
 * scrolls, so the user can verify the data before sharing.
 */
export function ReportScreen({ pets, logs, onClose }: ReportScreenProps) {
  const insets = useSafeAreaInsets();
  const rangeStart = new Date();
  rangeStart.setDate(rangeStart.getDate() - 30);
  const html = renderReport({
    pets,
    logs,
    rangeStart,
    rangeEnd: new Date(),
  });
  // We don't run a full HTML renderer; instead, we surface the
  // raw payload in a code block so the user can verify that
  // every section rendered. Stage 12-final replaces this with
  // an embedded web view or PDF share.
  return (
    <View style={[styles.container, { paddingTop: insets.top + 14 }]}>
      <AppHeader
        actionIcon="close-outline"
        eyebrow="VET-READY"
        onAction={onClose}
        title="Care report"
      />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: 100 + insets.bottom },
        ]}
      >
        <View style={styles.card}>
          <Ionicons color={colors.sage} name="document-text" size={22} />
          <Text style={styles.title}>Last 30 days</Text>
          <Text style={styles.body}>
            {pets.length} pet{pets.length === 1 ? "" : "s"},{" "}
            {logs.length} dose{logs.length === 1 ? "" : "s"} logged.
          </Text>
        </View>
        <View style={styles.previewCard}>
          <Text style={styles.previewTitle}>HTML payload</Text>
          <Text style={styles.previewHint}>
            Stage 12-final renders this through expo-print to
            produce a PDF, then shows the system share sheet.
          </Text>
          <Text style={styles.code} numberOfLines={40}>
            {html}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    color: colors.muted,
    fontFamily: "Manrope_400Regular",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
  },
  card: {
    alignItems: "center",
    backgroundColor: colors.paper,
    borderColor: colors.line,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 12,
    padding: 16,
  },
  code: {
    color: colors.muted,
    fontFamily: "Courier",
    fontSize: 10,
    lineHeight: 14,
  },
  container: { backgroundColor: colors.background, flex: 1 },
  content: { paddingHorizontal: 18, paddingTop: 8 },
  previewCard: {
    backgroundColor: colors.paper,
    borderColor: colors.line,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 12,
    padding: 16,
  },
  previewHint: {
    color: colors.muted,
    fontFamily: "Manrope_400Regular",
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 8,
    marginTop: 4,
  },
  previewTitle: {
    color: colors.ink,
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 13,
  },
  title: {
    color: colors.ink,
    fontFamily: "Fraunces_700Bold",
    fontSize: 22,
    marginTop: 8,
  },
});
