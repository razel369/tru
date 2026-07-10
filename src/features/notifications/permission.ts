import type { NotificationPermissionState } from "./types";

/**
 * PawPair — permission state detection.
 *
 * docs/AAA-HANDOFF.md §7: "Request permission only after the
 * user creates the first schedule and sees the benefit."
 *
 * We never request permission at app start. The caller is
 * expected to call requestPermissionIfNeeded() right after
 * the first schedule is saved, so the prompt has context.
 *
 * The function falls back to "unsupported" when running in an
 * environment where the native module is not available (e.g.
 * the web bundle). Tests can stub requestPermission() directly.
 */

export type PermissionRequestResult = {
  state: NotificationPermissionState;
  askedAtUtc: string;
};

let askImpl: () => Promise<PermissionRequestResult> = async () => {
  return {
    state: "unsupported",
    askedAtUtc: new Date().toISOString(),
  };
};

let getImpl: () => Promise<NotificationPermissionState> = async () => {
  return "unsupported";
};

export function __setPermissionBackend(
  ask: typeof askImpl,
  get: typeof getImpl,
): void {
  askImpl = ask;
  getImpl = get;
}

export async function getPermissionState(): Promise<NotificationPermissionState> {
  return getImpl();
}

export async function requestPermissionIfNeeded(): Promise<PermissionRequestResult> {
  return askImpl();
}
