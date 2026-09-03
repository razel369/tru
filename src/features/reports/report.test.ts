import { describe, expect, it } from "vitest";

import { renderReport } from "./report";
import type { DoseLog, Pet } from "../../types";

const PET: Pet = {
  id: "milo",
  name: "Milo",
  species: "dog",
  breed: "Golden retriever",
  age: 9,
  avatar: "milo",
  color: "#F3B66D",
  medications: [
    {
      id: "carprofen",
      name: "Carprofen",
      dosage: "75 mg",
      instructions: "Give with food",
      form: "tablet",
      times: ["08:00", "20:00"],
      stock: 14,
      stockUnit: "tablets",
      color: "#ED7C62",
    },
  ],
};

const LOG: DoseLog = {
  id: "l-1",
  petId: "milo",
  medicationId: "carprofen",
  date: "2026-07-10",
  scheduledTime: "08:00",
  status: "given",
  completedAt: "2026-07-10T08:04:00.000Z",
  completedBy: "Maya",
};

describe("renderReport", () => {
  it("includes the pet name, medications and adherence", () => {
    const html = renderReport({
      pets: [PET],
      logs: [LOG],
      rangeStart: new Date("2026-07-01"),
      rangeEnd: new Date("2026-07-15"),
    });
    expect(html).toContain("Milo");
    expect(html).toContain("Carprofen");
    expect(html).toContain("100% adherence");
    expect(html).toContain("Golden retriever");
  });

  it("redacts caregivers when redactCaregivers is true", () => {
    const html = renderReport({
      pets: [PET],
      logs: [LOG],
      rangeStart: new Date("2026-07-01"),
      rangeEnd: new Date("2026-07-15"),
      redactCaregivers: true,
    });
    expect(html).not.toContain("Maya");
    expect(html).toContain("—");
  });

  it("escapes HTML in user-entered fields", () => {
    const evil: Pet = {
      ...PET,
      name: "<script>alert(1)</script>",
      medications: [
        {
          ...PET.medications[0]!,
          instructions: "<img src=x>",
        },
      ],
    };
    const html = renderReport({
      pets: [evil],
      logs: [],
      rangeStart: new Date("2026-07-01"),
      rangeEnd: new Date("2026-07-15"),
    });
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).toContain("&lt;img src=x&gt;");
  });
});
