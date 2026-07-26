import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  AppState,
  NativeModules,
  Platform,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AutoOfflineBanner } from "../../components/feedback/OfflineBanner";
import { ConfirmationSheet } from "../../components/ConfirmationSheet";
import { LoadingScreen } from "../../components/LoadingScreen";
import { Toast } from "../../components/Toast";
import { assets, colors } from "../../design";
import { PRIVACY_POLICY } from "../../legal/privacy";
import { TERMS_OF_SERVICE } from "../../legal/terms";
import type { Pet } from "../../types";
import { deletePawPairCloudAccount } from "../account/delete-account";
import { trackAnalyticsEvent } from "../analytics/service";
import {
  getCareReminderPrivacy,
  getCareReminderState,
  initializeCareNotifications,
  setCareReminderPrivacy,
  setCareRemindersEnabled,
  subscribeCareNotificationActions,
  subscribeCareNotificationTargets,
  syncCareReminders,
  type CareNotificationTarget,
  type CareReminderPrivacy,
  type CareReminderState,
} from "../notifications/care-runtime";
import type { NotificationPermissionState } from "../notifications/types";
import { PersonalizedCareOnboarding } from "../onboarding/PersonalizedCareOnboarding";
import { LegalDocumentScreen } from "../settings/LegalDocumentScreen";
import { SettingsScreen } from "../settings/SettingsScreen";
import { StorageRecoveryScreen } from "../settings/StorageRecoveryScreen";
import {
  consumePendingSystemRoute,
  subscribeSystemRoutes,
} from "../system/shortcuts";
import type { PawPairSystemRoute } from "../system/routes";
import { canAddPet, defaultFreeEntitlement, isPlus } from "../subscriptions/entitlements";
import { PremiumPaywallScreen } from "../subscriptions/PremiumPaywallScreen";
import { refreshEntitlement } from "../subscriptions/storekit";
import type { PremiumEntryPoint } from "../subscriptions/types";
import {
  buildWatchSnapshot,
  subscribeWatchCareActions,
  syncWatchCare,
} from "../watch/bridge";

import { CareBottomNav, type CareTab } from "./CareBottomNav";
import { buildUpcomingAppointments } from "./appointments";
import { buildCareInsights } from "./care-insights";
import { CareLogSheet } from "./CareLogSheet";
import { buildCareSchedule } from "./engine";
import { HealthHubScreen } from "./HealthHubScreen";
import { HomeCareScreen } from "./HomeCareScreen";
import { MotionLabScreen } from "./MotionLabScreen";
import { resolveNativeMotionQASettings } from "./native-motion-qa";
import { resolveNativeScreenshotQASettings } from "./native-screenshot-qa";
import { buildMedicationSupplyStatuses } from "./medication-supply";
import { scheduledCareFromNotificationAction } from "./notification-occurrence";
import { PetProfileForm } from "./PetProfileForm";
import { PetsHubScreen } from "./PetsHubScreen";
import { PlanScreen } from "./PlanScreen";
import { QuickAddScreen } from "./QuickAddScreen";
import { usePetCareStore } from "./store";
import type { CareCategory, CareTask, ScheduledCare } from "./types";
import { useCareClock } from "./useCareClock";

type PetEditor = { mode: "add" } | { mode: "edit"; pet: Pet };
type LegalDocument = { body: string; title: string };
type PendingConfirmation = {
  body: string;
  confirmLabel: string;
  onConfirm: () => void;
  title: string;
};

const ACTIVATION_PAYWALL_KEY = "pawpair.premium.activation-paywall.v1";
const nativeMotionQA = resolveNativeMotionQASettings(
  Platform.OS === "ios"
    ? (NativeModules.PawPairSystemBridge as
        | Readonly<Record<string, unknown>>
        | undefined)
    : undefined,
);
const nativeScreenshotQA = resolveNativeScreenshotQASettings(
  Platform.OS === "ios"
    ? (NativeModules.PawPairSystemBridge as
        | Readonly<Record<string, unknown>>
        | undefined)
    : undefined,
);

function isSameLocalDate(first: Date, second: Date) {
  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate()
  );
}

