import type { ImageSourcePropType } from "react-native";
import { StyleSheet, View } from "react-native";
import { useMemo, useState } from "react";

import { EmptyTodayState } from "../../components/feedback/EmptyTodayState";
import type { Pet, ScheduledDose } from "../../types";

import { TodayHero } from "./TodayHeroDesignV2";
import { PetSwitcher } from "./PetSwitcher";
import { resolvePetVisual } from "../pet-visuals";

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
  const [selectedPetId, setSelectedPetId] = useState<string | null>(null);
  const pets = useMemo(() => {
    const uniquePets = new Map<string, Pet>();
    schedule.forEach((dose) => uniquePets.set(dose.pet.id, dose.pet));
    return Array.from(uniquePets.values());
  }, [schedule]);
  const nextDue = schedule.find(
    (dose) =>
      dose.status === "due" ||
      dose.status === "missed" ||
      dose.status === "upcoming",
  );
  const activePetId =
    selectedPetId && pets.some((pet) => pet.id === selectedPetId)
      ? selectedPetId
      : nextDue?.pet.id ?? pets[0]?.id ?? "";
  const focusPet = pets.find((pet) => pet.id === activePetId) ?? nextDue?.pet;
  const focusedSchedule = activePetId
    ? schedule.filter((dose) => dose.pet.id === activePetId)
    : schedule;
  const petImage = focusPet
    ? petImages[focusPet.avatar] ?? heroPet
    : heroPet;
  const petName = focusPet?.name ?? "your pet";
  const petVisual = focusPet
    ? resolvePetVisual(focusPet, petImage, heroScene)
    : null;

  return (
    <View style={styles.root}>
      <TodayHero
        companionImage={companionImage}
        heroScene={petVisual?.sceneSource ?? heroScene}
        onLog={onLog}
        onMenu={onMenu}
        petBreed={focusPet?.breed ?? "Beloved pet"}
        petImage={petVisual?.petSource ?? petImage}
        petKey={petVisual?.assetKey ?? `pet:${focusPet?.id ?? "fallback"}`}
        petLayout={petVisual?.layout}
        petName={petName}
        petVisualProfile={petVisual?.profile}
        roomImage={roomImage}
        schedule={focusedSchedule}
        sceneContainsPet={petVisual?.sceneContainsPet ?? false}
        topInset={topInset}
      />
      {focusPet ? (
        <PetSwitcher
          activePetId={focusPet.id}
          onSelect={setSelectedPetId}
          petImages={petImages}
          pets={pets}
          topInset={topInset}
        />
      ) : null}
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
