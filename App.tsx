import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import {
  convertInputs,
  DEFAULT_INPUTS,
  MONTHS,
  RUNOFF_COEFFICIENTS,
  simulateTank,
  validateInputs,
} from "./src/calculations";
import {
  ProjectInputs,
  RoofMaterial,
  SavedProject,
  SimulationResult,
  UnitSystem,
} from "./src/types";

type Screen = "plan" | "rainfall" | "results" | "saved";

const COLORS = {
  ink: "#173D3B",
  muted: "#63807D",
  teal: "#146C67",
  mint: "#D6F1EB",
  pale: "#F2F8F6",
  cream: "#FCF8EE",
  white: "#FFFFFF",
  orange: "#F2A65A",
  border: "#DDEAE6",
  danger: "#B84B4B",
};

const MATERIALS: Array<{
  id: RoofMaterial;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}> = [
  { id: "metal", label: "Metal", icon: "layers-outline" },
  { id: "tile", label: "Tile", icon: "grid-outline" },
  { id: "concrete", label: "Concrete", icon: "cube-outline" },
  { id: "green", label: "Green", icon: "leaf-outline" },
];

const STORAGE_KEY = "raintank.projects.v1";

function toNumber(value: string): number {
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

function round(value: number, digits = 0): string {
  return value.toLocaleString(undefined, {
    maximumFractionDigits: digits,
  });
}

function AppContent() {
  const insets = useSafeAreaInsets();
  const [screen, setScreen] = useState<Screen>("plan");
  const [inputs, setInputs] = useState<ProjectInputs>(DEFAULT_INPUTS);
  const [result, setResult] = useState<SimulationResult>(() =>
    simulateTank(DEFAULT_INPUTS),
  );
  const [saved, setSaved] = useState<SavedProject[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((value) => {
        if (value) setSaved(JSON.parse(value) as SavedProject[]);
      })
      .catch(() => {
        // A failed local restore should not block planning.
      });
  }, []);

  const units = useMemo(
    () =>
      inputs.units === "metric"
        ? { area: "m²", volume: "L", rain: "mm" }
        : { area: "ft²", volume: "gal", rain: "in" },
    [inputs.units],
  );

  const calculate = () => {
    const errors = validateInputs(inputs);
    if (errors.length) {
      Alert.alert("Check your plan", errors[0]);
      return;
    }
    setResult(simulateTank(inputs));
    setScreen("results");
  };

  const saveProject = async () => {
    const project: SavedProject = {
      id: `${Date.now()}`,
      savedAt: new Date().toISOString(),
      inputs,
      result,
    };
    const next = [project, ...saved.filter((item) => item.inputs.name !== inputs.name)];
    setSaved(next);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    Alert.alert("Plan saved", "Your project is available offline.");
  };

  const openSaved = (project: SavedProject) => {
    setInputs(project.inputs);
    setResult(project.result);
    setScreen("results");
  };

  const deleteSaved = async (id: string) => {
    const next = saved.filter((project) => project.id !== id);
    setSaved(next);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  return (
    <View style={styles.app}>
      <StatusBar style="dark" />
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.brandMark}>
          <Ionicons name="water" size={20} color={COLORS.white} />
        </View>
        <View style={styles.brandCopy}>
          <Text style={styles.brand}>RainTank</Text>
          <Text style={styles.brandTagline}>Harvest with confidence</Text>
        </View>
        <Pressable
          accessibilityLabel="Open saved plans"
          onPress={() => setScreen("saved")}
          style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]}
        >
          <Ionicons name="bookmark-outline" size={21} color={COLORS.ink} />
          {saved.length > 0 && <View style={styles.savedDot} />}
        </Pressable>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        {screen === "plan" && (
          <PlanScreen
            inputs={inputs}
            units={units}
            onChange={setInputs}
            onRainfall={() => setScreen("rainfall")}
            onCalculate={calculate}
          />
        )}
        {screen === "rainfall" && (
          <RainfallScreen
            inputs={inputs}
            onChange={setInputs}
            onBack={() => setScreen("plan")}
            onCalculate={calculate}
          />
        )}
        {screen === "results" && (
          <ResultsScreen
            inputs={inputs}
            result={result}
            onBack={() => setScreen("plan")}
            onSave={saveProject}
          />
        )}
        {screen === "saved" && (
          <SavedScreen
            projects={saved}
            onOpen={openSaved}
            onDelete={deleteSaved}
            onBack={() => setScreen("plan")}
          />
        )}
      </KeyboardAvoidingView>

      <View style={[styles.tabBar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
        <TabButton
          active={screen === "plan" || screen === "rainfall"}
          icon="calculator-outline"
          label="Plan"
          onPress={() => setScreen("plan")}
        />
        <TabButton
          active={screen === "results"}
          icon="analytics-outline"
          label="Results"
          onPress={() => setScreen("results")}
        />
        <TabButton
          active={screen === "saved"}
          icon="folder-open-outline"
          label="Saved"
          onPress={() => setScreen("saved")}
        />
      </View>
    </View>
  );
}

