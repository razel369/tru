import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

import { getSupabaseClient } from "../../data/cloud/supabase";
import { uuid } from "../../data/database/uuid";

const CONSENT_KEY = "pawpair.analytics.consent.v1";
const INSTALLATION_KEY = "pawpair.analytics.installation.v1";
const OUTBOX_KEY = "pawpair.analytics.outbox.v1";
const MAX_OUTBOX_EVENTS = 200;
const MAX_PROPERTY_COUNT = 24;

export type AnalyticsEventName =
  | "app_open"
  | "screen_view"
  | "onboarding_started"
  | "onboarding_completed"
  | "pet_profile_created"
  | "pet_switched"
  | "care_item_created"
  | "care_item_completed"
  | "health_record_created"
  | "notification_prompted"
  | "notification_granted"
  | "notification_denied"
  | "paywall_viewed"
  | "plan_selected"
  | "purchase_started"
  | "purchase_completed"
  | "purchase_failed"
  | "restore_completed"
  | "backup_created"
  | "backup_restored"
  | "app_error";

type PropertyValue = boolean | number | string | null;
type AnalyticsProperties = Record<string, PropertyValue>;

type QueuedEvent = {
  app_version: string;
  event_name: AnalyticsEventName;
  id: string;
  occurred_at: string;
  platform: "ios" | "ipad" | "web";
  properties: AnalyticsProperties;
  session_id: string;
};

type AnalyticsIdentity = {
  installationId: string;
  userId: string;
};

const SENSITIVE_KEYS = new Set([
  "address",
  "attachment",
  "breed",
  "care_payload",
  "diagnosis",
  "dosage",
  "email",
  "file_uri",
  "health_payload",
  "medication",
  "name",
  "note",
  "pet_name",
  "phone",
  "symptom",
]);

const sessionId = uuid();
let identity: AnalyticsIdentity | null = null;
let identityPromise: Promise<AnalyticsIdentity | null> | null = null;
let operationQueue: Promise<void> = Promise.resolve();

function appVersion() {
  return process.env.EXPO_PUBLIC_APP_VERSION?.trim() || "1.0.0";
}

function analyticsPlatform(): "ios" | "ipad" | "web" {
  if (Platform.OS === "web") return "web";
  return Platform.OS === "ios" && Platform.isPad ? "ipad" : "ios";
}

function sanitizeProperties(properties: AnalyticsProperties) {
  const safe: AnalyticsProperties = {};
  for (const [rawKey, rawValue] of Object.entries(properties).slice(
    0,
    MAX_PROPERTY_COUNT,
  )) {
    const key = rawKey.trim().toLowerCase();
    if (!/^[a-z][a-z0-9_]{0,47}$/.test(key) || SENSITIVE_KEYS.has(key)) {
      continue;
    }
    if (
      rawValue === null ||
      typeof rawValue === "boolean" ||
      typeof rawValue === "number"
    ) {
      safe[key] = rawValue;
    } else if (typeof rawValue === "string") {
      safe[key] = rawValue.slice(0, 120);
    }
  }
  return safe;
}

async function readOutbox(): Promise<QueuedEvent[]> {
  try {
    const raw = await AsyncStorage.getItem(OUTBOX_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as QueuedEvent[]) : [];
  } catch {
    return [];
  }
}

async function writeOutbox(events: QueuedEvent[]) {
  await AsyncStorage.setItem(
    OUTBOX_KEY,
    JSON.stringify(events.slice(-MAX_OUTBOX_EVENTS)),
  );
}

export async function hasAnalyticsConsent() {
  return Boolean(await AsyncStorage.getItem(CONSENT_KEY));
}

async function ensureIdentity(): Promise<AnalyticsIdentity | null> {
  if (identity) return identity;
  if (identityPromise) return identityPromise;
  identityPromise = (async () => {
    if (!(await hasAnalyticsConsent())) return null;
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    const sessionResult = await supabase.auth.getSession();
    if (sessionResult.error) return null;

    let session = sessionResult.data.session;
    if (session) {
      const verified = await supabase.auth.getUser();
      if (verified.error || !verified.data.user) {
        await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
        session = null;
      }
    }
    if (!session) {
      const signedIn = await supabase.auth.signInAnonymously();
      if (signedIn.error || !signedIn.data.session) return null;
      session = signedIn.data.session;
    }

    const userId = session.user.id;
    let installationId = await AsyncStorage.getItem(INSTALLATION_KEY);
    if (!installationId) {
      installationId = uuid();
      await AsyncStorage.setItem(INSTALLATION_KEY, installationId);
    }
    const consentAt = (await AsyncStorage.getItem(CONSENT_KEY))!;
    const locale = Intl.DateTimeFormat().resolvedOptions().locale ?? null;
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? null;
    const upserted = await supabase.from("installations").upsert(
      {
        analytics_consent_at: consentAt,
        app_version: appVersion(),
        id: installationId,
        last_seen_at: new Date().toISOString(),
        locale,
        platform: analyticsPlatform(),
        timezone,
        user_id: userId,
      },
      { onConflict: "id" },
    );
    if (upserted.error) return null;
    identity = { installationId, userId };
    return identity;
  })();
  try {
    return await identityPromise;
  } finally {
    identityPromise = null;
  }
}

async function flushNow() {
  const currentIdentity = await ensureIdentity();
  if (!currentIdentity) return;
  const supabase = getSupabaseClient();
  if (!supabase) return;
  const pending = await readOutbox();
  if (pending.length === 0) return;
  const batch = pending.slice(0, 50);
  const inserted = await supabase.from("analytics_events").insert(
    batch.map((event) => ({
      ...event,
      installation_id: currentIdentity.installationId,
      user_id: currentIdentity.userId,
    })),
  );
  if (!inserted.error) await writeOutbox(pending.slice(batch.length));
}

function serialize(operation: () => Promise<void>) {
  const result = operationQueue.then(operation);
  operationQueue = result.catch(() => undefined);
  return result;
}

export async function initializeAnalytics() {
  if (!(await hasAnalyticsConsent())) return false;
  const currentIdentity = await ensureIdentity();
  if (!currentIdentity) return false;
  await serialize(flushNow);
  return true;
}

export function trackAnalyticsEvent(
  eventName: AnalyticsEventName,
  properties: AnalyticsProperties = {},
) {
  return serialize(async () => {
    if (!(await hasAnalyticsConsent())) return;
    const pending = await readOutbox();
    pending.push({
      app_version: appVersion(),
      event_name: eventName,
      id: uuid(),
      occurred_at: new Date().toISOString(),
      platform: analyticsPlatform(),
      properties: sanitizeProperties(properties),
      session_id: sessionId,
    });
    await writeOutbox(pending);
    await flushNow();
  });
}

export async function setAnalyticsConsent(enabled: boolean) {
  if (enabled) {
    await AsyncStorage.setItem(CONSENT_KEY, new Date().toISOString());
    return initializeAnalytics();
  }

  const supabase = getSupabaseClient();
  const installationId = await AsyncStorage.getItem(INSTALLATION_KEY);
  if (supabase && installationId) {
    const deletion = await supabase
      .from("installations")
      .delete()
      .eq("id", installationId);
    if (deletion.error) {
      throw new Error(
        "PawPair could not remove this analytics installation. Check your connection and try again.",
      );
    }
  }
  identity = null;
  await AsyncStorage.multiRemove([CONSENT_KEY, INSTALLATION_KEY, OUTBOX_KEY]);
  return false;
}
