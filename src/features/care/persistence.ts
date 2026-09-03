import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

import type { DoseLog, Pet } from "../../types";
import { CareStateRepository } from "../../data/repositories/care-state";

import { emptyCareState, migrateLegacyData } from "./migration";
import {
  getPetCareStateValidationIssue,
  isPetCareState,
} from "./state-validation";
import type { PetCareState } from "./types";

export { isPetCareState };

const CARE_STATE_KEY = "pawpair.care.state.v1";
const EMERGENCY_STATE_KEY = "pawpair.care.emergency.v1";
const LEGACY_PETS_KEY = "pawpair.pets.v2";
const LEGACY_LOGS_KEY = "pawpair.logs.v2";
const DATABASE_NAME = "pawpair.v1.db";
const MAX_STATE_PAYLOAD_BYTES = 12 * 1024 * 1024;
const MIGRATION_KEYS = [
  CARE_STATE_KEY,
  LEGACY_PETS_KEY,
  LEGACY_LOGS_KEY,
];
const STORAGE_KEYS = [...MIGRATION_KEYS, EMERGENCY_STATE_KEY];
let persistenceQueue: Promise<void> = Promise.resolve();

type EmergencyEnvelope = {
  savedAt: string;
  state: PetCareState;
};

export type PetCarePersistenceBackend = "async-storage" | "sqlite";

export type PetCareLoadResult = {
  backend: PetCarePersistenceBackend;
  migrated: boolean;
  state: PetCareState;
  warning: string | null;
};

class InvalidCareSnapshotError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidCareSnapshotError";
  }
}

