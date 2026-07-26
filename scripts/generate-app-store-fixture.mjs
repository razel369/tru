import fs from "node:fs";
import path from "node:path";

const outputDirectory = path.resolve(
  process.argv[2] ?? "native-qa/app-store-fixture",
);
const screenshotDate = "2026-07-26";
const generatedAt = "2026-07-26T12:15:00.000Z";

const pets = [
  {
    id: "showcase-milo",
    name: "Milo",
    species: "dog",
    breed: "Golden Retriever",
    age: 4,
    avatar: "milo",
    visualProfile: "dog-large",
    visual: {
      assetKey: "breed:dog:golden-retriever",
      engravingText: "MILO",
      profile: "dog-large",
      revision: 1,
      status: "ready",
    },
    careProfile: {
      dateOfBirth: "2022-04-18",
      diet: "Sensitive stomach",
      veterinarianName: "Harbor Veterinary",
      sex: "male",
      reproductiveStatus: "altered",
    },
    color: "#F3B66D",
    medications: [],
  },
  {
    id: "showcase-luna",
    name: "Luna",
    species: "cat",
    breed: "British Shorthair",
    age: 3,
    avatar: "luna",
    visualProfile: "cat-compact",
    visual: {
      assetKey: "breed:cat:british-shorthair",
      engravingText: "LUNA",
      profile: "cat-compact",
      revision: 1,
      status: "ready",
    },
    careProfile: {
      dateOfBirth: "2023-02-11",
      allergies: "None known",
      sex: "female",
      reproductiveStatus: "altered",
    },
    color: "#9B91C8",
    medications: [],
  },
];

const tasks = [
  {
    id: "showcase-breakfast",
    petId: "showcase-milo",
    category: "feeding",
    title: "Breakfast",
    instructions: "Serve with fresh water",
    details: { quantity: "1 cup" },
    schedule: { frequency: "daily", times: ["08:00"] },
    enabled: true,
    createdAt: generatedAt,
  },
  {
    id: "showcase-medication",
    petId: "showcase-milo",
    category: "medication",
    title: "Joint support",
    instructions: "Give with food",
    details: {
      dose: "1 tablet",
      route: "oral",
      stock: 18,
      stockUnit: "tablets",
      unitsPerDose: 1,
      refillThreshold: 5,
    },
    schedule: { frequency: "daily", times: ["09:00"] },
    enabled: true,
    createdAt: generatedAt,
  },
  {
    id: "showcase-walk",
    petId: "showcase-milo",
    category: "walk",
    title: "Park walk",
    instructions: "Easy pace",
    details: { durationMinutes: 30 },
    schedule: { frequency: "daily", times: ["12:30"] },
    enabled: true,
    createdAt: generatedAt,
  },
  {
    id: "showcase-water",
    petId: "showcase-luna",
    category: "water",
    title: "Refresh water",
    instructions: "Rinse the bowl first",
    schedule: { frequency: "daily", times: ["14:00"] },
    enabled: true,
    createdAt: generatedAt,
  },
  {
    id: "showcase-grooming",
    petId: "showcase-milo",
    category: "grooming",
    title: "Brush coat",
    instructions: "Five calm minutes",
    details: { durationMinutes: 5 },
    schedule: { frequency: "daily", times: ["16:30"] },
    enabled: true,
    createdAt: generatedAt,
  },
  {
    id: "showcase-evening-meal",
    petId: "showcase-milo",
    category: "feeding",
    title: "Evening meal",
    instructions: "Serve after the walk",
    details: { quantity: "1 cup" },
    schedule: { frequency: "daily", times: ["19:00"] },
    enabled: true,
    createdAt: generatedAt,
  },
  {
    id: "showcase-dinner",
    petId: "showcase-luna",
    category: "feeding",
    title: "Dinner",
    instructions: "Wet food",
    details: { quantity: "1 pouch" },
    schedule: { frequency: "daily", times: ["18:30"] },
    enabled: true,
    createdAt: generatedAt,
  },
];

