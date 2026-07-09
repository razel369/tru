export type UnitSystem = "metric" | "imperial";

export type RoofMaterial = "metal" | "tile" | "concrete" | "green";

export interface ProjectInputs {
  name: string;
  units: UnitSystem;
  roofArea: number;
  roofMaterial: RoofMaterial;
  tankCapacity: number;
  dailyDemand: number;
  startingFillPercent: number;
  rainfall: number[];
}

export interface MonthResult {
  monthIndex: number;
  rainfall: number;
  captured: number;
  demand: number;
  endingStorage: number;
  overflow: number;
  shortage: number;
  reliability: number;
}

export interface SimulationResult {
  months: MonthResult[];
  annualRainfall: number;
  annualCaptured: number;
  annualDemand: number;
  annualOverflow: number;
  annualShortage: number;
  reliability: number;
  suggestedCapacity: number;
}

export interface SavedProject {
  id: string;
  savedAt: string;
  inputs: ProjectInputs;
  result: SimulationResult;
}
