import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { Fraunces_700Bold } from "@expo-google-fonts/fraunces";
import {
  Manrope_400Regular,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
} from "@expo-google-fonts/manrope";
import { useFonts } from "expo-font";
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
  addMedicationToPets,
  buildSchedule,
  createDoseLog,
  dateKey,
  DEMO_PETS,
  formatTime,
} from "./src/schedule";
import {
  DoseLog,
  Medication,
  MedicationForm,
  Pet,
  ScheduledDose,
} from "./src/types";

type Screen = "today" | "pets" | "insights" | "add";

const COLORS = {
  background: "#F7F4EE",
  paper: "#FFFDF9",
  ink: "#1D3040",
  navy: "#243E52",
  muted: "#73828B",
  line: "#E7E2D9",
  coral: "#EF7B63",
  coralSoft: "#FBE1DA",
  sage: "#5D9387",
  sageSoft: "#DCECE7",
  butter: "#F6D58C",
  butterSoft: "#FCF1D4",
  lavender: "#9891C7",
  white: "#FFFFFF",
  danger: "#C95C5C",
};

const PETS_KEY = "pawpair.pets.v1";
const LOGS_KEY = "pawpair.logs.v1";
const CAREGIVER = "Maya";

const FORM_OPTIONS: Array<{
  id: MedicationForm;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}> = [
  { id: "tablet", icon: "ellipse-outline", label: "Tablet" },
  { id: "liquid", icon: "water-outline", label: "Liquid" },
  { id: "drops", icon: "eyedrop-outline", label: "Drops" },
  { id: "injection", icon: "medkit-outline", label: "Injection" },
];

function makeSeedLogs(): DoseLog[] {
  const now = new Date();
  const schedule = buildSchedule(DEMO_PETS, [], now, 12 * 60);
  return schedule.slice(0, 2).map((dose, index) =>
    createDoseLog(
      dose,
      "given",
      index === 0 ? "Alex" : CAREGIVER,
      new Date(now.getFullYear(), now.getMonth(), now.getDate(), 8, index * 4),
    ),
  );
}

function AppContent() {
  const insets = useSafeAreaInsets();
  const [screen, setScreen] = useState<Screen>("today");
  const [pets, setPets] = useState<Pet[]>(DEMO_PETS);
  const [logs, setLogs] = useState<DoseLog[]>(makeSeedLogs);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [toast, setToast] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    Promise.all([AsyncStorage.getItem(PETS_KEY), AsyncStorage.getItem(LOGS_KEY)])
      .then(([savedPets, savedLogs]) => {
        if (savedPets) setPets(JSON.parse(savedPets) as Pet[]);
        if (savedLogs) setLogs(JSON.parse(savedLogs) as DoseLog[]);
      })
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    if (!loaded) return;
    void AsyncStorage.setItem(PETS_KEY, JSON.stringify(pets));
    void AsyncStorage.setItem(LOGS_KEY, JSON.stringify(logs));
  }, [loaded, logs, pets]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(timer);
  }, [toast]);

  const schedule = useMemo(
    () => buildSchedule(pets, logs, selectedDate),
    [logs, pets, selectedDate],
  );

  const logDose = (dose: ScheduledDose, status: "given" | "skipped") => {
    if (dose.status === "given" || dose.status === "skipped") return;
    const nextLog = createDoseLog(dose, status, CAREGIVER);
    setLogs((current) => [...current, nextLog]);
    if (status === "given") {
      setPets((current) =>
        current.map((pet) =>
          pet.id !== dose.pet.id
            ? pet
            : {
                ...pet,
                medications: pet.medications.map((medication) =>
                  medication.id === dose.medication.id
                    ? {
                        ...medication,
                        stock: Math.max(0, medication.stock - 1),
                      }
                    : medication,
                ),
              },
        ),
      );
      setToast(`${dose.medication.name} logged for ${dose.pet.name}`);
    } else {
      setToast(`Dose marked as skipped`);
    }
  };

  const addMedication = (petId: string, medication: Medication) => {
    setPets((current) => addMedicationToPets(current, petId, medication));
    setScreen("today");
    setToast(`${medication.name} added to today’s care plan`);
  };

  return (
    <View style={styles.app}>
      <StatusBar style={screen === "today" ? "light" : "dark"} />
      {screen === "today" && (
        <TodayScreen
          onAdd={() => setScreen("add")}
          onDateChange={setSelectedDate}
          onLog={logDose}
          schedule={schedule}
          selectedDate={selectedDate}
          topInset={insets.top}
        />
      )}
      {screen === "pets" && (
        <PetsScreen
          onAdd={() => setScreen("add")}
          pets={pets}
          topInset={insets.top}
        />
      )}
      {screen === "insights" && (
        <InsightsScreen logs={logs} pets={pets} topInset={insets.top} />
      )}
      {screen === "add" && (
        <AddMedicationScreen
          onBack={() => setScreen("today")}
          onSave={addMedication}
          pets={pets}
          topInset={insets.top}
        />
      )}

      {screen !== "add" && (
        <BottomNav
          active={screen}
          bottomInset={insets.bottom}
          onAdd={() => setScreen("add")}
          onChange={setScreen}
        />
      )}

      {toast && (
        <View style={[styles.toast, { bottom: 92 + insets.bottom }]}>
          <View style={styles.toastCheck}>
            <Ionicons name="checkmark" size={15} color={COLORS.white} />
          </View>
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      )}
    </View>
  );
}

