import type { ImageSourcePropType } from "react-native";
import { StyleSheet, View } from "react-native";

import { EmptyTodayState } from "../../components/feedback/EmptyTodayState";
import type { Pet, ScheduledDose } from "../../types";

import { TodayHero } from "./TodayHero";

interface TodayScreenProps {
  schedule: ScheduledDose[];
  selectedDate: Date;
  topInset: number;
  appIcon: ImageSourcePropType;
  heroPet: ImageSourcePropType;
  petImages: Record<Pet["avatar"], ImageSourcePropType>;
  companionImage?: ImageSourcePropType;
  roomImage?: ImageSourcePropType;
  heroScene?: ImageSourcePropType;
  onDateChange: (date: Date) => void;
  onLog: (dose: ScheduledDose, status: "given" | "skipped") => void;
  onAdd: () => void;
  onMenu?: () => void;
}

/**
 * Today — confirm the next real dose for a real pet.
 */
export function TodayScreen({
  schedule,
  topInset,
  heroPet,
  petImages,
  companionImage,
  roomImage,
  heroScene,
  onLog,
  onAdd,
  onMenu,
}: TodayScreenProps) {
  const nextDue = schedule.find(
    (dose) =>
      dose.status === "due" ||
      dose.status === "missed" ||
      dose.status === "upcoming",
  );
  const focusPet = nextDue?.pet ?? schedule[0]?.pet;
  const petImage = focusPet
    ? petImages[focusPet.avatar] ?? heroPet
    : heroPet;
  const petName = focusPet?.name ?? "your pet";

  return (
    <View style={styles.root}>
      <TodayHero
        canConfirm={nextDue !== undefined}
        companionImage={companionImage}
        heroScene={heroScene}
        nextDose={nextDue}
        onConfirmNext={
          nextDue ? () => onLog(nextDue, "given") : undefined
        }
        onLog={onLog}
        onMenu={onMenu}
        petImage={petImage}
        petName={petName}
        roomImage={roomImage}
        schedule={schedule}
        topInset={topInset}
      />
      {schedule.length === 0 ? (
        <View style={styles.emptyOverlay}>
          <EmptyTodayState onAddMedication={onAdd} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  emptyOverlay: {
    bottom: 118,
    left: 20,
    position: "absolute",
    right: 20,
  },
  root: {
    backgroundColor: "#C9B59A",
    flex: 1,
  },
});
