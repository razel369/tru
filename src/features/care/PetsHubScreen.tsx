import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Image,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { assets, colors, shadow } from "../../design";
import type { Pet } from "../../types";
import { resolvePetMotionPackForProfile } from "../pet-motion";
import {
  createBreedAssetKey,
  resolvePetStagePlacement,
  resolvePetVisual,
} from "../pet-visuals";
import type { PremiumEntryPoint } from "../subscriptions/types";

import { CareHandoffSheet } from "./CareHandoffSheet";
import {
  appointmentDateLabel,
  buildUpcomingAppointments,
} from "./appointments";
import { buildMedicationSupplyStatuses } from "./medication-supply";
import { petIdentitySummary } from "./pet-identity";
import type { CareTask, HealthRecord } from "./types";

function presentationForPet(pet: Pet) {
  const fallback = pet.avatar === "luna" ? assets.luna : assets.milo;
  const visual = resolvePetVisual(pet, fallback, assets.heroScene);
  const motionKey =
    visual.assetKey ?? createBreedAssetKey(pet.species, pet.breed);
  const motionPack = resolvePetMotionPackForProfile(motionKey, visual.profile);
  return {
    image: motionPack?.states.idle ?? visual.petSource,
    key: motionPack?.petKey ?? motionKey,
  };
}

