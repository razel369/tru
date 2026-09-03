import {
  strFromU8,
  strToU8,
  unzipSync,
  zipSync,
  type Zippable,
} from "fflate";

import type { PetCareState as CareState } from "./types";

export const PAWPAIR_BACKUP_FORMAT = "pawpair-portable-backup";
export const PAWPAIR_BACKUP_SCHEMA_VERSION = 1;
export const PAWPAIR_BACKUP_EXTENSION = "pawpair";

const MANIFEST_PATH = "manifest.json";
// fflate's synchronous archive APIs hold both the compressed and expanded
// buffers on the React Native JS heap. Keep these limits deliberately below
// desktop-oriented archive sizes so a valid backup cannot exhaust an iPhone.
export const PORTABLE_BACKUP_MAX_ARCHIVE_BYTES = 50 * 1024 * 1024;
export const PORTABLE_BACKUP_MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
export const PORTABLE_BACKUP_MAX_ATTACHMENT_COUNT = 100;
const MAX_MANIFEST_BYTES = 5 * 1024 * 1024;

type UnknownRecord = Record<string, unknown>;

export type PortableAttachmentReference = {
  archivePath: string;
  attachmentId: string;
  byteLength: number;
  field: "attachment" | "attachments";
  index: number | null;
  mimeType: string;
  name: string;
  recordId: string;
  referenceKey: string;
};

export type PortableAttachmentPayload = PortableAttachmentReference & {
  bytes: Uint8Array;
};

export type PortableBackupManifest = {
  appDataVersion: number;
  attachments: readonly PortableAttachmentReference[];
  exportedAt: string;
  format: typeof PAWPAIR_BACKUP_FORMAT;
  schemaVersion: typeof PAWPAIR_BACKUP_SCHEMA_VERSION;
  state: CareState;
};

export type ParsedPortableBackup = {
  attachments: readonly PortableAttachmentPayload[];
  manifest: PortableBackupManifest;
  state: CareState;
};

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function cloneState(state: CareState): CareState {
  return JSON.parse(JSON.stringify(state)) as CareState;
}

function safeSegment(value: string, fallback: string) {
  const normalized = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return normalized || fallback;
}

function attachmentMimeType(attachment: UnknownRecord) {
  const candidate = attachment.mimeType ?? attachment.mime;
  return typeof candidate === "string" && candidate.trim()
    ? candidate.trim()
    : "application/octet-stream";
}

function createReference(
  recordId: string,
  attachment: UnknownRecord,
  field: PortableAttachmentReference["field"],
  index: number | null,
): PortableAttachmentReference | null {
  const attachmentId = attachment.id;
  const uri = attachment.uri;
  if (typeof attachmentId !== "string" || typeof uri !== "string" || !uri) {
    return null;
  }

  const name =
    typeof attachment.name === "string" && attachment.name.trim()
      ? attachment.name.trim()
      : "medical-document";
  const referenceKey = `${recordId}::${attachmentId}`;
  const archivePath = `attachments/${safeSegment(recordId, "record")}-${safeSegment(
    attachmentId,
    "attachment",
  )}-${safeSegment(name, "document")}`;

  return {
    archivePath,
    attachmentId,
    byteLength: 0,
    field,
    index,
    mimeType: attachmentMimeType(attachment),
    name,
    recordId,
    referenceKey,
  };
}

export function getPortableAttachmentReferences(
  state: CareState,
): readonly (PortableAttachmentReference & { uri: string })[] {
  const stateRecord = state as unknown as UnknownRecord;
  const healthRecords = Array.isArray(stateRecord.healthRecords)
    ? stateRecord.healthRecords
    : [];
  const references: (PortableAttachmentReference & { uri: string })[] = [];

  healthRecords.forEach((candidate) => {
    if (!isRecord(candidate) || typeof candidate.id !== "string") return;

    if (isRecord(candidate.attachment)) {
      const reference = createReference(
        candidate.id,
        candidate.attachment,
        "attachment",
        null,
      );
      if (reference) {
        references.push({ ...reference, uri: candidate.attachment.uri as string });
      }
    }

    if (Array.isArray(candidate.attachments)) {
      candidate.attachments.forEach((attachment, index) => {
        if (!isRecord(attachment)) return;
        const reference = createReference(
          candidate.id as string,
          attachment,
          "attachments",
          index,
        );
        if (reference) {
          references.push({ ...reference, uri: attachment.uri as string });
        }
      });
    }
  });

  return references;
}

