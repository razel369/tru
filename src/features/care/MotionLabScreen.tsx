import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { colors, shadow } from "../../design";
import {
  auditRegisteredPetMotionBlinks,
  getRegisteredPetMotionKeys,
  resolvePetMotionPack,
  type PetMotionState,
} from "../pet-motion";
import { getPetVisualAsset } from "../pet-visuals/registry";

import { AnimatedPetHero } from "./AnimatedPetHero";

const STATE_OPTIONS: readonly {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  state: PetMotionState;
}[] = [
  { icon: "pause-outline", label: "Idle", state: "idle" },
  { icon: "eye-outline", label: "Half blink", state: "blinkHalf" },
  { icon: "eye-off-outline", label: "Blink", state: "blink" },
  { icon: "heart-outline", label: "Happy", state: "happy" },
  { icon: "sparkles-outline", label: "Attention", state: "attention" },
  { icon: "moon-outline", label: "Sleepy", state: "sleepy" },
];

function labelForPetKey(key: string) {
  const name = key.split(":").at(-1) ?? key;
  return name
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function MotionLabScreen({
  topInset,
  bottomInset,
  onClose,
}: {
  topInset: number;
  bottomInset: number;
  onClose: () => void;
}) {
  const petKeys = useMemo(
    () =>
      getRegisteredPetMotionKeys().filter((key) =>
        Boolean(getPetVisualAsset(key)),
      ),
    [],
  );
  const blinkAudits = useMemo(auditRegisteredPetMotionBlinks, []);
  const blinkAuditByKey = useMemo(
    () => new Map(blinkAudits.map((audit) => [audit.petKey, audit])),
    [blinkAudits],
  );
  const blinkReadyCount = petKeys.filter(
    (key) => blinkAuditByKey.get(key)?.ready,
  ).length;
  const [selectedKey, setSelectedKey] = useState(
    petKeys.includes("pet:luna") ? "pet:luna" : petKeys[0],
  );
  const [motionCommand, setMotionCommand] = useState<
    {
      durationMs?: number;
      id: number;
      sequenceScale?: number;
      state: PetMotionState;
    } | undefined
  >();
  const [reactionToken, setReactionToken] = useState(0);
  const packTransitionRef = useRef(false);
  const [isPackTransitioning, setIsPackTransitioning] = useState(false);
  const [motionReady, setMotionReady] = useState(false);

  useEffect(() => {
    if (!isPackTransitioning) return;
    const timer = setTimeout(() => {
      packTransitionRef.current = false;
      setIsPackTransitioning(false);
    }, 0);
    return () => clearTimeout(timer);
  }, [isPackTransitioning, selectedKey]);

  const pack = selectedKey ? resolvePetMotionPack(selectedKey) : null;
  const visual = selectedKey ? getPetVisualAsset(selectedKey) : undefined;

  if (!selectedKey || !pack || !visual) return null;

  const availableStates = Object.keys(pack.states) as PetMotionState[];
  const selectPack = (key: string) => {
    if (key === selectedKey || packTransitionRef.current) return;
    packTransitionRef.current = true;
    setIsPackTransitioning(true);
    setMotionReady(false);
    setMotionCommand(undefined);
    setSelectedKey(key);
  };
  const runState = (state: PetMotionState) => {
    if (packTransitionRef.current) return;
    setMotionCommand((previous) => ({
      durationMs: state === "idle" || state === "blink" ? undefined : 1800,
      id: (previous?.id ?? 0) + 1,
      sequenceScale:
        state === "blink" ? 2.15 : state === "attention" ? 1.4 : undefined,
      state,
    }));
  };

  return (
    <View style={styles.screen}>
      <View style={styles.preview} testID="motion-lab-preview">
        <AnimatedPetHero
          inspectionMode
          key={selectedKey}
          layout={visual.layout}
          motionCommand={motionCommand}
          onMotionReadyChange={setMotionReady}
          petKey={selectedKey}
          petName={labelForPetKey(selectedKey)}
          visualProfile={visual.profile}
          petSource={visual.petSource ?? pack.states.idle}
          reactionToken={reactionToken}
          sceneContainsPet={visual.mode === "integrated-scene"}
          sceneSource={visual.sceneSource ?? pack.stage}
        />
        <View pointerEvents="none" style={styles.floorGuide}>
          <Text style={styles.floorLabel}>FEET ANCHOR</Text>
        </View>
        <View style={[styles.header, { paddingTop: topInset + 12 }]}>
          <Pressable
            accessibilityLabel="Close motion lab"
            accessibilityRole="button"
            onPress={onClose}
            style={styles.back}
          >
            <Ionicons color={colors.ink} name="arrow-back" size={21} />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>INTERNAL TOOL</Text>
            <Text style={styles.title}>Motion Lab</Text>
          </View>
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: bottomInset + 28 }}
        showsVerticalScrollIndicator={false}
        style={styles.controls}
      >
        <Text style={styles.sectionLabel}>MOTION PACK</Text>
        <ScrollView
          contentContainerStyle={styles.petPicker}
          horizontal
          showsHorizontalScrollIndicator={false}
        >
          {petKeys.map((key) => {
            const active = key === selectedKey;
            const blinkReady = blinkAuditByKey.get(key)?.ready ?? false;
            return (
              <Pressable
                accessibilityLabel={`Preview ${labelForPetKey(key)} motion pack`}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                key={key}
                onPress={() => selectPack(key)}
                style={[styles.petChip, active && styles.petChipActive]}
                testID={`motion-pack-${key.replace(/:/g, "-")}`}
              >
                <Text
                  style={[
                    styles.petChipText,
                    active && styles.petChipTextActive,
                  ]}
                >
                  {labelForPetKey(key)}
                </Text>
                {!blinkReady && (
                  <Ionicons color={colors.coral} name="warning" size={12} />
                )}
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.panel}>
          <View style={styles.panelTitleRow}>
            <View>
              <Text style={styles.panelTitle}>State controls</Text>
              <Text style={styles.panelBody}>Run one state at a time.</Text>
            </View>
            <View style={styles.tierBadge}>
              <Text style={styles.tierText}>{pack.tier.toUpperCase()}</Text>
            </View>
          </View>

          <View style={styles.stateGrid}>
            {STATE_OPTIONS.map((option) => {
              const available =
                option.state === "idle" ||
                option.state === "attention" ||
                availableStates.includes(option.state);
              const disabled =
                !available || isPackTransitioning || !motionReady;
              return (
                <Pressable
                  accessibilityLabel={`Preview ${option.label.toLowerCase()} motion state`}
                  accessibilityRole="button"
                  accessibilityState={{ disabled }}
                  disabled={disabled}
                  key={option.state}
                  onPress={() => runState(option.state)}
                  style={[styles.stateButton, disabled && styles.disabled]}
                  testID={`motion-state-${option.state}`}
                >
                  <Ionicons
                    color={disabled ? colors.muted : colors.navy}
                    name={option.icon}
                    size={19}
                  />
                  <Text style={styles.stateText}>{option.label}</Text>
                  {!available && <Text style={styles.missingText}>MISSING</Text>}
                </Pressable>
              );
            })}
          </View>

          <Pressable
            accessibilityLabel="Preview petting reaction"
            accessibilityRole="button"
            onPress={() => setReactionToken((token) => token + 1)}
            style={styles.pettingButton}
          >
            <Ionicons color={colors.white} name="hand-left-outline" size={20} />
            <View style={styles.pettingCopy}>
              <Text style={styles.pettingTitle}>Test petting reaction</Text>
              <Text style={styles.pettingBody}>Lean, soften, then settle.</Text>
            </View>
            <Ionicons color={colors.white} name="play" size={17} />
          </Pressable>
        </View>

        <View style={styles.statusCard}>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Blink coverage</Text>
            <Text style={styles.statusValue}>
              {blinkReadyCount} / {petKeys.length} eye-safe
            </Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Pack key</Text>
            <Text
              numberOfLines={1}
              style={styles.statusValue}
              testID="motion-pack-key"
            >
              {selectedKey}
            </Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Motion assets</Text>
            <Text
              style={styles.statusValue}
              testID="motion-assets-status"
            >
              {motionReady ? "READY" : "LOADING"}
            </Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>States</Text>
            <Text style={styles.statusValue}>{availableStates.join(" · ")}</Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Feet</Text>
            <Text style={styles.statusValue}>{pack.canvas.feetY.toFixed(3)}</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  back: {
    alignItems: "center",
    backgroundColor: colors.paper,
    borderRadius: 20,
    height: 44,
    justifyContent: "center",
    width: 44,
    ...shadow.subtle,
  },
  controls: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    marginTop: -28,
    paddingHorizontal: 18,
  },
  disabled: { opacity: 0.38 },
  eyebrow: {
    color: colors.navy,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 9,
    letterSpacing: 1.2,
  },
  floorGuide: {
    borderColor: colors.coral,
    borderStyle: "dashed",
    borderTopWidth: 1,
    bottom: 24,
    left: 18,
    opacity: 0.62,
    position: "absolute",
    right: 18,
    zIndex: 4,
  },
  floorLabel: {
    alignSelf: "flex-end",
    backgroundColor: colors.paper,
    color: colors.coral,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 8,
    letterSpacing: 0.8,
    marginTop: -10,
    paddingHorizontal: 6,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    left: 18,
    position: "absolute",
    right: 18,
    top: 0,
    zIndex: 6,
  },
  headerCopy: { flex: 1, marginLeft: 11 },
  liveBadge: {
    alignItems: "center",
    backgroundColor: colors.paper,
    borderRadius: 14,
    flexDirection: "row",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  liveDot: {
    backgroundColor: colors.sage,
    borderRadius: 4,
    height: 7,
    width: 7,
  },
  liveText: {
    color: colors.sage,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 8,
    letterSpacing: 0.8,
  },
  missingText: {
    color: colors.muted,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 7,
    letterSpacing: 0.5,
    marginLeft: "auto",
  },
  panel: {
    backgroundColor: colors.paper,
    borderRadius: 25,
    padding: 15,
    ...shadow.card,
  },
  panelBody: {
    color: colors.muted,
    fontFamily: "Nunito_600SemiBold",
    fontSize: 11,
    marginTop: 2,
  },
  panelTitle: {
    color: colors.ink,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 17,
  },
  panelTitleRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  petChip: {
    backgroundColor: colors.paper,
    borderColor: colors.line,
    borderRadius: 17,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  petChipActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  petChipText: {
    color: colors.ink,
    fontFamily: "Nunito_700Bold",
    fontSize: 11,
  },
  petChipTextActive: { color: colors.white },
  petPicker: { gap: 8, paddingBottom: 14 },
  pettingBody: {
    color: "rgba(255,255,255,0.76)",
    fontFamily: "Nunito_600SemiBold",
    fontSize: 10,
  },
  pettingButton: {
    alignItems: "center",
    backgroundColor: colors.coral,
    borderRadius: 19,
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  pettingCopy: { flex: 1 },
  pettingTitle: {
    color: colors.white,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 13,
  },
  preview: {
    backgroundColor: colors.background,
    height: 520,
    overflow: "hidden",
    position: "relative",
  },
  screen: { backgroundColor: colors.background, flex: 1 },
  sectionLabel: {
    color: colors.navy,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 9,
    letterSpacing: 1.2,
    marginBottom: 9,
    marginTop: 18,
  },
  stateButton: {
    alignItems: "center",
    backgroundColor: colors.background,
    borderRadius: 16,
    flexBasis: "48%",
    flexDirection: "row",
    gap: 7,
    minHeight: 47,
    paddingHorizontal: 11,
  },
  stateGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 14,
  },
  stateText: {
    color: colors.ink,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 11,
  },
  statusCard: {
    backgroundColor: colors.sageSoft,
    borderRadius: 21,
    gap: 9,
    marginTop: 12,
    padding: 14,
  },
  statusLabel: {
    color: colors.sage,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 10,
  },
  statusRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
  },
  statusValue: {
    color: colors.ink,
    flex: 1,
    fontFamily: "Nunito_700Bold",
    fontSize: 10,
    textAlign: "right",
  },
  tierBadge: {
    backgroundColor: colors.sageSoft,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  tierText: {
    color: colors.sage,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 8,
    letterSpacing: 0.6,
  },
  title: {
    color: colors.ink,
    fontFamily: "Fredoka_600SemiBold",
    fontSize: 27,
    lineHeight: 31,
  },
});
