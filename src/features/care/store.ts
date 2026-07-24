import { useCallback, useEffect, useRef, useState } from "react";

import type { Pet } from "../../types";
import { createLocalId } from "../../utils/local-id";
import { trackAnalyticsEvent } from "../analytics/service";

import { createCareLog } from "./engine";
import {
  clearLocalHealthAttachments,
  pruneLocalHealthAttachments,
  removeLocalHealthAttachment,
} from "./health-attachments";
import { emptyCareState, upgradeCareState } from "./migration";
import { inventoryUnitsFromPlan, inventoryUnitsUsed } from "./inventory-delta";
import {
  clearPetCarePersistence,
  isPetCareState,
  loadPetCareState,
  savePetCareState,
} from "./persistence";
import type {
  CareLogActual,
  CareLogStatus,
  CareTask,
  HealthRecord,
  PetCareState,
  ScheduledCare,
} from "./types";

const EMPTY_STATE = emptyCareState();

function healthAttachmentsByUri(state: PetCareState) {
  const attachments = new Map<
    string,
    NonNullable<HealthRecord["attachment"]>
  >();
  state.healthRecords.forEach((record) => {
    if (record.attachment) {
      attachments.set(record.attachment.uri, record.attachment);
    }
  });
  return attachments;
}

function latestOccurrenceLog(
  logs: PetCareState["logs"],
  occurrence: ScheduledCare,
) {
  let latest: PetCareState["logs"][number] | undefined;
  for (const log of logs) {
    if (
      log.taskId !== occurrence.task.id ||
      log.date !== occurrence.date ||
      log.scheduledTime !== occurrence.scheduledTime
    ) {
      continue;
    }
    if (!latest || log.completedAt >= latest.completedAt) latest = log;
  }
  return latest;
}

