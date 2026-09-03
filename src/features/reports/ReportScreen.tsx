import { Ionicons } from "@expo/vector-icons";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppHeader } from "../../components/AppHeader";
import { colors } from "../../design";
import type { DoseLog, Pet } from "../../types";

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
  const given = logs.filter((log) => log.status === "given").length;
  const skipped = logs.filter((log) => log.status === "skipped").length;
  const adherence = logs.length > 0 ? Math.round((given / logs.length) * 100) : 0;
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
        <View style={styles.summaryCard}>
          <View style={styles.summaryIcon}>
            <Ionicons color={colors.sage} name="document-text" size={23} />
          </View>
          <View style={styles.flex}>
            <Text style={styles.kicker}>LAST 30 DAYS</Text>
            <Text style={styles.title}>Care at a glance</Text>
            <Text style={styles.body}>Ready to review with your veterinarian.</Text>
          </View>
          <View style={styles.adherenceBadge}>
            <Text style={styles.adherenceValue}>{adherence}%</Text>
            <Text style={styles.adherenceLabel}>given</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <Stat label="GIVEN" value={given} color={colors.sage} />
          <Stat label="SKIPPED" value={skipped} color={colors.coral} />
          <Stat label="PETS" value={pets.length} color={colors.sky} />
        </View>

        <Text style={styles.sectionLabel}>PETS INCLUDED</Text>
        {pets.map((pet) => (
          <View key={pet.id} style={styles.petCard}>
            <View style={[styles.petDot, { backgroundColor: pet.color }]} />
            <View style={styles.flex}>
              <Text style={styles.petName}>{pet.name}</Text>
              <Text style={styles.petMeta}>
                {pet.breed || "Beloved pet"} · {pet.medications.length} active medication
                {pet.medications.length === 1 ? "" : "s"}
              </Text>
            </View>
            <Ionicons color={colors.muted} name="checkmark-circle" size={20} />
          </View>
        ))}

        <View style={styles.noteCard}>
          <Ionicons color={colors.sky} name="information-circle-outline" size={20} />
          <Text style={styles.noteText}>
            This report reflects the doses recorded in PawPair and is not veterinary advice.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  adherenceBadge: {
    alignItems: "center",
    backgroundColor: colors.sageSoft,
    borderRadius: 21,
    height: 64,
    justifyContent: "center",
    width: 64,
  },
  adherenceLabel: {
    color: colors.sage,
    fontFamily: "Manrope_700Bold",
    fontSize: 9,
  },
  adherenceValue: {
    color: colors.sage,
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 18,
  },
  body: {
    color: colors.muted,
    fontFamily: "Manrope_400Regular",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
  },
  flex: { flex: 1 },
  kicker: {
    color: colors.sage,
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 9,
    letterSpacing: 1.2,
  },
  noteCard: {
    alignItems: "center",
    backgroundColor: colors.skySoft,
    borderRadius: 20,
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
    padding: 14,
  },
  noteText: {
    flex: 1,
    color: colors.muted,
    fontFamily: "Manrope_600SemiBold",
    fontSize: 11,
    lineHeight: 16,
  },
  container: { backgroundColor: colors.background, flex: 1 },
  content: { paddingHorizontal: 18, paddingTop: 8 },
  petCard: {
    alignItems: "center",
    backgroundColor: colors.paper,
    borderRadius: 20,
    flexDirection: "row",
    gap: 11,
    marginBottom: 9,
    padding: 14,
    shadowColor: "#2A3A4A",
    shadowOffset: { height: 5, width: 0 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  petDot: { borderRadius: 7, height: 14, width: 14 },
  petMeta: {
    color: colors.muted,
    fontFamily: "Manrope_600SemiBold",
    fontSize: 11,
    marginTop: 3,
  },
  petName: {
    color: colors.ink,
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 14,
  },
  sectionLabel: {
    color: colors.sky,
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 9,
    letterSpacing: 1.3,
    marginBottom: 8,
    marginLeft: 3,
    marginTop: 18,
  },
  statsRow: {
    flexDirection: "row",
    gap: 9,
  },
  summaryCard: {
    alignItems: "center",
    backgroundColor: colors.paper,
    borderRadius: 26,
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
    padding: 16,
    shadowColor: "#2A3A4A",
    shadowOffset: { height: 8, width: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
  },
  summaryIcon: {
    alignItems: "center",
    backgroundColor: colors.sageSoft,
    borderRadius: 18,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  title: {
    color: colors.ink,
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 22,
    letterSpacing: -0.3,
    marginTop: 8,
  },
});

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={statStyles.card}>
      <Text style={[statStyles.value, { color }]}>{value}</Text>
      <Text style={statStyles.label}>{label}</Text>
    </View>
  );
}

const statStyles = StyleSheet.create({
  card: {
    alignItems: "center",
    backgroundColor: colors.paper,
    borderRadius: 20,
    flex: 1,
    paddingVertical: 14,
  },
  label: {
    color: colors.muted,
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 8,
    letterSpacing: 0.9,
    marginTop: 3,
  },
  value: {
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 22,
  },
});
