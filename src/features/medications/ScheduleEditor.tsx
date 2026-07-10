import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "../../design";
import { formatTime } from "../../schedule";

interface ScheduleEditorProps {
  times: string[];
  paused: boolean;
  onTogglePause: () => void;
}

/**
 * Minimal schedule editor for the v1 Medication shape.
 *
 * Stage 7 lands the full schedule-engine editor (per-stage
 * forms for weekdays, every-N, taper, etc.) in stage 5; for
 * the prototype, we expose the schedule's wall-clock times
 * and a single Pause / Resume toggle. Pause removes the
 * medication from the Today timeline (see buildScheduleFromEngine
 * which honors a per-medication `paused` flag in stage 5d
 * follow-up).
 */
export function ScheduleEditor({
  times,
  paused,
  onTogglePause,
}: ScheduleEditorProps) {
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.label}>SCHEDULE</Text>
        <View style={styles.times}>
          {times.length === 0 ? (
            <Text style={styles.empty}>No times set</Text>
          ) : (
            times.map((time) => (
              <View key={time} style={styles.timePill}>
                <Text style={styles.timeText}>{formatTime(time)}</Text>
              </View>
            ))
          )}
        </View>
      </View>
      <View style={styles.divider} />
      <View style={styles.row}>
        <View style={styles.flex}>
          <Text style={styles.label}>REMINDERS</Text>
          <Text style={styles.body}>
            {paused
              ? "Reminders are paused. No notifications will fire."
              : "Reminders are active. Tap below to pause."}
          </Text>
        </View>
        <Pressable
          onPress={onTogglePause}
          style={[
            styles.toggle,
            paused ? styles.togglePaused : styles.toggleActive,
          ]}
        >
          <Ionicons
            color={paused ? colors.ink : colors.white}
            name={paused ? "play" : "pause"}
            size={16}
          />
          <Text
            style={[
              styles.toggleText,
              paused ? styles.toggleTextPaused : styles.toggleTextActive,
            ]}
          >
            {paused ? "Resume" : "Pause"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    color: colors.muted,
    fontFamily: "Manrope_400Regular",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  card: {
    backgroundColor: colors.paper,
    borderColor: colors.line,
    borderRadius: 20,
    borderWidth: 1,
    marginVertical: 8,
    padding: 16,
  },
  divider: {
    backgroundColor: colors.line,
    height: 1,
    marginVertical: 12,
  },
  empty: {
    color: colors.muted,
    fontFamily: "Manrope_400Regular",
    fontSize: 12,
  },
  flex: { flex: 1 },
  label: {
    color: colors.muted,
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 9,
    letterSpacing: 1.4,
  },
  row: { gap: 6 },
  timePill: {
    backgroundColor: colors.background,
    borderColor: colors.line,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  timeText: {
    color: colors.ink,
    fontFamily: "Manrope_700Bold",
    fontSize: 11,
  },
  times: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 },
  toggle: {
    alignItems: "center",
    borderRadius: 14,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  toggleActive: { backgroundColor: colors.coral },
  togglePaused: {
    backgroundColor: colors.paper,
    borderColor: colors.coral,
    borderWidth: 1,
  },
  toggleText: {
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 12,
  },
  toggleTextActive: { color: colors.white },
  toggleTextPaused: { color: colors.coral },
});
