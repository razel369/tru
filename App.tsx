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
import { StyleSheet, View } from "react-native";
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { BottomNav } from "./src/components/BottomNav";
import { LoadingScreen } from "./src/components/LoadingScreen";
import { Toast } from "./src/components/Toast";
import { colors } from "./src/design";
import { ensureMigrated } from "./src/data/database";
import { scheduleAllPets } from "./src/features/notifications";
import { makeExpoBackend } from "./src/features/notifications/expo-backend";
import { __setSchedulingBackend } from "./src/features/notifications/service";
import { __setDoseLogger, handleNotificationAction } from "./src/features/notifications/bridge";
import { AddMedicationScreen } from "./src/features/medications/AddMedicationScreen";
import { MedicationFormScreen } from "./src/features/medications/MedicationFormScreen";
import { MedicationMenu } from "./src/features/medications/MedicationMenu";
import { InsightsScreen } from "./src/features/insights/InsightsScreen";
import { HealthScreen } from "./src/features/notifications/HealthScreen";
import { OnboardingFlow } from "./src/features/onboarding/OnboardingFlow";
import { PetsScreen } from "./src/features/pets/PetsScreen";
import { PetFormScreen } from "./src/features/pets/PetFormScreen";
import { PetMenu } from "./src/features/pets/PetMenu";
import { buildScheduleFromEngine } from "./src/features/schedules/adapter";
import { TodayScreen } from "./src/features/today/TodayScreen";
import { SettingsScreen } from "./src/features/settings/SettingsScreen";
import { PaywallScreen } from "./src/features/subscriptions/PaywallScreen";
import { HouseholdScreen } from "./src/features/household/HouseholdScreen";
import { ReportScreen } from "./src/features/reports/ReportScreen";
import {
  addMedicationToPets,
  createDoseLog,
  DEMO_PETS,
} from "./src/schedule";
import type { DoseLog, Medication, Pet, ScheduledDose } from "./src/types";

type Screen =
  | "today"
  | "pets"
  | "insights"
  | "add"
  | "health"
  | "edit-medication"
  | "medication-menu"
  | "settings"
  | "paywall"
  | "household"
  | "add-pet"
  | "edit-pet"
  | "pet-menu"
  | "report";

const PETS_KEY = "pawpair.pets.v2";
const LOGS_KEY = "pawpair.logs.v2";
const ONBOARDING_KEY = "pawpair.onboarding.done.v1";
const CAREGIVER = "Maya";

