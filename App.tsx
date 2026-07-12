import AsyncStorage from "@react-native-async-storage/async-storage";
import { Fraunces_700Bold } from "@expo-google-fonts/fraunces/700Bold";
import { Manrope_400Regular } from "@expo-google-fonts/manrope/400Regular";
import { Manrope_600SemiBold } from "@expo-google-fonts/manrope/600SemiBold";
import { Manrope_700Bold } from "@expo-google-fonts/manrope/700Bold";
import { Manrope_800ExtraBold } from "@expo-google-fonts/manrope/800ExtraBold";
import { Nunito_600SemiBold } from "@expo-google-fonts/nunito/600SemiBold";
import { Nunito_700Bold } from "@expo-google-fonts/nunito/700Bold";
import { Nunito_800ExtraBold } from "@expo-google-fonts/nunito/800ExtraBold";
import { useFonts } from "expo-font";
import * as Haptics from "expo-haptics";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, Share, View } from "react-native";
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { BottomNav } from "./src/components/BottomNav";
import { LoadingScreen } from "./src/components/LoadingScreen";
import { Toast } from "./src/components/Toast";
import { colors, ThemeProvider } from "./src/design";
import { setLocale as setI18nLocale } from "./src/features/i18n/i18n";
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
import {
  canAddMedication,
  canAddPet,
  canPerform,
  defaultFreeEntitlement,
} from "./src/features/subscriptions/entitlements";
import { HouseholdScreen } from "./src/features/household/HouseholdScreen";
import { ReportScreen } from "./src/features/reports/ReportScreen";
import { LegalDocumentScreen } from "./src/features/settings/LegalDocumentScreen";
import { PRIVACY_POLICY } from "./src/legal/privacy";
import { TERMS_OF_SERVICE } from "./src/legal/terms";
import { AutoOfflineBanner } from "./src/components/feedback/OfflineBanner";
import { ErrorState } from "./src/components/feedback/ErrorState";
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
  | "report"
  | "privacy"
  | "terms";

const PETS_KEY = "pawpair.pets.v2";
const LOGS_KEY = "pawpair.logs.v2";
const ONBOARDING_KEY = "pawpair.onboarding.done.v1";
const CAREGIVER = "You";
/** Demo household is for local development only — never production. */
const ALLOW_DEMO = typeof __DEV__ !== "undefined" && __DEV__;

function makeSeedLogs(): DoseLog[] {
  const now = new Date();
  const schedule = buildScheduleFromEngine(DEMO_PETS, [], now, 12 * 60);
  return schedule.slice(0, 2).map((dose, index) =>
    createDoseLog(
      dose,
      "given",
      index === 0 ? "Alex (demo)" : CAREGIVER,
      new Date(now.getFullYear(), now.getMonth(), now.getDate(), 8, index * 4),
    ),
  );
}

