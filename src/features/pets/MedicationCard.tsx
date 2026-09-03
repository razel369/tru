import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, shadow } from "../../design";
import { formatTime } from "../../schedule";
import type { Medication } from "../../types";

interface MedicationCardProps {
  medication: Medication;
  onPress?: () => void;
  onLongPress?: () => void;
}

/** Clay medication row for the Pets active plan. */
export function MedicationCard({
  medication,
  onPress,
  onLongPress,
}: MedicationCardProps) {
  const lowStock = medication.stock <= 10;
  const content = (
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
            style={[styles.stockText, lowStock && { color: colors.coral }]}
          >
            {medication.stock} {medication.stockUnit} left
            {lowStock ? " · Refill soon" : ""}
          </Text>
        </View>
      </View>
      <Ionicons color={colors.muted} name="chevron-forward" size={19} />
    </View>
  );
  if (onPress === undefined && onLongPress === undefined) return content;
  return (
    <Pressable
      onLongPress={onLongPress}
      onPress={onPress}
      style={({ pressed }) => pressed && styles.pressed}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  medicationCard: {
    alignItems: "center",
    backgroundColor: colors.paper,
    borderRadius: 26,
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
    padding: 15,
    ...shadow.card,
  },
  medicationIconLarge: {
    alignItems: "center",
    borderRadius: 18,
    height: 50,
    justifyContent: "center",
    width: 50,
  },
  medicationMeta: {
    color: colors.muted,
    fontFamily: "Nunito_600SemiBold",
    fontSize: 11,
    marginTop: 4,
  },
  medicationTitle: {
    color: colors.ink,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 15,
  },
  pressed: { opacity: 0.85 },
  stockDot: { borderRadius: 3, height: 6, width: 6 },
  stockRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    marginTop: 6,
  },
  stockText: {
    color: colors.muted,
    fontFamily: "Nunito_700Bold",
    fontSize: 11,
  },
});