function PlanScreen({
  inputs,
  units,
  onChange,
  onRainfall,
  onCalculate,
}: {
  inputs: ProjectInputs;
  units: { area: string; volume: string; rain: string };
  onChange: (inputs: ProjectInputs) => void;
  onRainfall: () => void;
  onCalculate: () => void;
}) {
  const setUnits = (next: UnitSystem) => {
    onChange(convertInputs(inputs, next));
  };

  const annualRain = inputs.rainfall.reduce((sum, value) => sum + value, 0);

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <LinearGradient
        colors={["#D7F1EA", "#EEF7EF", "#FCF8EE"]}
        end={{ x: 1, y: 1 }}
        start={{ x: 0, y: 0 }}
        style={styles.hero}
      >
        <View style={styles.heroBadge}>
          <Ionicons name="sparkles" size={13} color={COLORS.teal} />
          <Text style={styles.heroBadgeText}>OFFLINE PLANNER</Text>
        </View>
        <Text style={styles.heroTitle}>Turn rainfall into a reliable reserve.</Text>
        <Text style={styles.heroBody}>
          Model your roof, climate, and daily use to find a tank that fits.
        </Text>
        <View style={styles.heroArt}>
          <View style={styles.heroDrop}>
            <Ionicons name="water" size={38} color={COLORS.white} />
          </View>
          <View style={styles.rainLineOne} />
          <View style={styles.rainLineTwo} />
        </View>
      </LinearGradient>

      <SectionHeader number="01" title="Project basics" />
      <View style={styles.card}>
        <LabeledInput
          label="Project name"
          onChange={(name) => onChange({ ...inputs, name })}
          value={inputs.name}
        />
        <Text style={styles.fieldLabel}>Units</Text>
        <View style={styles.segment}>
          <SegmentButton
            active={inputs.units === "metric"}
            label="Metric"
            onPress={() => setUnits("metric")}
          />
          <SegmentButton
            active={inputs.units === "imperial"}
            label="Imperial"
            onPress={() => setUnits("imperial")}
          />
        </View>
      </View>

      <SectionHeader number="02" title="Catchment" />
      <View style={styles.card}>
        <LabeledInput
          keyboardType="decimal-pad"
          label="Roof area"
          onChange={(roofArea) =>
            onChange({ ...inputs, roofArea: toNumber(roofArea) })
          }
          suffix={units.area}
          value={`${round(inputs.roofArea, 1)}`}
        />
        <Text style={styles.fieldLabel}>Roof surface</Text>
        <View style={styles.materialGrid}>
          {MATERIALS.map((material) => {
            const active = inputs.roofMaterial === material.id;
            return (
              <Pressable
                accessibilityRole="button"
                key={material.id}
                onPress={() =>
                  onChange({ ...inputs, roofMaterial: material.id })
                }
                style={({ pressed }) => [
                  styles.material,
                  active && styles.materialActive,
                  pressed && styles.pressed,
                ]}
              >
                <Ionicons
                  color={active ? COLORS.teal : COLORS.muted}
                  name={material.icon}
                  size={21}
                />
                <Text
                  style={[
                    styles.materialText,
                    active && styles.materialTextActive,
                  ]}
                >
                  {material.label}
                </Text>
                <Text style={styles.materialRate}>
                  {Math.round(RUNOFF_COEFFICIENTS[material.id] * 100)}%
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.helper}>
          The percentage estimates water retained after first-flush and surface
          losses.
        </Text>
      </View>

      <SectionHeader number="03" title="Storage & use" />
      <View style={styles.card}>
        <View style={styles.twoColumns}>
          <View style={styles.column}>
            <LabeledInput
              keyboardType="decimal-pad"
              label="Tank size"
              onChange={(tankCapacity) =>
                onChange({ ...inputs, tankCapacity: toNumber(tankCapacity) })
              }
              suffix={units.volume}
              value={`${round(inputs.tankCapacity, 0)}`}
            />
          </View>
          <View style={styles.column}>
            <LabeledInput
              keyboardType="decimal-pad"
              label="Daily use"
              onChange={(dailyDemand) =>
                onChange({ ...inputs, dailyDemand: toNumber(dailyDemand) })
              }
              suffix={units.volume}
              value={`${round(inputs.dailyDemand, 1)}`}
            />
          </View>
        </View>
        <LabeledInput
          keyboardType="number-pad"
          label="Starting tank level"
          onChange={(startingFillPercent) =>
            onChange({
              ...inputs,
              startingFillPercent: Math.min(
                100,
                Math.max(0, toNumber(startingFillPercent)),
              ),
            })
          }
          suffix="%"
          value={`${round(inputs.startingFillPercent)}`}
        />
      </View>

      <SectionHeader number="04" title="Local rainfall" />
      <Pressable
        onPress={onRainfall}
        style={({ pressed }) => [
          styles.rainfallCard,
          pressed && styles.pressed,
        ]}
      >
        <View style={styles.rainfallIcon}>
          <Ionicons name="rainy-outline" size={24} color={COLORS.teal} />
        </View>
        <View style={styles.flex}>
          <Text style={styles.rainfallTitle}>12-month rainfall profile</Text>
          <Text style={styles.rainfallMeta}>
            {round(annualRain, 1)} {units.rain} per year · Tap to edit
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={COLORS.muted} />
      </Pressable>

      <PrimaryButton
        icon="analytics"
        label="Calculate reliability"
        onPress={onCalculate}
      />
      <Text style={styles.disclaimer}>
        Planning estimate only. Verify structural, health, and local code
        requirements with qualified professionals.
      </Text>
    </ScrollView>
  );
}

function RainfallScreen({
  inputs,
  onChange,
  onBack,
  onCalculate,
}: {
  inputs: ProjectInputs;
  onChange: (inputs: ProjectInputs) => void;
  onBack: () => void;
  onCalculate: () => void;
}) {
  const rainUnit = inputs.units === "metric" ? "mm" : "in";
  const total = inputs.rainfall.reduce((sum, value) => sum + value, 0);
  const peak = Math.max(...inputs.rainfall, 1);

  const updateMonth = (index: number, value: string) => {
    const rainfall = [...inputs.rainfall];
    rainfall[index] = Math.max(0, toNumber(value));
    onChange({ ...inputs, rainfall });
  };

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <BackTitle
        eyebrow="CLIMATE PROFILE"
        onBack={onBack}
        title="Monthly rainfall"
      />
      <Text style={styles.pageIntro}>
        Use long-term monthly averages from your nearest reliable weather
        station.
      </Text>
      <View style={styles.rainSummary}>
        <View>
          <Text style={styles.summaryLabel}>ANNUAL TOTAL</Text>
          <Text style={styles.summaryValue}>
            {round(total, 1)} <Text style={styles.summaryUnit}>{rainUnit}</Text>
          </Text>
        </View>
        <View style={styles.miniChart}>
          {inputs.rainfall.map((value, index) => (
            <View
              key={MONTHS[index]}
              style={[
                styles.miniBar,
                { height: Math.max(5, (value / peak) * 48) },
              ]}
            />
          ))}
        </View>
      </View>
      <View style={styles.monthGrid}>
        {MONTHS.map((month, index) => (
          <View key={month} style={styles.monthField}>
            <Text style={styles.monthLabel}>{month}</Text>
            <TextInput
              accessibilityLabel={`${month} rainfall in ${rainUnit}`}
              keyboardType="decimal-pad"
              onChangeText={(value) => updateMonth(index, value)}
              selectTextOnFocus
              style={styles.monthInput}
              value={`${round(inputs.rainfall[index] ?? 0, 1)}`}
            />
            <Text style={styles.monthUnit}>{rainUnit}</Text>
          </View>
        ))}
      </View>
      <View style={styles.infoNote}>
        <Ionicons name="information-circle-outline" size={20} color={COLORS.teal} />
        <Text style={styles.infoNoteText}>
          Monthly averages are ideal for an early feasibility estimate. Final
          engineering should use several years of daily rainfall records.
        </Text>
      </View>
      <PrimaryButton icon="analytics" label="Run simulation" onPress={onCalculate} />
    </ScrollView>
  );
}

function ResultsScreen({
  inputs,
  result,
  onBack,
  onSave,
}: {
  inputs: ProjectInputs;
  result: SimulationResult;
  onBack: () => void;
  onSave: () => void;
}) {
  const volumeUnit = inputs.units === "metric" ? "L" : "gal";
  const reliabilityColor =
    result.reliability >= 90
      ? COLORS.teal
      : result.reliability >= 70
        ? "#C47A2C"
        : COLORS.danger;
  const maxStorage = Math.max(inputs.tankCapacity, 1);

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <BackTitle eyebrow="YOUR WATER PLAN" onBack={onBack} title={inputs.name} />
      <LinearGradient
        colors={["#153F3C", "#166D67"]}
        end={{ x: 1, y: 1 }}
        style={styles.scoreCard}
      >
        <Text style={styles.scoreEyebrow}>ESTIMATED DEMAND MET</Text>
        <Text style={styles.score}>
          {round(result.reliability)}
          <Text style={styles.scorePercent}>%</Text>
        </Text>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              {
                backgroundColor: reliabilityColor,
                width: `${Math.min(100, result.reliability)}%`,
              },
            ]}
          />
        </View>
        <Text style={styles.scoreCopy}>
          {result.reliability >= 95
            ? "Strong match for the rainfall profile and demand."
            : "Dry months may need backup water or lower demand."}
        </Text>
      </LinearGradient>

      <View style={styles.metricGrid}>
        <Metric
          icon="water-outline"
          label="Captured"
          unit={volumeUnit}
          value={result.annualCaptured}
        />
        <Metric
          icon="flash-outline"
          label="Demand"
          unit={volumeUnit}
          value={result.annualDemand}
        />
        <Metric
          icon="arrow-up-circle-outline"
          label="Overflow"
          unit={volumeUnit}
          value={result.annualOverflow}
        />
        <Metric
          icon="alert-circle-outline"
          label="Shortfall"
          unit={volumeUnit}
          value={result.annualShortage}
        />
      </View>

      <SectionHeader number="12M" title="Storage through the year" />
      <View style={styles.chartCard}>
        <View style={styles.chart}>
          {result.months.map((month) => {
            const height = (month.endingStorage / maxStorage) * 112;
            return (
              <View key={month.monthIndex} style={styles.chartColumn}>
                <View style={styles.chartBarTrack}>
                  <View style={[styles.chartBar, { height: Math.max(2, height) }]} />
                </View>
                <Text style={styles.chartMonth}>{MONTHS[month.monthIndex]}</Text>
              </View>
            );
          })}
        </View>
        <View style={styles.chartLegend}>
          <View style={styles.legendDot} />
          <Text style={styles.chartLegendText}>End-of-month tank level</Text>
        </View>
      </View>

      <View style={styles.recommendation}>
        <View style={styles.recommendationIcon}>
          <Ionicons name="bulb-outline" size={24} color={COLORS.teal} />
        </View>
        <View style={styles.flex}>
          <Text style={styles.recommendationLabel}>95% RELIABILITY TARGET</Text>
          <Text style={styles.recommendationValue}>
            {round(result.suggestedCapacity)} {volumeUnit}
          </Text>
          <Text style={styles.recommendationCopy}>
            Modelled minimum within the search range. A larger tank cannot fix a
            yearly supply deficit.
          </Text>
        </View>
      </View>

      <View style={styles.actionRow}>
        <Pressable
          onPress={onBack}
          style={({ pressed }) => [
            styles.secondaryButton,
            pressed && styles.pressed,
          ]}
        >
          <Ionicons name="create-outline" size={20} color={COLORS.teal} />
          <Text style={styles.secondaryButtonText}>Edit</Text>
        </Pressable>
        <View style={styles.actionPrimary}>
          <PrimaryButton icon="bookmark-outline" label="Save plan" onPress={onSave} />
        </View>
      </View>
    </ScrollView>
  );
}