function TodayScreen({
  schedule,
  selectedDate,
  topInset,
  onDateChange,
  onLog,
  onAdd,
}: {
  schedule: ScheduledDose[];
  selectedDate: Date;
  topInset: number;
  onDateChange: (date: Date) => void;
  onLog: (dose: ScheduledDose, status: "given" | "skipped") => void;
  onAdd: () => void;
}) {
  const given = schedule.filter((dose) => dose.status === "given").length;
  const progress = schedule.length ? given / schedule.length : 0;
  const nextDose = schedule.find(
    (dose) => dose.status !== "given" && dose.status !== "skipped",
  );
  const dates = Array.from({ length: 5 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() + index);
    return date;
  });

  return (
    <ScrollView
      contentContainerStyle={styles.todayContent}
      showsVerticalScrollIndicator={false}
      stickyHeaderIndices={[1]}
    >
      <LinearGradient
        colors={["#20394C", "#2D5362"]}
        end={{ x: 1, y: 1 }}
        style={[styles.hero, { paddingTop: topInset + 12 }]}
      >
        <View style={styles.heroHeader}>
          <View style={styles.wordmarkRow}>
            <View style={styles.logoMark}>
              <Ionicons name="paw" size={18} color={COLORS.navy} />
            </View>
            <Text style={styles.wordmark}>PawPair</Text>
          </View>
          <Pressable style={styles.profileButton}>
            <Text style={styles.profileInitial}>M</Text>
            <View style={styles.onlineDot} />
          </Pressable>
        </View>

        <View style={styles.heroCopy}>
          <Text style={styles.heroEyebrow}>GOOD EVENING, MAYA</Text>
          <Text style={styles.heroTitle}>Milo’s care is{"\n"}right on track.</Text>
          <Text style={styles.heroSubtitle}>
            {given} of {schedule.length} doses complete today
          </Text>
          {nextDose && (
            <View style={styles.nextDosePill}>
              <View
                style={[
                  styles.nextDoseDot,
                  { backgroundColor: nextDose.medication.color },
                ]}
              />
              <Text style={styles.nextDoseText}>
                Next · {nextDose.medication.name} at{" "}
                {formatTime(nextDose.scheduledTime)}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.heroPet}>
          <View style={styles.heroPetHalo} />
          <View style={styles.heroPetCircle}>
            <Text style={styles.heroPetEmoji}>🐕</Text>
          </View>
          <View style={styles.heroHeart}>
            <Ionicons name="heart" size={14} color={COLORS.coral} />
          </View>
        </View>

        <View style={styles.progressRow}>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.max(8, progress * 100)}%` },
              ]}
            />
          </View>
          <Text style={styles.progressText}>{Math.round(progress * 100)}%</Text>
        </View>
      </LinearGradient>

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
                  style={[styles.dateNumber, active && styles.dateNumberActive]}
                >
                  {date.getDate()}
                </Text>
                {active && <View style={styles.dateDot} />}
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.contentSection}>
        <View style={styles.sectionHeadingRow}>
          <View>
            <Text style={styles.sectionKicker}>CARE PLAN</Text>
            <Text style={styles.sectionTitle}>Today’s doses</Text>
          </View>
          <Pressable onPress={onAdd} style={styles.roundAddButton}>
            <Ionicons name="add" size={22} color={COLORS.coral} />
          </Pressable>
        </View>

        <View style={styles.timeline}>
          {schedule.map((dose, index) => (
            <DoseCard
              dose={dose}
              isLast={index === schedule.length - 1}
              key={dose.id}
              onLog={onLog}
            />
          ))}
        </View>

        <View style={styles.syncCard}>
          <View style={styles.syncIllustration}>
            <View style={[styles.personBubble, styles.personBubbleFirst]}>
              <Text style={styles.personText}>M</Text>
            </View>
            <View style={[styles.personBubble, styles.personBubbleSecond]}>
              <Text style={styles.personText}>A</Text>
            </View>
            <View style={styles.syncBadge}>
              <Ionicons name="sync" size={13} color={COLORS.sage} />
            </View>
          </View>
          <View style={styles.flex}>
            <Text style={styles.syncTitle}>Everyone stays in sync</Text>
            <Text style={styles.syncCopy}>
              Alex can see every dose you log, instantly.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.muted} />
        </View>
      </View>
    </ScrollView>
  );
}

function DoseCard({
  dose,
  isLast,
  onLog,
}: {
  dose: ScheduledDose;
  isLast: boolean;
  onLog: (dose: ScheduledDose, status: "given" | "skipped") => void;
}) {
  const complete = dose.status === "given";
  const skipped = dose.status === "skipped";
  const active = dose.status === "due";

  return (
    <View style={styles.timelineRow}>
      <View style={styles.timelineMarkerColumn}>
        <View
          style={[
            styles.timelineMarker,
            complete && styles.timelineMarkerComplete,
            active && styles.timelineMarkerActive,
          ]}
        >
          {complete ? (
            <Ionicons name="checkmark" size={13} color={COLORS.white} />
          ) : (
            <View
              style={[styles.markerCore, active && styles.markerCoreActive]}
            />
          )}
        </View>
        {!isLast && <View style={styles.timelineLine} />}
      </View>

      <View
        style={[
          styles.doseCard,
          active && styles.doseCardActive,
          (complete || skipped) && styles.doseCardResolved,
        ]}
      >
        <View style={styles.doseTopRow}>
          <View style={styles.timeBlock}>
            <Text
              style={[styles.doseTime, complete && styles.resolvedText]}
            >
              {formatTime(dose.scheduledTime).replace(" ", "\n")}
            </Text>
          </View>
          <View
            style={[
              styles.medIcon,
              { backgroundColor: `${dose.medication.color}1F` },
            ]}
          >
            <Ionicons
              name={dose.medication.form === "liquid" ? "water" : "medical"}
              size={20}
              color={dose.medication.color}
            />
          </View>
          <View style={styles.flex}>
            <View style={styles.medNameRow}>
              <Text
                style={[styles.medName, complete && styles.resolvedText]}
              >
                {dose.medication.name}
              </Text>
              <View
                style={[
                  styles.petTag,
                  { backgroundColor: `${dose.pet.color}26` },
                ]}
              >
                <Text style={styles.petTagText}>
                  {dose.pet.emoji} {dose.pet.name}
                </Text>
              </View>
            </View>
            <Text style={styles.medDetails}>
              {dose.medication.dosage} · {dose.medication.instructions}
            </Text>
          </View>
        </View>

        {complete && dose.log ? (
          <View style={styles.loggedRow}>
            <Ionicons
              name="checkmark-circle"
              size={17}
              color={COLORS.sage}
            />
            <Text style={styles.loggedText}>
              Given by {dose.log.completedBy} ·{" "}
              {new Date(dose.log.completedAt).toLocaleTimeString([], {
                hour: "numeric",
                minute: "2-digit",
              })}
            </Text>
          </View>
        ) : skipped ? (
          <View style={styles.loggedRow}>
            <Ionicons
              name="remove-circle-outline"
              size={17}
              color={COLORS.muted}
            />
            <Text style={styles.loggedText}>Dose skipped</Text>
          </View>
        ) : (
          <View style={styles.doseActions}>
            <Pressable
              onPress={() => onLog(dose, "skipped")}
              style={({ pressed }) => [
                styles.skipButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.skipButtonText}>Skip</Text>
            </Pressable>
            <Pressable
              onPress={() => onLog(dose, "given")}
              style={({ pressed }) => [
                styles.giveButton,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons name="checkmark" size={18} color={COLORS.white} />
              <Text style={styles.giveButtonText}>Mark as given</Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

function PetsScreen({
  pets,
  topInset,
  onAdd,
}: {
  pets: Pet[];
  topInset: number;
  onAdd: () => void;
}) {
  const [selectedPet, setSelectedPet] = useState(pets[0]?.id ?? "");
  const pet = pets.find((item) => item.id === selectedPet) ?? pets[0];

  return (
    <ScrollView
      contentContainerStyle={[styles.standardContent, { paddingTop: topInset + 14 }]}
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
              style={[styles.petSelectorItem, active && styles.petSelectorActive]}
            >
              <View
                style={[
                  styles.petSelectorAvatar,
                  { backgroundColor: `${item.color}38` },
                ]}
              >
                <Text style={styles.petSelectorEmoji}>{item.emoji}</Text>
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
              <Text style={styles.petProfileEmoji}>{pet.emoji}</Text>
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
                name="ellipsis-horizontal"
                size={20}
                color={COLORS.ink}
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
              <Ionicons name="document-text-outline" size={24} color={COLORS.sage} />
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

function MedicationCard({ medication }: { medication: Medication }) {
  const lowStock = medication.stock <= 10;
  return (
    <View style={styles.medicationCard}>
      <View
        style={[
          styles.medicationIconLarge,
          { backgroundColor: `${medication.color}20` },
        ]}
      >
        <Ionicons
          name={medication.form === "liquid" ? "water" : "medical"}
          size={23}
          color={medication.color}
        />
      </View>
      <View style={styles.flex}>
        <Text style={styles.medicationTitle}>{medication.name}</Text>
        <Text style={styles.medicationMeta}>
          {medication.dosage} · {medication.times.map(formatTime).join(" & ")}
        </Text>
        <View style={styles.stockRow}>
          <View
            style={[
              styles.stockDot,
              { backgroundColor: lowStock ? COLORS.coral : COLORS.sage },
            ]}
          />
          <Text
            style={[
              styles.stockText,
              lowStock && { color: COLORS.coral },
            ]}
          >
            {medication.stock} {medication.stockUnit} left
            {lowStock ? " · Refill soon" : ""}
          </Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={19} color={COLORS.muted} />
    </View>
  );
}

function InsightsScreen({
  pets,
  logs,
  topInset,
}: {
  pets: Pet[];
  logs: DoseLog[];
  topInset: number;
}) {
  const weekly = [100, 86, 100, 100, 72, 100, 94];
  const lowStock = pets.flatMap((pet) =>
    pet.medications
      .filter((medication) => medication.stock <= 10)
      .map((medication) => ({ pet, medication })),
  );

  return (
    <ScrollView
      contentContainerStyle={[styles.standardContent, { paddingTop: topInset + 14 }]}
      showsVerticalScrollIndicator={false}
    >
      <AppHeader
        actionIcon="share-outline"
        eyebrow="CARE AT A GLANCE"
        title="Insights"
      />

      <LinearGradient
        colors={["#E4EEE9", "#F6EBD2"]}
        end={{ x: 1, y: 1 }}
        style={styles.insightHero}
      >
        <View style={styles.insightScoreRing}>
          <Text style={styles.insightScore}>94</Text>
          <Text style={styles.insightScoreUnit}>%</Text>
        </View>
        <View style={styles.flex}>
          <Text style={styles.insightHeroKicker}>7-DAY ADHERENCE</Text>
          <Text style={styles.insightHeroTitle}>Beautiful consistency</Text>
          <Text style={styles.insightHeroCopy}>
            That’s 6% better than last week.
          </Text>
        </View>
        <Text style={styles.sparkle}>✦</Text>
      </LinearGradient>

      <View style={styles.statsRow}>
        <StatCard
          icon="checkmark-done"
          label="Doses given"
          value={`${Math.max(18, logs.filter((log) => log.status === "given").length)}`}
        />
        <StatCard icon="flame" label="Day streak" value="12" />
        <StatCard icon="people" label="Caregivers" value="2" />
      </View>

      <View style={styles.chartPanel}>
        <View style={styles.sectionHeadingRow}>
          <View>
            <Text style={styles.sectionKicker}>THIS WEEK</Text>
            <Text style={styles.sectionTitle}>Daily completion</Text>
          </View>
          <Text style={styles.textAction}>Jul 6–12</Text>
        </View>
        <View style={styles.weekChart}>
          {weekly.map((value, index) => (
            <View key={`${value}-${index}`} style={styles.weekColumn}>
              <View style={styles.weekBarTrack}>
                <View style={[styles.weekBar, { height: `${value}%` }]} />
              </View>
              <Text style={styles.weekDay}>
                {["M", "T", "W", "T", "F", "S", "S"][index]}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.sectionHeadingRow}>
        <View>
          <Text style={styles.sectionKicker}>SMART HEADS-UP</Text>
          <Text style={styles.sectionTitle}>Needs attention</Text>
        </View>
      </View>
      {lowStock.map(({ pet, medication }) => (
        <View key={`${pet.id}-${medication.id}`} style={styles.attentionCard}>
          <View style={styles.attentionIcon}>
            <Ionicons name="cube-outline" size={22} color={COLORS.coral} />
          </View>
          <View style={styles.flex}>
            <Text style={styles.attentionTitle}>
              {medication.name} is running low
            </Text>
            <Text style={styles.attentionCopy}>
              {pet.name} has about {medication.stock} doses remaining.
            </Text>
          </View>
          <Pressable style={styles.refillButton}>
            <Text style={styles.refillText}>Refill</Text>
          </Pressable>
        </View>
      ))}

      <View style={styles.careTeamCard}>
        <View style={styles.careTeamTop}>
          <View>
            <Text style={styles.careTeamKicker}>PAWPAIR FAMILY</Text>
            <Text style={styles.careTeamTitle}>Care works better together.</Text>
          </View>
          <Ionicons name="heart-circle" size={38} color={COLORS.butter} />
        </View>
        <View style={styles.caregiverRow}>
          <View style={styles.caregiverAvatar}>
            <Text style={styles.caregiverInitial}>M</Text>
          </View>
          <View style={[styles.caregiverAvatar, styles.caregiverSecond]}>
            <Text style={styles.caregiverInitial}>A</Text>
          </View>
          <Pressable style={styles.inviteButton}>
            <Ionicons name="add" size={17} color={COLORS.white} />
            <Text style={styles.inviteText}>Invite caregiver</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

function AddMedicationScreen({
  pets,
  topInset,
  onBack,
  onSave,
}: {
  pets: Pet[];
  topInset: number;
  onBack: () => void;
  onSave: (petId: string, medication: Medication) => void;
}) {
  const [petId, setPetId] = useState(pets[0]?.id ?? "");
  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [instructions, setInstructions] = useState("Give with food");
  const [time, setTime] = useState("08:00");
  const [stock, setStock] = useState("30");
  const [form, setForm] = useState<MedicationForm>("tablet");

  const save = () => {
    if (!petId || !name.trim() || !dosage.trim() || !/^\d{2}:\d{2}$/.test(time)) {
      Alert.alert(
        "A few details are missing",
        "Choose a pet and add the medication, dosage, and time.",
      );
      return;
    }
    onSave(petId, {
      id: `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`,
      name: name.trim(),
      dosage: dosage.trim(),
      instructions: instructions.trim() || "Follow veterinary instructions",
      form,
      times: [time],
      stock: Math.max(0, Number(stock) || 0),
      stockUnit: form === "liquid" ? "doses" : "tablets",
      color: COLORS.coral,
    });
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.flex}
    >
      <ScrollView
        contentContainerStyle={[
          styles.addContent,
          { paddingTop: topInset + 12 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.addHeader}>
          <Pressable onPress={onBack} style={styles.closeButton}>
            <Ionicons name="close" size={22} color={COLORS.ink} />
          </Pressable>
          <View style={styles.flex}>
            <Text style={styles.sectionKicker}>NEW CARE ROUTINE</Text>
            <Text style={styles.addTitle}>Add medication</Text>
          </View>
          <View style={styles.stepPill}>
            <Text style={styles.stepText}>1 OF 1</Text>
          </View>
        </View>

        <View style={styles.addIllustration}>
          <View style={styles.addIllustrationCircle}>
            <Ionicons name="medical" size={30} color={COLORS.coral} />
          </View>
          <View>
            <Text style={styles.addIllustrationTitle}>
              Let’s make every dose easy.
            </Text>
            <Text style={styles.addIllustrationCopy}>
              Add exactly what your veterinarian prescribed.
            </Text>
          </View>
        </View>

        <FormLabel label="Who is it for?" />
        <View style={styles.petChoiceRow}>
          {pets.map((pet) => {
            const active = pet.id === petId;
            return (
              <Pressable
                key={pet.id}
                onPress={() => setPetId(pet.id)}
                style={[styles.petChoice, active && styles.petChoiceActive]}
              >
                <Text style={styles.petChoiceEmoji}>{pet.emoji}</Text>
                <Text
                  style={[
                    styles.petChoiceName,
                    active && styles.petChoiceNameActive,
                  ]}
                >
                  {pet.name}
                </Text>
                {active && (
                  <View style={styles.choiceCheck}>
                    <Ionicons name="checkmark" size={11} color={COLORS.white} />
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>

        <FormLabel label="Medication form" />
        <ScrollView
          contentContainerStyle={styles.formChoiceRow}
          horizontal
          showsHorizontalScrollIndicator={false}
        >
          {FORM_OPTIONS.map((option) => {
            const active = option.id === form;
            return (
              <Pressable
                key={option.id}
                onPress={() => setForm(option.id)}
                style={[styles.formChoice, active && styles.formChoiceActive]}
              >
                <Ionicons
                  name={option.icon}
                  size={19}
                  color={active ? COLORS.coral : COLORS.muted}
                />
                <Text
                  style={[
                    styles.formChoiceText,
                    active && styles.formChoiceTextActive,
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.formCard}>
          <FormInput
            label="Medication name"
            onChange={setName}
            placeholder="e.g. Carprofen"
            value={name}
          />
          <View style={styles.formTwoColumns}>
            <View style={styles.flex}>
              <FormInput
                label="Dosage"
                onChange={setDosage}
                placeholder="e.g. 75 mg"
                value={dosage}
              />
            </View>
            <View style={styles.flex}>
              <FormInput
                label="Time"
                onChange={setTime}
                placeholder="08:00"
                value={time}
              />
            </View>
          </View>
          <FormInput
            label="Instructions"
            onChange={setInstructions}
            placeholder="Give with food"
            value={instructions}
          />
          <FormInput
            keyboardType="number-pad"
            label="Starting supply"
            onChange={setStock}
            placeholder="30"
            suffix={form === "liquid" ? "doses" : "tablets"}
            value={stock}
          />
        </View>

        <View style={styles.safetyNote}>
          <Ionicons
            name="shield-checkmark-outline"
            size={21}
            color={COLORS.sage}
          />
          <Text style={styles.safetyText}>
            PawPair tracks the schedule you enter. It never changes dosage or
            replaces veterinary advice.
          </Text>
        </View>

        <Pressable
          onPress={save}
          style={({ pressed }) => [
            styles.saveMedicationButton,
            pressed && styles.pressed,
          ]}
        >
          <Ionicons name="sparkles" size={19} color={COLORS.white} />
          <Text style={styles.saveMedicationText}>Add to care plan</Text>
          <Ionicons name="arrow-forward" size={19} color={COLORS.white} />
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function AppHeader({
  eyebrow,
  title,
  actionIcon,
  onAction,
}: {
  eyebrow: string;
  title: string;
  actionIcon: keyof typeof Ionicons.glyphMap;
  onAction?: () => void;
}) {
  return (
    <View style={styles.appHeader}>
      <View style={styles.flex}>
        <Text style={styles.sectionKicker}>{eyebrow}</Text>
        <Text style={styles.pageTitle}>{title}</Text>
      </View>
      <Pressable onPress={onAction} style={styles.headerAction}>
        <Ionicons name={actionIcon} size={21} color={COLORS.ink} />
      </Pressable>
    </View>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.statCard}>
      <View style={styles.statIcon}>
        <Ionicons name={icon} size={17} color={COLORS.sage} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function FormLabel({ label }: { label: string }) {
  return <Text style={styles.formLabel}>{label}</Text>;
}

function FormInput({
  label,
  value,
  placeholder,
  suffix,
  keyboardType,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  suffix?: string;
  keyboardType?: "default" | "number-pad";
  onChange: (value: string) => void;
}) {
  return (
    <View style={styles.formInputGroup}>
      <Text style={styles.formInputLabel}>{label}</Text>
      <View style={styles.formInputShell}>
        <TextInput
          accessibilityLabel={label}
          keyboardType={keyboardType}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor="#A9B0B3"
          style={styles.formInput}
          value={value}
        />
        {suffix && <Text style={styles.formInputSuffix}>{suffix}</Text>}
      </View>
    </View>
  );
}

function BottomNav({
  active,
  bottomInset,
  onChange,
  onAdd,
}: {
  active: Screen;
  bottomInset: number;
  onChange: (screen: Screen) => void;
  onAdd: () => void;
}) {
  return (
    <View style={[styles.bottomNav, { paddingBottom: Math.max(bottomInset, 10) }]}>
      <NavItem
        active={active === "today"}
        icon="home-outline"
        label="Today"
        onPress={() => onChange("today")}
      />
      <NavItem
        active={active === "pets"}
        icon="paw-outline"
        label="Pets"
        onPress={() => onChange("pets")}
      />
      <Pressable onPress={onAdd} style={styles.navAdd}>
        <LinearGradient
          colors={["#F28A70", "#E96D58"]}
          style={styles.navAddGradient}
        >
          <Ionicons name="add" size={27} color={COLORS.white} />
        </LinearGradient>
      </Pressable>
      <NavItem
        active={active === "insights"}
        icon="stats-chart-outline"
        label="Insights"
        onPress={() => onChange("insights")}
      />
      <NavItem
        active={false}
        icon="person-outline"
        label="Profile"
        onPress={() => undefined}
      />
    </View>
  );
}

function NavItem({
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
    <Pressable onPress={onPress} style={styles.navItem}>
      <View style={[styles.navIconWrap, active && styles.navIconWrapActive]}>
        <Ionicons
          name={active ? (icon.replace("-outline", "") as keyof typeof Ionicons.glyphMap) : icon}
          size={21}
          color={active ? COLORS.coral : "#97A1A6"}
        />
      </View>
      <Text style={[styles.navLabel, active && styles.navLabelActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Fraunces_700Bold,
    Manrope_400Regular,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingScreen}>
        <View style={styles.loadingMark}>
          <Ionicons name="paw" size={24} color={COLORS.navy} />
        </View>
        <Text style={styles.loadingWordmark}>PawPair</Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  addContent: { paddingBottom: 34, paddingHorizontal: 18 },
  addHeader: { alignItems: "center", flexDirection: "row", gap: 12, marginBottom: 20 },
  addIllustration: { alignItems: "center", backgroundColor: COLORS.butterSoft, borderRadius: 22, flexDirection: "row", gap: 14, marginBottom: 24, padding: 17 },
  addIllustrationCircle: { alignItems: "center", backgroundColor: COLORS.paper, borderRadius: 18, height: 58, justifyContent: "center", transform: [{ rotate: "-5deg" }], width: 58 },
  addIllustrationCopy: { color: COLORS.muted, fontFamily: "Manrope_400Regular", fontSize: 11, marginTop: 4 },
  addIllustrationTitle: { color: COLORS.ink, fontFamily: "Manrope_800ExtraBold", fontSize: 15 },
  addTitle: { color: COLORS.ink, fontFamily: "Fraunces_700Bold", fontSize: 28, letterSpacing: -0.6, marginTop: 2 },
  app: { backgroundColor: COLORS.background, flex: 1 },
  appHeader: { alignItems: "center", flexDirection: "row", marginBottom: 24 },
  attentionCard: { alignItems: "center", backgroundColor: COLORS.paper, borderColor: COLORS.line, borderRadius: 19, borderWidth: 1, flexDirection: "row", gap: 12, marginBottom: 10, padding: 15 },
  attentionCopy: { color: COLORS.muted, fontFamily: "Manrope_400Regular", fontSize: 11, marginTop: 4 },
  attentionIcon: { alignItems: "center", backgroundColor: COLORS.coralSoft, borderRadius: 14, height: 46, justifyContent: "center", width: 46 },
  attentionTitle: { color: COLORS.ink, fontFamily: "Manrope_800ExtraBold", fontSize: 13 },
  bottomNav: { alignItems: "flex-end", backgroundColor: COLORS.paper, borderTopColor: COLORS.line, borderTopWidth: 1, flexDirection: "row", paddingHorizontal: 8, paddingTop: 8 },
  caregiverAvatar: { alignItems: "center", backgroundColor: COLORS.coral, borderColor: COLORS.navy, borderRadius: 17, borderWidth: 2, height: 34, justifyContent: "center", width: 34 },
  caregiverInitial: { color: COLORS.white, fontSize: 12, fontWeight: "900" },
  caregiverRow: { alignItems: "center", flexDirection: "row", marginTop: 20 },
  caregiverSecond: { backgroundColor: COLORS.sage, marginLeft: -8 },
  careTeamCard: { backgroundColor: COLORS.navy, borderRadius: 23, marginTop: 18, overflow: "hidden", padding: 20 },
  careTeamKicker: { color: "#A9C9C0", fontFamily: "Manrope_800ExtraBold", fontSize: 9, letterSpacing: 1.2 },
  careTeamTitle: { color: COLORS.white, fontFamily: "Fraunces_700Bold", fontSize: 20, marginTop: 5 },
  careTeamTop: { flexDirection: "row", justifyContent: "space-between" },
  chartPanel: { backgroundColor: COLORS.paper, borderColor: COLORS.line, borderRadius: 23, borderWidth: 1, marginBottom: 24, padding: 18 },
  choiceCheck: { alignItems: "center", backgroundColor: COLORS.coral, borderRadius: 8, height: 16, justifyContent: "center", position: "absolute", right: 7, top: 7, width: 16 },
  closeButton: { alignItems: "center", backgroundColor: COLORS.paper, borderColor: COLORS.line, borderRadius: 15, borderWidth: 1, height: 44, justifyContent: "center", width: 44 },
  contentSection: { paddingBottom: 28, paddingHorizontal: 18, paddingTop: 22 },
  dateDay: { color: COLORS.muted, fontFamily: "Manrope_800ExtraBold", fontSize: 8, letterSpacing: 0.6 },
  dateDayActive: { color: COLORS.coral },
  dateDot: { backgroundColor: COLORS.coral, borderRadius: 2, bottom: 5, height: 4, position: "absolute", width: 4 },
  dateItem: { alignItems: "center", borderRadius: 15, flex: 1, height: 60, justifyContent: "center", position: "relative" },
  dateItemActive: { backgroundColor: COLORS.coralSoft },
  dateNumber: { color: COLORS.ink, fontFamily: "Manrope_800ExtraBold", fontSize: 17, marginTop: 4 },
  dateNumberActive: { color: COLORS.coral },
  dateRail: { backgroundColor: COLORS.paper, borderColor: COLORS.line, borderRadius: 20, borderWidth: 1, elevation: 2, flexDirection: "row", padding: 5, shadowColor: COLORS.ink, shadowOffset: { height: 5, width: 0 }, shadowOpacity: 0.05, shadowRadius: 12 },
  dateRailWrap: { backgroundColor: COLORS.background, paddingHorizontal: 18, paddingTop: 12 },
  doseActions: { flexDirection: "row", gap: 9, marginTop: 14 },
  doseCard: { backgroundColor: COLORS.paper, borderColor: COLORS.line, borderRadius: 20, borderWidth: 1, elevation: 1, flex: 1, marginBottom: 14, padding: 15, shadowColor: COLORS.ink, shadowOffset: { height: 5, width: 0 }, shadowOpacity: 0.035, shadowRadius: 10 },
  doseCardActive: { borderColor: "#F0A797", shadowColor: COLORS.coral, shadowOffset: { height: 5, width: 0 }, shadowOpacity: 0.08, shadowRadius: 14 },
  doseCardResolved: { backgroundColor: "#FAF9F5" },
  doseTime: { color: COLORS.ink, fontFamily: "Manrope_800ExtraBold", fontSize: 10, lineHeight: 13, textAlign: "center" },
  doseTopRow: { alignItems: "center", flexDirection: "row" },
  flex: { flex: 1 },
  formCard: { backgroundColor: COLORS.paper, borderColor: COLORS.line, borderRadius: 22, borderWidth: 1, marginTop: 5, padding: 17 },
  formChoice: { alignItems: "center", backgroundColor: COLORS.paper, borderColor: COLORS.line, borderRadius: 14, borderWidth: 1, flexDirection: "row", gap: 7, paddingHorizontal: 13, paddingVertical: 11 },
  formChoiceActive: { backgroundColor: COLORS.coralSoft, borderColor: "#F0A797" },
  formChoiceRow: { gap: 8, paddingBottom: 18 },
  formChoiceText: { color: COLORS.muted, fontFamily: "Manrope_700Bold", fontSize: 11 },
  formChoiceTextActive: { color: COLORS.coral },
  formInput: { color: COLORS.ink, flex: 1, fontFamily: "Manrope_700Bold", fontSize: 14, padding: 0 },
  formInputGroup: { marginBottom: 15 },
  formInputLabel: { color: COLORS.ink, fontFamily: "Manrope_800ExtraBold", fontSize: 11, marginBottom: 7 },
  formInputShell: { alignItems: "center", backgroundColor: COLORS.background, borderColor: COLORS.line, borderRadius: 13, borderWidth: 1, flexDirection: "row", height: 50, paddingHorizontal: 13 },
  formInputSuffix: { color: COLORS.muted, fontFamily: "Manrope_700Bold", fontSize: 11 },
  formLabel: { color: COLORS.ink, fontFamily: "Manrope_800ExtraBold", fontSize: 12, marginBottom: 10 },
  formTwoColumns: { flexDirection: "row", gap: 10 },
  giveButton: { alignItems: "center", backgroundColor: COLORS.coral, borderRadius: 12, flex: 1.75, flexDirection: "row", gap: 7, justifyContent: "center", minHeight: 41 },
  giveButtonText: { color: COLORS.white, fontFamily: "Manrope_800ExtraBold", fontSize: 11 },
  headerAction: { alignItems: "center", backgroundColor: COLORS.paper, borderColor: COLORS.line, borderRadius: 15, borderWidth: 1, height: 44, justifyContent: "center", width: 44 },
  healthyDot: { backgroundColor: COLORS.sage, borderRadius: 4, height: 7, width: 7 },
  hero: { minHeight: 326, overflow: "hidden", paddingBottom: 20, paddingHorizontal: 20, position: "relative" },
  heroCopy: { marginTop: 30, zIndex: 2 },
  heroEyebrow: { color: "#B5D6CD", fontFamily: "Manrope_800ExtraBold", fontSize: 9, letterSpacing: 1.4 },
  heroHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  heroHeart: { alignItems: "center", backgroundColor: COLORS.paper, borderRadius: 17, bottom: 7, height: 32, justifyContent: "center", position: "absolute", right: 3, shadowColor: "#000", shadowOffset: { height: 3, width: 0 }, shadowOpacity: 0.12, shadowRadius: 6, width: 32 },
  heroPet: { bottom: 54, height: 150, position: "absolute", right: 10, width: 150 },
  heroPetCircle: { alignItems: "center", backgroundColor: COLORS.butter, borderRadius: 52, bottom: 12, height: 104, justifyContent: "center", position: "absolute", right: 15, transform: [{ rotate: "4deg" }], width: 104 },
  heroPetEmoji: { fontSize: 61, transform: [{ rotate: "-4deg" }] },
  heroPetHalo: { borderColor: "rgba(255,255,255,0.13)", borderRadius: 70, borderWidth: 20, height: 140, position: "absolute", right: 0, top: 0, width: 140 },
  heroSubtitle: { color: "rgba(255,255,255,0.72)", fontFamily: "Manrope_600SemiBold", fontSize: 11, marginTop: 11 },
  heroTitle: { color: COLORS.white, fontFamily: "Fraunces_700Bold", fontSize: 34, letterSpacing: -0.8, lineHeight: 38, marginTop: 8 },
  insightHero: { alignItems: "center", borderRadius: 24, flexDirection: "row", gap: 15, marginBottom: 12, overflow: "hidden", padding: 20, position: "relative" },
  insightHeroCopy: { color: COLORS.muted, fontFamily: "Manrope_400Regular", fontSize: 11, marginTop: 5 },
  insightHeroKicker: { color: COLORS.sage, fontFamily: "Manrope_800ExtraBold", fontSize: 8, letterSpacing: 1 },
  insightHeroTitle: { color: COLORS.ink, fontFamily: "Fraunces_700Bold", fontSize: 20, marginTop: 4 },
  insightScore: { color: COLORS.ink, fontSize: 30, fontWeight: "900", letterSpacing: -1.5 },
  insightScoreRing: { alignItems: "baseline", backgroundColor: "rgba(255,255,255,0.75)", borderColor: COLORS.white, borderRadius: 35, borderWidth: 5, flexDirection: "row", height: 70, justifyContent: "center", paddingTop: 11, width: 70 },
  insightScoreUnit: { color: COLORS.sage, fontSize: 11, fontWeight: "900" },
  inviteButton: { alignItems: "center", backgroundColor: COLORS.coral, borderRadius: 13, flexDirection: "row", gap: 6, marginLeft: "auto", paddingHorizontal: 13, paddingVertical: 10 },
  inviteText: { color: COLORS.white, fontSize: 10, fontWeight: "800" },
  loggedRow: { alignItems: "center", borderTopColor: COLORS.line, borderTopWidth: 1, flexDirection: "row", gap: 6, marginTop: 13, paddingTop: 11 },
  loggedText: { color: COLORS.muted, fontFamily: "Manrope_600SemiBold", fontSize: 10 },
  loadingMark: { alignItems: "center", backgroundColor: COLORS.butter, borderRadius: 19, height: 52, justifyContent: "center", transform: [{ rotate: "-6deg" }], width: 52 },
  loadingScreen: { alignItems: "center", backgroundColor: COLORS.background, flex: 1, gap: 14, justifyContent: "center" },
  loadingWordmark: { color: COLORS.ink, fontFamily: "Fraunces_700Bold", fontSize: 24 },
  logoMark: { alignItems: "center", backgroundColor: COLORS.butter, borderRadius: 12, height: 34, justifyContent: "center", transform: [{ rotate: "-5deg" }], width: 34 },
  markerCore: { backgroundColor: COLORS.line, borderRadius: 4, height: 7, width: 7 },
  markerCoreActive: { backgroundColor: COLORS.coral },
  medDetails: { color: COLORS.muted, fontFamily: "Manrope_400Regular", fontSize: 10, marginTop: 5 },
  medIcon: { alignItems: "center", borderRadius: 13, height: 42, justifyContent: "center", marginRight: 10, width: 42 },
  medName: { color: COLORS.ink, fontFamily: "Manrope_800ExtraBold", fontSize: 14 },
  medNameRow: { alignItems: "center", flexDirection: "row", gap: 7 },
  medicationCard: { alignItems: "center", backgroundColor: COLORS.paper, borderColor: COLORS.line, borderRadius: 19, borderWidth: 1, flexDirection: "row", gap: 12, marginBottom: 10, padding: 15 },
  medicationIconLarge: { alignItems: "center", borderRadius: 15, height: 50, justifyContent: "center", width: 50 },
  medicationMeta: { color: COLORS.muted, fontFamily: "Manrope_400Regular", fontSize: 10, marginTop: 4 },
  medicationTitle: { color: COLORS.ink, fontFamily: "Manrope_800ExtraBold", fontSize: 14 },
  moreButton: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.56)", borderRadius: 12, height: 38, justifyContent: "center", width: 38 },
  navAdd: { alignItems: "center", flex: 1, marginTop: -24 },
  navAddGradient: { alignItems: "center", borderColor: COLORS.paper, borderRadius: 25, borderWidth: 4, height: 54, justifyContent: "center", shadowColor: COLORS.coral, shadowOffset: { height: 6, width: 0 }, shadowOpacity: 0.26, shadowRadius: 8, width: 54 },
  navIconWrap: { alignItems: "center", borderRadius: 11, height: 29, justifyContent: "center", width: 39 },
  navIconWrapActive: { backgroundColor: COLORS.coralSoft },
  navItem: { alignItems: "center", flex: 1, gap: 2 },
  navLabel: { color: "#97A1A6", fontFamily: "Manrope_700Bold", fontSize: 8 },
  navLabelActive: { color: COLORS.coral },
  nextDoseDot: { borderRadius: 4, height: 7, width: 7 },
  nextDosePill: { alignItems: "center", alignSelf: "flex-start", backgroundColor: "rgba(255,255,255,0.11)", borderColor: "rgba(255,255,255,0.13)", borderRadius: 12, borderWidth: 1, flexDirection: "row", gap: 7, marginTop: 14, paddingHorizontal: 10, paddingVertical: 8 },
  nextDoseText: { color: "rgba(255,255,255,0.88)", fontFamily: "Manrope_700Bold", fontSize: 9 },
  onlineDot: { backgroundColor: "#83D0A8", borderColor: COLORS.navy, borderRadius: 5, borderWidth: 2, bottom: -1, height: 10, position: "absolute", right: -1, width: 10 },
  pageTitle: { color: COLORS.ink, fontFamily: "Fraunces_700Bold", fontSize: 32, letterSpacing: -0.7, marginTop: 2 },
  personBubble: { alignItems: "center", borderColor: COLORS.paper, borderRadius: 17, borderWidth: 2, height: 34, justifyContent: "center", position: "absolute", width: 34 },
  personBubbleFirst: { backgroundColor: COLORS.coral, left: 2 },
  personBubbleSecond: { backgroundColor: COLORS.sage, left: 26 },
  personText: { color: COLORS.white, fontSize: 11, fontWeight: "900" },
  petChoice: { alignItems: "center", backgroundColor: COLORS.paper, borderColor: COLORS.line, borderRadius: 18, borderWidth: 1, flex: 1, padding: 13, position: "relative" },
  petChoiceActive: { backgroundColor: COLORS.coralSoft, borderColor: "#F0A797" },
  petChoiceEmoji: { fontSize: 28 },
  petChoiceName: { color: COLORS.muted, fontSize: 11, fontWeight: "800", marginTop: 5 },
  petChoiceNameActive: { color: COLORS.coral },
  petChoiceRow: { flexDirection: "row", gap: 9, marginBottom: 22 },
  petProfileAvatar: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.68)", borderRadius: 30, height: 66, justifyContent: "center", marginRight: 14, width: 66 },
  petProfileCard: { alignItems: "center", borderColor: "rgba(255,255,255,0.75)", borderRadius: 24, borderWidth: 1, elevation: 1, flexDirection: "row", marginBottom: 24, padding: 18, shadowColor: COLORS.ink, shadowOffset: { height: 6, width: 0 }, shadowOpacity: 0.05, shadowRadius: 14 },
  petProfileEmoji: { fontSize: 39 },
  petProfileMeta: { color: COLORS.muted, fontSize: 11, marginTop: 4 },
  petProfileName: { color: COLORS.ink, fontFamily: "Fraunces_700Bold", fontSize: 24 },
  petProfileStatus: { alignItems: "center", flexDirection: "row", gap: 5, marginTop: 8 },
  petProfileStatusText: { color: COLORS.sage, fontSize: 9, fontWeight: "800" },
  petSelector: { gap: 14, paddingBottom: 18 },
  petSelectorActive: { backgroundColor: COLORS.paper, borderColor: COLORS.line, borderWidth: 1 },
  petSelectorAvatar: { alignItems: "center", borderRadius: 22, height: 46, justifyContent: "center", width: 46 },
  petSelectorEmoji: { fontSize: 27 },
  petSelectorItem: { alignItems: "center", borderColor: "transparent", borderRadius: 18, borderWidth: 1, flexDirection: "row", gap: 8, paddingHorizontal: 9, paddingVertical: 7 },
  petSelectorName: { color: COLORS.muted, fontSize: 12, fontWeight: "800", paddingRight: 4 },
  petSelectorNameActive: { color: COLORS.ink },
  petTag: { borderRadius: 7, paddingHorizontal: 6, paddingVertical: 3 },
  petTagText: { color: COLORS.ink, fontSize: 8, fontWeight: "800" },
  pressed: { opacity: 0.78, transform: [{ scale: 0.985 }] },
  profileButton: { alignItems: "center", backgroundColor: "#365B6B", borderColor: "rgba(255,255,255,0.25)", borderRadius: 17, borderWidth: 1, height: 38, justifyContent: "center", position: "relative", width: 38 },
  profileInitial: { color: COLORS.white, fontSize: 13, fontWeight: "900" },
  progressFill: { backgroundColor: COLORS.butter, borderRadius: 4, height: 6 },
  progressRow: { alignItems: "center", bottom: 22, flexDirection: "row", gap: 9, left: 20, position: "absolute", width: "50%" },
  progressText: { color: COLORS.white, fontSize: 9, fontWeight: "900" },
  progressTrack: { backgroundColor: "rgba(255,255,255,0.16)", borderRadius: 4, flex: 1, height: 6, overflow: "hidden" },
  proPill: { backgroundColor: COLORS.butterSoft, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5 },
  proPillText: { color: "#A77921", fontSize: 8, fontWeight: "900", letterSpacing: 0.5 },
  refillButton: { backgroundColor: COLORS.coralSoft, borderRadius: 10, paddingHorizontal: 11, paddingVertical: 8 },
  refillText: { color: COLORS.coral, fontSize: 9, fontWeight: "900" },
  resolvedText: { color: COLORS.muted },
  roundAddButton: { alignItems: "center", backgroundColor: COLORS.coralSoft, borderRadius: 15, height: 42, justifyContent: "center", width: 42 },
  safetyNote: { alignItems: "flex-start", backgroundColor: COLORS.sageSoft, borderRadius: 16, flexDirection: "row", gap: 10, marginVertical: 16, padding: 14 },
  safetyText: { color: COLORS.ink, flex: 1, fontSize: 10, lineHeight: 16 },
  saveMedicationButton: { alignItems: "center", backgroundColor: COLORS.coral, borderRadius: 17, flexDirection: "row", gap: 9, justifyContent: "center", minHeight: 56, paddingHorizontal: 18 },
  saveMedicationText: { color: COLORS.white, flex: 1, fontFamily: "Manrope_800ExtraBold", fontSize: 14, textAlign: "center" },
  sectionHeadingRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: 14 },
  sectionKicker: { color: COLORS.sage, fontFamily: "Manrope_800ExtraBold", fontSize: 8, letterSpacing: 1.3 },
  sectionTitle: { color: COLORS.ink, fontFamily: "Fraunces_700Bold", fontSize: 23, letterSpacing: -0.4, marginTop: 3 },
  skipButton: { alignItems: "center", backgroundColor: COLORS.background, borderRadius: 12, flex: 0.75, justifyContent: "center", minHeight: 41 },
  skipButtonText: { color: COLORS.muted, fontFamily: "Manrope_800ExtraBold", fontSize: 10 },
  sparkle: { color: COLORS.coral, fontSize: 20, position: "absolute", right: 10, top: 8 },
  standardContent: { paddingBottom: 32, paddingHorizontal: 18 },
  statCard: { alignItems: "center", backgroundColor: COLORS.paper, borderColor: COLORS.line, borderRadius: 17, borderWidth: 1, flex: 1, paddingHorizontal: 7, paddingVertical: 14 },
  statIcon: { alignItems: "center", backgroundColor: COLORS.sageSoft, borderRadius: 10, height: 30, justifyContent: "center", marginBottom: 7, width: 30 },
  statLabel: { color: COLORS.muted, fontSize: 8, marginTop: 3, textAlign: "center" },
  statsRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  statValue: { color: COLORS.ink, fontSize: 18, fontWeight: "900" },
  stepPill: { backgroundColor: COLORS.sageSoft, borderRadius: 9, paddingHorizontal: 9, paddingVertical: 6 },
  stepText: { color: COLORS.sage, fontSize: 8, fontWeight: "900", letterSpacing: 0.7 },
  stockDot: { borderRadius: 3, height: 6, width: 6 },
  stockRow: { alignItems: "center", flexDirection: "row", gap: 5, marginTop: 7 },
  stockText: { color: COLORS.sage, fontSize: 9, fontWeight: "700" },
  syncBadge: { alignItems: "center", backgroundColor: COLORS.paper, borderRadius: 10, height: 20, justifyContent: "center", left: 22, position: "absolute", top: 8, width: 20 },
  syncCard: { alignItems: "center", backgroundColor: COLORS.sageSoft, borderRadius: 20, flexDirection: "row", gap: 12, marginTop: 6, padding: 16 },
  syncCopy: { color: COLORS.muted, fontFamily: "Manrope_400Regular", fontSize: 10, marginTop: 4 },
  syncIllustration: { height: 38, position: "relative", width: 62 },
  syncTitle: { color: COLORS.ink, fontFamily: "Manrope_800ExtraBold", fontSize: 13 },
  textAction: { color: COLORS.coral, fontSize: 10, fontWeight: "900" },
  timeBlock: { alignItems: "center", marginRight: 9, width: 35 },
  timeline: { marginTop: 2 },
  timelineLine: { backgroundColor: COLORS.line, flex: 1, marginVertical: 3, width: 1.5 },
  timelineMarker: { alignItems: "center", backgroundColor: COLORS.paper, borderColor: COLORS.line, borderRadius: 10, borderWidth: 1.5, height: 20, justifyContent: "center", width: 20 },
  timelineMarkerActive: { borderColor: COLORS.coral },
  timelineMarkerColumn: { alignItems: "center", marginRight: 8, width: 20 },
  timelineMarkerComplete: { backgroundColor: COLORS.sage, borderColor: COLORS.sage },
  timelineRow: { alignItems: "stretch", flexDirection: "row" },
  toast: { alignItems: "center", alignSelf: "center", backgroundColor: COLORS.ink, borderRadius: 16, flexDirection: "row", gap: 9, left: 22, paddingHorizontal: 15, paddingVertical: 13, position: "absolute", right: 22, shadowColor: "#000", shadowOffset: { height: 7, width: 0 }, shadowOpacity: 0.18, shadowRadius: 14 },
  toastCheck: { alignItems: "center", backgroundColor: COLORS.sage, borderRadius: 10, height: 21, justifyContent: "center", width: 21 },
  toastText: { color: COLORS.white, flex: 1, fontFamily: "Manrope_700Bold", fontSize: 11 },
  todayContent: { paddingBottom: 24 },
  vetCard: { alignItems: "center", backgroundColor: COLORS.sageSoft, borderRadius: 20, flexDirection: "row", gap: 12, marginTop: 12, padding: 16 },
  vetCopy: { color: COLORS.muted, fontFamily: "Manrope_400Regular", fontSize: 10, lineHeight: 15, marginTop: 4 },
  vetIcon: { alignItems: "center", backgroundColor: COLORS.paper, borderRadius: 14, height: 48, justifyContent: "center", width: 48 },
  vetTitle: { color: COLORS.ink, fontFamily: "Manrope_800ExtraBold", fontSize: 13 },
  weekBar: { backgroundColor: COLORS.sage, borderRadius: 5, bottom: 0, position: "absolute", width: "100%" },
  weekBarTrack: { backgroundColor: COLORS.sageSoft, borderRadius: 5, flex: 1, overflow: "hidden", width: 18 },
  weekChart: { flexDirection: "row", gap: 14, height: 150, justifyContent: "center", marginTop: 8 },
  weekColumn: { alignItems: "center", flex: 1, gap: 7 },
  weekDay: { color: COLORS.muted, fontSize: 9, fontWeight: "800" },
  wordmark: { color: COLORS.white, fontFamily: "Manrope_800ExtraBold", fontSize: 18, letterSpacing: -0.5 },
  wordmarkRow: { alignItems: "center", flexDirection: "row", gap: 9 },
});