const logs = [
  {
    id: "showcase-log-breakfast",
    taskId: "showcase-breakfast",
    petId: "showcase-milo",
    date: screenshotDate,
    scheduledTime: "08:00",
    status: "done",
    completedAt: "2026-07-26T08:04:00.000Z",
    completedBy: "You",
    taskSnapshotVersion: 1,
    taskTitle: "Breakfast",
    taskCategory: "feeding",
    taskInstructions: "Serve with fresh water",
    planned: { quantity: "1 cup" },
    actual: { quantity: "1 cup" },
  },
];

const healthRecords = [
  {
    id: "showcase-weight-current",
    petId: "showcase-milo",
    type: "weight",
    title: "Weight",
    date: "2026-07-24",
    value: "27.4",
    unit: "kg",
    notes: "Steady and within target range",
    createdAt: generatedAt,
  },
  {
    id: "showcase-weight-previous",
    petId: "showcase-milo",
    type: "weight",
    title: "Weight",
    date: "2026-06-23",
    value: "27.7",
    unit: "kg",
    createdAt: "2026-06-23T12:00:00.000Z",
  },
  {
    id: "showcase-vaccine",
    petId: "showcase-milo",
    type: "vaccination",
    title: "Rabies vaccine",
    date: "2026-05-10",
    nextDueDate: "2027-05-10",
    provider: "Harbor Veterinary",
    createdAt: "2026-05-10T10:00:00.000Z",
  },
  {
    id: "showcase-visit",
    petId: "showcase-milo",
    type: "vet-visit",
    title: "Annual wellness visit",
    date: "2026-05-10",
    notes: "Healthy exam",
    provider: "Harbor Veterinary",
    createdAt: "2026-05-10T10:30:00.000Z",
  },
];

const state = {
  version: 1,
  pets,
  tasks,
  logs,
  healthRecords,
  activePetId: "showcase-milo",
};

function checksumCareStatePayload(payload) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < payload.length; index += 1) {
    hash ^= payload.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `${payload.length}:${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function sqlString(value) {
  return `'${value.replaceAll("'", "''")}'`;
}

const payload = JSON.stringify(state);
const checksum = checksumCareStatePayload(payload);
const sql = `BEGIN;
DELETE FROM care_state_snapshots WHERE id = 'primary';
INSERT INTO care_state_snapshots (
  id, data_version, payload, payload_checksum, updated_at_utc
) VALUES (
  'primary',
  1,
  ${sqlString(payload)},
  ${sqlString(checksum)},
  ${sqlString(generatedAt)}
);
COMMIT;
`;

const watchSnapshot = {
  version: 1,
  generatedAt,
  activePetId: "showcase-milo",
  items: [
    {
      id: "showcase-medication:2026-07-26:09:00",
      petId: "showcase-milo",
      petName: "Milo",
      title: "Joint support",
      time: "9:00 AM",
      status: "done",
      category: "medication",
      instructions: "Give with food",
    },
    {
      id: "showcase-walk:2026-07-26:12:30",
      petId: "showcase-milo",
      petName: "Milo",
      title: "Park walk",
      time: "12:30 PM",
      status: "due",
      category: "walk",
      instructions: "Easy pace",
    },
    {
      id: "showcase-dinner:2026-07-26:18:30",
      petId: "showcase-luna",
      petName: "Luna",
      title: "Dinner",
      time: "6:30 PM",
      status: "upcoming",
      category: "feeding",
      instructions: "Wet food",
    },
  ],
};

fs.mkdirSync(outputDirectory, { recursive: true });
fs.writeFileSync(
  path.join(outputDirectory, "care-state.json"),
  `${JSON.stringify(state, null, 2)}\n`,
);
fs.writeFileSync(path.join(outputDirectory, "care-state.sql"), sql);
const watchPayload = JSON.stringify(watchSnapshot);
fs.writeFileSync(
  path.join(outputDirectory, "watch-snapshot.json"),
  `${JSON.stringify(watchSnapshot, null, 2)}\n`,
);
fs.writeFileSync(
  path.join(outputDirectory, "watch-snapshot.hex"),
  Buffer.from(watchPayload, "utf8").toString("hex"),
);

console.log(
  JSON.stringify({
    careStateBytes: Buffer.byteLength(payload),
    checksum,
    outputDirectory,
    watchSnapshotBytes: Buffer.byteLength(watchPayload),
  }),
);