function SavedScreen({
  projects,
  onOpen,
  onDelete,
  onBack,
}: {
  projects: SavedProject[];
  onOpen: (project: SavedProject) => void;
  onDelete: (id: string) => void;
  onBack: () => void;
}) {
  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <BackTitle eyebrow="OFFLINE LIBRARY" onBack={onBack} title="Saved plans" />
      {projects.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Ionicons name="folder-open-outline" size={36} color={COLORS.teal} />
          </View>
          <Text style={styles.emptyTitle}>No plans saved yet</Text>
          <Text style={styles.emptyCopy}>
            Run a simulation, then save it for quick offline access.
          </Text>
          <PrimaryButton icon="add" label="Create a plan" onPress={onBack} />
        </View>
      ) : (
        projects.map((project) => (
          <Pressable
            key={project.id}
            onPress={() => onOpen(project)}
            style={({ pressed }) => [
              styles.savedCard,
              pressed && styles.pressed,
            ]}
          >
            <View style={styles.savedCardIcon}>
              <Ionicons name="water-outline" size={24} color={COLORS.teal} />
            </View>
            <View style={styles.flex}>
              <Text style={styles.savedName}>{project.inputs.name}</Text>
              <Text style={styles.savedMeta}>
                {round(project.inputs.tankCapacity)}{" "}
                {project.inputs.units === "metric" ? "L" : "gal"} tank ·{" "}
                {round(project.result.reliability)}% demand met
              </Text>
            </View>
            <Pressable
              accessibilityLabel={`Delete ${project.inputs.name}`}
              hitSlop={10}
              onPress={() => onDelete(project.id)}
              style={styles.deleteButton}
            >
              <Ionicons name="trash-outline" size={19} color={COLORS.muted} />
            </Pressable>
          </Pressable>
        ))
      )}
    </ScrollView>
  );
}