function parseJson(raw: string | null): unknown {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

function enqueuePersistenceOperation<T>(operation: () => Promise<T>) {
  const result = persistenceQueue.then(operation);
  persistenceQueue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

function serializeCareState(state: PetCareState) {
  const validationIssue = getPetCareStateValidationIssue(state);
  if (validationIssue) {
    throw new Error(
      `PawPair refused to save invalid care data: ${validationIssue}.`,
    );
  }
  const payload = JSON.stringify(state);
  if (new TextEncoder().encode(payload).byteLength > MAX_STATE_PAYLOAD_BYTES) {
    throw new Error("The local PawPair care database exceeds 12 MB.");
  }
  return payload;
}

function timestampMs(value: string) {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : Number.NEGATIVE_INFINITY;
}

async function readEmergencyState(): Promise<EmergencyEnvelope | null> {
  const parsed = parseJson(await AsyncStorage.getItem(EMERGENCY_STATE_KEY));
  if (
    !parsed ||
    typeof parsed !== "object" ||
    typeof (parsed as EmergencyEnvelope).savedAt !== "string" ||
    !Number.isFinite(Date.parse((parsed as EmergencyEnvelope).savedAt)) ||
    !isPetCareState((parsed as EmergencyEnvelope).state)
  ) {
    return null;
  }
  return parsed as EmergencyEnvelope;
}

async function writeEmergencyState(state: PetCareState, savedAt: string) {
  const emergency: EmergencyEnvelope = { savedAt, state };
  await AsyncStorage.setItem(
    EMERGENCY_STATE_KEY,
    JSON.stringify(emergency),
  );
}

async function readLegacyState() {
  const values = await AsyncStorage.multiGet([
    CARE_STATE_KEY,
    LEGACY_PETS_KEY,
    LEGACY_LOGS_KEY,
  ]);
  const currentRaw = values[0]?.[1] ?? null;
  const current = parseJson(currentRaw);
  if (isPetCareState(current)) {
    return {
      currentPresent: true,
      currentValid: true,
      found: true,
      state: current,
    };
  }

  const petsValue = parseJson(values[1]?.[1] ?? null);
  const logsValue = parseJson(values[2]?.[1] ?? null);
  const pets = Array.isArray(petsValue) ? (petsValue as Pet[]) : [];
  const logs = Array.isArray(logsValue) ? (logsValue as DoseLog[]) : [];
  const legacyFound = Boolean(values[1]?.[1] || values[2]?.[1]);
  return {
    currentPresent: Boolean(currentRaw),
    currentValid: false,
    found: legacyFound,
    state: migrateLegacyData(pets, logs),
  };
}

async function openRepository() {
  const [{ ensureMigrated, getDatabase }] = await Promise.all([
    import("../../data/database"),
  ]);
  await ensureMigrated();
  return new CareStateRepository(await getDatabase());
}

async function clearMigrationKeys() {
  await AsyncStorage.multiRemove(MIGRATION_KEYS);
}

async function loadPetCareStateNow(): Promise<PetCareLoadResult> {
  const legacy = await readLegacyState();
  const emergency = await readEmergencyState();
  if (Platform.OS === "web") {
    if (emergency) {
      return {
        backend: "async-storage",
        migrated: !legacy.currentValid,
        state: emergency.state,
        warning: legacy.currentValid
          ? null
          : "Recovered the latest complete care update after a storage interruption.",
      };
    }
    if (legacy.currentPresent && !legacy.currentValid && !legacy.found) {
      throw new Error(
        "PawPair found damaged local care data and no safe recovery copy.",
      );
    }
    return {
      backend: "async-storage",
      migrated: legacy.found && !legacy.currentValid,
      state: legacy.state,
      warning:
        legacy.currentPresent && !legacy.currentValid
          ? "Recovered care data from the previous PawPair storage format."
          : null,
    };
  }

  try {
    const repository = await openRepository();
    const snapshot = await repository.load();
    if (snapshot) {
      const parsed = parseJson(snapshot.payload);
      if (!isPetCareState(parsed)) {
        const recoveryState =
          emergency?.state ?? (legacy.found ? legacy.state : null);
        if (!recoveryState || !isPetCareState(recoveryState)) {
          throw new InvalidCareSnapshotError(
            "PawPair found damaged local care data and no safe recovery copy.",
          );
        }
        const recovered = await repository.save(
          recoveryState.version,
          JSON.stringify(recoveryState),
        );
        try {
          await writeEmergencyState(recoveryState, recovered.updatedAt);
        } catch {
          // The repaired SQLite snapshot remains authoritative.
        }
        try {
          await clearMigrationKeys();
        } catch {
          // Stale migration keys cannot override the repaired SQLite snapshot.
        }
        return {
          backend: "sqlite",
          migrated: true,
          state: recoveryState,
          warning: "Recovered damaged local care data from a safe copy.",
        };
      }
      if (
        emergency &&
        timestampMs(emergency.savedAt) > timestampMs(snapshot.updatedAt)
      ) {
        const recovered = await repository.save(
          emergency.state.version,
          JSON.stringify(emergency.state),
        );
        await writeEmergencyState(emergency.state, recovered.updatedAt);
        await clearMigrationKeys();
        return {
          backend: "sqlite",
          migrated: true,
          state: emergency.state,
          warning: "Recovered the latest care update after a storage interruption.",
        };
      }
      await clearMigrationKeys();
      return {
        backend: "sqlite",
        migrated: false,
        state: parsed,
        warning: null,
      };
    }

    if (
      !emergency &&
      legacy.currentPresent &&
      !legacy.currentValid &&
      !legacy.found
    ) {
      throw new Error(
        "PawPair found damaged migration data and no safe recovery copy.",
      );
    }
    const initial = emergency?.state ?? legacy.state ?? emptyCareState();
    if (!isPetCareState(initial)) {
      throw new InvalidCareSnapshotError(
        "PawPair could not create a valid local care database.",
      );
    }
    const saved = await repository.save(
      initial.version,
      JSON.stringify(initial),
    );
    await writeEmergencyState(initial, saved.updatedAt);
    await clearMigrationKeys();
    return {
      backend: "sqlite",
      migrated: emergency !== null || legacy.found,
      state: initial,
      warning: null,
    };
  } catch (error) {
    if (error instanceof InvalidCareSnapshotError) throw error;
    const fallback = emergency?.state ?? (legacy.found ? legacy.state : null);
    if (!fallback) throw error;
    return {
      backend: "async-storage",
      migrated: false,
      state: fallback,
      warning:
        "SQLite is temporarily unavailable. PawPair kept your latest local recovery copy.",
    };
  }
}

export function loadPetCareState(): Promise<PetCareLoadResult> {
  return enqueuePersistenceOperation(loadPetCareStateNow);
}

async function savePetCareStateNow(
  state: PetCareState,
  payload: string,
): Promise<void> {
  if (Platform.OS === "web") {
    await writeEmergencyState(state, new Date().toISOString());
    await AsyncStorage.setItem(CARE_STATE_KEY, payload);
    return;
  }

  let committedAt: string;
  try {
    const repository = await openRepository();
    const saved = await repository.save(state.version, payload);
    committedAt = saved.updatedAt;
  } catch (error) {
    try {
      await writeEmergencyState(state, new Date().toISOString());
    } catch {
      // Preserve the original database error when both storage layers fail.
    }
    throw error;
  }
  try {
    await writeEmergencyState(state, committedAt);
  } catch {
    // SQLite remains authoritative if the redundant recovery copy cannot update.
  }
  try {
    await clearMigrationKeys();
  } catch {
    // The SQLite commit is authoritative; stale migration keys are harmless.
  }
}

export function savePetCareState(state: PetCareState): Promise<void> {
  const payload = serializeCareState(state);
  const snapshot = JSON.parse(payload) as PetCareState;
  return enqueuePersistenceOperation(() =>
    savePetCareStateNow(snapshot, payload),
  );
}

async function clearPetCarePersistenceNow(): Promise<void> {
  await AsyncStorage.multiRemove(STORAGE_KEYS);
  if (Platform.OS === "web") return;
  const [{ closeDatabase }, SQLite] = await Promise.all([
    import("../../data/database"),
    import("expo-sqlite"),
  ]);
  await closeDatabase();
  await SQLite.deleteDatabaseAsync(DATABASE_NAME);
}

export function clearPetCarePersistence(): Promise<void> {
  return enqueuePersistenceOperation(clearPetCarePersistenceNow);
}