function AppContent() {
  const insets = useSafeAreaInsets();
  const [screen, setScreen] = useState<Screen>("today");
  const [pets, setPets] = useState<Pet[]>([]);
  const [logs, setLogs] = useState<DoseLog[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loadError, setLoadError] = useState<string | null>(null);
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
      setLoadError(
        error instanceof Error
          ? `Local store could not initialize: ${error.message}`
          : "Local store could not initialize.",
      );
    });

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
        try {
          const parsedPets = savedPets
            ? (JSON.parse(savedPets) as Pet[])
            : [];
          const parsedLogs = savedLogs
            ? (JSON.parse(savedLogs) as DoseLog[])
            : [];

          if (Array.isArray(parsedPets) && parsedPets.length > 0) {
            setPets(parsedPets);
            setLogs(Array.isArray(parsedLogs) ? parsedLogs : []);
            setOnboardingDone(true);
            return;
          }

          if (ALLOW_DEMO && savedOnboardingFlag === "skipped") {
            setPets(DEMO_PETS);
            setLogs(makeSeedLogs());
            setOnboardingDone(true);
            return;
          }

          // No pets — send to onboarding (even if a stale "completed" flag exists).
          setPets([]);
          setLogs([]);
          setOnboardingDone(false);
        } catch (parseError) {
          setPets([]);
          setLogs([]);
          setOnboardingDone(false);
          setLoadError(
            parseError instanceof Error
              ? parseError.message
              : "Storage was unreadable. Starting fresh.",
          );
        }
      })
      .catch((error) => {
        setPets([]);
        setLogs([]);
        setOnboardingDone(false);
        setLoadError(
          error instanceof Error
            ? error.message
            : "Could not read local storage.",
        );
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

  // Surface a one-time toast when the hydration step hit a
  // parse error so the user knows we fell back to demo data.
  useEffect(() => {
    if (loadError) setToast(`Storage warning: ${loadError}`);
  }, [loadError]);

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
  const entitlement = useMemo(() => defaultFreeEntitlement(), []);

  const [pendingConflict, setPendingConflict] = useState<{
    dose: ScheduledDose;
    attemptedStatus: "given" | "skipped";
    existingBy: string;
  } | null>(null);

  const logDose = (dose: ScheduledDose, status: "given" | "skipped") => {
    if (dose.status === "given" || dose.status === "skipped") return;

    // Conflict detection: if another log already exists for the
    // exact same dose key (pet + medication + day + time), we
    // surface a "Already logged" state instead of overwriting.
    // The user can confirm and we will create the new entry as
    // a correction.
    const dateKeyFromDose = `${dose.scheduledTime.slice(0, 5)}`;
    const conflict = logs.find(
      (entry) =>
        entry.petId === dose.pet.id &&
        entry.medicationId === dose.medication.id &&
        entry.date === selectedDate.toISOString().slice(0, 10) &&
        entry.scheduledTime === dateKeyFromDose,
    );
    if (conflict) {
      setPendingConflict({
        dose,
        attemptedStatus: status,
        existingBy: conflict.completedBy,
      });
      return;
    }

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
      setToast(`You logged ${dose.medication.name} for ${dose.pet.name}`);
    } else {
      setToast(`You skipped ${dose.medication.name}`);
    }
  };

  const resolveConflict = (keepMine: boolean) => {
    if (!pendingConflict) return;
    const { dose, attemptedStatus, existingBy } = pendingConflict;
    setPendingConflict(null);
    if (!keepMine) {
      setToast(`${dose.medication.name} already logged by ${existingBy}`);
      return;
    }
    // Confirm: write the new event as a correction. In the
    // server-side dose_events table the new row carries a
    // correction_of_event_id pointing at the original. The
    // prototype log shape does not have that field; the next
    // migration to SQLite will add it.
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    const nextLog = createDoseLog(dose, attemptedStatus, CAREGIVER);
    setLogs((current) => [...current, nextLog]);
    if (attemptedStatus === "given") {
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
    }
    setToast(`Logged as correction for ${dose.pet.name}`);
  };

  const addMedication = (petId: string, medication: Medication) => {
    const activeMedCount = pets.reduce(
      (sum, pet) => sum + pet.medications.length,
      0,
    );
    if (!canAddMedication(entitlement, activeMedCount)) {
      setToast("Free plan includes up to 2 active medications. Plus is coming soon.");
      setScreen("paywall");
      return;
    }
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
    if (!canAddPet(entitlement, pets.length)) {
      setToast("Free plan includes 1 pet. Plus is coming soon.");
      setScreen("paywall");
      return;
    }
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
    setPets([newPet]);
    setLogs([]);
    void AsyncStorage.setItem(ONBOARDING_KEY, "completed");
    setOnboardingDone(true);
    setToast(`${pet.name} is ready on this phone`);
  };

  const skipOnboarding = () => {
    if (!ALLOW_DEMO) return;
    setPets(DEMO_PETS);
    setLogs(makeSeedLogs());
    void AsyncStorage.setItem(ONBOARDING_KEY, "skipped");
    setOnboardingDone(true);
    setToast("Exploring sample household (Milo & Luna)");
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
          companionImage={require("./assets/pawpair-companion-buddy.png")}
          heroScene={require("./assets/pawpair-hero-clean.png")}
          onComplete={finishOnboarding}
          onSkip={ALLOW_DEMO ? skipOnboarding : undefined}
        />
      </View>
    );
  }

  return (
    <View style={styles.app}>
      <StatusBar style="dark" />
      <AutoOfflineBanner />
      {screen === "today" && (
        <TodayScreen
          appIcon={require("./assets/pawpair-icon.png")}
          companionImage={require("./assets/pawpair-companion-buddy.png")}
          heroPet={require("./assets/pawpair-milo.png")}
          heroScene={require("./assets/pawpair-hero-clean.png")}
          onAdd={() => setScreen("add")}
          onDateChange={setSelectedDate}
          onLog={logDose}
          onMenu={() => setScreen("settings")}
          petImages={{
            milo: require("./assets/pawpair-milo.png"),
            luna: require("./assets/pawpair-luna.png"),
          }}
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
          onAdd={() => {
            const activeMedCount = pets.reduce(
              (sum, pet) => sum + pet.medications.length,
              0,
            );
            if (!canAddMedication(entitlement, activeMedCount)) {
              setToast(
                "Free plan includes up to 2 active medications. Plus is coming soon.",
              );
              setScreen("paywall");
              return;
            }
            setScreen("add");
          }}
          onAddPet={() => {
            if (!canAddPet(entitlement, pets.length)) {
              setToast("Free plan includes 1 pet. Plus is coming soon.");
              setScreen("paywall");
              return;
            }
            setScreen("add-pet");
          }}
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
          onOpenReport={() => {
            if (!canPerform(entitlement, "report")) {
              setToast("Care reports are part of PawPair Plus — coming soon.");
              setScreen("paywall");
              return;
            }
            setScreen("report");
          }}
          pets={pets}
          topInset={insets.top}
        />
      )}
      {screen === "insights" && (
        <InsightsScreen logs={logs} pets={pets} topInset={insets.top} />
      )}
      {screen === "health" && (
        <HealthScreen
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
              setOnboardingDone(false);
              setScreen("today");
              setToast("Account deleted — start fresh when you’re ready");
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
              await Share.share({
                message: payload,
                title: "PawPair care export",
              });
              setToast("Export ready to share");
            } catch {
              setToast("Could not export data");
            }
          }}
          onOpenPrivacy={() => setScreen("privacy")}
          onOpenTerms={() => setScreen("terms")}
        />
      )}
      {screen === "privacy" && (
        <LegalDocumentScreen
          body={PRIVACY_POLICY}
          onClose={() => setScreen("settings")}
          title="Privacy policy"
        />
      )}
      {screen === "terms" && (
        <LegalDocumentScreen
          body={TERMS_OF_SERVICE}
          onClose={() => setScreen("settings")}
          title="Terms of service"
        />
      )}
      {screen === "paywall" && (
        <PaywallScreen onClose={() => setScreen("health")} />
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
            paused: editingMed.paused === true,
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
              paused: draft.paused === true,
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
        screen !== "medication-menu" &&
        screen !== "privacy" &&
        screen !== "terms" &&
        screen !== "paywall" &&
        screen !== "household" &&
        screen !== "report" && (
          <BottomNav
            active={
              screen === "settings" ||
              screen === "add-pet" ||
              screen === "edit-pet" ||
              screen === "pet-menu"
                ? "health"
                : screen
            }
            bottomInset={insets.bottom}
            onAdd={() => setScreen("add")}
            onChange={setScreen}
          />
        )}

      {pendingConflict && (
        <View style={styles.conflictWrap}>
          <View style={styles.conflictCard}>
            <Text style={styles.conflictTitle}>Already logged</Text>
            <Text style={styles.conflictBody}>
              {pendingConflict.existingBy} already logged{" "}
              {pendingConflict.dose.medication.name} for{" "}
              {pendingConflict.dose.pet.name}. Discard your tap, or save it as
              a correction.
            </Text>
            <View style={styles.conflictRow}>
              <Pressable
                onPress={() => resolveConflict(false)}
                style={styles.conflictCancel}
              >
                <Text style={styles.conflictCancelText}>Discard</Text>
              </Pressable>
              <Pressable
                onPress={() => resolveConflict(true)}
                style={styles.conflictKeep}
              >
                <Text style={styles.conflictKeepText}>Log correction</Text>
              </Pressable>
            </View>
          </View>
        </View>
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
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
  });

  // Set the initial app locale. The full i18n switch in
  // stage 10-final will read the device locale via
  // expo-localization; the default here is English so the
  // existing string catalog matches what the rest of the app
  // expects. To preview Hebrew, set this to "he" and reload.
  useEffect(() => {
    setI18nLocale("en");
  }, []);

  if (!fontsLoaded) {
    return <LoadingScreen icon={require("./assets/pawpair-icon.png")} />;
  }

  return (
    <ThemeProvider>
      <SafeAreaProvider>
        <AppContent />
      </SafeAreaProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  absolute: { ...StyleSheet.absoluteFill, backgroundColor: "transparent" },
  app: { backgroundColor: colors.background, flex: 1 },
  conflictBody: {
    color: colors.muted,
    fontFamily: "Nunito_600SemiBold",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
  },
  conflictCancel: {
    alignItems: "center",
    backgroundColor: colors.paper,
    borderRadius: 999,
    flex: 1,
    paddingVertical: 12,
  },
  conflictCancelText: {
    color: colors.ink,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 13,
  },
  conflictCard: {
    backgroundColor: colors.coralSoft,
    borderRadius: 28,
    padding: 18,
  },
  conflictKeep: {
    alignItems: "center",
    backgroundColor: colors.coral,
    borderRadius: 999,
    flex: 1,
    paddingVertical: 12,
  },
  conflictKeepText: {
    color: colors.white,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 13,
  },
  conflictRow: { flexDirection: "row", gap: 10, marginTop: 14 },
  conflictTitle: {
    color: colors.ink,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 18,
  },
  conflictWrap: {
    bottom: 110,
    left: 18,
    position: "absolute",
    right: 18,
    zIndex: 40,
  },
});
