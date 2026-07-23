import { scryptAsync } from "@noble/hashes/scrypt.js";
import * as Crypto from "expo-crypto";

const MAGIC = Uint8Array.of(0x50, 0x41, 0x57, 0x50, 0x41, 0x49, 0x52, 0x21);
const ENVELOPE_VERSION = 1;
const KDF_SCRYPT = 1;
const CIPHER_AES_256_GCM = 1;
const HEADER_BYTES = 44;
const SALT_OFFSET = 28;
const SALT_BYTES = 16;
const IV_BYTES = 12;
const TAG_BYTES = 16;
const KEY_BYTES = 32;
const MAX_PLAINTEXT_BYTES = 300 * 1024 * 1024;
const SCRYPT_N = 2 ** 15;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_MAX_MEMORY = 64 * 1024 * 1024;

export const PORTABLE_BACKUP_MIN_PASSPHRASE_LENGTH = 12;
export const PORTABLE_BACKUP_MAX_PASSPHRASE_LENGTH = 256;

export class PortableBackupPassphraseRequiredError extends Error {
  readonly code = "portable-backup-passphrase-required";

  constructor() {
    super("This PawPair backup is encrypted. Enter its backup password to continue.");
    this.name = "PortableBackupPassphraseRequiredError";
  }
}

export class PortableBackupDecryptionError extends Error {
  readonly code = "portable-backup-decryption-failed";

  constructor() {
    super("The backup password is incorrect, or the encrypted backup is damaged.");
    this.name = "PortableBackupDecryptionError";
  }
}

function hasMagic(bytes: Uint8Array) {
  if (bytes.byteLength < MAGIC.byteLength) return false;
  return MAGIC.every((value, index) => bytes[index] === value);
}

function normalizedPassphrase(passphrase: string) {
  const normalized = passphrase.normalize("NFKC");
  const visibleLength = [...normalized.trim()].length;
  if (
    visibleLength < PORTABLE_BACKUP_MIN_PASSPHRASE_LENGTH ||
    normalized.length > PORTABLE_BACKUP_MAX_PASSPHRASE_LENGTH
  ) {
    throw new Error(
      `Use a backup password between ${PORTABLE_BACKUP_MIN_PASSPHRASE_LENGTH} and ${PORTABLE_BACKUP_MAX_PASSPHRASE_LENGTH} characters.`,
    );
  }
  return normalized;
}

function createHeader(plaintextLength: number, salt: Uint8Array) {
  const header = new Uint8Array(HEADER_BYTES);
  const view = new DataView(header.buffer);
  header.set(MAGIC, 0);
  header[8] = ENVELOPE_VERSION;
  header[9] = KDF_SCRYPT;
  header[10] = CIPHER_AES_256_GCM;
  header[11] = 0;
  view.setUint32(12, SCRYPT_N, false);
  view.setUint32(16, SCRYPT_R, false);
  view.setUint32(20, SCRYPT_P, false);
  view.setUint32(24, plaintextLength, false);
  header.set(salt, SALT_OFFSET);
  return header;
}

function parseHeader(bytes: Uint8Array) {
  if (!hasMagic(bytes) || bytes.byteLength < HEADER_BYTES + IV_BYTES + TAG_BYTES) {
    throw new Error("This is not a supported encrypted PawPair backup.");
  }

  const header = bytes.subarray(0, HEADER_BYTES);
  const view = new DataView(header.buffer, header.byteOffset, header.byteLength);
  const plaintextLength = view.getUint32(24, false);
  if (
    header[8] !== ENVELOPE_VERSION ||
    header[9] !== KDF_SCRYPT ||
    header[10] !== CIPHER_AES_256_GCM ||
    header[11] !== 0 ||
    view.getUint32(12, false) !== SCRYPT_N ||
    view.getUint32(16, false) !== SCRYPT_R ||
    view.getUint32(20, false) !== SCRYPT_P ||
    plaintextLength < 1 ||
    plaintextLength > MAX_PLAINTEXT_BYTES ||
    bytes.byteLength !== HEADER_BYTES + IV_BYTES + plaintextLength + TAG_BYTES
  ) {
    throw new Error("This encrypted PawPair backup uses an unsupported format.");
  }

  return {
    header,
    plaintextLength,
    salt: header.slice(SALT_OFFSET, SALT_OFFSET + SALT_BYTES),
  };
}

async function deriveEncryptionKey(passphrase: string, salt: Uint8Array) {
  const keyBytes = await scryptAsync(normalizedPassphrase(passphrase), salt, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
    dkLen: KEY_BYTES,
    asyncTick: 8,
    maxmem: SCRYPT_MAX_MEMORY,
  });
  try {
    return (await Crypto.AESEncryptionKey.import(
      keyBytes,
    )) as Crypto.AESEncryptionKey;
  } finally {
    keyBytes.fill(0);
  }
}

export function isEncryptedPortableBackup(bytes: Uint8Array) {
  return hasMagic(bytes);
}

export async function encryptPortableBackupArchive(
  plaintext: Uint8Array,
  passphrase: string,
) {
  if (!plaintext.byteLength || plaintext.byteLength > MAX_PLAINTEXT_BYTES) {
    throw new Error("The PawPair backup is too large to encrypt safely.");
  }

  const salt = await Crypto.getRandomBytesAsync(SALT_BYTES);
  const header = createHeader(plaintext.byteLength, salt);
  const key = await deriveEncryptionKey(passphrase, salt);
  const sealed = await Crypto.aesEncryptAsync(plaintext, key, {
    additionalData: header,
    nonce: { length: IV_BYTES },
    tagLength: TAG_BYTES,
  });
  const combined = await sealed.combined("bytes");
  const encrypted = new Uint8Array(header.byteLength + combined.byteLength);
  encrypted.set(header, 0);
  encrypted.set(combined, header.byteLength);
  return encrypted;
}

export async function decryptPortableBackupArchive(
  encrypted: Uint8Array,
  passphrase: string,
) {
  const { header, plaintextLength, salt } = parseHeader(encrypted);
  const key = await deriveEncryptionKey(passphrase, salt);
  // Expo Crypto's web implementation reads the backing ArrayBuffer without
  // preserving a Uint8Array byteOffset. Give it an offset-zero copy so the
  // PawPair envelope header is never interpreted as part of the sealed data.
  const sealed = Crypto.AESSealedData.fromCombined(
    encrypted.slice(HEADER_BYTES),
    { ivLength: IV_BYTES, tagLength: TAG_BYTES },
  );

  let plaintext: Uint8Array;
  try {
    plaintext = await Crypto.aesDecryptAsync(sealed, key, {
      additionalData: header,
      output: "bytes",
    });
  } catch {
    throw new PortableBackupDecryptionError();
  }
  if (plaintext.byteLength !== plaintextLength) {
    plaintext.fill(0);
    throw new PortableBackupDecryptionError();
  }
  return plaintext;
}
