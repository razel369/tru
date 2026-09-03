import * as DocumentPicker from "expo-document-picker";
import { Directory, File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";

import type { PetCareState as CareState } from "./types";
import {
  createPortableBackupArchive,
  getPortableAttachmentReferences,
  materializePortableBackupState,
  parsePortableBackupArchive,
  PAWPAIR_BACKUP_EXTENSION,
  PORTABLE_BACKUP_MAX_ARCHIVE_BYTES,
  PORTABLE_BACKUP_MAX_ATTACHMENT_BYTES,
  PORTABLE_BACKUP_MAX_ATTACHMENT_COUNT,
  type PortableAttachmentPayload,
} from "./portable-backup-core";
import {
  decryptPortableBackupArchive,
  encryptPortableBackupArchive,
  isEncryptedPortableBackup,
  PortableBackupPassphraseRequiredError,
} from "./portable-backup-encryption";

const HEALTH_DOCUMENT_DIRECTORY = "pawpair-health-records";

export type PortableBackupExportResult = {
  attachmentCount: number;
  byteLength: number;
  encrypted: boolean;
  fileName: string;
  uri: string | null;
};

export type PortableBackupSecurityOptions = {
  passphrase?: string;
  requestPassphrase?: (errorMessage?: string) => Promise<string | null>;
};

export type PreparedPortableRestore = {
  attachmentCount: number;
  encrypted: boolean;
  exportedAt: string;
  petCount: number;
  recordCount: number;
  stagedUris: readonly string[];
  state: CareState;
};

function backupFileName(encrypted: boolean) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const securityLabel = encrypted ? "Secure-" : "";
  return `PawPair-${securityLabel}${stamp}.${PAWPAIR_BACKUP_EXTENSION}`;
}

function safeFileName(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100) || "medical-document";
}

function ensureByteLimit(
  byteLength: number,
  maxBytes: number,
  message: string,
) {
  if (!Number.isFinite(byteLength) || byteLength < 0 || byteLength > maxBytes) {
    throw new Error(message);
  }
}

async function readUriBytes(uri: string, maxBytes: number, message: string) {
  if (Platform.OS === "web" || /^(blob:|data:|https?:)/i.test(uri)) {
    const response = await fetch(uri);
    if (!response.ok) throw new Error("A medical attachment could not be read.");
    const declaredLength = Number(response.headers.get("content-length"));
    if (Number.isFinite(declaredLength) && declaredLength > 0) {
      ensureByteLimit(declaredLength, maxBytes, message);
    }
    const bytes = new Uint8Array(await response.arrayBuffer());
    ensureByteLimit(bytes.byteLength, maxBytes, message);
    return bytes;
  }
  const file = new File(uri);
  if (!file.exists) throw new Error("A medical attachment could not be read.");
  ensureByteLimit(file.size, maxBytes, message);
  const bytes = await file.bytes();
  ensureByteLimit(bytes.byteLength, maxBytes, message);
  return bytes;
}

function createHealthDirectory() {
  const directory = new Directory(Paths.document, HEALTH_DOCUMENT_DIRECTORY);
  if (!directory.exists) {
    directory.create({ idempotent: true, intermediates: true });
  }
  return directory;
}

function writeStagedAttachment(name: string, bytes: Uint8Array) {
  const directory = createHealthDirectory();
  const file = new File(
    directory,
    `restored-${Date.now()}-${Math.random().toString(36).slice(2, 10)}-${safeFileName(name)}`,
  );
  file.create({ intermediates: true, overwrite: false });
  file.write(bytes);
  return file;
}

async function deleteUris(uris: readonly string[]) {
  const managedDirectory = new Directory(
    Paths.document,
    HEALTH_DOCUMENT_DIRECTORY,
  );
  const managedRoot = `${managedDirectory.uri.replace(/\/+$/, "")}/`;
  await Promise.all(
    uris.map(async (uri) => {
      try {
        const file = new File(uri);
        if (!file.uri.startsWith(managedRoot)) return;
        const relativePath = file.uri.slice(managedRoot.length);
        if (!relativePath || relativePath.includes("/")) return;
        if (file.exists) file.delete();
      } catch {
        // Best-effort rollback must not hide the original restore error.
      }
    }),
  );
}

function deletePickedCacheFile(uri: string) {
  try {
    const file = new File(uri);
    const cacheRoot = `${Paths.cache.uri.replace(/\/+$/, "")}/`;
    if (file.uri.startsWith(cacheRoot) && file.exists) file.delete();
  } catch {
    // Picker cache cleanup is best effort and must not hide import failures.
  }
}

async function readPortableAttachmentPayloads(
  references: ReturnType<typeof getPortableAttachmentReferences>,
) {
  if (references.length > PORTABLE_BACKUP_MAX_ATTACHMENT_COUNT) {
    throw new Error("PawPair can back up at most 100 medical attachments at once.");
  }

  const payloads: PortableAttachmentPayload[] = [];
  let totalBytes = 0;
  try {
    for (const reference of references) {
      const bytes = await readUriBytes(
        reference.uri,
        PORTABLE_BACKUP_MAX_ATTACHMENT_BYTES,
        `Medical attachment ${reference.name} is larger than 10 MB.`,
      );
      totalBytes += bytes.byteLength;
      if (totalBytes > PORTABLE_BACKUP_MAX_ARCHIVE_BYTES) {
        bytes.fill(0);
        throw new Error("The medical attachments are too large for one backup.");
      }
      payloads.push({ ...reference, bytes });
    }
    return payloads;
  } catch (error) {
    payloads.forEach((payload) => payload.bytes.fill(0));
    throw error;
  }
}