function replaceReferenceUri(
  state: CareState,
  reference: PortableAttachmentReference,
  uri: string,
) {
  const stateRecord = state as unknown as UnknownRecord;
  const healthRecords = Array.isArray(stateRecord.healthRecords)
    ? stateRecord.healthRecords
    : [];
  const record = healthRecords.find(
    (candidate) => isRecord(candidate) && candidate.id === reference.recordId,
  );
  if (!isRecord(record)) throw new Error("Backup references a missing health record.");

  const candidate =
    reference.field === "attachment"
      ? record.attachment
      : Array.isArray(record.attachments) && reference.index !== null
        ? record.attachments[reference.index]
        : null;
  if (!isRecord(candidate) || candidate.id !== reference.attachmentId) {
    throw new Error("Backup attachment reference does not match its health record.");
  }

  candidate.uri = uri;
  candidate.storage = "app-document";
}

export function materializePortableBackupState(
  state: CareState,
  references: readonly PortableAttachmentReference[],
  uriByReference: ReadonlyMap<string, string>,
) {
  const restored = cloneState(state);
  references.forEach((reference) => {
    const uri = uriByReference.get(reference.referenceKey);
    if (!uri) throw new Error("A restored attachment file is missing.");
    replaceReferenceUri(restored, reference, uri);
  });
  return restored;
}

function validateCareState(value: unknown): asserts value is CareState {
  if (!isRecord(value) || value.version !== 1) {
    throw new Error("This backup uses an unsupported PawPair data version.");
  }
  if (
    !Array.isArray(value.pets) ||
    !Array.isArray(value.tasks) ||
    !Array.isArray(value.logs) ||
    !Array.isArray(value.healthRecords)
  ) {
    throw new Error("The backup does not contain a valid PawPair care state.");
  }
  if (value.pets.length > 100 || value.healthRecords.length > 20_000) {
    throw new Error("The backup contains an unreasonable number of records.");
  }
}

function validateReference(value: unknown): asserts value is PortableAttachmentReference {
  if (
    !isRecord(value) ||
    typeof value.archivePath !== "string" ||
    !value.archivePath.startsWith("attachments/") ||
    value.archivePath.includes("..") ||
    typeof value.attachmentId !== "string" ||
    typeof value.byteLength !== "number" ||
    value.byteLength < 0 ||
    value.byteLength > PORTABLE_BACKUP_MAX_ATTACHMENT_BYTES ||
    (value.field !== "attachment" && value.field !== "attachments") ||
    (value.index !== null && (!Number.isInteger(value.index) || (value.index as number) < 0)) ||
    typeof value.mimeType !== "string" ||
    typeof value.name !== "string" ||
    typeof value.recordId !== "string" ||
    typeof value.referenceKey !== "string"
  ) {
    throw new Error("The backup contains an invalid attachment reference.");
  }
}

