import type { Pet } from "../../types";

export const TEST_PETS: Pet[] = [
  {
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
      {
        id: "omega",
        name: "Omega-3",
        dosage: "1 softgel",
        instructions: "With the evening meal",
        form: "capsule",
        times: ["18:30"],
        stock: 24,
        stockUnit: "softgels",
        color: "#58A89D",
      },
    ],
  },
  {
    id: "luna",
    name: "Luna",
    species: "cat",
    breed: "British shorthair",
    age: 6,
    avatar: "luna",
    color: "#9B91C8",
    medications: [
      {
        id: "thyronorm",
        name: "Thyronorm",
        dosage: "0.5 ml",
        instructions: "Shake well before use",
        form: "liquid",
        times: ["07:30", "19:30"],
        stock: 8,
        stockUnit: "doses",
        color: "#8C7FC1",
      },
    ],
  },
];