export function PetCareApp() {
  const insets = useSafeAreaInsets();
  const store = usePetCareStore();
  const notificationPets = store.state.pets;
  const notificationTasks = store.state.tasks;
  const activatePetFromNotification = store.setActivePetId;
  const logNotificationOccurrence = store.logOccurrence;
  const liveCareNow = useCareClock();
  const careNow = nativeScreenshotQA.now ?? liveCareNow;
  const [tab, setTab] = useState<CareTab>(nativeScreenshotQA.initialTab);
  const [homeScrollRequest, setHomeScrollRequest] = useState(0);
  const [addReturnTab, setAddReturnTab] =
    useState<Exclude<CareTab, "add">>("home");
  const [selectedDate, setSelectedDate] = useState(
    () => new Date(nativeScreenshotQA.now ?? Date.now()),
  );
  const selectedDateTracksToday = useRef(true);
  const [toast, setToast] = useState<string | null>(null);
  const [petEditor, setPetEditor] = useState<PetEditor | null>(null);
  const [addCategory, setAddCategory] = useState<CareCategory>("feeding");
  const [editingTask, setEditingTask] = useState<CareTask | null>(null);
  const [motionLabOpen, setMotionLabOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(
    nativeScreenshotQA.openSettings,
  );
  const [legalDocument, setLegalDocument] = useState<LegalDocument | null>(null);
  const [remindersEnabled, setRemindersEnabled] = useState(false);
  const [reminderPrivacy, setReminderPrivacy] =
    useState<CareReminderPrivacy>("private");
  const [notificationTarget, setNotificationTarget] =
    useState<CareNotificationTarget | null>(null);
  const [scheduledReminderCount, setScheduledReminderCount] = useState(0);
  const [requestedReminderCount, setRequestedReminderCount] = useState(0);
  const [notificationPermission, setNotificationPermission] =
    useState<NotificationPermissionState>("undetermined");
  const [confirmation, setConfirmation] =
    useState<PendingConfirmation | null>(null);
  const [logEditor, setLogEditor] = useState<ScheduledCare | null>(null);
  const [entitlement, setEntitlement] = useState(defaultFreeEntitlement);
  const [paywallSource, setPaywallSource] =
    useState<PremiumEntryPoint | null>(null);
  const [activationPromptReady, setActivationPromptReady] = useState(false);
  const activationPromptSeen = useRef(true);

  const applyCareReminderState = useCallback((result: CareReminderState) => {
    setRemindersEnabled(result.enabled);
    setScheduledReminderCount(result.scheduled);
    setRequestedReminderCount(result.requested);
    setNotificationPermission(result.permission);
  }, []);

  const openSystemRoute = useCallback((route: PawPairSystemRoute) => {
    setSettingsOpen(false);
    setLegalDocument(null);
    setConfirmation(null);
    setLogEditor(null);
    setPetEditor(null);
    setMotionLabOpen(false);
    setEditingTask(null);
    setNotificationTarget(null);
    setPaywallSource(null);

    if (route === "health") {
      setTab("health");
      return;
    }
    if (route === "add") {
      setAddReturnTab("home");
      setAddCategory("feeding");
      setTab("add");
      return;
    }
    selectedDateTracksToday.current = true;
    setSelectedDate(new Date());
    setTab("home");
    setHomeScrollRequest((value) => value + 1);
  }, []);

  useEffect(() => {
    if (!store.loaded) return;
    let active = true;
    const consume = () => {
      void consumePendingSystemRoute().then((route) => {
        if (active && route) openSystemRoute(route);
      });
    };
    consume();
    const unsubscribe = subscribeSystemRoutes(openSystemRoute);
    const appStateSubscription = AppState.addEventListener(
      "change",
      (state) => {
        if (state === "active") consume();
      },
    );
    return () => {
      active = false;
      unsubscribe();
      appStateSubscription.remove();
    };
  }, [openSystemRoute, store.loaded]);

  const refreshCareReminderState = useCallback(async () => {
    try {
      const result = await getCareReminderState();
      applyCareReminderState(result);
    } catch {
      setRemindersEnabled(false);
      setScheduledReminderCount(0);
      setRequestedReminderCount(0);
      setNotificationPermission("unsupported");
    }
  }, [applyCareReminderState]);

  useEffect(() => {
    if (!toast) return;

    const timeout = setTimeout(() => setToast(null), 1800);
    return () => clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    if (!selectedDateTracksToday.current) return;
    setSelectedDate((current) =>
      isSameLocalDate(current, careNow) ? current : new Date(careNow),
    );
  }, [careNow]);

  useEffect(() => {
    void initializeCareNotifications()
      .then(refreshCareReminderState)
      .catch(refreshCareReminderState);
  }, [refreshCareReminderState]);

  useEffect(() => {
    let active = true;
    void getCareReminderPrivacy()
      .then((privacy) => {
        if (active) setReminderPrivacy(privacy);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    void refreshEntitlement().then((next) => {
      if (active) setEntitlement(next);
    });
    void AsyncStorage.getItem(ACTIVATION_PAYWALL_KEY)
      .then((value) => {
        if (!active) return;
        activationPromptSeen.current = value === "shown";
        setActivationPromptReady(true);
      })
      .catch(() => {
        if (!active) return;
        activationPromptSeen.current = true;
        setActivationPromptReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(
    () =>
      subscribeCareNotificationTargets((target) => {
        setNotificationTarget(target);
        if (notificationPets.some((pet) => pet.id === target.petId)) {
          activatePetFromNotification(target.petId);
        }
        setSettingsOpen(false);
        setLegalDocument(null);
        setConfirmation(null);
        setLogEditor(null);
        setPetEditor(null);
        setMotionLabOpen(false);
        setEditingTask(null);
        if (target.kind === "care") {
          const targetDate = target.date
            ? new Date(`${target.date}T12:00:00`)
            : new Date();
          if (!Number.isNaN(targetDate.getTime())) {
            selectedDateTracksToday.current = !target.date;
            setSelectedDate(targetDate);
          }
        }
        setTab(target.kind === "health" ? "health" : "plan");
      }),
    [activatePetFromNotification, notificationPets],
  );

  useEffect(
    () =>
      subscribeCareNotificationActions((action) => {
        const occurrence = scheduledCareFromNotificationAction(
          action,
          notificationTasks,
          notificationPets,
        );
        if (!occurrence) return;

        logNotificationOccurrence(occurrence, action.action);
        if (action.action === "done") {
          void trackAnalyticsEvent("care_item_completed");
        }
        setToast(
          action.action === "done"
            ? `${occurrence.task.title} completed for ${occurrence.pet.name}`
            : `${occurrence.task.title} skipped`,
        );
      }),
    [logNotificationOccurrence, notificationPets, notificationTasks],
  );

  useEffect(() => {
    if (!store.loaded || !remindersEnabled) return;
    void syncCareReminders(
      store.state.tasks,
      store.state.pets,
      store.state.healthRecords,
    )
      .then(applyCareReminderState)
      .catch(() => {
        setScheduledReminderCount(0);
        setRequestedReminderCount(0);
      });
  }, [
    applyCareReminderState,
    remindersEnabled,
    store.loaded,
    store.state.healthRecords,
    store.state.pets,
    store.state.tasks,
  ]);

  const schedule = useMemo(
    () =>
      buildCareSchedule(
        store.state.tasks,
        store.state.logs,
        store.state.pets,
        selectedDate,
        careNow,
      ),
    [
      careNow,
      selectedDate,
      store.state.logs,
      store.state.pets,
      store.state.tasks,
    ],
  );
  const homeSchedule = useMemo(() => {
    const petId = store.state.activePetId ?? store.state.pets[0]?.id;
    return petId
      ? schedule.filter((item) => item.pet.id === petId)
      : [];
  }, [schedule, store.state.activePetId, store.state.pets]);
  const watchSchedule = useMemo(
    () =>
      buildCareSchedule(
        store.state.tasks,
        store.state.logs,
        store.state.pets,
        new Date(careNow),
        careNow,
      ),
    [
      careNow,
      store.state.logs,
      store.state.pets,
      store.state.tasks,
    ],
  );
  const watchHomeSchedule = useMemo(() => {
    const petId = store.state.activePetId ?? store.state.pets[0]?.id;
    return petId
      ? watchSchedule.filter((item) => item.pet.id === petId)
      : [];
  }, [store.state.activePetId, store.state.pets, watchSchedule]);

  useEffect(() => {
    if (!store.loaded) return;
    void syncWatchCare(
      buildWatchSnapshot(watchHomeSchedule, store.state.activePetId),
    );
  }, [careNow, store.loaded, store.state.activePetId, watchHomeSchedule]);

  useEffect(
    () =>
      subscribeWatchCareActions((action) => {
        const occurrence = watchSchedule.find(
          (item) => item.id === action.occurrenceId,
        );
        if (!occurrence) return;
        logNotificationOccurrence(occurrence, action.status);
        setToast(
          action.status === "done"
            ? `${occurrence.task.title} completed from Apple Watch`
            : `${occurrence.task.title} skipped from Apple Watch`,
        );
        void Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        ).catch(() => undefined);
      }),
    [logNotificationOccurrence, watchSchedule],
  );
  const careInsights = useMemo(
    () =>
      buildCareInsights(
        store.state.tasks,
        store.state.logs,
        store.state.pets,
        careNow,
      ),
    [careNow, store.state.logs, store.state.pets, store.state.tasks],
  );
  const medicationSupplies = useMemo(
    () =>
      buildMedicationSupplyStatuses(store.state.tasks, store.state.pets),
    [store.state.pets, store.state.tasks],
  );
  const upcomingAppointments = useMemo(
    () =>
      buildUpcomingAppointments(
        store.state.tasks,
        store.state.pets,
        careNow,
      ),
    [careNow, store.state.pets, store.state.tasks],
  );

  if (!store.loaded) {
    return <LoadingScreen icon={assets.icon} />;
  }

  if (store.recoveryRequired) {
    return (
      <StorageRecoveryScreen
        bottomInset={insets.bottom}
        onReset={store.clearAllData}
        onRestore={store.replaceAllData}
        topInset={insets.top}
      />
    );
  }

  if (nativeMotionQA.enabled) {
    return (
      <MotionLabScreen
        autoBlinkInspection={nativeMotionQA.autoBlinkInspection}
        autoStressInteractions={nativeMotionQA.autoStressInteractions}
        bottomInset={insets.bottom}
        onClose={() => undefined}
        topInset={insets.top}
      />
    );
  }

  const savePet = (pet: Pet) => {
    const isFirstPet = store.state.pets.length === 0;
    const speciesChanged =
      petEditor?.mode === "edit" && petEditor.pet.species !== pet.species;
    if (petEditor?.mode === "edit") {
      store.updatePet(pet);
      setToast(
        speciesChanged
          ? `${pet.name}'s species changed / review the care plan`
          : pet.name + " updated",
      );
    } else {
      store.addPet(pet);
      setToast(`${pet.name} added · no care moments created`);
    }
    setPetEditor(null);
    setTab(speciesChanged ? "plan" : isFirstPet ? "home" : "pets");
  };

  if (store.state.pets.length === 0) {
    return (
      <PersonalizedCareOnboarding
        bottomInset={insets.bottom}
        onFinish={(pet, intent) => {
          selectedDateTracksToday.current = true;
          setSelectedDate(new Date(careNow));
          setAddCategory("feeding");
          setAddReturnTab("home");
          setTab("add");
          store.addPet(pet);
          setToast(null);
          if (intent === "premium") {
            activationPromptSeen.current = true;
            void AsyncStorage.setItem(ACTIVATION_PAYWALL_KEY, "shown");
            setPaywallSource("onboarding");
          }
        }}
        topInset={insets.top}
      />
    );
  }

  if (petEditor) {
    return (
      <PetProfileForm
        bottomInset={insets.bottom}
        editing={petEditor.mode === "edit" ? petEditor.pet : undefined}
        onCancel={() => setPetEditor(null)}
        onSave={savePet}
        topInset={insets.top}
      />
    );
  }

  if (legalDocument) {
    return (
      <LegalDocumentScreen
        body={legalDocument.body}
        onClose={() => setLegalDocument(null)}
        title={legalDocument.title}
      />
    );
  }

  if (paywallSource) {
    const activePet =
      store.state.pets.find((pet) => pet.id === store.state.activePetId) ??
      store.state.pets[0];
    return (
      <PremiumPaywallScreen
        entryPoint={paywallSource}
        onActivated={(next) => {
          setEntitlement(next);
          setPaywallSource(null);
          setToast("PawPair Premium is ready");
        }}
        onClose={() => setPaywallSource(null)}
        onOpenPrivacy={() =>
          setLegalDocument({ body: PRIVACY_POLICY, title: "Privacy Policy" })
        }
        onOpenTerms={() =>
          setLegalDocument({ body: TERMS_OF_SERVICE, title: "Terms of Service" })
        }
        pet={activePet}
      />
    );
  }

  if (settingsOpen) {
    return (
      <SettingsScreen
        bottomInset={insets.bottom}
        careState={store.state}
        notificationPermission={notificationPermission}
        onClose={() => setSettingsOpen(false)}
        onDeleteAccount={async () => {
          const previousRemindersEnabled = remindersEnabled;
          let remindersWereDisabled = false;
          let cloudAccountDeleted = false;
          try {
            await setCareRemindersEnabled(
              false,
              store.state.tasks,
              store.state.pets,
              store.state.healthRecords,
            );
            remindersWereDisabled = previousRemindersEnabled;
            const deletion = await deletePawPairCloudAccount();
            cloudAccountDeleted = deletion.cloudAccountDeleted;
            const result = await store.clearAllData();
            setSettingsOpen(false);
            if (result.warning) {
              Alert.alert("Account deleted with a cleanup warning", result.warning);
            }
          } catch (error) {
            if (
              previousRemindersEnabled &&
              remindersWereDisabled &&
              !cloudAccountDeleted
            ) {
              try {
                const result = await setCareRemindersEnabled(
                  true,
                  store.state.tasks,
                  store.state.pets,
                  store.state.healthRecords,
                );
                applyCareReminderState(result);
              } catch {
                await refreshCareReminderState();
              }
            }
            if (cloudAccountDeleted) {
              throw new Error(
                "Your cloud account was deleted, but local cleanup did not finish. Open Settings and delete the remaining local data again.",
              );
            }
            throw error;
          }
        }}
        onOpenPrivacy={() =>
          setLegalDocument({ body: PRIVACY_POLICY, title: "Privacy Policy" })
        }
        onOpenTerms={() =>
          setLegalDocument({ body: TERMS_OF_SERVICE, title: "Terms of Service" })
        }
        onRestoreData={async (nextState) => {
          const previousRemindersEnabled = remindersEnabled;
          if (previousRemindersEnabled) {
            await setCareRemindersEnabled(
              false,
              store.state.tasks,
              store.state.pets,
              store.state.healthRecords,
            );
          }
          try {
            await store.replaceAllData(nextState);
            try {
              const result = await setCareRemindersEnabled(
                previousRemindersEnabled,
                nextState.tasks,
                nextState.pets,
                nextState.healthRecords,
              );
              applyCareReminderState(result);
              setToast("Portable backup restored");
            } catch {
              setRemindersEnabled(false);
              setScheduledReminderCount(0);
              setRequestedReminderCount(0);
              setToast("Backup restored; re-enable reminders in Settings");
            }
          } catch (error) {
            if (previousRemindersEnabled) {
              await setCareRemindersEnabled(
                true,
                store.state.tasks,
                store.state.pets,
                store.state.healthRecords,
              );
            }
            throw error;
          }
        }}
        onToggleReminders={async (enabled) => {
          const result = await setCareRemindersEnabled(
            enabled,
            store.state.tasks,
            store.state.pets,
            store.state.healthRecords,
          );
          applyCareReminderState(result);
        }}
        onChangeReminderPrivacy={async (privacy) => {
          const result = await setCareReminderPrivacy(
            privacy,
            store.state.tasks,
            store.state.pets,
            store.state.healthRecords,
          );
          setReminderPrivacy(result);
        }}
        reminderPrivacy={reminderPrivacy}
        remindersEnabled={remindersEnabled}
        requestedReminderCount={requestedReminderCount}
        scheduledReminderCount={scheduledReminderCount}
        topInset={insets.top}
      />
    );
  }

  if (__DEV__ && motionLabOpen) {
    return (
      <MotionLabScreen
        bottomInset={insets.bottom}
        onClose={() => setMotionLabOpen(false)}
        topInset={insets.top}
      />
    );
  }

  const complete = (item: ScheduledCare) => {
    void Haptics.notificationAsync(
      Haptics.NotificationFeedbackType.Success,
    ).catch(() => undefined);
    store.logOccurrence(item, "done");
    void trackAnalyticsEvent("care_item_completed");
    const stock = item.task.details?.stock;
    const remaining =
      stock === undefined
        ? undefined
        : Math.max(0, stock - (item.task.details?.unitsPerDose ?? 1));
    const threshold = item.task.details?.refillThreshold ?? 5;
    setToast(
      remaining !== undefined && remaining <= threshold
        ? `${item.task.title} completed. Refill soon: ${remaining} ${item.task.details?.stockUnit || "doses"} left`
        : item.task.title + " completed for " + item.pet.name,
    );
    if (
      activationPromptReady &&
      !activationPromptSeen.current &&
      !isPlus(entitlement)
    ) {
      activationPromptSeen.current = true;
      void AsyncStorage.setItem(ACTIVATION_PAYWALL_KEY, "shown");
      setTimeout(() => setPaywallSource("first-care"), 650);
    }
  };

  const skip = (item: ScheduledCare) => {
    void Haptics.notificationAsync(
      Haptics.NotificationFeedbackType.Warning,
    ).catch(() => undefined);
    store.logOccurrence(item, "skipped");
    setToast(item.task.title + " skipped");
  };

  const undo = (item: ScheduledCare) => {
    store.clearOccurrence(item);
    setLogEditor(null);
    setToast("Care log restored to pending");
  };

  const openAdd = (category: CareCategory = "feeding") => {
    setEditingTask(null);
    setAddCategory(category);
    setAddReturnTab(tab === "add" ? "home" : tab);
    setTab("add");
  };

  const changeTab = (next: CareTab) => {
    setToast(null);
    if (next === "home") {
      selectedDateTracksToday.current = true;
      setSelectedDate(new Date(careNow));
      setHomeScrollRequest((request) => request + 1);
    }
    if (next === "add") {
      setAddCategory("feeding");
      setAddReturnTab(tab === "add" ? "home" : tab);
    }
    setTab(next);
  };

  return (
    <View style={styles.app}>
      <AutoOfflineBanner />
      {tab === "home" && (
        <HomeCareScreen
          activePetId={store.state.activePetId}
          bottomInset={insets.bottom}
          now={careNow}
          onActivePetChange={store.setActivePetId}
          onComplete={complete}
          onOpenAdd={() => openAdd()}
          onOpenLog={setLogEditor}
          onSkip={skip}
          pets={store.state.pets}
          schedule={homeSchedule}
          scrollToTopSignal={homeScrollRequest}
          topInset={insets.top}
        />
      )}
      {tab === "plan" && (
        <PlanScreen
          focusTaskId={
            notificationTarget?.kind === "care"
              ? notificationTarget.sourceId
              : null
          }
          bottomInset={insets.bottom}
          insights={careInsights}
          medicationSupplies={medicationSupplies}
          upcomingAppointments={upcomingAppointments}
          onAdd={() => openAdd()}
          onComplete={complete}
          onDateChange={(date) => {
            selectedDateTracksToday.current = isSameLocalDate(date, careNow);
            setSelectedDate(date);
          }}
          onOpenLog={setLogEditor}
          onSkip={skip}
          onEditTask={(task) => {
            setEditingTask(task);
            setAddCategory(task.category);
            setAddReturnTab("plan");
            setTab("add");
          }}
          onFocusTaskHandled={() => setNotificationTarget(null)}
          onRemoveTask={(task) => {
            setConfirmation({
              body: "This care moment will disappear from the active plan. Completed and skipped history stays on this device.",
              confirmLabel: "Remove moment",
              title: `Remove ${task.title}?`,
              onConfirm: () => {
                store.removeTask(task.id);
                setToast(task.title + " removed");
              },
            });
          }}
          schedule={schedule}
          selectedDate={selectedDate}
          topInset={insets.top}
        />
      )}
      {tab === "add" && (
        <QuickAddScreen
          activePetId={store.state.activePetId}
          bottomInset={insets.bottom}
          editingTask={editingTask ?? undefined}
          initialCategory={addCategory}
          initialDate={
            addReturnTab === "plan" ? selectedDate : new Date(careNow)
          }
          onCancel={() => {
            setEditingTask(null);
            setTab(addReturnTab);
          }}
          onSave={(task) => {
            if (editingTask) store.updateTask(task);
            else store.addTask(task);
            const nextDate =
              task.schedule.frequency === "once" && task.schedule.date
                ? new Date(task.schedule.date + "T12:00:00")
                : new Date(careNow);
            selectedDateTracksToday.current = isSameLocalDate(
              nextDate,
              careNow,
            );
            setSelectedDate(nextDate);
            setToast(task.title + (editingTask ? " updated" : " added"));
            setEditingTask(null);
            setTab("plan");
          }}
          pets={store.state.pets}
          topInset={insets.top}
        />
      )}
      {tab === "health" && (
        <HealthHubScreen
          activePetId={store.state.activePetId}
          bottomInset={insets.bottom}
          focusRecordId={
            notificationTarget?.kind === "health"
              ? notificationTarget.sourceId
              : null
          }
          onActivePetChange={store.setActivePetId}
          onAddRecord={(record) => {
            store.addHealthRecord(record);
            setToast("Health record saved");
          }}
          onUpdateRecord={(record) => {
            store.updateHealthRecord(record);
            setToast("Health record updated");
          }}
          onOpenAddTask={openAdd}
          onFocusRecordHandled={() => setNotificationTarget(null)}
          onRemoveRecord={(recordId) => {
            setConfirmation({
              body: "This entry will be removed from the health timeline. This cannot be undone.",
              confirmLabel: "Remove record",
              title: "Remove health record?",
              onConfirm: () => {
                store.removeHealthRecord(recordId);
                setToast("Health record removed");
              },
            });
          }}
          pets={store.state.pets}
          records={store.state.healthRecords}
          tasks={store.state.tasks}
          topInset={insets.top}
        />
      )}
      {tab === "pets" && (
        <PetsHubScreen
          records={store.state.healthRecords}
          activePetId={store.state.activePetId}
          bottomInset={insets.bottom}
          onActivate={(petId) => {
            store.setActivePetId(petId);
          }}
          isPremium={isPlus(entitlement)}
          onAdd={() => {
            if (canAddPet(entitlement, store.state.pets.length)) {
              setPetEditor({ mode: "add" });
            } else {
              setPaywallSource("second-pet");
            }
          }}
          onEdit={(pet) => setPetEditor({ mode: "edit", pet })}
          onOpenMotionLab={() => setMotionLabOpen(true)}
          onOpenSettings={() => {
            setSettingsOpen(true);
            void refreshCareReminderState();
          }}
          onOpenHealth={() => setTab("health")}
          onOpenPlan={() => setTab("plan")}
          onOpenPremium={setPaywallSource}
          onRemove={(petId) => {
            const pet = store.state.pets.find((item) => item.id === petId);
            setConfirmation({
              body: "Their profile, care plan and local history will be removed from this device. This cannot be undone.",
              confirmLabel: "Remove pet",
              title: `Remove ${pet?.name ?? "this pet"}?`,
              onConfirm: () => {
                store.removePet(petId);
                setToast("Pet removed from this device");
              },
            });
          }}
          pets={store.state.pets}
          tasks={store.state.tasks}
          topInset={insets.top}
        />
      )}
      {tab !== "add" && (
        <CareBottomNav
          active={tab}
          bottomInset={insets.bottom}
          onChange={changeTab}
        />
      )}
      {(toast || store.error) && (
        <Toast
          bottomInset={insets.bottom}
          text={toast ?? "Storage warning: " + store.error}
        />
      )}
      <ConfirmationSheet
        body={confirmation?.body ?? ""}
        bottomInset={insets.bottom}
        confirmLabel={confirmation?.confirmLabel ?? "Remove"}
        onCancel={() => setConfirmation(null)}
        onConfirm={() => {
          if (!confirmation) return;
          void Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Warning,
          ).catch(() => undefined);
          confirmation.onConfirm();
          setConfirmation(null);
        }}
        title={confirmation?.title ?? "Confirm change"}
        visible={confirmation !== null}
      />
      <CareLogSheet
        bottomInset={insets.bottom}
        occurrence={logEditor}
        onClose={() => setLogEditor(null)}
        onSave={(note, actual) => {
          if (!logEditor?.log) return;
          store.updateCareLog(logEditor.log.id, note, actual);
          setToast("Care history updated");
          setLogEditor(null);
        }}
        onUndo={() => {
          if (logEditor) undo(logEditor);
        }}
        visible={logEditor !== null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  app: { backgroundColor: colors.background, flex: 1 },
});