function parseManifest(bytes: Uint8Array): PortableBackupManifest {
  if (bytes.byteLength > MAX_MANIFEST_BYTES) {
    throw new Error("The PawPair backup manifest is too large.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(strFromU8(bytes));
  } catch {
    throw new Error("The PawPair backup manifest is not valid JSON.");
  }

  if (
    !isRecord(parsed) ||
    parsed.format !== PAWPAIR_BACKUP_FORMAT ||
    parsed.schemaVersion !== PAWPAIR_BACKUP_SCHEMA_VERSION ||
    typeof parsed.exportedAt !== "string" ||
    typeof parsed.appDataVersion !== "number" ||
    !Array.isArray(parsed.attachments)
  ) {
    throw new Error("This is not a supported PawPair backup.");
  }
  validateCareState(parsed.state);
  parsed.attachments.forEach(validateReference);
  if (parsed.attachments.length > PORTABLE_BACKUP_MAX_ATTACHMENT_COUNT) {
    throw new Error("The PawPair backup contains too many attachments.");
  }

  const paths = new Set<string>();
  const keys = new Set<string>();
  parsed.attachments.forEach((reference) => {
    if (paths.has(reference.archivePath) || keys.has(reference.referenceKey)) {
      throw new Error("The PawPair backup contains duplicate attachment references.");
    }
    paths.add(reference.archivePath);
    keys.add(reference.referenceKey);
  });

  return parsed as unknown as PortableBackupManifest;
}

export function createPortableBackupArchive(
  state: CareState,
  payloads: readonly PortableAttachmentPayload[],
  exportedAt = new Date().toISOString(),
) {
  validateCareState(state);
  const references = getPortableAttachmentReferences(state);
  if (references.length > PORTABLE_BACKUP_MAX_ATTACHMENT_COUNT) {
    throw new Error("PawPair can back up at most 100 medical attachments at once.");
  }
  if (references.length !== payloads.length) {
    throw new Error("Not every medical attachment was available for backup.");
  }

  const referencePaths = new Set<string>();
  const referenceKeys = new Set<string>();
  references.forEach((reference) => {
    if (
      referencePaths.has(reference.archivePath) ||
      referenceKeys.has(reference.referenceKey)
    ) {
      throw new Error("Two medical attachments resolve to the same backup identity.");
    }
    referencePaths.add(reference.archivePath);
    referenceKeys.add(reference.referenceKey);
  });

  const payloadByReference = new Map(
    payloads.map((payload) => [payload.referenceKey, payload]),
  );
  const archivedState = cloneState(state);
  const manifestReferences = references.map((reference) => {
    const payload = payloadByReference.get(reference.referenceKey);
    if (
      !payload ||
      payload.bytes.byteLength > PORTABLE_BACKUP_MAX_ATTACHMENT_BYTES
    ) {
      throw new Error(`Medical attachment ${reference.name} could not be backed up.`);
    }
    replaceReferenceUri(
      archivedState,
      reference,
      `pawpair-archive://${reference.archivePath}`,
    );
    return { ...reference, byteLength: payload.bytes.byteLength };
  });

  const manifest: PortableBackupManifest = {
    appDataVersion: state.version,
    attachments: manifestReferences,
    exportedAt,
    format: PAWPAIR_BACKUP_FORMAT,
    schemaVersion: PAWPAIR_BACKUP_SCHEMA_VERSION,
    state: archivedState,
  };
  const files: Zippable = {
    [MANIFEST_PATH]: [strToU8(JSON.stringify(manifest)), { level: 6 }],
  };
  manifestReferences.forEach((reference) => {
    const payload = payloadByReference.get(reference.referenceKey);
    if (!payload) throw new Error("Backup attachment payload is missing.");
    files[reference.archivePath] = [payload.bytes, { level: 0 }];
  });

  const archive = zipSync(files, { level: 6 });
  if (archive.byteLength > PORTABLE_BACKUP_MAX_ARCHIVE_BYTES) {
    throw new Error("The PawPair backup is larger than 50 MB.");
  }
  return archive;
}

export function parsePortableBackupArchive(bytes: Uint8Array): ParsedPortableBackup {
  if (
    !bytes.byteLength ||
    bytes.byteLength > PORTABLE_BACKUP_MAX_ARCHIVE_BYTES
  ) {
    throw new Error("The selected PawPair backup has an invalid size.");
  }

  let totalExpandedBytes = 0;
  let fileCount = 0;
  const files = unzipSync(bytes, {
    filter(file) {
      fileCount += 1;
      totalExpandedBytes += file.originalSize;
      if (
        fileCount > PORTABLE_BACKUP_MAX_ATTACHMENT_COUNT + 1 ||
        totalExpandedBytes > PORTABLE_BACKUP_MAX_ARCHIVE_BYTES
      ) {
        throw new Error("The backup expands beyond PawPair safety limits.");
      }
      return file.name === MANIFEST_PATH || file.name.startsWith("attachments/");
    },
  });
  const manifestBytes = files[MANIFEST_PATH];
  if (!manifestBytes) throw new Error("The PawPair backup manifest is missing.");
  const manifest = parseManifest(manifestBytes);

  const attachments = manifest.attachments.map((reference) => {
    const attachmentBytes = files[reference.archivePath];
    if (!attachmentBytes || attachmentBytes.byteLength !== reference.byteLength) {
      throw new Error(`Medical attachment ${reference.name} is missing or damaged.`);
    }
    return { ...reference, bytes: attachmentBytes };
  });

  return { attachments, manifest, state: manifest.state };
}