export function usePetCareStore() {
  const [state, setState] = useState<PetCareState | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const writeQueue = useRef<Promise<void>>(Promise.resolve());
  const persistenceUnlocked = useRef(false);
  const persistenceEpoch = useRef(0);
  const latestState = useRef<PetCareState | null>(state);
  const prePersistedState = useRef<PetCareState | null>(null);
  const persistedAttachments = useRef<ReturnType<
    typeof healthAttachmentsByUri
  > | null>(null);
  latestState.current = state;

  const persistState = useCallback((nextState: PetCareState) => {
    const operation = writeQueue.current
      .catch(() => undefined)
      .then(() => savePetCareState(nextState));
    writeQueue.current = operation;
    return operation;
  }, []);

  useEffect(() => {
    void loadPetCareState()
      .then((result) => {
        const upgradedState = upgradeCareState(result.state);
        persistenceUnlocked.current = true;
        persistedAttachments.current = healthAttachmentsByUri(upgradedState);
        setState(upgradedState);
        setError(result.warning);
      })
      .catch((reason: unknown) => {
        persistenceUnlocked.current = false;
        setError(
          reason instanceof Error ? reason.message : "Could not load pet care data.",
        );
      })
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    if (!loaded || !state || !persistenceUnlocked.current) return;
    if (prePersistedState.current === state) {
      prePersistedState.current = null;
      return;
    }
    const epoch = persistenceEpoch.current;
    const nextAttachments = healthAttachmentsByUri(state);
    void persistState(state)
      .then(async () => {
        if (epoch !== persistenceEpoch.current) return;
        const previousAttachments = persistedAttachments.current;
        persistedAttachments.current = nextAttachments;
        if (previousAttachments) {
          const latestAttachments = latestState.current
            ? healthAttachmentsByUri(latestState.current)
            : nextAttachments;
          const removed = Array.from(previousAttachments.entries())
            .filter(
              ([uri]) =>
                !nextAttachments.has(uri) && !latestAttachments.has(uri),
            )
            .map(([, attachment]) => attachment);
          await Promise.all(removed.map(removeLocalHealthAttachment));
        }
        if (epoch !== persistenceEpoch.current) return;
        setError(null);
      })
      .catch((reason: unknown) => {
        if (epoch !== persistenceEpoch.current) return;
        setError(
          reason instanceof Error ? reason.message : "Could not save pet care data.",
        );
      });
  }, [loaded, persistState, state]);

  const addPet = useCallback((pet: Pet) => {
    setState((current) => {
      if (!current) return current;
      return {
        ...current,
        pets: [...current.pets, pet],
        activePetId: pet.id,
      };
    });
  }, []);

  const updatePet = useCallback((pet: Pet) => {
    setState((current) =>
      current
        ? {
            ...current,
            pets: current.pets.map((item) => (item.id === pet.id ? pet : item)),
          }
        : current,
    );
  }, []);

  const removePet = useCallback((petId: string) => {
    setState((current) => {
      if (!current) return current;
      const pets = current.pets.filter((pet) => pet.id !== petId);
      const taskIds = new Set(
        current.tasks.filter((task) => task.petId === petId).map((task) => task.id),
      );
      return {
        ...current,
        pets,
        tasks: current.tasks.filter((task) => task.petId !== petId),
        logs: current.logs.filter(
          (log) => log.petId !== petId && !taskIds.has(log.taskId),
        ),
        healthRecords: current.healthRecords.filter(
          (record) => record.petId !== petId,
        ),
        activePetId:
          current.activePetId === petId
            ? pets[0]?.id ?? null
            : current.activePetId,
      };
    });
  }, []);

  const setActivePetId = useCallback((petId: string) => {
    setState((current) =>
      current && current.pets.some((pet) => pet.id === petId)
        ? { ...current, activePetId: petId }
        : current,
    );
    void trackAnalyticsEvent("pet_switched");
  }, []);

  const addTask = useCallback((task: CareTask) => {
    setState((current) =>
      current ? { ...current, tasks: [...current.tasks, task] } : current,
    );
    void trackAnalyticsEvent("care_item_created");
  }, []);

  const updateTask = useCallback((task: CareTask) => {
    setState((current) => {
      if (!current) return current;
      const existing = current.tasks.find((item) => item.id === task.id);
      if (!existing) return current;
      const hasHistory = current.logs.some((log) => log.taskId === task.id);
      if (hasHistory && existing.petId !== task.petId) {
        const archivedAt = new Date().toISOString();
        return {
          ...current,
          tasks: [
            ...current.tasks.map((item) =>
              item.id === existing.id
                ? { ...item, enabled: false, archivedAt }
                : item,
            ),
            {
              ...task,
              id: createLocalId("care-custom"),
              createdAt: new Date().toISOString(),
            },
          ],
        };
      }
      return {
        ...current,
        tasks: current.tasks.map((item) =>
          item.id === task.id ? task : item,
        ),
      };
    });
  }, []);

  const removeTask = useCallback((taskId: string) => {
    setState((current) => {
      if (!current) return current;
      const hasHistory = current.logs.some((log) => log.taskId === taskId);
      const archivedAt = new Date().toISOString();
      return {
        ...current,
        tasks: hasHistory
          ? current.tasks.map((task) =>
              task.id === taskId
                ? { ...task, enabled: false, archivedAt }
                : task,
            )
          : current.tasks.filter((task) => task.id !== taskId),
      };
    });
  }, []);

  const logOccurrence = useCallback(
    (occurrence: ScheduledCare, status: CareLogStatus) => {
      setState((current) => {
        if (!current) return current;
        const storedTask = current.tasks.find(
          (task) => task.id === occurrence.task.id,
        );
        const storedPet = current.pets.find(
          (pet) => pet.id === occurrence.pet.id,
        );
        if (!storedTask || !storedPet || storedTask.petId !== storedPet.id) {
          return current;
        }
        const linkedMedication = storedTask.medicationId
          ? storedPet.medications.find(
              (medication) => medication.id === storedTask.medicationId,
            )
          : undefined;
        const unitsPerDose = storedTask.details?.unitsPerDose ?? 1;
        const availableStocks = [
          storedTask.details?.stock,
          linkedMedication?.stock,
        ];
        const stockSnapshot = availableStocks
          .filter(
            (stock): stock is number =>
              Number.isFinite(stock) && (stock ?? -1) >= 0,
          )
          .reduce<number | undefined>(
            (lowest, stock) =>
              lowest === undefined ? stock : Math.min(lowest, stock),
            undefined,
          );
        const taskForLog =
          storedTask.category === "medication" && stockSnapshot !== undefined
            ? {
                ...storedTask,
                details: {
                  ...storedTask.details,
                  stock: stockSnapshot,
                  unitsPerDose,
                },
              }
            : storedTask;
        const currentOccurrence: ScheduledCare = {
          ...occurrence,
          task: taskForLog,
          pet: storedPet,
        };
        const previous = latestOccurrenceLog(current.logs, currentOccurrence);
        if (previous?.status === status) return current;
        const nextLog = createCareLog(currentOccurrence, status);
        const tracksMedicationStock = storedTask.category === "medication";
        const shouldUseStock =
          tracksMedicationStock &&
          status === "done" &&
          previous?.status !== "done";
        const shouldRestoreStock =
          tracksMedicationStock &&
          status !== "done" &&
          previous?.status === "done";
        const usedStock = inventoryUnitsUsed(availableStocks, unitsPerDose);
        const restoredStock = inventoryUnitsFromPlan(
          previous?.planned,
          unitsPerDose,
        );

        return {
          ...current,
          logs: [
            ...current.logs.filter(
              (log) =>
                !(
                  log.taskId === occurrence.task.id &&
                  log.date === occurrence.date &&
                  log.scheduledTime === occurrence.scheduledTime
                ),
            ),
            nextLog,
          ],
          tasks: current.tasks.map((task) => {
            if (task.id !== storedTask.id || task.details?.stock === undefined) {
              return task;
            }
            const stock = shouldUseStock
              ? Math.max(0, task.details.stock - usedStock)
              : shouldRestoreStock
                ? task.details.stock + restoredStock
                : task.details.stock;
            return { ...task, details: { ...task.details, stock } };
          }),
          pets: current.pets.map((pet) =>
            pet.id !== storedPet.id
              ? pet
              : {
                  ...pet,
                  medications: pet.medications.map((medication) =>
                    medication.id !== storedTask.medicationId
                      ? medication
                      : {
                          ...medication,
                          stock: shouldUseStock
                            ? Math.max(
                                0,
                                medication.stock - usedStock,
                              )
                            : shouldRestoreStock
                              ? medication.stock + restoredStock
                              : medication.stock,
                        },
                  ),
                },
          ),
        };
      });
    },
    [],
  );

  const clearOccurrence = useCallback((occurrence: ScheduledCare) => {
    setState((current) => {
      if (!current) return current;
      const storedTask = current.tasks.find(
        (task) => task.id === occurrence.task.id,
      );
      const storedPet = current.pets.find(
        (pet) => pet.id === occurrence.pet.id,
      );
      if (!storedTask || !storedPet || storedTask.petId !== storedPet.id) {
        return current;
      }
      const currentOccurrence: ScheduledCare = {
        ...occurrence,
        task: storedTask,
        pet: storedPet,
      };
      const previous = latestOccurrenceLog(current.logs, currentOccurrence);
      const restoredStock = inventoryUnitsFromPlan(
        previous?.planned,
        storedTask.details?.unitsPerDose,
      );
      return {
        ...current,
        logs: current.logs.filter(
          (log) =>
            !(
              log.taskId === occurrence.task.id &&
              log.date === occurrence.date &&
              log.scheduledTime === occurrence.scheduledTime
            ),
        ),
        tasks:
          previous?.status === "done"
            ? current.tasks.map((task) =>
                task.id === storedTask.id &&
                task.details?.stock !== undefined
                  ? {
                      ...task,
                      details: {
                        ...task.details,
                        stock:
                          task.details.stock + restoredStock,
                      },
                    }
                  : task,
              )
            : current.tasks,
        pets:
          previous?.status === "done" && storedTask.medicationId
            ? current.pets.map((pet) =>
                pet.id !== storedPet.id
                  ? pet
                  : {
                      ...pet,
                      medications: pet.medications.map((medication) =>
                        medication.id === storedTask.medicationId
                          ? {
                              ...medication,
                              stock:
                                medication.stock + restoredStock,
                            }
                          : medication,
                      ),
                    },
              )
            : current.pets,
      };
    });
  }, []);

  const updateCareLog = useCallback(
    (logId: string, note: string, actual?: CareLogActual) => {
      const normalizedNote = note.trim();
      const normalizedActual =
        actual && Object.keys(actual).length > 0 ? actual : undefined;
      setState((current) =>
        current
          ? {
              ...current,
              logs: current.logs.map((log) =>
                log.id === logId
                  ? {
                      ...log,
                      note: normalizedNote || undefined,
                      actual: normalizedActual,
                    }
                  : log,
              ),
            }
          : current,
      );
    },
    [],
  );

  const addHealthRecord = useCallback((record: HealthRecord) => {
    setState((current) =>
      current
        ? {
            ...current,
            healthRecords: [record, ...current.healthRecords],
          }
        : current,
    );
    void trackAnalyticsEvent("health_record_created");
  }, []);

  const updateHealthRecord = useCallback((record: HealthRecord) => {
    setState((current) =>
      current
        ? {
            ...current,
            healthRecords: current.healthRecords.map((existing) =>
              existing.id === record.id ? record : existing,
            ),
          }
        : current,
    );
  }, []);

  const removeHealthRecord = useCallback((recordId: string) => {
    setState((current) =>
      current
        ? {
            ...current,
            healthRecords: current.healthRecords.filter(
              (record) => record.id !== recordId,
            ),
          }
        : current,
    );
  }, []);

  const clearAllData = useCallback(async () => {
    const wasPersistenceUnlocked = persistenceUnlocked.current;
    persistenceUnlocked.current = false;
    persistenceEpoch.current += 1;
    const clearOperation = writeQueue.current
      .catch(() => undefined)
      .then(() => clearPetCarePersistence());
    writeQueue.current = clearOperation;
    try {
      await clearOperation;
    } catch (reason) {
      persistenceUnlocked.current = wasPersistenceUnlocked;
      const message =
        reason instanceof Error
          ? reason.message
          : "Could not clear PawPair's local data.";
      setError(message);
      throw reason;
    }

    const clearedState = emptyCareState();
    persistenceUnlocked.current = true;
    persistedAttachments.current = healthAttachmentsByUri(clearedState);
    setError(null);
    setState(clearedState);
    try {
      await clearLocalHealthAttachments();
      return { warning: null };
    } catch {
      const message =
        "Care data was cleared, but PawPair could not remove every local document. Try clearing data again.";
      setError(message);
      return { warning: message };
    }
  }, []);

  const replaceAllData = useCallback(async (nextState: PetCareState) => {
    if (!isPetCareState(nextState)) {
      throw new Error("The restored PawPair data is not valid.");
    }
    const upgradedState = upgradeCareState(nextState);
    const nextAttachments = healthAttachmentsByUri(upgradedState);
    const wasPersistenceUnlocked = persistenceUnlocked.current;
    persistenceUnlocked.current = false;
    persistenceEpoch.current += 1;
    try {
      await persistState(upgradedState);
    } catch (reason) {
      persistenceUnlocked.current = wasPersistenceUnlocked;
      throw reason;
    }
    let attachmentCleanupWarning: string | null = null;
    try {
      await pruneLocalHealthAttachments(nextAttachments.keys());
    } catch {
      attachmentCleanupWarning =
        "Backup restored, but PawPair could not remove every unreferenced local document.";
    }
    persistenceUnlocked.current = true;
    persistedAttachments.current = nextAttachments;
    prePersistedState.current = upgradedState;
    setError(attachmentCleanupWarning);
    setState(upgradedState);
  }, [persistState]);

  return {
    state: state ?? EMPTY_STATE,
    loaded,
    error,
    recoveryRequired: loaded && state === null,
    addPet,
    updatePet,
    removePet,
    setActivePetId,
    addTask,
    updateTask,
    removeTask,
    logOccurrence,
    clearOccurrence,
    updateCareLog,
    addHealthRecord,
    updateHealthRecord,
    removeHealthRecord,
    replaceAllData,
    clearAllData,
  };
}
