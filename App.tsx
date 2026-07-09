import AsyncStorage from "@react-native-async-storage/async-storage";
import { Fraunces_700Bold } from "@expo-google-fonts/fraunces/700Bold";
import { Manrope_400Regular } from "@expo-google-fonts/manrope/400Regular";
import { Manrope_600SemiBold } from "@expo-google-fonts/manrope/600SemiBold";
import { Manrope_700Bold } from "@expo-google-fonts/manrope/700Bold";
import { Manrope_800ExtraBold } from "@expo-google-fonts/manrope/800ExtraBold";
import { useFonts } from "expo-font";
import * as Haptics from "expo-haptics";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { BottomNav } from "./src/components/BottomNav";
import { LoadingScreen } from "./src/components/LoadingScreen";
import { Toast } from "./src/components/Toast";
import { AddMedicationScreen } from "./src/features/medications/AddMedicationScreen";
import { InsightsScreen } from "./src/features/insights/InsightsScreen";
import { PetsScreen } from "./src/features/pets/PetsScreen";
import { TodayScreen } from "./src/features/today/TodayScreen";
import { colors } from "./src/design";
import {
  addMedicationToPets,
  buildSchedule,
  createDoseLog,
  DEMO_PETS,
} from "./src/schedule";
import type { DoseLog, Medication, Pet, ScheduledDose } from "./src/types";

type Screen = "today" | "pets" | "insights" | "add";

const PETS_KEY = "pawpair.pets.v2";
const LOGS_KEY = "pawpair.logs.v2";
const CAREGIVER = "Maya";

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
    void Haptics.notificationAsync(
      status === "given"
        ? Haptics.NotificationFeedbackType.Success
        : Haptics.NotificationFeedbackType.Warning,
    );
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
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setPets((current) => addMedicationToPets(current, petId, medication));
    setScreen("today");
    setToast(`${medication.name} added to today’s care plan`);
  };

  return (
    <View style={styles.app}>
      <StatusBar style={screen === "today" ? "light" : "dark"} />
      {screen === "today" && (
        <TodayScreen
          appIcon={require("./assets/pawpair-icon.png")}
          heroPet={require("./assets/pawpair-milo.png")}
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
          petImages={{
            milo: require("./assets/pawpair-milo.png"),
            luna: require("./assets/pawpair-luna.png"),
          }}
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
          petImages={{
            milo: require("./assets/pawpair-milo.png"),
            luna: require("./assets/pawpair-luna.png"),
          }}
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

      {toast && <Toast bottomInset={insets.bottom} text={toast} />}
    </View>
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
    return <LoadingScreen icon={require("./assets/pawpair-icon.png")} />;
  }

  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  app: { backgroundColor: colors.background, flex: 1 },
});
