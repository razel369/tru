import { File } from "expo-file-system";

export function removeTemporaryShareFile(uri?: string) {
  if (!uri) return;
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    // Cache cleanup is best-effort and must never replace the sharing result.
  }
}
