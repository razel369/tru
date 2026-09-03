import {
  NativeEventEmitter,
  NativeModules,
  Platform,
  type EmitterSubscription,
} from "react-native";

import type { WatchSnapshot } from "./snapshot";
export { buildWatchSnapshot } from "./snapshot";

export type WatchCareAction = {
  occurrenceId: string;
  status: "done" | "skipped";
};

export type WatchConnectionStatus = {
  supported: boolean;
  paired: boolean;
  watchAppInstalled: boolean;
  reachable: boolean;
  activationState: "notActivated" | "inactive" | "activated";
};

type PawPairWatchBridgeModule = {
  sync(payload: WatchSnapshot): Promise<boolean>;
  getStatus?(): Promise<WatchConnectionStatus>;
};

const nativeBridge = NativeModules.PawPairWatchBridge as
  | PawPairWatchBridgeModule
  | undefined;

export async function syncWatchCare(snapshot: WatchSnapshot) {
  if (Platform.OS !== "ios" || !nativeBridge) return false;
  return nativeBridge.sync(snapshot).catch(() => false);
}

const unavailableStatus: WatchConnectionStatus = {
  supported: false,
  paired: false,
  watchAppInstalled: false,
  reachable: false,
  activationState: "notActivated",
};

function sanitizeWatchConnectionStatus(
  value: unknown,
): WatchConnectionStatus {
  if (!value || typeof value !== "object") return unavailableStatus;
  const status = value as Partial<WatchConnectionStatus>;
  const activationState =
    status.activationState === "activated" ||
    status.activationState === "inactive"
      ? status.activationState
      : "notActivated";
  return {
    supported: status.supported === true,
    paired: status.paired === true,
    watchAppInstalled: status.watchAppInstalled === true,
    reachable: status.reachable === true,
    activationState,
  };
}

export async function getWatchConnectionStatus(): Promise<WatchConnectionStatus> {
  if (
    Platform.OS !== "ios" ||
    !nativeBridge ||
    typeof nativeBridge.getStatus !== "function"
  ) {
    return unavailableStatus;
  }
  return nativeBridge
    .getStatus()
    .then(sanitizeWatchConnectionStatus)
    .catch(() => unavailableStatus);
}

export function subscribeWatchConnectionStatus(
  listener: (status: WatchConnectionStatus) => void,
): () => void {
  if (Platform.OS !== "ios" || !nativeBridge) return () => undefined;
  const emitter = new NativeEventEmitter(nativeBridge as never);
  const subscription: EmitterSubscription = emitter.addListener(
    "PawPairWatchStatus",
    (value: unknown) => listener(sanitizeWatchConnectionStatus(value)),
  );
  return () => subscription.remove();
}

export function subscribeWatchCareActions(
  listener: (action: WatchCareAction) => void,
): () => void {
  if (Platform.OS !== "ios" || !nativeBridge) return () => undefined;
  const emitter = new NativeEventEmitter(nativeBridge as never);
  const subscription: EmitterSubscription = emitter.addListener(
    "PawPairWatchAction",
    (value: unknown) => {
      if (!value || typeof value !== "object") return;
      const action = value as Partial<WatchCareAction>;
      if (
        typeof action.occurrenceId === "string" &&
        (action.status === "done" || action.status === "skipped")
      ) {
        listener(action as WatchCareAction);
      }
    },
  );
  return () => subscription.remove();
}