function makeSeedLogs(): DoseLog[] {
  const now = new Date();
  const schedule = buildScheduleFromEngine(DEMO_PETS, [], now, 12 * 60);
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
  const [editingMedication, setEditingMedication] = useState<{
    petId: string;
    medicationId: string;
  } | null>(null);
  const [menuMedication, setMenuMedication] = useState<{
    petId: string;
    medicationId: string;
  } | null>(null);
  const [editingPetOnly, setEditingPetOnly] = useState<{
    petId: string;
  } | null>(null);
  const [menuPetOnly, setMenuPetOnly] = useState<{
    petId: string;
  } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  /** `null` while we are reading storage. `true` if onboarding is done, `false` if not. */
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);

  useEffect(() => {
    void ensureMigrated().catch((error) => {
      // eslint-disable-next-line no-console
      console.warn("[pawpair] ensureMigrated failed", error);
    });

    // Wire the production notification backend. The web and test
    // environments keep the no-op default; iOS and Android get the
    // expo-notifications adapter.
    void makeExpoBackend()
      .then(__setSchedulingBackend)
      .catch((error) => {
        // eslint-disable-next-line no-console
        console.warn("[pawpair] expo backend unavailable", error);
      });

    Promise.all([
      AsyncStorage.getItem(PETS_KEY),
      AsyncStorage.getItem(LOGS_KEY),
      AsyncStorage.getItem(ONBOARDING_KEY),
    ])
      .then(([savedPets, savedLogs, savedOnboardingFlag]) => {
        if (savedPets) setPets(JSON.parse(savedPets) as Pet[]);
        if (savedLogs) setLogs(JSON.parse(savedLogs) as DoseLog[]);
        if (savedPets) {
          setOnboardingDone(true);
        } else if (savedOnboardingFlag === "skipped") {
          // User already chose "Continue with demo data"; we stored
          // DEMO_PETS already, so this branch is the demo-data path.
          setOnboardingDone(true);
        } else if (savedOnboardingFlag === "completed") {
          // Edge case: onboarding marked complete but no pets saved
          // (storage cleared). Treat as not-done so the user can
          // re-onboard.
          setOnboardingDone(false);
        } else {
          setOnboardingDone(false);
        }
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

  // Reschedule local notifications whenever the pet list changes
  // and the app has finished loading. The web and the no-op
  // backend (tests) both make this a no-op; on a real device the
  // notifications are scheduled through expo-notifications.
  useEffect(() => {
    if (!loaded) return;
    if (pets.length === 0) return;
    void scheduleAllPets(pets, new Date()).catch((error) => {
      // eslint-disable-next-line no-console
      console.warn("[pawpair] scheduleAllPets failed", error);
    });
  }, [loaded, pets]);

  // Wire the notification action bridge. When the user taps
  // Given/Skip from a system notification, the dose is logged
  // here so the host (web or native) keeps a single source of
  // truth for state.
  useEffect(() => {
    __setDoseLogger((params) => {
      // Translate the notification's "log this dose" intent
      // into a ScheduledDose-shaped update on the current pet
      // list. The action only runs on native; the web bundle
      // never calls this path because the no-op backend never
      // dispatches.
      const [petId, medicationId] = params.scheduleId.replace(
        /^med-/,
        "",
      ).split("::");
      const pet = pets.find((p) => p.id === petId);
      const medication = pet?.medications.find(
        (m) => m.id === medicationId,
      );
      if (!pet || !medication) return;
      const dose: ScheduledDose = {
        id: params.scheduledDoseKey,
        pet,
        medication,
        scheduledTime: new Date(params.atUtc).toISOString().slice(11, 16),
        status: params.action,
      };
      logDose(dose, params.action);
    });
    return () => __setDoseLogger(null);
    // logDose is captured by closure; we only need to set the
    // logger once after pets first load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, pets]);

  const schedule = useMemo(
    () => buildScheduleFromEngine(pets, logs, selectedDate),
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

  const updateMedication = (
    petId: string,
    medicationId: string,
    next: Medication,
  ) => {
    setPets((current) =>
      current.map((pet) =>
        pet.id !== petId
          ? pet
          : {
              ...pet,
              medications: pet.medications.map((m) =>
                m.id === medicationId ? next : m,
              ),
            },
      ),
    );
    setScreen("today");
    setToast(`${next.name} updated`);
  };

  const archiveMedication = (petId: string, medicationId: string) => {
    setPets((current) =>
      current.map((pet) =>
        pet.id !== petId
          ? pet
          : {
              ...pet,
              medications: pet.medications.filter(
                (m) => m.id !== medicationId,
              ),
            },
      ),
    );
    setMenuMedication(null);
    setToast("Medication archived");
  };

  const addPet = (pet: Pet) => {
    setPets((current) => [...current, pet]);
    setScreen("pets");
    setToast(`${pet.name} added to your family`);
  };

  const updatePet = (pet: Pet) => {
    setPets((current) =>
      current.map((p) => (p.id === pet.id ? pet : p)),
    );
    setEditingPetOnly(null);
    setMenuPetOnly(null);
    setScreen("pets");
    setToast(`${pet.name} updated`);
  };

  const archivePet = (petId: string) => {
    const pet = pets.find((p) => p.id === petId);
    setPets((current) => current.filter((p) => p.id !== petId));
    setMenuPetOnly(null);
    setScreen("pets");
    setToast(`${pet?.name ?? "Pet"} archived`);
  };

  const editingPet = editingMedication
    ? pets.find((p) => p.id === editingMedication.petId) ?? null
    : null;
  const editingMed = editingPet?.medications.find(
    (m) => m.id === editingMedication?.medicationId,
  );
  const menuPet = menuMedication
    ? pets.find((p) => p.id === menuMedication.petId) ?? null
    : null;
  const menuMed = menuPet?.medications.find(
    (m) => m.id === menuMedication?.medicationId,
  );

  const finishOnboarding = ({
    pet,
    medication,
  }: {
    pet: {
      name: string;
      species: "dog" | "cat" | "other";
      accentColor: string;
      breed?: string;
      ageYears?: number;
    };
    medication: {
      name: string;
      dosageText: string;
      form: "tablet" | "capsule" | "liquid" | "drops" | "injection" | "topical";
      times: string[];
      startingSupply: number;
      supplyUnit: "tablets" | "doses" | "softgels" | "ml";
    };
  }) => {
    const petId = pet.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const medicationId = `${medication.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`;
    const newPet: Pet = {
      id: petId,
      name: pet.name,
      species: pet.species,
      breed: pet.breed ?? "",
      age: pet.ageYears ?? 0,
      avatar: "milo",
      color: pet.accentColor,
      medications: [
        {
          id: medicationId,
          name: medication.name,
          dosage: medication.dosageText,
          instructions: "Follow veterinary instructions",
          form: medication.form,
          times: medication.times,
          stock: medication.startingSupply,
          stockUnit: medication.supplyUnit,
          color: colors.coral,
        },
      ],
    };
    setPets((current) => [...current, newPet]);
    setLogs([]);
    void AsyncStorage.setItem(ONBOARDING_KEY, "completed");
    setOnboardingDone(true);
    setToast(`${pet.name} is ready`);
  };

  const skipOnboarding = () => {
    setPets(DEMO_PETS);
    setLogs(makeSeedLogs());
    void AsyncStorage.setItem(ONBOARDING_KEY, "skipped");
    setOnboardingDone(true);
  };

  // Wait for hydration to decide which surface to render.
  if (!loaded || onboardingDone === null) {
    return <LoadingScreen icon={require("./assets/pawpair-icon.png")} />;
  }

  if (!onboardingDone) {
    return (
      <View style={styles.app}>
        <StatusBar style="dark" />
        <OnboardingFlow
          appIcon={require("./assets/pawpair-icon.png")}
          onComplete={finishOnboarding}
          onSkip={skipOnboarding}
        />
      </View>
    );
  }

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
          onAddPet={() => setScreen("add-pet")}
          onEditPet={(petId) => {
            setEditingPetOnly({ petId });
            setScreen("edit-pet");
          }}
          onLongPressPet={(petId) => {
            setMenuPetOnly({ petId });
            setScreen("pet-menu");
          }}
          onEditMedication={(petId, medicationId) => {
            setEditingMedication({ petId, medicationId });
            setScreen("edit-medication");
          }}
          onLongPressMedication={(petId, medicationId) => {
            setMenuMedication({ petId, medicationId });
            setScreen("medication-menu");
          }}
          onOpenReport={() => setScreen("report")}
          pets={pets}
          topInset={insets.top}
        />
      )}
      {screen === "insights" && (
        <InsightsScreen logs={logs} pets={pets} topInset={insets.top} />
      )}
      {screen === "health" && (
        <HealthScreen
          onOpenHousehold={() => setScreen("household")}
          onOpenPaywall={() => setScreen("paywall")}
          onOpenSettings={() => setScreen("settings")}
        />
      )}
      {screen === "settings" && (
        <SettingsScreen
          onDeleteAccount={async () => {
            try {
              await Promise.all([
                AsyncStorage.removeItem(PETS_KEY),
                AsyncStorage.removeItem(LOGS_KEY),
                AsyncStorage.removeItem(ONBOARDING_KEY),
              ]);
              setPets([]);
              setLogs([]);
              setScreen("today");
              setToast("Account deleted");
            } catch {
              setToast("Could not delete account");
            }
          }}
          onExportData={async () => {
            const payload = JSON.stringify(
              {
                version: 1,
                exportedAtUtc: new Date().toISOString(),
                pets,
                logs,
              },
              null,
              2,
            );
            try {
              // We do not yet integrate expo-file-system; the
              // payload is logged to the console so the user can
              // copy it out during development. Stage 12-final
              // will hand it to expo-print or the system share
              // sheet.
              // eslint-disable-next-line no-console
              console.log("[pawpair] export", payload);
              setToast(
                `Exported ${pets.length} pets, ${logs.length} logs to console`,
              );
            } catch {
              setToast("Could not export data");
            }
          }}
        />
      )}
      {screen === "paywall" && (
        <PaywallScreen
          onClose={() => setScreen("today")}
          onSubscribed={() => {
            setScreen("today");
            setToast("PawPair Plus unlocked (demo)");
          }}
        />
      )}
      {screen === "household" && (
        <HouseholdScreen onClose={() => setScreen("today")} />
      )}
      {screen === "add-pet" && (
        <PetFormScreen
          onCancel={() => setScreen("pets")}
          onSave={addPet}
        />
      )}
      {screen === "edit-pet" &&
        editingPetOnly &&
        (() => {
          const pet = pets.find((p) => p.id === editingPetOnly.petId);
          if (!pet) return null;
          return (
            <PetFormScreen
              editing={pet}
              onCancel={() => {
                setEditingPetOnly(null);
                setScreen("pets");
              }}
              onSave={updatePet}
            />
          );
        })()}
      {screen === "pet-menu" &&
        menuPetOnly &&
        (() => {
          const pet = pets.find((p) => p.id === menuPetOnly.petId);
          if (!pet) return null;
          return (
            <View style={styles.absolute}>
              <PetMenu
                onArchive={() => archivePet(pet.id)}
                onCancel={() => {
                  setMenuPetOnly(null);
                  setScreen("pets");
                }}
                onEdit={() => {
                  setEditingPetOnly({ petId: pet.id });
                  setMenuPetOnly(null);
                  setScreen("edit-pet");
                }}
                visible
              />
            </View>
          );
        })()}
      {screen === "report" && (
        <View style={styles.absolute}>
          <ReportScreen
            pets={pets}
            logs={logs}
            onClose={() => setScreen("today")}
          />
        </View>
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
      {screen === "edit-medication" && editingPet && editingMed && (
        <MedicationFormScreen
          editing={editingMed}
          initialDraft={{
            petId: editingMedication?.petId ?? "",
            name: editingMed.name,
            dosage: editingMed.dosage,
            instructions: editingMed.instructions,
            form: editingMed.form,
            times: editingMed.times,
            startingSupply: editingMed.stock,
            supplyUnit: editingMed.stockUnit as
              | "tablets"
              | "doses"
              | "softgels"
              | "ml",
          }}
          petImages={{
            milo: require("./assets/pawpair-milo.png"),
            luna: require("./assets/pawpair-luna.png"),
          }}
          pets={pets}
          onCancel={() => {
            setEditingMedication(null);
            setScreen("pets");
          }}
          onSave={(draft) => {
            const medicationId = editingMedication?.medicationId ?? "";
            const petId = editingMedication?.petId ?? "";
            const next: Medication = {
              id: medicationId,
              name: draft.name,
              dosage: draft.dosage,
              instructions: draft.instructions,
              form: draft.form,
              times: draft.times,
              stock: draft.startingSupply,
              stockUnit: draft.supplyUnit,
              color: editingMed.color,
            };
            updateMedication(petId, medicationId, next);
            setEditingMedication(null);
          }}
        />
      )}
      {screen === "medication-menu" && menuPet && menuMed && (
        <View style={styles.absolute}>
          <MedicationMenu
            onArchive={() => {
              if (menuMedication) {
                archiveMedication(
                  menuMedication.petId,
                  menuMedication.medicationId,
                );
              }
              setScreen("pets");
            }}
            onCancel={() => {
              setMenuMedication(null);
              setScreen("pets");
            }}
            onEdit={() => {
              if (menuMedication) {
                setEditingMedication(menuMedication);
                setScreen("edit-medication");
              } else {
                setScreen("pets");
              }
              setMenuMedication(null);
            }}
            visible
          />
        </View>
      )}

      {screen !== "add" &&
        screen !== "edit-medication" &&
        screen !== "medication-menu" && (
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
  absolute: { ...StyleSheet.absoluteFill, backgroundColor: "transparent" },
  app: { backgroundColor: colors.background, flex: 1 },
});
