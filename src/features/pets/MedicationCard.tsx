import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import { colors } from "../../design";
import { formatTime } from "../../schedule";
import type { Medication } from "../../types";

interface MedicationCardProps {
  medication: Medication;
}

/**
 * A medication row inside the active plan list on the Pets screen.
 * Extracted verbatim from App.tsx in stage 2.
 */
export function MedicationCard({ medication }: MedicationCardProps) {
  const lowStock = medication.stock <= 10;
  return (
    <View style={styles.medicationCard}>
      <View
        style={[
          styles.medicationIconLarge,
          { backgroundColor: `${medication.color}20` },
        ]}
      >
        <Ionicons
          color={medication.color}
          name={medication.form === "liquid" ? "water" : "medical"}
          size={23}
        />
      </View>
      <View style={styles.flex}>
        <Text style={styles.medicationTitle}>{medication.name}</Text>
        <Text style={styles.medicationMeta}>
          {medication.dosage} · {medication.times.map(formatTime).join(" & ")}
        </Text>
        <View style={styles.stockRow}>
          <View
            style={[
              styles.stockDot,
              { backgroundColor: lowStock ? colors.coral : colors.sage },
            ]}
          />
          <Text
            style={[
              styles.stockText,
              lowStock && { color: colors.coral },
            ]}
          >
            {medication.stock} {medication.stockUnit} left
            {lowStock ? " · Refill soon" : ""}
          </Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={19} color={colors.muted} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  medicationCard: {
    alignItems: "center",
    backgroundColor: colors.paper,
    borderColor: colors.line,
    borderRadius: 19,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    marginBottom: 10,
    padding: 15,
  },
  medicationIconLarge: {
    alignItems: "center",
    borderRadius: 15,
    height: 50,
    justifyContent: "center",
    width: 50,
  },
  medicationMeta: {
    color: colors.muted,
    fontFamily: "Manrope_400Regular",
    fontSize: 10,
    marginTop: 4,
  },
  medicationTitle: {
    color: colors.ink,
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 14,
  },
  stockDot: { borderRadius: 3, height: 6, width: 6 },
  stockRow: { alignItems: "center", flexDirection: "row", gap: 6, marginTop: 6 },
  stockText: {
    color: colors.muted,
    fontFamily: "Manrope_600SemiBold",
    fontSize: 10,
  },
});
