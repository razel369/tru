import assert from "node:assert/strict";

import { strToU8, zipSync } from "fflate";

import {
  createPortableBackupArchive,
  getPortableAttachmentReferences,
  materializePortableBackupState,
  parsePortableBackupArchive,
} from "../src/features/care/portable-backup-core";

function stateWithAttachment() {
  return {
    activePetId: "pet-atlas",
    healthRecords: [
      {
        attachment: {
          createdAt: "2026-07-16T12:00:00.000Z",
          id: "attachment-blood-panel",
          mime: "application/pdf",
          name: "atlas-blood-panel.pdf",
          size: 5,
          storage: "app-document",
          uri: "file:///private/pawpair-health-records/original.pdf",
        },
        date: "2026-07-16",
        id: "record-blood-panel",
        petId: "pet-atlas",
        title: "Blood panel",
        type: "document",
      },
    ],
    logs: [],
    pets: [{ id: "pet-atlas", name: "Atlas" }],
    tasks: [],
    version: 1,
  };
}

const state = stateWithAttachment();
const reference = getPortableAttachmentReferences(state)[0];
assert(reference, "attachment reference should be discovered");
const attachmentBytes = new Uint8Array([37, 80, 68, 70, 45]);
const archive = createPortableBackupArchive(
  state,
  [{ ...reference, bytes: attachmentBytes }],
  "2026-07-16T14:00:00.000Z",
);
const parsed = parsePortableBackupArchive(archive);

assert.equal(parsed.manifest.exportedAt, "2026-07-16T14:00:00.000Z");
assert.deepEqual(Array.from(parsed.attachments[0].bytes), Array.from(attachmentBytes));
assert.match(
  parsed.state.healthRecords[0].attachment.uri,
  /^pawpair-archive:\/\//,
  "private source URI must not be stored in the manifest",
);
const restored = materializePortableBackupState(
  parsed.state,
  parsed.manifest.attachments,
  new Map([[reference.referenceKey, "file:///restored/atlas-blood-panel.pdf"]]),
);
assert.equal(
  restored.healthRecords[0].attachment.uri,
  "file:///restored/atlas-blood-panel.pdf",
);
assert.equal(restored.healthRecords[0].attachment.storage, "app-document");

assert.throws(() => parsePortableBackupArchive(archive.slice(0, -12)));
assert.throws(
  () =>
    parsePortableBackupArchive(
      zipSync({
        "manifest.json": strToU8(
          JSON.stringify({ format: "not-pawpair", schemaVersion: 1 }),
        ),
      }),
    ),
  /not a supported PawPair backup/,
);
assert.throws(
  () => createPortableBackupArchive(stateWithAttachment(), []),
  /Not every medical attachment was available/,
);

console.log(
  JSON.stringify(
    {
      archiveBytes: archive.byteLength,
      attachmentBytes: parsed.attachments[0].bytes.byteLength,
      checks: 4,
      status: "passed",
    },
    null,
    2,
  ),
);
