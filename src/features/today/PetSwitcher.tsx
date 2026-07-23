import { Ionicons } from "@expo/vector-icons";
import type { ImageSourcePropType } from "react-native";
import { Image, StyleSheet, Text, View } from "react-native";
import { useState } from "react";

import type { Pet } from "../../types";
import { MotionPressable, MotionReveal } from "../../components/motion";

interface PetSwitcherProps {
  activePetId: string;
  pets: Pet[];
  petImages: Record<string, ImageSourcePropType>;
  topInset: number;
  onSelect: (petId: string) => void;
}

export function PetSwitcher({
  activePetId,
  pets,
  petImages,
  topInset,
  onSelect,
}: PetSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const activePet = pets.find((pet) => pet.id === activePetId) ?? pets[0];

  if (!activePet) return null;

  return (
    <View style={[styles.root, { top: topInset + 10 }]}>
      <MotionPressable
        accessibilityLabel={`Switch pet. Currently ${activePet.name}`}
        accessibilityRole="button"
        onPress={() => setIsOpen((open) => !open)}
        style={({ pressed }) => [styles.trigger, pressed && styles.pressed]}
      >
        <View style={[styles.statusDot, { backgroundColor: activePet.color }]} />
        <View style={styles.triggerCopy}>
          <Text numberOfLines={1} style={styles.activeName}>
            {activePet.name}
          </Text>
          <Text numberOfLines={1} style={styles.activeBreed}>
            {activePet.breed || "Beloved pet"}
          </Text>
        </View>
        <Ionicons
          color="#5F655F"
          name={isOpen ? "chevron-up" : "chevron-down"}
          size={16}
        />
      </MotionPressable>

      {isOpen ? (
        <MotionReveal style={styles.menu}>
          <Text style={styles.menuLabel}>YOUR PETS</Text>
          {pets.map((pet) => {
            const isActive = pet.id === activePet.id;
            const source = petImages[pet.avatar];
            return (
              <MotionPressable
                key={pet.id}
                onPress={() => {
                  onSelect(pet.id);
                  setIsOpen(false);
                }}
                style={({ pressed }) => [
                  styles.petRow,
                  isActive && styles.petRowActive,
                  pressed && styles.pressed,
                ]}
              >
                <View style={[styles.avatar, { backgroundColor: `${pet.color}2A` }]}>
                  {source ? <Image source={source} style={styles.avatarImage} /> : null}
                </View>
                <View style={styles.petCopy}>
                  <Text numberOfLines={1} style={styles.petName}>
                    {pet.name}
                  </Text>
                  <Text numberOfLines={1} style={styles.petBreed}>
                    {pet.breed || "Beloved pet"}
                  </Text>
                </View>
                {isActive ? (
                  <View style={styles.check}>
                    <Ionicons color="#FFFFFF" name="checkmark" size={14} />
                  </View>
                ) : null}
              </MotionPressable>
            );
          })}
          <Text style={styles.hint}>Add or edit pets from the Pets tab</Text>
        </MotionReveal>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    left: 72,
    position: "absolute",
    width: 142,
    zIndex: 80,
    elevation: 20,
  },
  trigger: {
    minHeight: 52,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.78)",
    backgroundColor: "rgba(255,252,247,0.94)",
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    shadowColor: "#3A3028",
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
  },
  statusDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  triggerCopy: {
    flex: 1,
    minWidth: 0,
  },
  activeName: {
    color: "#272A26",
    fontSize: 15,
    fontWeight: "800",
    lineHeight: 18,
  },
  activeBreed: {
    color: "#777C76",
    fontSize: 10,
    fontWeight: "600",
    lineHeight: 14,
  },
  menu: {
    width: 240,
    marginTop: 7,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#E7E0D6",
    backgroundColor: "#FFFDF9",
    padding: 8,
    shadowColor: "#332C25",
    shadowOpacity: 0.2,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
  },
  menuLabel: {
    marginHorizontal: 9,
    marginTop: 5,
    marginBottom: 5,
    color: "#9A8E80",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.3,
  },
  petRow: {
    minHeight: 58,
    borderRadius: 16,
    paddingHorizontal: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  petRowActive: {
    backgroundColor: "#F9EEE5",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImage: {
    width: 38,
    height: 38,
    resizeMode: "contain",
  },
  petCopy: {
    flex: 1,
    minWidth: 0,
  },
  petName: {
    color: "#2D302C",
    fontSize: 14,
    fontWeight: "800",
  },
  petBreed: {
    marginTop: 2,
    color: "#7D837D",
    fontSize: 11,
    fontWeight: "500",
  },
  check: {
    width: 23,
    height: 23,
    borderRadius: 12,
    backgroundColor: "#E66F51",
    alignItems: "center",
    justifyContent: "center",
  },
  hint: {
    marginHorizontal: 9,
    marginTop: 6,
    marginBottom: 5,
    color: "#969B95",
    fontSize: 10,
    lineHeight: 14,
    textAlign: "center",
  },
  pressed: {
    opacity: 0.78,
  },
});
