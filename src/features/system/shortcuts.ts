import {
  NativeEventEmitter,
  NativeModules,
  Platform,
  type EmitterSubscription,
} from "react-native";

import {
  normalizePawPairSystemRoute,
  type PawPairSystemRoute,
} from "./routes";

type PawPairSystemBridgeModule = {
  consumePendingRoute(): Promise<unknown>;
};

const nativeBridge = NativeModules.PawPairSystemBridge as
  | PawPairSystemBridgeModule
  | undefined;

export async function consumePendingSystemRoute(): Promise<PawPairSystemRoute | null> {
  if (
    Platform.OS !== "ios" ||
    !nativeBridge ||
    typeof nativeBridge.consumePendingRoute !== "function"
  ) {
    return null;
  }
  return nativeBridge
    .consumePendingRoute()
    .then(normalizePawPairSystemRoute)
    .catch(() => null);
}

export function subscribeSystemRoutes(
  listener: (route: PawPairSystemRoute) => void,
): () => void {
  if (Platform.OS !== "ios" || !nativeBridge) return () => undefined;
  const emitter = new NativeEventEmitter(nativeBridge as never);
  const subscription: EmitterSubscription = emitter.addListener(
    "PawPairSystemRoute",
    (value: unknown) => {
      const route = normalizePawPairSystemRoute(
        value && typeof value === "object"
          ? (value as { route?: unknown }).route
          : value,
      );
      if (route) listener(route);
    },
  );
  return () => subscription.remove();
}
