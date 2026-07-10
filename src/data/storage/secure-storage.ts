/**
 * PawPair — secure storage wrapper.
 *
 * docs/AAA-HANDOFF.md §13: "Store tokens in SecureStore, never
 * AsyncStorage." Caregiver data is also sensitive: a stolen
 * device with full AsyncStorage would expose every pet,
 * medication, and dose log. We keep that data in expo-secure-
 * store too, on devices that support it.
 *
 * The API is `getJSON / setJSON / remove`. The implementation
 * falls back to AsyncStorage when expo-secure-store is not
 * available (web bundle, test runner). The fallback is loud:
 * it logs a warning so the production release is the only
 * environment that should ever be using it.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

type SecureStore = {
  getItemAsync: (key: string, opts?: object) => Promise<string | null>;
  setItemAsync: (key: string, value: string, opts?: object) => Promise<void>;
  deleteItemAsync: (key: string, opts?: object) => Promise<void>;
};

let secureStoreModule: SecureStore | null = null;
let loadedSecureStore = false;
let fellBackToAsyncStorage = false;

async function loadSecureStore(): Promise<SecureStore | null> {
  if (loadedSecureStore) return secureStoreModule;
  loadedSecureStore = true;
  try {
    const mod = (await import("expo-secure-store" as never)) as {
      default?: SecureStore;
    };
    secureStoreModule = mod.default ?? (mod as unknown as SecureStore);
    if (!secureStoreModule) {
      fellBackToAsyncStorage = true;
    }
    return secureStoreModule;
  } catch {
    fellBackToAsyncStorage = true;
    return null;
  }
}

export function didFallBackToAsyncStorage(): boolean {
  return fellBackToAsyncStorage;
}

export async function getJSON<T>(key: string): Promise<T | null> {
  const store = await loadSecureStore();
  if (store) {
    const raw = await store.getItemAsync(key);
    if (raw === null) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }
  const raw = await AsyncStorage.getItem(key);
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function setJSON<T>(key: string, value: T): Promise<void> {
  const store = await loadSecureStore();
  const payload = JSON.stringify(value);
  if (store) {
    await store.setItemAsync(key, payload);
    return;
  }
  await AsyncStorage.setItem(key, payload);
}

export async function remove(key: string): Promise<void> {
  const store = await loadSecureStore();
  if (store) {
    await store.deleteItemAsync(key);
    return;
  }
  await AsyncStorage.removeItem(key);
}
