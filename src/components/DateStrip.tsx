import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, shadow } from "../design";
import { dateKey } from "../schedule";

interface DateStripProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  daysAhead?: number;
}

/**
 * Soft clay day rail — pill days, sky active state.
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
              <Text style={[styles.dateDay, active && styles.dateDayActive]}>
                {index === 0
                  ? "TODAY"
                  : date
                      .toLocaleDateString("en-US", { weekday: "short" })
                      .toUpperCase()}
              </Text>
              <Text
                style={[styles.dateNumber, active && styles.dateNumberActive]}
              >
                {date.getDate()}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dateDay: {
    color: colors.muted,
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 8,
    letterSpacing: 0.5,
  },
  dateDayActive: {
    color: colors.white,
  },
  dateItem: {
    alignItems: "center",
    borderRadius: 18,
    flex: 1,
    height: 58,
    justifyContent: "center",
  },
  dateItemActive: {
    backgroundColor: colors.sky,
    ...shadow.subtle,
  },
  dateNumber: {
    color: colors.ink,
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 17,
    marginTop: 3,
  },
  dateNumberActive: {
    color: colors.white,
  },
  dateRail: {
    backgroundColor: colors.paper,
    borderRadius: 24,
    flexDirection: "row",
    padding: 6,
    ...shadow.card,
  },
  dateRailWrap: {
    backgroundColor: colors.background,
    paddingHorizontal: 18,
    paddingTop: 4,
  },
});