function LabeledInput({
  label,
  value,
  suffix,
  keyboardType,
  onChange,
}: {
  label: string;
  value: string;
  suffix?: string;
  keyboardType?: "default" | "decimal-pad" | "number-pad";
  onChange: (value: string) => void;
}) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.inputShell}>
        <TextInput
          accessibilityLabel={label}
          keyboardType={keyboardType}
          onChangeText={onChange}
          selectTextOnFocus={keyboardType !== undefined}
          style={styles.input}
          value={value}
        />
        {suffix && <Text style={styles.inputSuffix}>{suffix}</Text>}
      </View>
    </View>
  );
}

function SectionHeader({ number, title }: { number: string; title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionNumber}>{number}</Text>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionLine} />
    </View>
  );
}

function SegmentButton({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.segmentButton, active && styles.segmentButtonActive]}
    >
      <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

function PrimaryButton({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.primaryButton,
        pressed && styles.primaryButtonPressed,
      ]}
    >
      <Ionicons name={icon} size={20} color={COLORS.white} />
      <Text style={styles.primaryButtonText}>{label}</Text>
      <Ionicons name="arrow-forward" size={18} color={COLORS.white} />
    </Pressable>
  );
}

function BackTitle({
  eyebrow,
  onBack,
  title,
}: {
  eyebrow: string;
  onBack: () => void;
  title: string;
}) {
  return (
    <View style={styles.pageTitleRow}>
      <Pressable onPress={onBack} style={styles.backButton}>
        <Ionicons name="arrow-back" size={21} color={COLORS.ink} />
      </Pressable>
      <View style={styles.flex}>
        <Text style={styles.pageEyebrow}>{eyebrow}</Text>
        <Text numberOfLines={1} style={styles.pageTitle}>
          {title}
        </Text>
      </View>
    </View>
  );
}

