import * as DocumentPicker from "expo-document-picker";
import * as Crypto from "expo-crypto";
import { Directory, File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { Linking, Platform } from "react-native";

import type { HealthAttachment } from "./types";

const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024;
const HEALTH_ATTACHMENT_DIRECTORY = "pawpair-health-records";
const MIME_BY_EXTENSION: Readonly<Record<string, string>> = {
  ".heic": "image/heic",
  ".heif": "image/heif",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".webp": "image/webp",
};
const EXTENSION_BY_MIME: Readonly<Record<string, string>> = {
  "application/pdf": ".pdf",
  "image/heic": ".heic",
  "image/heif": ".heif",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

function safeFileName(value: string) {
  const normalized = value
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .slice(-96);
  return normalized || "health-document";
}

function extensionFromName(value: string) {
  const match = /\.[a-zA-Z0-9]+$/.exec(value.trim());
  return match?.[0]?.toLowerCase() ?? "";
}

function uniqueFileName(originalName: string, mimeType: string) {
  const safe = safeFileName(originalName);
  const currentExtension = extensionFromName(safe);
  const extension =
    MIME_BY_EXTENSION[currentExtension] === mimeType
      ? currentExtension
      : (EXTENSION_BY_MIME[mimeType] ?? "");
  const separator = currentExtension ? safe.lastIndexOf(currentExtension) : -1;
  const stem = separator > 0 ? safe.slice(0, separator) : safe;
  return `${Date.now()}-${Crypto.randomUUID()}-${stem.slice(0, 58)}${extension}`;
}

function attachmentDirectory() {
  const directory = new Directory(Paths.document, HEALTH_ATTACHMENT_DIRECTORY);
  if (!directory.exists) {
    directory.create({ idempotent: true, intermediates: true });
  }
  return directory;
}

function utiForMimeType(mimeType: string) {
  if (mimeType === "application/pdf") return "com.adobe.pdf";
  if (mimeType === "image/png") return "public.png";
  if (mimeType === "image/jpeg") return "public.jpeg";
  if (mimeType === "image/heic") return "public.heic";
  if (mimeType === "image/heif") return "public.heif";
  if (mimeType === "image/webp") return "org.webmproject.webp";
  return "public.data";
}

function bytesMatch(bytes: Uint8Array, offset: number, expected: number[]) {
  return expected.every((value, index) => bytes[offset + index] === value);
}

function asciiAt(bytes: Uint8Array, offset: number, length: number) {
  return String.fromCharCode(...bytes.subarray(offset, offset + length));
}

function detectAttachmentMimeType(bytes: Uint8Array) {
  const pdfSearchLimit = Math.min(bytes.byteLength - 4, 1024);
  for (let offset = 0; offset <= pdfSearchLimit; offset += 1) {
    if (bytesMatch(bytes, offset, [0x25, 0x50, 0x44, 0x46, 0x2d])) {
      return "application/pdf";
    }
  }
  if (bytesMatch(bytes, 0, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (
    bytesMatch(bytes, 0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  ) {
    return "image/png";
  }
  if (
    asciiAt(bytes, 0, 4) === "RIFF" &&
    asciiAt(bytes, 8, 4) === "WEBP"
  ) {
    return "image/webp";
  }
  if (asciiAt(bytes, 4, 4) === "ftyp") {
    const brand = asciiAt(bytes, 8, 4).toLowerCase();
    if (["heic", "heix", "hevc", "hevx"].includes(brand)) {
      return "image/heic";
    }
    if (["heif", "heim", "heis", "mif1", "msf1"].includes(brand)) {
      return "image/heif";
    }
  }
  return null;
}

function normalizeDeclaredMimeType(value?: string | null) {
  const normalized = value?.split(";", 1)[0]?.trim().toLowerCase();
  if (normalized === "image/jpg") return "image/jpeg";
  if (normalized === "application/x-pdf") return "application/pdf";
  return normalized ?? "";
}

function sameMimeFamily(first: string, second: string) {
  if (first === second) return true;
  return (
    (first === "image/heic" || first === "image/heif") &&
    (second === "image/heic" || second === "image/heif")
  );
}

function validateAttachmentIdentity(
  name: string,
  declaredMimeType: string | null | undefined,
  detectedMimeType: string,
) {
  const extensionMimeType = MIME_BY_EXTENSION[extensionFromName(name)];
  const normalizedDeclaredMimeType = normalizeDeclaredMimeType(declaredMimeType);
  if (
    extensionMimeType &&
    !sameMimeFamily(extensionMimeType, detectedMimeType)
  ) {
    throw new Error("The document contents do not match its file extension.");
  }
  if (
    normalizedDeclaredMimeType &&
    normalizedDeclaredMimeType !== "application/octet-stream" &&
    normalizedDeclaredMimeType !== "binary/octet-stream" &&
    !sameMimeFamily(normalizedDeclaredMimeType, detectedMimeType)
  ) {
    throw new Error("The document contents do not match its reported file type.");
  }
}

function ensureAttachmentSize(size: number) {
  if (!Number.isFinite(size) || size <= 0) {
    throw new Error("Choose a non-empty PDF or image.");
  }
  if (size > MAX_ATTACHMENT_BYTES) {
    throw new Error("Choose a PDF or image smaller than 20 MB.");
  }
}

async function readAttachmentBytes(uri: string) {
  if (Platform.OS === "web" || /^(blob:|data:|https?:)/i.test(uri)) {
    const response = await fetch(uri);
    if (!response.ok) throw new Error("PawPair could not read this document.");
    const declaredLength = Number(response.headers.get("content-length"));
    if (Number.isFinite(declaredLength) && declaredLength > 0) {
      ensureAttachmentSize(declaredLength);
    }
    const bytes = new Uint8Array(await response.arrayBuffer());
    ensureAttachmentSize(bytes.byteLength);
    return bytes;
  }
  const source = new File(uri);
  if (!source.exists) throw new Error("The selected document is unavailable.");
  ensureAttachmentSize(source.size);
  const bytes = await source.bytes();
  ensureAttachmentSize(bytes.byteLength);
  return bytes;
}

function isManagedAttachmentUri(uri: string) {
  try {
    const file = new File(uri);
    const directory = new Directory(Paths.document, HEALTH_ATTACHMENT_DIRECTORY);
    const root = `${directory.uri.replace(/\/+$/, "")}/`;
    const relativePath = file.uri.startsWith(root)
      ? file.uri.slice(root.length)
      : "";
    return Boolean(relativePath) && !relativePath.includes("/");
  } catch {
    return false;
  }
}

function deletePickedCacheFile(uri: string) {
  if (Platform.OS === "web") return;
  try {
    const file = new File(uri);
    const cacheRoot = `${Paths.cache.uri.replace(/\/+$/, "")}/`;
    if (file.uri.startsWith(cacheRoot) && file.exists) file.delete();
  } catch {
    // Picker cache cleanup is best effort.
  }
}

export function formatAttachmentSize(size: number) {
  if (!Number.isFinite(size) || size <= 0) return "Size unavailable";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / (1024 * 1024)).toFixed(size >= 10 * 1024 * 1024 ? 0 : 1)} MB`;
}

export async function pickLocalHealthAttachment(): Promise<HealthAttachment | null> {
  const result = await DocumentPicker.getDocumentAsync({
    copyToCacheDirectory: true,
    multiple: false,
    type: [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/heic",
      "image/heif",
      "image/webp",
    ],
  });
  if (result.canceled || !result.assets[0]) return null;

  const asset = result.assets[0];
  if (typeof asset.size === "number" && asset.size > 0) {
    ensureAttachmentSize(asset.size);
  }
  const createdAt = new Date().toISOString();
  let bytes: Uint8Array | null = null;
  let destination: File | null = null;
  try {
    bytes = await readAttachmentBytes(asset.uri);
    const mimeType = detectAttachmentMimeType(bytes);
    if (!mimeType) {
      throw new Error(
        "Choose a genuine PDF, JPEG, PNG, HEIC, HEIF, or WebP document.",
      );
    }
    validateAttachmentIdentity(asset.name, asset.mimeType, mimeType);
    const id = `attachment-${Crypto.randomUUID()}`;
    if (Platform.OS === "web") {
      return {
        id,
        name: asset.name,
        uri: asset.uri,
        mimeType,
        size: bytes.byteLength,
        storage: "session",
        createdAt,
      };
    }

    destination = new File(
      attachmentDirectory(),
      uniqueFileName(asset.name, mimeType),
    );
    destination.create({ intermediates: true, overwrite: false });
    destination.write(bytes);
    return {
      id,
      name: asset.name,
      uri: destination.uri,
      mimeType,
      size: destination.size,
      storage: "app-document",
      createdAt,
    };
  } catch (error) {
    if (destination?.exists) destination.delete();
    throw error;
  } finally {
    bytes?.fill(0);
    deletePickedCacheFile(asset.uri);
  }
}

export async function shareLocalHealthAttachment(attachment: HealthAttachment) {
  if (Platform.OS === "web") {
    await Linking.openURL(attachment.uri);
    return;
  }
  if (
    attachment.storage !== "app-document" ||
    !isManagedAttachmentUri(attachment.uri)
  ) {
    throw new Error("This document is not stored in PawPair's secure folder.");
  }
  const file = new File(attachment.uri);
  if (!file.exists) throw new Error("This document is no longer available.");
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error("Sharing is not available on this device.");
  }
  await Sharing.shareAsync(attachment.uri, {
    dialogTitle: attachment.name,
    mimeType: attachment.mimeType,
    UTI: utiForMimeType(attachment.mimeType),
  });
}

export async function removeLocalHealthAttachment(
  attachment?: HealthAttachment,
) {
  if (
    !attachment ||
    attachment.storage !== "app-document" ||
    !isManagedAttachmentUri(attachment.uri)
  ) {
    return;
  }
  try {
    const file = new File(attachment.uri);
    if (file.exists) file.delete();
  } catch {
    // Deletion remains idempotent if iOS already removed an unavailable file.
  }
}

export async function pruneLocalHealthAttachments(
  keepUris: Iterable<string>,
): Promise<{ deleted: number; failed: number }> {
  if (Platform.OS === "web") return { deleted: 0, failed: 0 };
  const directory = new Directory(Paths.document, HEALTH_ATTACHMENT_DIRECTORY);
  if (!directory.exists) return { deleted: 0, failed: 0 };

  const keep = new Set<string>();
  for (const uri of keepUris) {
    if (!isManagedAttachmentUri(uri)) continue;
    try {
      keep.add(new File(uri).uri);
    } catch {
      // Invalid restored references are ignored and cannot protect another file.
    }
  }

  let entries: ReturnType<Directory["list"]>;
  try {
    entries = directory.list();
  } catch {
    return { deleted: 0, failed: 1 };
  }

  let deleted = 0;
  let failed = 0;
  entries.forEach((entry) => {
    if (!(entry instanceof File) || keep.has(entry.uri)) return;
    try {
      if (entry.exists) entry.delete();
      deleted += 1;
    } catch {
      failed += 1;
    }
  });
  return { deleted, failed };
}

export async function clearLocalHealthAttachments() {
  if (Platform.OS === "web") return;
  const directory = new Directory(Paths.document, HEALTH_ATTACHMENT_DIRECTORY);
  if (directory.exists) directory.delete();
}
