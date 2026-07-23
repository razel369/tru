import { describe, expect, it } from "vitest";

import type { PetCareState } from "./types";
import {
  createPortableBackupArchive,
  parsePortableBackupArchive,
  PORTABLE_BACKUP_MAX_ARCHIVE_BYTES,
  PORTABLE_BACKUP_MAX_ATTACHMENT_BYTES,
  PORTABLE_BACKUP_MAX_ATTACHMENT_COUNT,
} from "./portable-backup-core";

const emptyState: PetCareState = {
  activePetId: null,
  healthRecords: [],
  logs: [],
  pets: [],
  tasks: [],
  version: 1,
};

describe("portable backup archive", () => {
  it("round-trips a valid care state and manifest", () => {
    const exportedAt = "2026-07-23T12:00:00.000Z";
    const archive = createPortableBackupArchive(emptyState, [], exportedAt);
    const parsed = parsePortableBackupArchive(archive);

    expect(parsed.manifest.exportedAt).toBe(exportedAt);
    expect(parsed.manifest.state).toEqual(emptyState);
    expect(parsed.attachments).toEqual([]);
  });

  it("keeps synchronous mobile archive limits conservative", () => {
    expect(PORTABLE_BACKUP_MAX_ARCHIVE_BYTES).toBe(50 * 1024 * 1024);
    expect(PORTABLE_BACKUP_MAX_ATTACHMENT_BYTES).toBe(10 * 1024 * 1024);
    expect(PORTABLE_BACKUP_MAX_ATTACHMENT_COUNT).toBe(100);
  });
});
