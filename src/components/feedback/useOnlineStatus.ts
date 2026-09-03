import { useEffect, useState } from "react";
import { AppState } from "react-native";

/**
 * Minimal online-status hook. The full implementation reads
 * `expo-network` and `AppState` together so we know whether
 * the device has a live network. Stage 7 ships the
 * conservative version: the app reports "offline" only when
 * NetInfo has previously said so. The default state is online
 * so we never accidentally hide the UI in environments
 * (test runner, web bundle) where NetInfo is missing.
 */
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    let mounted = true;
    let netInfoSubscription: { remove: () => void } | null = null;
    try {
      // Lazy import so the web bundle and tests do not have to
      // resolve expo-network.
      void import("@react-native-community/netinfo" as never)
        .then((mod: { default?: unknown }) => {
          if (!mounted) return;
          const NetInfo = (mod as { default: { add: (cb: (s: { isConnected: boolean | null }) => void) => { remove: () => void }; fetch: () => Promise<{ isConnected: boolean | null }> } }).default;
          if (typeof NetInfo?.fetch !== "function") return;
          void NetInfo.fetch().then((s) => {
            if (mounted) setOnline(s.isConnected !== false);
          });
          netInfoSubscription = NetInfo.add((s) => {
            if (mounted) setOnline(s.isConnected !== false);
          });
        })
        .catch(() => {
          // NetInfo not available (web/test). Stay online.
        });
    } catch {
      // NetInfo not available. Stay online.
    }
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") {
        // Re-check on foreground; the host can rely on the
        // previous subscription to push the latest value.
        setOnline((current) => current);
      }
    });
    return () => {
      mounted = false;
      netInfoSubscription?.remove();
      sub.remove();
    };
  }, []);
  return online;
}