function Metric({
  icon,
  label,
  unit,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  unit: string;
  value: number;
}) {
  return (
    <View style={styles.metric}>
      <Ionicons name={icon} size={20} color={COLORS.teal} />
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{round(value)}</Text>
      <Text style={styles.metricUnit}>{unit} / year</Text>
    </View>
  );
}

function TabButton({
  active,
  icon,
  label,
  onPress,
}: {
  active: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.tabButton}>
      <Ionicons
        color={active ? COLORS.teal : "#8AA09D"}
        name={icon}
        size={22}
      />
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
        {label}
      </Text>
      {active && <View style={styles.tabIndicator} />}
    </Pressable>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  actionPrimary: { flex: 1.55 },
  actionRow: { flexDirection: "row", gap: 10, marginTop: 20 },
  app: { backgroundColor: COLORS.pale, flex: 1 },
  backButton: {
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderColor: COLORS.border,
    borderRadius: 16,
    borderWidth: 1,
    height: 46,
    justifyContent: "center",
    marginRight: 14,
    width: 46,
  },
  brand: { color: COLORS.ink, fontSize: 18, fontWeight: "800", letterSpacing: -0.5 },
  brandCopy: { flex: 1 },
  brandMark: {
    alignItems: "center",
    backgroundColor: COLORS.teal,
    borderRadius: 14,
    height: 40,
    justifyContent: "center",
    marginRight: 10,
    transform: [{ rotate: "-6deg" }],
    width: 40,
  },
  brandTagline: { color: COLORS.muted, fontSize: 10, fontWeight: "600", letterSpacing: 0.2 },
  card: {
    backgroundColor: COLORS.white,
    borderColor: COLORS.border,
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
  },
  chart: { flexDirection: "row", gap: 6, height: 142 },
  chartBar: {
    backgroundColor: "#58B5A7",
    borderRadius: 5,
    bottom: 0,
    position: "absolute",
    width: "100%",
  },
  chartBarTrack: {
    backgroundColor: "#E7F1EE",
    borderRadius: 5,
    flex: 1,
    overflow: "hidden",
    width: "100%",
  },
  chartCard: {
    backgroundColor: COLORS.white,
    borderColor: COLORS.border,
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
  },
  chartColumn: { alignItems: "center", flex: 1, gap: 7 },
  chartLegend: { alignItems: "center", flexDirection: "row", gap: 7, marginTop: 15 },
  chartLegendText: { color: COLORS.muted, fontSize: 12 },
  chartMonth: { color: COLORS.muted, fontSize: 9, fontWeight: "700" },
  column: { flex: 1 },
  deleteButton: { padding: 6 },
  disclaimer: {
    color: COLORS.muted,
    fontSize: 11,
    lineHeight: 16,
    marginHorizontal: 12,
    marginTop: 12,
    textAlign: "center",
  },
  emptyCopy: {
    color: COLORS.muted,
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 24,
    maxWidth: 270,
    textAlign: "center",
  },
  emptyIcon: {
    alignItems: "center",
    backgroundColor: COLORS.mint,
    borderRadius: 30,
    height: 74,
    justifyContent: "center",
    marginBottom: 18,
    width: 74,
  },
  emptyState: {
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderColor: COLORS.border,
    borderRadius: 24,
    borderWidth: 1,
    marginTop: 24,
    padding: 30,
  },
  emptyTitle: { color: COLORS.ink, fontSize: 20, fontWeight: "800", marginBottom: 8 },
  fieldLabel: {
    color: COLORS.ink,
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 8,
  },
  flex: { flex: 1 },
  header: {
    alignItems: "center",
    backgroundColor: COLORS.pale,
    flexDirection: "row",
    paddingBottom: 10,
    paddingHorizontal: 20,
  },
  headerButton: {
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderColor: COLORS.border,
    borderRadius: 14,
    borderWidth: 1,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  helper: { color: COLORS.muted, fontSize: 11, lineHeight: 16, marginTop: 12 },
  hero: {
    borderRadius: 26,
    minHeight: 220,
    overflow: "hidden",
    padding: 22,
    position: "relative",
  },
  heroArt: {
    alignItems: "center",
    bottom: -16,
    height: 130,
    justifyContent: "center",
    position: "absolute",
    right: -3,
    width: 130,
  },
  heroBadge: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.72)",
    borderRadius: 20,
    flexDirection: "row",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  heroBadgeText: { color: COLORS.teal, fontSize: 9, fontWeight: "900", letterSpacing: 1.1 },
  heroBody: { color: COLORS.muted, fontSize: 14, lineHeight: 21, marginTop: 10, maxWidth: "68%" },
  heroDrop: {
    alignItems: "center",
    backgroundColor: "#4AAB9E",
    borderRadius: 50,
    height: 82,
    justifyContent: "center",
    transform: [{ rotate: "7deg" }],
    width: 82,
  },
  heroTitle: {
    color: COLORS.ink,
    fontSize: 29,
    fontWeight: "900",
    letterSpacing: -1.2,
    lineHeight: 33,
    marginTop: 18,
    maxWidth: "77%",
  },
  infoNote: {
    alignItems: "flex-start",
    backgroundColor: COLORS.mint,
    borderRadius: 16,
    flexDirection: "row",
    gap: 10,
    marginBottom: 18,
    padding: 15,
  },
  infoNoteText: { color: COLORS.ink, flex: 1, fontSize: 12, lineHeight: 18 },
  input: { color: COLORS.ink, flex: 1, fontSize: 16, fontWeight: "700", padding: 0 },
  inputGroup: { marginBottom: 17 },
  inputShell: {
    alignItems: "center",
    backgroundColor: COLORS.pale,
    borderColor: COLORS.border,
    borderRadius: 13,
    borderWidth: 1,
    flexDirection: "row",
    height: 50,
    paddingHorizontal: 14,
  },
  inputSuffix: { color: COLORS.muted, fontSize: 13, fontWeight: "700", marginLeft: 8 },
  legendDot: { backgroundColor: "#58B5A7", borderRadius: 4, height: 8, width: 8 },
  material: {
    alignItems: "center",
    backgroundColor: COLORS.pale,
    borderColor: "transparent",
    borderRadius: 14,
    borderWidth: 1.5,
    flex: 1,
    minWidth: "44%",
    padding: 12,
  },
  materialActive: { backgroundColor: COLORS.mint, borderColor: "#78BFB4" },
  materialGrid: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
  materialRate: { color: COLORS.muted, fontSize: 9, marginTop: 2 },
  materialText: { color: COLORS.muted, fontSize: 12, fontWeight: "700", marginTop: 5 },
  materialTextActive: { color: COLORS.teal },
  metric: {
    backgroundColor: COLORS.white,
    borderColor: COLORS.border,
    borderRadius: 18,
    borderWidth: 1,
    minWidth: "46%",
    padding: 15,
  },
  metricGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 12 },
  metricLabel: { color: COLORS.muted, fontSize: 11, fontWeight: "700", marginTop: 10 },
  metricUnit: { color: COLORS.muted, fontSize: 10, marginTop: 1 },
  metricValue: { color: COLORS.ink, fontSize: 21, fontWeight: "900", marginTop: 3 },
  miniBar: { backgroundColor: "#4EAB9E", borderRadius: 3, flex: 1 },
  miniChart: { alignItems: "flex-end", flex: 1, flexDirection: "row", gap: 3, height: 50, marginLeft: 28 },
  monthField: {
    backgroundColor: COLORS.white,
    borderColor: COLORS.border,
    borderRadius: 16,
    borderWidth: 1,
    minWidth: "30%",
    padding: 12,
  },
  monthGrid: { flexDirection: "row", flexWrap: "wrap", gap: 9, marginBottom: 16 },
  monthInput: { color: COLORS.ink, fontSize: 18, fontWeight: "800", paddingVertical: 7 },
  monthLabel: { color: COLORS.teal, fontSize: 10, fontWeight: "900", letterSpacing: 0.8 },
  monthUnit: { color: COLORS.muted, fontSize: 9 },
  pageEyebrow: { color: COLORS.teal, fontSize: 9, fontWeight: "900", letterSpacing: 1.2 },
  pageIntro: { color: COLORS.muted, fontSize: 14, lineHeight: 21, marginBottom: 18 },
  pageTitle: { color: COLORS.ink, fontSize: 25, fontWeight: "900", letterSpacing: -0.8, marginTop: 2 },
  pageTitleRow: { alignItems: "center", flexDirection: "row", marginBottom: 14 },
  pressed: { opacity: 0.72, transform: [{ scale: 0.985 }] },
  primaryButton: {
    alignItems: "center",
    backgroundColor: COLORS.teal,
    borderRadius: 17,
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
    minHeight: 56,
    paddingHorizontal: 18,
  },
  primaryButtonPressed: { backgroundColor: "#0E5955", transform: [{ scale: 0.985 }] },
  primaryButtonText: { color: COLORS.white, flex: 1, fontSize: 15, fontWeight: "800", textAlign: "center" },
  progressFill: { borderRadius: 4, height: 7 },
  progressTrack: { backgroundColor: "rgba(255,255,255,0.17)", borderRadius: 4, height: 7, marginTop: 16, overflow: "hidden" },
  rainLineOne: { backgroundColor: "rgba(20,108,103,0.16)", borderRadius: 4, height: 5, position: "absolute", right: 10, top: 10, transform: [{ rotate: "-35deg" }], width: 34 },
  rainLineTwo: { backgroundColor: "rgba(20,108,103,0.12)", borderRadius: 4, height: 5, left: 0, position: "absolute", top: 32, transform: [{ rotate: "-35deg" }], width: 25 },
  rainfallCard: {
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderColor: COLORS.border,
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
    padding: 16,
  },
  rainfallIcon: { alignItems: "center", backgroundColor: COLORS.mint, borderRadius: 14, height: 48, justifyContent: "center", width: 48 },
  rainfallMeta: { color: COLORS.muted, fontSize: 11, marginTop: 4 },
  rainfallTitle: { color: COLORS.ink, fontSize: 14, fontWeight: "800" },
  rainSummary: { alignItems: "flex-end", backgroundColor: COLORS.cream, borderRadius: 20, flexDirection: "row", marginBottom: 14, padding: 18 },
  recommendation: { alignItems: "flex-start", backgroundColor: COLORS.cream, borderRadius: 20, flexDirection: "row", gap: 13, marginTop: 14, padding: 17 },
  recommendationCopy: { color: COLORS.muted, fontSize: 11, lineHeight: 16, marginTop: 5 },
  recommendationIcon: { alignItems: "center", backgroundColor: "#F3E6C6", borderRadius: 14, height: 48, justifyContent: "center", width: 48 },
  recommendationLabel: { color: COLORS.teal, fontSize: 9, fontWeight: "900", letterSpacing: 0.9 },
  recommendationValue: { color: COLORS.ink, fontSize: 22, fontWeight: "900", marginTop: 3 },
  savedCard: { alignItems: "center", backgroundColor: COLORS.white, borderColor: COLORS.border, borderRadius: 19, borderWidth: 1, flexDirection: "row", gap: 12, marginBottom: 10, padding: 15 },
  savedCardIcon: { alignItems: "center", backgroundColor: COLORS.mint, borderRadius: 14, height: 48, justifyContent: "center", width: 48 },
  savedDot: { backgroundColor: COLORS.orange, borderColor: COLORS.white, borderRadius: 5, borderWidth: 1.5, height: 9, position: "absolute", right: 8, top: 7, width: 9 },
  savedMeta: { color: COLORS.muted, fontSize: 11, marginTop: 4 },
  savedName: { color: COLORS.ink, fontSize: 15, fontWeight: "800" },
  score: { color: COLORS.white, fontSize: 58, fontWeight: "900", letterSpacing: -3, marginTop: 3 },
  scoreCard: { borderRadius: 25, padding: 22 },
  scoreCopy: { color: "rgba(255,255,255,0.76)", fontSize: 12, lineHeight: 18, marginTop: 12 },
  scoreEyebrow: { color: "#9FD5CC", fontSize: 9, fontWeight: "900", letterSpacing: 1.2 },
  scorePercent: { fontSize: 25, letterSpacing: 0 },
  scrollContent: { paddingBottom: 30, paddingHorizontal: 18, paddingTop: 6 },
  secondaryButton: { alignItems: "center", backgroundColor: COLORS.white, borderColor: COLORS.border, borderRadius: 17, borderWidth: 1, flex: 0.75, flexDirection: "row", gap: 7, justifyContent: "center", minHeight: 56 },
  secondaryButtonText: { color: COLORS.teal, fontSize: 14, fontWeight: "800" },
  sectionHeader: { alignItems: "center", flexDirection: "row", gap: 9, marginBottom: 10, marginTop: 24 },
  sectionLine: { backgroundColor: COLORS.border, flex: 1, height: 1 },
  sectionNumber: { color: COLORS.teal, fontSize: 9, fontWeight: "900", letterSpacing: 1 },
  sectionTitle: { color: COLORS.ink, fontSize: 14, fontWeight: "800" },
  segment: { backgroundColor: COLORS.pale, borderRadius: 13, flexDirection: "row", padding: 4 },
  segmentButton: { alignItems: "center", borderRadius: 10, flex: 1, paddingVertical: 10 },
  segmentButtonActive: { backgroundColor: COLORS.white },
  segmentText: { color: COLORS.muted, fontSize: 12, fontWeight: "700" },
  segmentTextActive: { color: COLORS.teal },
  summaryLabel: { color: COLORS.teal, fontSize: 9, fontWeight: "900", letterSpacing: 1 },
  summaryUnit: { color: COLORS.muted, fontSize: 13 },
  summaryValue: { color: COLORS.ink, fontSize: 25, fontWeight: "900", marginTop: 5 },
  tabBar: { backgroundColor: COLORS.white, borderTopColor: COLORS.border, borderTopWidth: 1, flexDirection: "row", paddingTop: 8 },
  tabButton: { alignItems: "center", flex: 1, gap: 3, position: "relative" },
  tabIndicator: { backgroundColor: COLORS.teal, borderRadius: 2, height: 3, position: "absolute", top: -9, width: 28 },
  tabLabel: { color: "#8AA09D", fontSize: 9, fontWeight: "700" },
  tabLabelActive: { color: COLORS.teal },
  twoColumns: { flexDirection: "row", gap: 10 },
});
