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

type PawPairWatchBridgeModule = {
  sync(payload: WatchSnapshot): Promise<boolean>;
};

const nativeBridge = NativeModules.PawPairWatchBridge as
  | PawPairWatchBridgeModule
  | undefined;

export async function syncWatchCare(snapshot: WatchSnapshot) {
  if (Platform.OS !== "ios" || !nativeBridge) return false;
  return nativeBridge.sync(snapshot).catch(() => false);
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
