import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";
import { AppState, Platform, type AppStateStatus } from "react-native";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ?? "";
const SUPABASE_PUBLISHABLE_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ?? "";
const SECURE_CHUNK_SIZE = 1800;

type ChunkManifest = {
  count: number;
  generation: string;
};

function secureKey(key: string) {
  return `pawpair.${key.replace(/[^A-Za-z0-9._-]/g, "_")}`;
}

function parseManifest(value: string | null): ChunkManifest | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Partial<ChunkManifest>;
    if (
      typeof parsed.generation !== "string" ||
      !Number.isInteger(parsed.count) ||
      (parsed.count ?? 0) < 1 ||
      (parsed.count ?? 0) > 64
    ) {
      return null;
    }
    return parsed as ChunkManifest;
  } catch {
    return null;
  }
}

async function deleteGeneration(base: string, manifest: ChunkManifest | null) {
  if (!manifest) return;
  await Promise.all(
    Array.from({ length: manifest.count }, (_, index) =>
      SecureStore.deleteItemAsync(
        `${base}.${manifest.generation}.${index}`,
      ).catch(() => undefined),
    ),
  );
}

class ChunkedSecureStore {
  async getItem(key: string): Promise<string | null> {
    const base = secureKey(key);
    const manifest = parseManifest(
      await SecureStore.getItemAsync(`${base}.manifest`),
    );
    if (!manifest) return null;
    const chunks = await Promise.all(
      Array.from({ length: manifest.count }, (_, index) =>
        SecureStore.getItemAsync(`${base}.${manifest.generation}.${index}`),
      ),
    );
    if (chunks.some((chunk) => chunk === null)) return null;
    return chunks.join("");
  }

  async setItem(key: string, value: string): Promise<void> {
    const base = secureKey(key);
    const manifestKey = `${base}.manifest`;
    const previous = parseManifest(await SecureStore.getItemAsync(manifestKey));
    const generation = `${Date.now().toString(36)}${Math.random()
      .toString(36)
      .slice(2, 8)}`;
    const chunks = Array.from(
      { length: Math.max(1, Math.ceil(value.length / SECURE_CHUNK_SIZE)) },
      (_, index) =>
        value.slice(
          index * SECURE_CHUNK_SIZE,
          (index + 1) * SECURE_CHUNK_SIZE,
        ),
    );
    await Promise.all(
      chunks.map((chunk, index) =>
        SecureStore.setItemAsync(`${base}.${generation}.${index}`, chunk),
      ),
    );
    await SecureStore.setItemAsync(
      manifestKey,
      JSON.stringify({ count: chunks.length, generation }),
    );
    await deleteGeneration(base, previous);
  }

  async removeItem(key: string): Promise<void> {
    const base = secureKey(key);
    const manifestKey = `${base}.manifest`;
    const previous = parseManifest(await SecureStore.getItemAsync(manifestKey));
    await SecureStore.deleteItemAsync(manifestKey);
    await deleteGeneration(base, previous);
  }
}

const authStorage =
  Platform.OS === "web" ? AsyncStorage : new ChunkedSecureStore();

let client: SupabaseClient | null | undefined;

export function isSupabaseConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);
}

export function getSupabaseClient(): SupabaseClient | null {
  if (client !== undefined) return client;
  if (!isSupabaseConfigured()) {
    client = null;
    return client;
  }
  client = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      storage: authStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
  return client;
}

export function startSupabaseSessionLifecycle() {
  const supabase = getSupabaseClient();
  if (!supabase || Platform.OS === "web") return () => undefined;

  const sync = (state: AppStateStatus) => {
    if (state === "active") supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  };
  sync(AppState.currentState);
  const subscription = AppState.addEventListener("change", sync);
  return () => {
    subscription.remove();
    supabase.auth.stopAutoRefresh();
  };
}
