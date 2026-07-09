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
import { colors } from "../../design";
import type { Pet } from "../../types";

import { MedicationCard } from "./MedicationCard";

interface PetsScreenProps {
  pets: Pet[];
  topInset: number;
  petImages: Record<Pet["avatar"], ImageSourcePropType>;
  onAdd: () => void;
}

/**
 * Pets screen — list of household pets with the active plan per pet.
 * Extracted verbatim from App.tsx in stage 2. Profile tab is
 * intentionally non-functional per docs/AAA-HANDOFF.md §2.
 */
export function PetsScreen({
  pets,
  topInset,
  petImages,
  onAdd,
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
    >
      <AppHeader
        actionIcon="add"
        eyebrow="YOUR FAMILY"
        onAction={onAdd}
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
            <Pressable
              key={item.id}
              onPress={() => setSelectedPet(item.id)}
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
            </Pressable>
          );
        })}
      </ScrollView>

      {pet && (
        <>
          <LinearGradient
            colors={[`${pet.color}32`, `${pet.color}10`]}
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
            <Pressable style={styles.moreButton}>
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

          {pet.medications.map((medication) => (
            <MedicationCard key={medication.id} medication={medication} />
          ))}

          <View style={styles.vetCard}>
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
            <View style={styles.proPill}>
              <Text style={styles.proPillText}>PRO</Text>
            </View>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  healthyDot: {
    backgroundColor: colors.sage,
    borderRadius: 4,
    height: 7,
    width: 7,
  },
  moreButton: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.56)",
    borderRadius: 12,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  petProfileAvatar: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.68)",
    borderRadius: 30,
    height: 66,
    justifyContent: "center",
    marginRight: 14,
    width: 66,
  },
  petProfileCard: {
    alignItems: "center",
    borderColor: "rgba(255,255,255,0.75)",
    borderRadius: 24,
    borderWidth: 1,
    elevation: 1,
    flexDirection: "row",
    marginBottom: 24,
    padding: 18,
    shadowColor: colors.ink,
    shadowOffset: { height: 6, width: 0 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
  },
  petProfileImage: { borderRadius: 31, height: 62, width: 62 },
  petProfileMeta: { color: colors.muted, fontSize: 11, marginTop: 4 },
  petProfileName: {
    color: colors.ink,
    fontFamily: "Fraunces_700Bold",
    fontSize: 24,
  },
  petProfileStatus: {
    alignItems: "center",
    flexDirection: "row",
    gap: 5,
    marginTop: 8,
  },
  petProfileStatusText: {
    color: colors.sage,
    fontSize: 9,
    fontWeight: "800",
  },
  petSelector: { gap: 14, paddingBottom: 18 },
  petSelectorActive: {
    backgroundColor: colors.paper,
    borderColor: colors.line,
    borderWidth: 1,
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
    borderColor: "transparent",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 9,
    paddingVertical: 7,
  },
  petSelectorName: {
    color: colors.muted,
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 12,
  },
  petSelectorNameActive: { color: colors.coral },
  proPill: {
    backgroundColor: colors.butterSoft,
    borderRadius: 9,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  proPillText: {
    color: "#9B7A0F",
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 9,
    letterSpacing: 0.6,
  },
  sectionHeadingRow: {
    alignItems: "flex-end",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  sectionKicker: {
    color: colors.muted,
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 9,
    letterSpacing: 1.4,
  },
  sectionTitle: {
    color: colors.ink,
    fontFamily: "Fraunces_700Bold",
    fontSize: 22,
    marginTop: 2,
  },
  standardContent: { paddingBottom: 110, paddingHorizontal: 18 },
  textAction: {
    color: colors.coral,
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 11,
  },
  vetCard: {
    alignItems: "center",
    backgroundColor: colors.sageSoft,
    borderRadius: 19,
    flexDirection: "row",
    gap: 12,
    marginTop: 18,
    padding: 15,
  },
  vetCopy: {
    color: colors.muted,
    fontFamily: "Manrope_400Regular",
    fontSize: 11,
    marginTop: 4,
  },
  vetIcon: {
    alignItems: "center",
    backgroundColor: colors.paper,
    borderRadius: 14,
    height: 46,
    justifyContent: "center",
    width: 46,
  },
  vetTitle: {
    color: colors.ink,
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 13,
  },
});
