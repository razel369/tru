import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import type { ImageSourcePropType } from "react-native";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useState } from "react";

import { AppHeader } from "../../components/AppHeader";
import { PressScale } from "../../components/PressScale";
import { colors, shadow } from "../../design";
import type { Pet } from "../../types";

import { MedicationCard } from "./MedicationCard";
import { MotionPressable } from "../../components/motion";

interface PetsScreenProps {
  pets: Pet[];
  topInset: number;
  petImages: Record<Pet["avatar"], ImageSourcePropType>;
  onAdd: () => void;
  onEditMedication?: (petId: string, medicationId: string) => void;
  onLongPressMedication?: (petId: string, medicationId: string) => void;
  onAddPet?: () => void;
  onEditPet?: (petId: string) => void;
  onLongPressPet?: (petId: string) => void;
  onOpenReport?: () => void;
}

/**
 * Pets — clay family roster with soft profile plate and plan list.
 */
export function PetsScreen({
  pets,
  topInset,
  petImages,
  onAdd,
  onEditMedication,
  onLongPressMedication,
  onAddPet,
  onEditPet,
  onLongPressPet,
  onOpenReport,
}: PetsScreenProps) {
  const [selectedPet, setSelectedPet] = useState(pets[0]?.id ?? "");
  const pet = pets.find((item) => item.id === selectedPet) ?? pets[0];

  return (
    <ScrollView
      contentContainerStyle={[
        styles.standardContent,
        { paddingTop: topInset + 14 },
      ]}
      showsVerticalScrollIndicator={false}
      style={styles.screen}
    >
      <AppHeader
        accent="plant"
        actionIcon="add"
        eyebrow="YOUR FAMILY"
        onAction={onAddPet ?? onAdd}
        title="Pets"
      />

      <ScrollView
        contentContainerStyle={styles.petSelector}
        horizontal
        showsHorizontalScrollIndicator={false}
      >
        {pets.map((item) => {
          const active = item.id === pet?.id;
          return (
            <PressScale
              key={item.id}
              onPress={() => setSelectedPet(item.id)}
              scaleTo={0.94}
              style={[
                styles.petSelectorItem,
                active && styles.petSelectorActive,
              ]}
            >
              <View
                style={[
                  styles.petSelectorAvatar,
                  { backgroundColor: `${item.color}38` },
                ]}
              >
                <Image
                  accessibilityLabel={`Portrait of ${item.name}`}
                  source={petImages[item.avatar]}
                  style={styles.petSelectorImage}
                />
              </View>
              <Text
                style={[
                  styles.petSelectorName,
                  active && styles.petSelectorNameActive,
                ]}
              >
                {item.name}
              </Text>
            </PressScale>
          );
        })}
        {onAddPet ? (
          <Pressable onPress={onAddPet} style={styles.addPetChip}>
            <Ionicons color={colors.coral} name="add" size={18} />
            <Text style={styles.addPetText}>Add pet</Text>
          </Pressable>
        ) : null}
      </ScrollView>

      {pet && (
        <>
          <LinearGradient
            colors={["#FFF8F1", "#F3E4D4"]}
            style={styles.petProfileCard}
          >
            <View style={styles.petProfileAvatar}>
              <Image
                accessibilityLabel={`Portrait of ${pet.name}`}
                source={petImages[pet.avatar]}
                style={styles.petProfileImage}
              />
            </View>
            <View style={styles.flex}>
              <Text style={styles.petProfileName}>{pet.name}</Text>
              <Text style={styles.petProfileMeta}>
                {pet.breed} · {pet.age} years
              </Text>
              <View style={styles.petProfileStatus}>
                <View style={styles.healthyDot} />
                <Text style={styles.petProfileStatusText}>
                  Care plan is up to date
                </Text>
              </View>
            </View>
            <Pressable
              onPress={() => onLongPressPet?.(pet.id)}
              onLongPress={() => onLongPressPet?.(pet.id)}
              style={styles.moreButton}
            >
              <Ionicons
                color={colors.ink}
                name="ellipsis-horizontal"
                size={20}
              />
            </Pressable>
          </LinearGradient>

          <View style={styles.sectionHeadingRow}>
            <View>
              <Text style={styles.sectionKicker}>ACTIVE PLAN</Text>
              <Text style={styles.sectionTitle}>
                {pet.medications.length} medications
              </Text>
            </View>
            <Pressable onPress={onAdd}>
              <Text style={styles.textAction}>Add new</Text>
            </Pressable>
          </View>
          {onEditPet && (
            <Pressable
              onPress={() => onEditPet(pet.id)}
              style={styles.editPetButton}
            >
              <Ionicons color={colors.ink} name="create-outline" size={14} />
              <Text style={styles.editPetButtonText}>
                Edit {pet.name}'s profile
              </Text>
            </Pressable>
          )}

          {pet.medications.map((medication) => (
            <MedicationCard
              key={medication.id}
              medication={medication}
              onPress={
                onEditMedication
                  ? () => onEditMedication(pet.id, medication.id)
                  : undefined
              }
              onLongPress={
                onLongPressMedication
                  ? () => onLongPressMedication(pet.id, medication.id)
                  : undefined
              }
            />
          ))}

          <MotionPressable onPress={onOpenReport} style={styles.vetCard}>
            <View style={styles.vetIcon}>
              <Ionicons
                color={colors.sage}
                name="document-text-outline"
                size={24}
              />
            </View>
            <View style={styles.flex}>
              <Text style={styles.vetTitle}>Vet-ready care summary</Text>
              <Text style={styles.vetCopy}>
                Every dose, note, and missed medication in one clear report.
              </Text>
            </View>
            <Ionicons color={colors.muted} name="chevron-forward" size={19} />
          </MotionPressable>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  addPetChip: {
    alignItems: "center",
    backgroundColor: colors.coralSoft,
    borderRadius: 22,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  addPetText: {
    color: colors.coral,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 12,
  },
  editPetButton: {
    alignItems: "center",
    backgroundColor: colors.paper,
    borderRadius: 20,
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
    marginBottom: 14,
    marginTop: -8,
    paddingVertical: 12,
    ...shadow.subtle,
  },
  editPetButtonText: {
    color: colors.ink,
    fontFamily: "Nunito_700Bold",
    fontSize: 12,
  },
  flex: { flex: 1 },
  healthyDot: {
    backgroundColor: colors.sage,
    borderRadius: 4,
    height: 7,
    width: 7,
  },
  moreButton: {
    alignItems: "center",
    backgroundColor: "rgba(255,252,247,0.92)",
    borderRadius: 14,
    height: 40,
    justifyContent: "center",
    width: 40,
    ...shadow.subtle,
  },
  petProfileAvatar: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.8)",
    borderRadius: 32,
    height: 68,
    justifyContent: "center",
    marginRight: 14,
    width: 68,
    ...shadow.subtle,
  },
  petProfileCard: {
    alignItems: "center",
    borderRadius: 30,
    flexDirection: "row",
    marginBottom: 24,
    padding: 18,
    ...shadow.card,
  },
  petProfileImage: { borderRadius: 31, height: 62, width: 62 },
  petProfileMeta: {
    color: colors.muted,
    fontFamily: "Nunito_600SemiBold",
    fontSize: 12,
    marginTop: 4,
  },
  petProfileName: {
    color: colors.ink,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 26,
    letterSpacing: -0.4,
  },
  petProfileStatus: {
    alignItems: "center",
    flexDirection: "row",
    gap: 5,
    marginTop: 8,
  },
  petProfileStatusText: {
    color: colors.sage,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 11,
  },
  petSelector: { gap: 12, paddingBottom: 18 },
  petSelectorActive: {
    backgroundColor: colors.paper,
    ...shadow.card,
  },
  petSelectorAvatar: {
    alignItems: "center",
    borderRadius: 22,
    height: 46,
    justifyContent: "center",
    width: 46,
  },
  petSelectorImage: { borderRadius: 22, height: 44, width: 44 },
  petSelectorItem: {
    alignItems: "center",
    borderRadius: 22,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  petSelectorName: {
    color: colors.muted,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 13,
  },
  petSelectorNameActive: { color: colors.sky },
  proPill: {
    backgroundColor: colors.butterSoft,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  proPillText: {
    color: "#9B7A0F",
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 10,
    letterSpacing: 0.6,
  },
  screen: { backgroundColor: colors.background, flex: 1 },
  sectionHeadingRow: {
    alignItems: "flex-end",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  sectionKicker: {
    color: colors.sky,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 10,
    letterSpacing: 1.4,
  },
  sectionTitle: {
    color: colors.ink,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 22,
    letterSpacing: -0.3,
    marginTop: 2,
  },
  standardContent: { paddingBottom: 110, paddingHorizontal: 18 },
  textAction: {
    color: colors.coral,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 13,
  },
  vetCard: {
    alignItems: "center",
    backgroundColor: colors.sageSoft,
    borderRadius: 24,
    flexDirection: "row",
    gap: 12,
    marginTop: 18,
    padding: 16,
  },
  vetCopy: {
    color: colors.muted,
    fontFamily: "Nunito_600SemiBold",
    fontSize: 12,
    marginTop: 4,
  },
  vetIcon: {
    alignItems: "center",
    backgroundColor: colors.paper,
    borderRadius: 16,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  vetTitle: {
    color: colors.ink,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 14,
  },
});
