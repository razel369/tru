import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "../../design";
import { formatTime } from "../../schedule";
import type { ScheduledDose } from "../../types";

interface DoseCardProps {
  dose: ScheduledDose;
  isLast: boolean;
  onLog: (dose: ScheduledDose, status: "given" | "skipped") => void;
}

/**
 * One dose row in the Today timeline. Shows the medication, the
 * scheduled time, the pet, and the action set ("Mark as given" / "Skip"
 * for due and upcoming, or a caregiver-attributed "Given by …" line for
 * resolved doses). Extracted verbatim from App.tsx in stage 2.
 */
export function DoseCard({ dose, isLast, onLog }: DoseCardProps) {
  const complete = dose.status === "given";
  const skipped = dose.status === "skipped";
  const active = dose.status === "due";

  return (
    <View style={styles.timelineRow}>
      <View style={styles.timelineMarkerColumn}>
        <View
          style={[
            styles.timelineMarker,
            complete && styles.timelineMarkerComplete,
            active && styles.timelineMarkerActive,
          ]}
        >
          {complete ? (
            <Ionicons name="checkmark" size={13} color={colors.white} />
          ) : (
            <View
              style={[styles.markerCore, active && styles.markerCoreActive]}
            />
          )}
        </View>
        {!isLast && <View style={styles.timelineLine} />}
      </View>

      <View
        style={[
          styles.doseCard,
          active && styles.doseCardActive,
          (complete || skipped) && styles.doseCardResolved,
        ]}
      >
        <View style={styles.doseTopRow}>
          <View style={styles.timeBlock}>
            <Text
              style={[styles.doseTime, complete && styles.resolvedText]}
            >
              {formatTime(dose.scheduledTime).replace(" ", "\n")}
            </Text>
          </View>
          <View
            style={[
              styles.medIcon,
              { backgroundColor: `${dose.medication.color}1F` },
            ]}
          >
            <Ionicons
              color={dose.medication.color}
              name={dose.medication.form === "liquid" ? "water" : "medical"}
              size={20}
            />
          </View>
          <View style={styles.flex}>
            <View style={styles.medNameRow}>
              <Text
                style={[styles.medName, complete && styles.resolvedText]}
              >
                {dose.medication.name}
              </Text>
              <View
                style={[
                  styles.petTag,
                  { backgroundColor: `${dose.pet.color}26` },
                ]}
              >
                <View
                  style={[
                    styles.petTagDot,
                    { backgroundColor: dose.pet.color },
                  ]}
                />
                <Text style={styles.petTagText}>{dose.pet.name}</Text>
              </View>
            </View>
            <Text style={styles.medDetails}>
              {dose.medication.dosage} · {dose.medication.instructions}
            </Text>
          </View>
        </View>

        {complete && dose.log ? (
          <View style={styles.loggedRow}>
            <Ionicons
              name="checkmark-circle"
              size={17}
              color={colors.sage}
            />
            <Text style={styles.loggedText}>
              Given by {dose.log.completedBy} ·{" "}
              {new Date(dose.log.completedAt).toLocaleTimeString([], {
                hour: "numeric",
                minute: "2-digit",
              })}
            </Text>
          </View>
        ) : skipped ? (
          <View style={styles.loggedRow}>
            <Ionicons
              name="remove-circle-outline"
              size={17}
              color={colors.muted}
            />
            <Text style={styles.loggedText}>Dose skipped</Text>
          </View>
        ) : (
          <View style={styles.doseActions}>
            <Pressable
              onPress={() => onLog(dose, "skipped")}
              style={({ pressed }) => [
                styles.skipButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.skipButtonText}>Skip</Text>
            </Pressable>
            <Pressable
              onPress={() => onLog(dose, "given")}
              style={({ pressed }) => [
                styles.giveButton,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons name="checkmark" size={18} color={colors.white} />
              <Text style={styles.giveButtonText}>Mark as given</Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  doseActions: { flexDirection: "row", gap: 9, marginTop: 14 },
  doseCard: {
    backgroundColor: colors.paper,
    borderColor: colors.line,
    borderRadius: 20,
    borderWidth: 1,
    elevation: 1,
    flex: 1,
    marginBottom: 14,
    padding: 15,
    shadowColor: colors.ink,
    shadowOffset: { height: 5, width: 0 },
    shadowOpacity: 0.035,
    shadowRadius: 10,
  },
  doseCardActive: {
    borderColor: "#F0A797",
    shadowColor: colors.coral,
    shadowOffset: { height: 5, width: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
  },
  doseCardResolved: { backgroundColor: "#FAF9F5" },
  doseTime: {
    color: colors.ink,
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 10,
    lineHeight: 13,
    textAlign: "center",
  },
  doseTopRow: { alignItems: "center", flexDirection: "row" },
  flex: { flex: 1 },
  giveButton: {
    alignItems: "center",
    backgroundColor: colors.coral,
    borderRadius: 12,
    flex: 1.75,
    flexDirection: "row",
    gap: 7,
    justifyContent: "center",
    minHeight: 41,
  },
  giveButtonText: {
    color: colors.white,
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 11,
  },
  loggedRow: {
    alignItems: "center",
    borderTopColor: colors.line,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 6,
    marginTop: 13,
    paddingTop: 11,
  },
  loggedText: {
    color: colors.muted,
    fontFamily: "Manrope_600SemiBold",
    fontSize: 10,
  },
  markerCore: {
    backgroundColor: colors.line,
    borderRadius: 4,
    height: 7,
    width: 7,
  },
  markerCoreActive: { backgroundColor: colors.coral },
  medDetails: {
    color: colors.muted,
    fontFamily: "Manrope_400Regular",
    fontSize: 10,
    marginTop: 5,
  },
  medIcon: {
    alignItems: "center",
    borderRadius: 13,
    height: 42,
    justifyContent: "center",
    marginRight: 10,
    width: 42,
  },
  medName: { color: colors.ink, fontFamily: "Manrope_800ExtraBold", fontSize: 14 },
  medNameRow: { alignItems: "center", flexDirection: "row", gap: 7 },
  petTag: {
    alignItems: "center",
    borderRadius: 9,
    flexDirection: "row",
    gap: 5,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  petTagDot: { borderRadius: 4, height: 5, width: 5 },
  petTagText: {
    color: colors.ink,
    fontFamily: "Manrope_700Bold",
    fontSize: 9,
  },
  pressed: { opacity: 0.85 },
  resolvedText: { color: colors.muted },
  skipButton: {
    alignItems: "center",
    backgroundColor: colors.background,
    borderColor: colors.line,
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 41,
  },
  skipButtonText: {
    color: colors.muted,
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 11,
  },
  timelineLine: {
    backgroundColor: colors.line,
    flex: 1,
    marginTop: 4,
    width: 2,
  },
  timelineMarker: {
    alignItems: "center",
    backgroundColor: colors.paper,
    borderColor: colors.line,
    borderRadius: 14,
    borderWidth: 1.5,
    height: 28,
    justifyContent: "center",
    marginTop: 18,
    width: 28,
  },
  timelineMarkerActive: {
    backgroundColor: colors.coral,
    borderColor: colors.coral,
  },
  timelineMarkerColumn: { alignItems: "center", marginRight: 12, width: 28 },
  timelineMarkerComplete: {
    backgroundColor: colors.sage,
    borderColor: colors.sage,
  },
  timelineRow: { flexDirection: "row" },
  timeBlock: { marginRight: 8, width: 44 },
});
