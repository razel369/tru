import * as Crypto from "expo-crypto";

export function createLocalId(prefix: string) {
  return `${prefix}-${Crypto.randomUUID()}`;
}
