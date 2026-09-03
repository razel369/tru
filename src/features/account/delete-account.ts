import { getSupabaseClient } from "../../data/cloud/supabase";
import { setAnalyticsConsent } from "../analytics/service";

export type AccountDeletionResult = {
  cloudAccountDeleted: boolean;
};

/**
 * Removes PawPair-controlled cloud identity and analytics data before the
 * caller clears care data from the device. App Store purchase history remains
 * with Apple and can still be restored after a new anonymous session is made.
 */
export async function deletePawPairCloudAccount(): Promise<AccountDeletionResult> {
  const supabase = getSupabaseClient();

  // This clears the local consent, outbox and installation identifier even
  // when cloud services are unavailable or no anonymous session was created.
  await setAnalyticsConsent(false);

  if (!supabase) return { cloudAccountDeleted: false };

  const sessionResult = await supabase.auth.getSession();
  if (sessionResult.error) {
    throw new Error(
      "PawPair could not verify the cloud account. Check your connection and try again.",
    );
  }
  if (!sessionResult.data.session) return { cloudAccountDeleted: false };

  const deletion = await supabase.functions.invoke("delete-account", {
    body: { confirmation: "DELETE" },
  });
  if (deletion.error) {
    throw new Error(
      "PawPair could not delete the cloud account. Your care data is still on this device.",
    );
  }

  // The server-side deletion invalidates the user. Local sign-out removes the
  // persisted token without depending on another successful network request.
  await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
  return { cloudAccountDeleted: true };
}
