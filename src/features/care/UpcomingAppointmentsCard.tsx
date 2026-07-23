import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, shadow } from "../../design";

import {
  appointmentDateLabel,
  appointmentReminderLabel,
  type UpcomingAppointment,
} from "./appointments";
import type { CareTask } from "./types";

function countdown(days: number) {
  if (days === 0) return "TODAY";
  if (days === 1) return "TOMORROW";
  return `${days} DAYS`;
}

export function UpcomingAppointmentsCard({
  appointments,
  onEdit,
}: {
  appointments: UpcomingAppointment[];
  onEdit: (task: CareTask) => void;
}) {
  if (appointments.length === 0) return null;
  return (
    <View style={styles.card}>
      <View style={styles.heading}>
        <View style={styles.headingIcon}>
          <Ionicons color="#A56B58" name="calendar-outline" size={18} />
        </View>
        <View style={styles.flex}>
          <Text style={styles.eyebrow}>UPCOMING</Text>
          <Text style={styles.title}>Appointments</Text>
        </View>
        <Text style={styles.count}>{appointments.length}</Text>
      </View>
      {appointments.slice(0, 3).map((item) => (
        <Pressable
          accessibilityLabel={`Edit ${item.task.title} for ${item.petName}`}
          accessibilityRole="button"
          key={item.task.id}
          onPress={() => onEdit(item.task)}
          style={styles.row}
        >
          <View style={styles.dateBadge}>
            <Text style={styles.dateBadgeText}>{countdown(item.daysUntil)}</Text>
          </View>
          <View style={styles.flex}>
            <Text style={styles.appointment}>{item.task.title}</Text>
            <Text style={styles.meta}>
              {item.petName} / {appointmentDateLabel(item)}
            </Text>
            <Text numberOfLines={1} style={styles.detail}>
              {[item.task.details?.provider, item.task.details?.location, appointmentReminderLabel(item.task)]
                .filter(Boolean)
                .join(" / ")}
            </Text>
          </View>
          <Ionicons color={colors.muted} name="chevron-forward" size={16} />
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  appointment: { color: colors.ink, fontFamily: "Nunito_800ExtraBold", fontSize: 12 },
  card: { backgroundColor: colors.paper, borderColor: "rgba(165,107,88,0.15)", borderRadius: 23, borderWidth: 1, marginHorizontal: 18, marginTop: 10, padding: 13, ...shadow.subtle },
  count: { color: "#A56B58", fontFamily: "Nunito_800ExtraBold", fontSize: 11 },
  dateBadge: { alignItems: "center", backgroundColor: "#F2E4DF", borderRadius: 11, minWidth: 52, paddingHorizontal: 6, paddingVertical: 6 },
  dateBadgeText: { color: "#A56B58", fontFamily: "Nunito_800ExtraBold", fontSize: 7, letterSpacing: 0.3 },
  detail: { color: colors.navy, fontFamily: "Nunito_700Bold", fontSize: 8, marginTop: 2 },
  eyebrow: { color: "#A56B58", fontFamily: "Nunito_800ExtraBold", fontSize: 8, letterSpacing: 0.9 },
  flex: { flex: 1 },
  heading: { alignItems: "center", flexDirection: "row", gap: 9, marginBottom: 8 },
  headingIcon: { alignItems: "center", backgroundColor: "#F2E4DF", borderRadius: 17, height: 36, justifyContent: "center", width: 36 },
  meta: { color: colors.muted, fontFamily: "Nunito_600SemiBold", fontSize: 9, marginTop: 1 },
  row: { alignItems: "center", borderTopColor: colors.line, borderTopWidth: 1, flexDirection: "row", gap: 9, minHeight: 66, paddingHorizontal: 2, paddingVertical: 7 },
  title: { color: colors.ink, fontFamily: "Fredoka_600SemiBold", fontSize: 17, lineHeight: 20 },
});
