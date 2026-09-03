import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, shadow } from "../../design";

import type { MedicationSupplyStatus } from "./medication-supply";
import type { CareTask } from "./types";

export function MedicationSupplyCard({
  supplies,
  onEdit,
}: {
  supplies: MedicationSupplyStatus[];
  onEdit: (task: CareTask) => void;
}) {
  const alerts = supplies.filter((item) => item.severity !== "healthy").slice(0, 3);
  if (alerts.length === 0) return null;

  return (
    <View style={styles.card}>
      <View style={styles.heading}>
        <View style={styles.headingIcon}>
          <Ionicons color={colors.coral} name="medical-outline" size={18} />
        </View>
        <View style={styles.flex}>
          <Text style={styles.eyebrow}>SUPPLY WATCH</Text>
          <Text style={styles.title}>Refill before it runs out</Text>
        </View>
      </View>
      <View style={styles.rows}>
        {alerts.map((item) => {
          const critical = item.severity === "critical" || item.severity === "out";
          return (
            <Pressable
              accessibilityLabel={`Edit ${item.task.title} supply for ${item.petName}`}
              accessibilityRole="button"
              key={item.task.id}
              onPress={() => onEdit(item.task)}
              style={styles.row}
            >
              <View style={[styles.dot, { backgroundColor: critical ? colors.coral : "#D6933D" }]} />
              <View style={styles.flex}>
                <Text style={styles.medication}>{item.task.title}</Text>
                <Text style={styles.meta}>{item.petName} / {item.stock} {item.stockUnit} left</Text>
              </View>
              <Text style={[styles.days, critical && styles.daysCritical]}>
                {item.severity === "out"
                  ? "OUT"
                  : item.daysRemaining === null
                    ? "LOW"
                    : `${item.daysRemaining}d`}
              </Text>
              <Ionicons color={colors.muted} name="chevron-forward" size={15} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.paper, borderColor: "rgba(255,117,102,0.18)", borderRadius: 23, borderWidth: 1, marginHorizontal: 18, marginTop: 10, padding: 13, ...shadow.subtle },
  days: { color: "#B1712D", fontFamily: "Nunito_800ExtraBold", fontSize: 10 },
  daysCritical: { color: colors.danger },
  dot: { borderRadius: 5, height: 9, width: 9 },
  eyebrow: { color: colors.coral, fontFamily: "Nunito_800ExtraBold", fontSize: 8, letterSpacing: 0.9 },
  flex: { flex: 1 },
  heading: { alignItems: "center", flexDirection: "row", gap: 9, marginBottom: 8 },
  headingIcon: { alignItems: "center", backgroundColor: colors.coralSoft, borderRadius: 17, height: 36, justifyContent: "center", width: 36 },
  medication: { color: colors.ink, fontFamily: "Nunito_800ExtraBold", fontSize: 12 },
  meta: { color: colors.muted, fontFamily: "Nunito_600SemiBold", fontSize: 9, marginTop: 1 },
  row: { alignItems: "center", borderTopColor: colors.line, borderTopWidth: 1, flexDirection: "row", gap: 8, minHeight: 50, paddingHorizontal: 3 },
  rows: { borderBottomColor: colors.line, borderBottomWidth: 1 },
  title: { color: colors.ink, fontFamily: "Fredoka_600SemiBold", fontSize: 17, lineHeight: 20 },
});