export function PetsHubScreen({
  pets,
  tasks,
  records,
  activePetId,
  topInset,
  bottomInset,
  onActivate,
  onAdd,
  onEdit,
  onOpenMotionLab,
  onOpenSettings,
  onOpenHealth,
  onOpenPlan,
  onOpenPremium,
  onRemove,
  isPremium,
}: {
  pets: Pet[];
  tasks: CareTask[];
  records: HealthRecord[];
  activePetId: string | null;
  topInset: number;
  bottomInset: number;
  onActivate: (petId: string) => void;
  onAdd: () => void;
  onEdit: (pet: Pet) => void;
  onOpenMotionLab: () => void;
  onOpenSettings: () => void;
  onOpenHealth: () => void;
  onOpenPlan: () => void;
  onOpenPremium: (entryPoint: PremiumEntryPoint) => void;
  onRemove: (petId: string) => void;
  isPremium: boolean;
}) {
  const activePet = pets.find((pet) => pet.id === activePetId) ?? pets[0];
  const switchMotion = useRef(new Animated.Value(1)).current;
  const [handoffOpen, setHandoffOpen] = useState(false);

  useEffect(() => {
    switchMotion.setValue(0);
    Animated.spring(switchMotion, {
      damping: 18,
      mass: 0.7,
      stiffness: 145,
      toValue: 1,
      useNativeDriver: Platform.OS !== "web",
    }).start();
  }, [activePet?.id, switchMotion]);

  if (!activePet) {
    return (
      <View style={[styles.screen, { paddingTop: topInset }]}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>YOUR FAMILY</Text>
            <Text style={styles.title}>Pets</Text>
          </View>
          <Pressable
            accessibilityLabel="Add pet"
            accessibilityRole="button"
            onPress={onAdd}
            style={styles.add}
          >
            <Ionicons color={colors.white} name="add" size={24} />
          </Pressable>
        </View>
        <View style={styles.emptyCard}>
          <View style={styles.emptyIcon}>
            <Ionicons color={colors.sage} name="paw-outline" size={34} />
          </View>
          <Text style={styles.emptyTitle}>Your family starts here</Text>
          <Text style={styles.emptyCopy}>
            Add a companion to build a care world around them.
          </Text>
          <Pressable
            accessibilityLabel="Add a pet"
            accessibilityRole="button"
            onPress={onAdd}
            style={styles.emptyButton}
          >
            <Text style={styles.emptyButtonText}>Add a pet</Text>
            <Ionicons color={colors.white} name="arrow-forward" size={18} />
          </Pressable>
        </View>
      </View>
    );
  }

  const activePresentation = presentationForPet(activePet);
  const activeTasks = tasks.filter(
    (task) => task.petId === activePet.id && task.enabled,
  ).length;
  const activeRecords = records.filter(
    (record) => record.petId === activePet.id,
  );
  const latestWeight = activeRecords
    .filter((record) => record.type === "weight" && record.value)
    .sort((first, second) => second.date.localeCompare(first.date))[0];
  const nextAppointment = buildUpcomingAppointments(tasks, pets).find(
    (item) => item.task.petId === activePet.id,
  );
  const supplyStatuses = buildMedicationSupplyStatuses(tasks, pets).filter(
    (item) => item.task.petId === activePet.id,
  );
  const supplyAlerts = supplyStatuses.filter(
    (item) => item.severity !== "healthy",
  );
  const vetPhone = activePet.careProfile?.veterinarianPhone?.trim();
  const emergencyPhone =
    activePet.careProfile?.emergencyContactPhone?.trim();
  const callPhone = (phone: string) => {
    const safeNumber = phone.replace(/[^\d+*#]/g, "");
    if (!safeNumber) return;
    void Linking.openURL(`tel:${safeNumber}`).catch(() =>
      Alert.alert(
        "Call could not be started",
        "Check the saved phone number or call from a device with phone service.",
      ),
    );
  };
  const activePlacement = resolvePetStagePlacement(activePresentation.key, {
    maxScale: 2.35,
    minScale: 0.74,
    targetFeetY: 0.96,
    targetSubjectHeight: 0.82,
  });
  const petScale = activePlacement.scale;
  const petOffsetX = activePlacement.translateXRatio * 224;
  const petOffsetY = activePlacement.translateYRatio * 218;

  return (
    <View style={[styles.screen, { paddingTop: topInset }]}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: bottomInset + 126 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>YOUR FAMILY</Text>
            <Text style={styles.title}>Pets</Text>
          </View>
          <View style={styles.headerActions}>
            {__DEV__ && (
            <Pressable
              accessibilityLabel="Open motion lab"
                accessibilityRole="button"
                onPress={onOpenMotionLab}
                style={styles.lab}
              >
                <Ionicons color={colors.navy} name="flask-outline" size={20} />
              </Pressable>
            )}
            <Pressable
              accessibilityLabel={
                isPremium ? "Manage PawPair Premium" : "Explore PawPair Premium"
              }
              accessibilityRole="button"
              onPress={() => onOpenPremium("pets")}
              style={[styles.premium, isPremium && styles.premiumActive]}
            >
              <Ionicons
                color={isPremium ? colors.white : colors.sage}
                name={isPremium ? "checkmark" : "sparkles"}
                size={19}
              />
            </Pressable>
            <Pressable
              accessibilityLabel="Open settings"
              accessibilityRole="button"
              onPress={onOpenSettings}
              style={styles.lab}
            >
              <Ionicons color={colors.navy} name="settings-outline" size={20} />
            </Pressable>
            <Pressable
              accessibilityHint={
                pets.length >= 2 && !isPremium
                  ? "Additional companions are included with PawPair Premium"
                  : "Adds another companion to your family"
              }
              accessibilityLabel={
                pets.length >= 2 && !isPremium
                  ? "Add pet with PawPair Premium"
                  : "Add pet"
              }
              accessibilityRole="button"
              onPress={onAdd}
              style={styles.add}
            >
              <Ionicons color={colors.white} name="add" size={24} />
              {pets.length >= 2 && !isPremium && (
                <View style={styles.addPremiumBadge}>
                  <Ionicons color={colors.coral} name="sparkles" size={9} />
                </View>
              )}
            </Pressable>
          </View>
        </View>

        <View style={styles.activeCard}>
          <LinearGradient
            colors={["#E6D2B9", "#F3E7D6", "#EAD8C0"]}
            end={{ x: 0.9, y: 1 }}
            start={{ x: 0.1, y: 0 }}
            style={styles.stage}
          >
            <View pointerEvents="none" style={styles.stageGlow} />
            <View pointerEvents="none" style={styles.stageOrb} />
            <View pointerEvents="none" style={styles.stageFloor} />
            <LinearGradient
              colors={[
                "rgba(71,49,34,0)",
                "rgba(71,49,34,0.18)",
                "rgba(71,49,34,0)",
              ]}
              end={{ x: 1, y: 0.5 }}
              start={{ x: 0, y: 0.5 }}
              style={styles.petShadow}
            />
            <Animated.Image
              accessibilityIgnoresInvertColors
              key={activePresentation.key}
              resizeMode="contain"
              source={activePresentation.image}
              style={[
                styles.activeImage,
                {
                  opacity: switchMotion,
                  transform: [
                    { translateX: petOffsetX },
                    {
                      translateY: switchMotion.interpolate({
                        inputRange: [0, 1],
                        outputRange: [petOffsetY + 7, petOffsetY],
                      }),
                    },
                    {
                      scale: switchMotion.interpolate({
                        inputRange: [0, 1],
                        outputRange: [petScale * 0.97, petScale],
                      }),
                    },
                  ],
                },
              ]}
            />
            <View style={styles.activeBadge}>
              <View style={styles.activeDot} />
              <Text style={styles.activeText}>CURRENT COMPANION</Text>
            </View>
          </LinearGradient>

          <View style={styles.activeBody}>
            <View style={styles.identityRow}>
              <View style={styles.flex}>
                <Text numberOfLines={1} style={styles.petName}>
                  {activePet.name}
                </Text>
                <Text numberOfLines={1} style={styles.petMeta}>
                  {activePet.breed || activePet.species} / {petIdentitySummary(activePet)}
                </Text>
              </View>
              <View style={styles.speciesMark}>
                <Ionicons
                  color={colors.navy}
                  name={activePet.species === "cat" ? "sparkles-outline" : "paw-outline"}
                  size={18}
                />
              </View>
            </View>

            <View style={styles.careStrip}>
              <View style={styles.careIcon}>
                <Ionicons color={colors.sage} name="heart" size={16} />
              </View>
              <View style={styles.flex}>
                <Text style={styles.careLabel}>TODAY'S RHYTHM</Text>
                <Text style={styles.careCount}>
                  {activeTasks} active {activeTasks === 1 ? "moment" : "moments"}
                </Text>
              </View>
              <View style={styles.readyDot} />
            </View>

            <View style={styles.actions}>
              <Pressable
                accessibilityRole="button"
                onPress={() => onEdit(activePet)}
                style={({ pressed }) => [
                  styles.action,
                  pressed && styles.actionPressed,
                ]}
              >
                <Ionicons color={colors.navy} name="create-outline" size={17} />
                <Text style={styles.actionText}>Edit profile</Text>
              </Pressable>
              <Pressable accessibilityLabel={`Create care handoff for ${activePet.name}`} accessibilityRole="button" onPress={() => isPremium ? setHandoffOpen(true) : onOpenPremium("care-handoff")} style={({ pressed }) => [styles.handoffAction, pressed && styles.actionPressed]}>
                <Ionicons color={colors.sage} name="share-social-outline" size={17} />
                <Text style={styles.handoffText}>Care handoff</Text>
                {!isPremium ? <Ionicons color={colors.sage} name="sparkles" size={13} /> : null}
              </Pressable>
              <Pressable
                accessibilityLabel={`Remove ${activePet.name}`}
                accessibilityRole="button"
                onPress={() => onRemove(activePet.id)}
                style={({ pressed }) => [
                  styles.removeAction,
                  pressed && styles.actionPressed,
                ]}
              >
                <Ionicons color={colors.danger} name="trash-outline" size={17} />
              </Pressable>
            </View>
          </View>
        </View>

        <View style={styles.glanceHeader}>
          <View>
            <Text style={styles.familyEyebrow}>AT A GLANCE</Text>
            <Text style={styles.familyTitle}>{activePet.name}'s care</Text>
          </View>
          <View style={styles.glanceLive}>
            <View style={styles.readyDot} />
            <Text style={styles.glanceLiveText}>ON DEVICE</Text>
          </View>
        </View>

        <View style={styles.glanceGrid}>
          <Pressable
            accessibilityLabel={`Open ${activePet.name} health records`}
            accessibilityRole="button"
            onPress={onOpenHealth}
            style={styles.glanceCard}
          >
            <View style={[styles.glanceIcon, { backgroundColor: colors.skySoft }]}>
              <Ionicons color={colors.sky} name="pulse-outline" size={17} />
            </View>
            <Text style={styles.glanceLabel}>HEALTH</Text>
            <Text numberOfLines={1} style={styles.glanceValue}>
              {latestWeight
                ? `${latestWeight.value} ${latestWeight.unit || ""}`.trim()
                : `${activeRecords.length} records`}
            </Text>
            <Text numberOfLines={1} style={styles.glanceHint}>
              {latestWeight ? "Latest weight" : "Open passport"}
            </Text>
          </Pressable>

          <Pressable
            accessibilityLabel={`Open ${activePet.name} medication supply`}
            accessibilityRole="button"
            onPress={onOpenPlan}
            style={styles.glanceCard}
          >
            <View style={[styles.glanceIcon, { backgroundColor: colors.coralSoft }]}>
              <Ionicons color={colors.coral} name="medical-outline" size={17} />
            </View>
            <Text style={styles.glanceLabel}>SUPPLY</Text>
            <Text
              numberOfLines={1}
              style={[
                styles.glanceValue,
                supplyAlerts.length > 0 && styles.glanceValueAlert,
              ]}
            >
              {supplyAlerts.length > 0
                ? `${supplyAlerts.length} low`
                : supplyStatuses.length > 0
                  ? "On track"
                  : "Not tracked"}
            </Text>
            <Text numberOfLines={1} style={styles.glanceHint}>
              {supplyStatuses[0]?.daysRemaining !== null &&
              supplyStatuses[0]?.daysRemaining !== undefined
                ? `${supplyStatuses[0].daysRemaining} days nearest`
                : "Medication plan"}
            </Text>
          </Pressable>

          <Pressable
            accessibilityLabel={`Open ${activePet.name} appointments`}
            accessibilityRole="button"
            onPress={onOpenPlan}
            style={styles.glanceCard}
          >
            <View style={[styles.glanceIcon, styles.appointmentIcon]}>
              <Ionicons color="#A56B58" name="calendar-outline" size={17} />
            </View>
            <Text style={styles.glanceLabel}>NEXT VISIT</Text>
            <Text numberOfLines={1} style={styles.glanceValue}>
              {nextAppointment
                ? nextAppointment.daysUntil === 0
                  ? "Today"
                  : `${nextAppointment.daysUntil} days`
                : "None"}
            </Text>
            <Text numberOfLines={1} style={styles.glanceHint}>
              {nextAppointment
                ? appointmentDateLabel(nextAppointment)
                : "No visit planned"}
            </Text>
          </Pressable>
        </View>

        {(vetPhone || emergencyPhone) && (
          <View style={styles.contactsCard}>
            <View style={styles.contactsHeading}>
              <Ionicons color={colors.navy} name="call-outline" size={16} />
              <Text style={styles.contactsTitle}>Care contacts</Text>
            </View>
            <View style={styles.contactActions}>
              {vetPhone ? (
                <Pressable
                  accessibilityLabel={`Call ${activePet.careProfile?.veterinarianName || "veterinarian"}`}
                  accessibilityRole="button"
                  onPress={() => callPhone(vetPhone)}
                  style={styles.contactButton}
                >
                  <View style={styles.contactIcon}>
                    <Ionicons color={colors.sky} name="medkit-outline" size={16} />
                  </View>
                  <View style={styles.flex}>
                    <Text style={styles.contactLabel}>VETERINARIAN</Text>
                    <Text numberOfLines={1} style={styles.contactName}>
                      {activePet.careProfile?.veterinarianName || vetPhone}
                    </Text>
                  </View>
                  <Ionicons color={colors.sage} name="call" size={16} />
                </Pressable>
              ) : null}
              {emergencyPhone ? (
                <Pressable
                  accessibilityLabel={`Call ${activePet.careProfile?.emergencyContactName || "emergency contact"}`}
                  accessibilityRole="button"
                  onPress={() => callPhone(emergencyPhone)}
                  style={styles.contactButton}
                >
                  <View style={[styles.contactIcon, styles.emergencyIcon]}>
                    <Ionicons color={colors.coral} name="alert-circle-outline" size={16} />
                  </View>
                  <View style={styles.flex}>
                    <Text style={styles.contactLabel}>EMERGENCY</Text>
                    <Text numberOfLines={1} style={styles.contactName}>
                      {activePet.careProfile?.emergencyContactName || emergencyPhone}
                    </Text>
                  </View>
                  <Ionicons color={colors.coral} name="call" size={16} />
                </Pressable>
              ) : null}
            </View>
          </View>
        )}

        <View style={styles.familyHeader}>
          <View>
            <Text style={styles.familyEyebrow}>SWITCH COMPANION</Text>
            <Text style={styles.familyTitle}>Your family</Text>
          </View>
          <View style={styles.familyCount}>
            <Text style={styles.familyCountText}>{pets.length}</Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.familyRail}
          horizontal
          showsHorizontalScrollIndicator={false}
        >
          {pets.map((pet) => {
            const selected = pet.id === activePet.id;
            const presentation = presentationForPet(pet);
            const thumbPlacement = resolvePetStagePlacement(presentation.key, {
              maxScale: 2.4,
              minScale: 0.72,
              targetFeetY: 0.94,
              targetSubjectHeight: 0.78,
            });
            const thumbScale = thumbPlacement.scale;
            const thumbOffsetX = thumbPlacement.translateXRatio * 70;
            const thumbOffsetY = thumbPlacement.translateYRatio * 68;
            return (
              <Pressable
                accessibilityLabel={`Switch to ${pet.name}`}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                key={pet.id}
                onPress={() => onActivate(pet.id)}
                style={[styles.familyPet, selected && styles.familyPetActive]}
              >
                <View style={styles.thumbStage}>
                  <View style={styles.thumbGlow} />
                  <View style={styles.thumbShadow} />
                  <Image
                    accessibilityIgnoresInvertColors
                    resizeMode="contain"
                    source={presentation.image}
                    style={[
                      styles.thumbImage,
                      {
                        transform: [
                          { translateX: thumbOffsetX },
                          { translateY: thumbOffsetY },
                          { scale: thumbScale },
                        ],
                      },
                    ]}
                  />
                  {selected && (
                    <View style={styles.selectedCheck}>
                      <Ionicons color={colors.white} name="checkmark" size={11} />
                    </View>
                  )}
                </View>
                <Text numberOfLines={1} style={styles.familyPetName}>
                  {pet.name}
                </Text>
                <Text numberOfLines={1} style={styles.familyPetBreed}>
                  {pet.breed || pet.species}
                </Text>
              </Pressable>
            );
          })}
          <Pressable
            accessibilityHint={
              pets.length >= 2 && !isPremium
                ? "Additional companions are included with PawPair Premium"
                : "Adds another companion to your family"
            }
            accessibilityLabel={
              pets.length >= 2 && !isPremium
                ? "Add another pet with PawPair Premium"
                : "Add another pet"
            }
            accessibilityRole="button"
            onPress={onAdd}
            style={styles.addFamilyPet}
          >
            <View style={styles.addFamilyIcon}>
              <Ionicons color={colors.coral} name="add" size={23} />
            </View>
            <Text style={styles.addFamilyText}>
              {pets.length >= 2 && !isPremium ? "Premium pet" : "Add pet"}
            </Text>
          </Pressable>
        </ScrollView>
      </ScrollView>
      <CareHandoffSheet bottomInset={bottomInset} onClose={() => setHandoffOpen(false)} pet={activePet} records={records} tasks={tasks} visible={handoffOpen} />
    </View>
  );
}

const styles = StyleSheet.create({
  addPremiumBadge: {
    alignItems: "center",
    backgroundColor: colors.paper,
    borderRadius: 9,
    height: 18,
    justifyContent: "center",
    position: "absolute",
    right: -2,
    top: -2,
    width: 18,
  },
  action: {
    alignItems: "center",
    backgroundColor: colors.background,
    borderColor: colors.line,
    borderRadius: 15,
    borderWidth: 1,
    flex: 1,
    flexDirection: "row",
    gap: 7,
    justifyContent: "center",
    minHeight: 44,
  },
  actionPressed: { opacity: 0.75, transform: [{ scale: 0.985 }] },
  actionText: {
    color: colors.navy,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 12,
  },
  actions: { flexDirection: "row", gap: 8 },
  activeBadge: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.86)",
    borderRadius: 16,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    position: "absolute",
    right: 12,
    top: 12,
  },
  activeBody: { gap: 11, padding: 15 },
  activeCard: {
    backgroundColor: colors.paper,
    borderColor: "rgba(72, 145, 132, 0.32)",
    borderRadius: 28,
    borderWidth: 1,
    marginHorizontal: 18,
    marginTop: 14,
    overflow: "hidden",
    ...shadow.card,
  },
  activeDot: {
    backgroundColor: colors.sage,
    borderRadius: 4,
    height: 7,
    width: 7,
  },
  activeImage: {
    bottom: 14,
    height: 218,
    left: "50%",
    marginLeft: -112,
    position: "absolute",
    width: 224,
    zIndex: 2,
  },
  activeText: {
    color: colors.sage,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 8,
    letterSpacing: 0.8,
  },
  add: {
    alignItems: "center",
    backgroundColor: colors.coral,
    borderRadius: 22,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  addFamilyIcon: {
    alignItems: "center",
    borderColor: colors.coral,
    borderRadius: 34,
    borderStyle: "dashed",
    borderWidth: 1,
    height: 68,
    justifyContent: "center",
    width: 68,
  },
  addFamilyPet: {
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: 8,
    width: 82,
  },
  addFamilyText: {
    color: colors.coral,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 10,
    marginTop: 7,
  },
  careCount: {
    color: colors.ink,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 12,
  },
  careIcon: {
    alignItems: "center",
    backgroundColor: colors.paper,
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  careLabel: {
    color: colors.sage,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 8,
    letterSpacing: 0.8,
  },
  careStrip: {
    alignItems: "center",
    backgroundColor: colors.sageSoft,
    borderRadius: 18,
    flexDirection: "row",
    gap: 9,
    minHeight: 54,
    paddingHorizontal: 10,
  },
  contactActions: { gap: 7, marginTop: 9 },
  contactButton: { alignItems: "center", backgroundColor: colors.background, borderRadius: 16, flexDirection: "row", gap: 9, minHeight: 50, paddingHorizontal: 10 },
  contactIcon: { alignItems: "center", backgroundColor: colors.skySoft, borderRadius: 15, height: 34, justifyContent: "center", width: 34 },
  contactLabel: { color: colors.muted, fontFamily: "Nunito_800ExtraBold", fontSize: 7, letterSpacing: 0.7 },
  contactName: { color: colors.ink, fontFamily: "Nunito_800ExtraBold", fontSize: 11, marginTop: 1 },
  contactsCard: { backgroundColor: colors.paper, borderColor: "rgba(34,48,67,0.07)", borderRadius: 22, borderWidth: 1, marginHorizontal: 18, marginTop: 10, padding: 12, ...shadow.subtle },
  contactsHeading: { alignItems: "center", flexDirection: "row", gap: 7 },
  contactsTitle: { color: colors.ink, fontFamily: "Nunito_800ExtraBold", fontSize: 12 },
  emptyButton: {
    alignItems: "center",
    backgroundColor: colors.coral,
    borderRadius: 18,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    marginTop: 8,
    minHeight: 48,
    paddingHorizontal: 22,
  },
  emptyButtonText: {
    color: colors.white,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 14,
  },
  emptyCard: {
    alignItems: "center",
    backgroundColor: colors.paper,
    borderRadius: 28,
    margin: 18,
    padding: 28,
  },
  emptyCopy: {
    color: colors.muted,
    fontFamily: "Nunito_700Bold",
    fontSize: 12,
    lineHeight: 17,
    marginVertical: 8,
    textAlign: "center",
  },
  emptyIcon: {
    alignItems: "center",
    backgroundColor: colors.sageSoft,
    borderRadius: 34,
    height: 68,
    justifyContent: "center",
    marginBottom: 14,
    width: 68,
  },
  emptyTitle: {
    color: colors.ink,
    fontFamily: "Fredoka_600SemiBold",
    fontSize: 22,
  },
  emergencyIcon: { backgroundColor: colors.coralSoft },
  eyebrow: {
    color: colors.navy,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 10,
    letterSpacing: 1.2,
  },
  familyCount: {
    alignItems: "center",
    backgroundColor: colors.sageSoft,
    borderRadius: 14,
    height: 28,
    justifyContent: "center",
    width: 28,
  },
  familyCountText: {
    color: colors.sage,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 11,
  },
  familyEyebrow: {
    color: colors.navy,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 8,
    letterSpacing: 0.9,
  },
  familyHeader: {
    alignItems: "flex-end",
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: 19,
    marginTop: 18,
  },
  familyPet: {
    alignItems: "center",
    borderColor: "transparent",
    borderRadius: 20,
    borderWidth: 1,
    padding: 7,
    width: 92,
  },
  familyPetActive: {
    backgroundColor: colors.paper,
    borderColor: colors.sage,
  },
  familyPetBreed: {
    color: colors.muted,
    fontFamily: "Nunito_700Bold",
    fontSize: 8,
    marginTop: 1,
    maxWidth: 76,
  },
  familyPetName: {
    color: colors.ink,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 11,
    marginTop: 6,
    maxWidth: 76,
  },
  familyRail: {
    gap: 8,
    paddingHorizontal: 18,
    paddingTop: 9,
  },
  familyTitle: {
    color: colors.ink,
    fontFamily: "Fredoka_600SemiBold",
    fontSize: 20,
    lineHeight: 23,
  },
  flex: { flex: 1 },
  glanceCard: { backgroundColor: colors.paper, borderColor: "rgba(34,48,67,0.07)", borderRadius: 19, borderWidth: 1, flex: 1, minHeight: 116, padding: 10, ...shadow.subtle },
  glanceGrid: { flexDirection: "row", gap: 8, marginHorizontal: 18, marginTop: 9 },
  glanceHeader: { alignItems: "flex-end", flexDirection: "row", justifyContent: "space-between", marginHorizontal: 19, marginTop: 18 },
  glanceHint: { color: colors.muted, fontFamily: "Nunito_600SemiBold", fontSize: 8, marginTop: 2 },
  glanceIcon: { alignItems: "center", borderRadius: 14, height: 30, justifyContent: "center", width: 30 },
  glanceLabel: { color: colors.muted, fontFamily: "Nunito_800ExtraBold", fontSize: 7, letterSpacing: 0.7, marginTop: 8 },
  glanceLive: { alignItems: "center", backgroundColor: colors.sageSoft, borderRadius: 13, flexDirection: "row", gap: 5, paddingHorizontal: 8, paddingVertical: 6 },
  glanceLiveText: { color: colors.sage, fontFamily: "Nunito_800ExtraBold", fontSize: 7, letterSpacing: 0.5 },
  glanceValue: { color: colors.ink, fontFamily: "Nunito_800ExtraBold", fontSize: 12, marginTop: 3 },
  glanceValueAlert: { color: colors.danger },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: 10,
  },
  headerActions: { flexDirection: "row", gap: 9 },
  handoffAction: { alignItems: "center", backgroundColor: colors.sageSoft, borderColor: "rgba(72,145,132,0.28)", borderRadius: 15, borderWidth: 1, flex: 1, flexDirection: "row", gap: 6, justifyContent: "center", minHeight: 44 },
  handoffText: { color: colors.sage, fontFamily: "Nunito_800ExtraBold", fontSize: 11 },
  identityRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
  lab: {
    alignItems: "center",
    backgroundColor: colors.paper,
    borderColor: colors.line,
    borderRadius: 22,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  petMeta: {
    color: colors.muted,
    fontFamily: "Nunito_700Bold",
    fontSize: 11,
    marginTop: 1,
  },
  premium: { alignItems: "center", backgroundColor: colors.sageSoft, borderColor: "rgba(72,145,132,0.32)", borderRadius: 22, borderWidth: 1, height: 44, justifyContent: "center", width: 44 },
  premiumActive: { backgroundColor: colors.sage, borderColor: colors.sage },
  appointmentIcon: { backgroundColor: "#F2E4DF" },
  petName: {
    color: colors.ink,
    fontFamily: "Fredoka_600SemiBold",
    fontSize: 26,
    lineHeight: 29,
  },
  petShadow: {
    borderRadius: 999,
    bottom: 17,
    height: 17,
    left: "50%",
    marginLeft: -70,
    position: "absolute",
    width: 140,
  },
  readyDot: {
    backgroundColor: colors.sage,
    borderColor: colors.paper,
    borderRadius: 6,
    borderWidth: 3,
    height: 12,
    width: 12,
  },
  removeAction: {
    alignItems: "center",
    backgroundColor: "rgba(255, 117, 102, 0.08)",
    borderColor: "rgba(255, 117, 102, 0.22)",
    borderRadius: 15,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 44,
    width: 48,
  },
  screen: { backgroundColor: colors.background, flex: 1 },
  selectedCheck: {
    alignItems: "center",
    backgroundColor: colors.sage,
    borderColor: colors.paper,
    borderRadius: 10,
    borderWidth: 2,
    height: 19,
    justifyContent: "center",
    position: "absolute",
    right: -2,
    top: -2,
    width: 19,
  },
  speciesMark: {
    alignItems: "center",
    backgroundColor: colors.skySoft,
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  stage: {
    height: 244,
    overflow: "hidden",
    position: "relative",
  },
  stageFloor: {
    backgroundColor: "rgba(161, 123, 84, 0.10)",
    bottom: 0,
    height: 48,
    left: 0,
    position: "absolute",
    right: 0,
  },
  stageGlow: {
    backgroundColor: "rgba(255,255,255,0.46)",
    borderRadius: 150,
    height: 285,
    left: "50%",
    marginLeft: -142,
    position: "absolute",
    top: 8,
    width: 285,
  },
  stageOrb: {
    backgroundColor: "rgba(255, 209, 103, 0.28)",
    borderRadius: 52,
    height: 104,
    left: -30,
    position: "absolute",
    top: -35,
    width: 104,
  },
  thumbGlow: {
    backgroundColor: "rgba(255,255,255,0.58)",
    borderRadius: 40,
    height: 70,
    left: 5,
    position: "absolute",
    top: 3,
    width: 70,
  },
  thumbImage: {
    bottom: 4,
    height: 68,
    left: 5,
    position: "absolute",
    width: 70,
  },
  thumbShadow: {
    backgroundColor: "rgba(52, 48, 42, 0.15)",
    borderRadius: 99,
    bottom: 5,
    height: 6,
    left: 20,
    position: "absolute",
    width: 40,
  },
  thumbStage: {
    backgroundColor: colors.sageSoft,
    borderRadius: 18,
    height: 78,
    overflow: "hidden",
    position: "relative",
    width: 80,
  },
  title: {
    color: colors.ink,
    fontFamily: "Fredoka_600SemiBold",
    fontSize: 31,
    lineHeight: 36,
  },
});