function downloadWebArchive(
  fileName: string,
  bytes: Uint8Array,
  encrypted: boolean,
) {
  if (typeof document === "undefined" || typeof URL === "undefined") return false;
  const buffer = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
  const url = URL.createObjectURL(
    new Blob([buffer], {
      type: encrypted
        ? "application/vnd.pawpair.backup+encrypted"
        : "application/vnd.pawpair.backup+zip",
    }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1_000);
  return true;
}

export async function exportPortableBackup(
  state: CareState,
  options: PortableBackupSecurityOptions = {},
): Promise<PortableBackupExportResult> {
  const references = getPortableAttachmentReferences(state);
  const payloads = await readPortableAttachmentPayloads(references);
  let archive: Uint8Array;
  try {
    archive = createPortableBackupArchive(state, payloads);
  } finally {
    payloads.forEach((payload) => payload.bytes.fill(0));
  }
  const encrypted = typeof options.passphrase === "string";
  let portableBytes: Uint8Array;
  if (encrypted) {
    try {
      portableBytes = await encryptPortableBackupArchive(
        archive,
        options.passphrase as string,
      );
    } finally {
      archive.fill(0);
    }
  } else {
    portableBytes = archive;
  }
  const fileName = backupFileName(encrypted);

  try {
    if (
      Platform.OS === "web" &&
      downloadWebArchive(fileName, portableBytes, encrypted)
    ) {
      return {
        attachmentCount: references.length,
        byteLength: portableBytes.byteLength,
        encrypted,
        fileName,
        uri: null,
      };
    }

    const file = new File(Paths.cache, fileName);
    try {
      file.create({ intermediates: true, overwrite: true });
      file.write(portableBytes);
      if (!(await Sharing.isAvailableAsync())) {
        throw new Error("Sharing is not available on this device.");
      }
      await Sharing.shareAsync(file.uri, {
        dialogTitle: "Save PawPair portable backup",
        mimeType: encrypted ? "application/octet-stream" : "application/zip",
        UTI: encrypted ? "public.data" : "public.zip-archive",
      });
      return {
        attachmentCount: references.length,
        byteLength: portableBytes.byteLength,
        encrypted,
        fileName,
        uri: null,
      };
    } finally {
      if (file.exists) file.delete();
    }
  } finally {
    portableBytes.fill(0);
  }
}

export async function pickPortableBackup(
  options: PortableBackupSecurityOptions = {},
): Promise<PreparedPortableRestore | null> {
  const result = await DocumentPicker.getDocumentAsync({
    copyToCacheDirectory: true,
    multiple: false,
    type: [
      "application/zip",
      "application/octet-stream",
      "application/x-pawpair-backup",
      "application/vnd.pawpair.backup+zip",
    ],
  });
  if (result.canceled) return null;

  const selected = result.assets[0];
  if (!selected) return null;
  let selectedBytes: Uint8Array;
  try {
    selectedBytes = await readUriBytes(
      selected.uri,
      PORTABLE_BACKUP_MAX_ARCHIVE_BYTES + 128,
      "The selected PawPair backup is larger than 50 MB.",
    );
  } finally {
    deletePickedCacheFile(selected.uri);
  }
  const encrypted = isEncryptedPortableBackup(selectedBytes);
  let archive: Uint8Array;
  if (encrypted) {
    let passphrase = options.passphrase;
    let unlockError: string | undefined;
    try {
      while (true) {
        if (typeof passphrase !== "string") {
          if (!options.requestPassphrase) {
            throw new PortableBackupPassphraseRequiredError();
          }
          const requestedPassphrase =
            await options.requestPassphrase(unlockError);
          if (requestedPassphrase === null) return null;
          passphrase = requestedPassphrase;
        }

        const activePassphrase = passphrase;
        if (typeof activePassphrase !== "string") continue;
        try {
          archive = await decryptPortableBackupArchive(
            selectedBytes,
            activePassphrase,
          );
          break;
        } catch {
          if (!options.requestPassphrase) throw new Error("This backup could not be unlocked.");
          unlockError = "That password did not unlock this backup. Check it and try again.";
          passphrase = undefined;
        }
      }
    } finally {
      selectedBytes.fill(0);
    }
  } else {
    archive = selectedBytes;
  }
  let parsed: ReturnType<typeof parsePortableBackupArchive>;
  try {
    parsed = parsePortableBackupArchive(archive);
  } finally {
    archive.fill(0);
  }
  const stagedUris: string[] = [];
  const uriByReference = new Map<string, string>();

  try {
    parsed.attachments.forEach((attachment) => {
      const file = writeStagedAttachment(attachment.name, attachment.bytes);
      stagedUris.push(file.uri);
      uriByReference.set(attachment.referenceKey, file.uri);
    });
    const state = materializePortableBackupState(
      parsed.state,
      parsed.manifest.attachments,
      uriByReference,
    );
    return {
      attachmentCount: parsed.attachments.length,
      encrypted,
      exportedAt: parsed.manifest.exportedAt,
      petCount: state.pets.length,
      recordCount: state.healthRecords.length,
      stagedUris,
      state,
    };
  } catch (error) {
    await deleteUris(stagedUris);
    throw error;
  }
}

export async function discardPreparedPortableRestore(
  prepared: PreparedPortableRestore,
) {
  await deleteUris(prepared.stagedUris);
}

export async function deletePortableStateAttachments(state: CareState) {
  const uris = getPortableAttachmentReferences(state)
    .map((reference) => reference.uri)
    .filter((uri) => uri.startsWith("file:"));
  await deleteUris(uris);
}
