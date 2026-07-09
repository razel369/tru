import { Pressable, StyleSheet, Text, View } from "react-native";

import { dateKey } from "../schedule";
import { colors } from "../design";

interface DateStripProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  daysAhead?: number;
}

/**
 * Horizontal day selector. Extracted verbatim from App.tsx in stage 2.
 * No behavior change. All style values copied 1:1.
 */
export function DateStrip({
  selectedDate,
  onDateChange,
  daysAhead = 5,
}: DateStripProps) {
  const dates = Array.from({ length: daysAhead }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() + index);
    return date;
  });

  return (
    <View style={styles.dateRailWrap}>
      <View style={styles.dateRail}>
        {dates.map((date, index) => {
          const active = dateKey(date) === dateKey(selectedDate);
          return (
            <Pressable
              key={dateKey(date)}
              onPress={() => onDateChange(date)}
              style={[styles.dateItem, active && styles.dateItemActive]}
            >
              <Text
                style={[styles.dateDay, active && styles.dateDayActive]}
              >
                {index === 0
                  ? "TODAY"
                  : date
                      .toLocaleDateString("en-US", { weekday: "short" })
                      .toUpperCase()}
              </Text>
              <Text
                style={[
                  styles.dateNumber,
                  active && styles.dateNumberActive,
                ]}
              >
                {date.getDate()}
              </Text>
              {active && <View style={styles.dateDot} />}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dateRailWrap: {
    backgroundColor: colors.background,
    paddingHorizontal: 18,
    paddingTop: 12,
  },
  dateRail: {
    backgroundColor: colors.paper,
    borderColor: colors.line,
    borderRadius: 20,
    borderWidth: 1,
    elevation: 2,
    flexDirection: "row",
    padding: 5,
    shadowColor: colors.ink,
    shadowOffset: { height: 5, width: 0 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
  },
  dateItem: {
    alignItems: "center",
    borderRadius: 15,
    flex: 1,
    height: 60,
    justifyContent: "center",
    position: "relative",
  },
  dateItemActive: {
    backgroundColor: colors.coralSoft,
  },
  dateDay: {
    color: colors.muted,
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 8,
    letterSpacing: 0.6,
  },
  dateDayActive: {
    color: colors.coral,
  },
  dateNumber: {
    color: colors.ink,
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 17,
    marginTop: 4,
  },
  dateNumberActive: {
    color: colors.coral,
  },
  dateDot: {
    backgroundColor: colors.coral,
    borderRadius: 2,
    bottom: 5,
    height: 4,
    position: "absolute",
    width: 4,
  },
});
