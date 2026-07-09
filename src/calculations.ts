import {
  MonthResult,
  ProjectInputs,
  RoofMaterial,
  SimulationResult,
  UnitSystem,
} from "./types";

export const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

export const DAYS_PER_MONTH = [
  31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31,
] as const;

export const RUNOFF_COEFFICIENTS: Record<RoofMaterial, number> = {
  metal: 0.9,
  tile: 0.85,
  concrete: 0.8,
  green: 0.5,
};

export const DEFAULT_RAINFALL_METRIC = [
  78, 65, 71, 54, 48, 38, 31, 34, 45, 62, 74, 81,
];

export const DEFAULT_INPUTS: ProjectInputs = {
  name: "Home system",
  units: "metric",
  roofArea: 120,
  roofMaterial: "tile",
  tankCapacity: 5000,
  dailyDemand: 80,
  startingFillPercent: 50,
  rainfall: DEFAULT_RAINFALL_METRIC,
};

const LITERS_PER_GALLON = 3.785411784;
const SQ_METERS_PER_SQ_FOOT = 0.09290304;
const MM_PER_INCH = 25.4;

export function areaToSquareMeters(value: number, units: UnitSystem): number {
  return units === "metric" ? value : value * SQ_METERS_PER_SQ_FOOT;
}

export function rainfallToMillimeters(
  value: number,
  units: UnitSystem,
): number {
  return units === "metric" ? value : value * MM_PER_INCH;
}

export function volumeToLiters(value: number, units: UnitSystem): number {
  return units === "metric" ? value : value * LITERS_PER_GALLON;
}

export function litersToVolume(value: number, units: UnitSystem): number {
  return units === "metric" ? value : value / LITERS_PER_GALLON;
}

export function convertInputs(
  inputs: ProjectInputs,
  nextUnits: UnitSystem,
): ProjectInputs {
  if (inputs.units === nextUnits) return inputs;

  const toMetric = nextUnits === "metric";
  return {
    ...inputs,
    units: nextUnits,
    roofArea: toMetric
      ? inputs.roofArea * SQ_METERS_PER_SQ_FOOT
      : inputs.roofArea / SQ_METERS_PER_SQ_FOOT,
    tankCapacity: toMetric
      ? inputs.tankCapacity * LITERS_PER_GALLON
      : inputs.tankCapacity / LITERS_PER_GALLON,
    dailyDemand: toMetric
      ? inputs.dailyDemand * LITERS_PER_GALLON
      : inputs.dailyDemand / LITERS_PER_GALLON,
    rainfall: inputs.rainfall.map((value) =>
      toMetric ? value * MM_PER_INCH : value / MM_PER_INCH,
    ),
  };
}

export function simulateTank(inputs: ProjectInputs): SimulationResult {
  const areaM2 = areaToSquareMeters(inputs.roofArea, inputs.units);
  const capacityL = volumeToLiters(inputs.tankCapacity, inputs.units);
  const dailyDemandL = volumeToLiters(inputs.dailyDemand, inputs.units);
  const coefficient = RUNOFF_COEFFICIENTS[inputs.roofMaterial];

  let storage =
    capacityL * Math.min(100, Math.max(0, inputs.startingFillPercent)) * 0.01;
  let annualCaptured = 0;
  let annualDemand = 0;
  let annualOverflow = 0;
  let annualShortage = 0;
  let annualRainfallMm = 0;

  const months: MonthResult[] = inputs.rainfall.map((rainfall, monthIndex) => {
    const rainfallMm = rainfallToMillimeters(rainfall, inputs.units);
    const captured = areaM2 * rainfallMm * coefficient;
    const demand = dailyDemandL * (DAYS_PER_MONTH[monthIndex] ?? 30);
    const available = storage + captured;
    const overflow = Math.max(0, available - capacityL);
    const usable = Math.min(capacityL, available);
    const supplied = Math.min(usable, demand);
    const shortage = Math.max(0, demand - supplied);

    storage = Math.max(0, usable - demand);
    annualRainfallMm += rainfallMm;
    annualCaptured += captured;
    annualDemand += demand;
    annualOverflow += overflow;
    annualShortage += shortage;

    return {
      monthIndex,
      rainfall,
      captured: litersToVolume(captured, inputs.units),
      demand: litersToVolume(demand, inputs.units),
      endingStorage: litersToVolume(storage, inputs.units),
      overflow: litersToVolume(overflow, inputs.units),
      shortage: litersToVolume(shortage, inputs.units),
      reliability: demand === 0 ? 100 : (supplied / demand) * 100,
    };
  });

  const suggestedCapacityL = suggestCapacityLiters(inputs);
  return {
    months,
    annualRainfall:
      inputs.units === "metric"
        ? annualRainfallMm
        : annualRainfallMm / MM_PER_INCH,
    annualCaptured: litersToVolume(annualCaptured, inputs.units),
    annualDemand: litersToVolume(annualDemand, inputs.units),
    annualOverflow: litersToVolume(annualOverflow, inputs.units),
    annualShortage: litersToVolume(annualShortage, inputs.units),
    reliability:
      annualDemand === 0
        ? 100
        : ((annualDemand - annualShortage) / annualDemand) * 100,
    suggestedCapacity: litersToVolume(suggestedCapacityL, inputs.units),
  };
}

function suggestCapacityLiters(inputs: ProjectInputs): number {
  const currentCapacity = volumeToLiters(inputs.tankCapacity, inputs.units);
  const maxCapacity = Math.max(currentCapacity * 8, 1000);
  let low = 0;
  let high = maxCapacity;

  for (let iteration = 0; iteration < 28; iteration += 1) {
    const midpoint = (low + high) / 2;
    const candidate: ProjectInputs = {
      ...inputs,
      tankCapacity: litersToVolume(midpoint, inputs.units),
    };
    const reliability = simulateWithoutSuggestion(candidate);
    if (reliability >= 95) high = midpoint;
    else low = midpoint;
  }

  return high >= maxCapacity * 0.999 ? maxCapacity : high;
}

function simulateWithoutSuggestion(inputs: ProjectInputs): number {
  const areaM2 = areaToSquareMeters(inputs.roofArea, inputs.units);
  const capacityL = volumeToLiters(inputs.tankCapacity, inputs.units);
  const dailyDemandL = volumeToLiters(inputs.dailyDemand, inputs.units);
  const coefficient = RUNOFF_COEFFICIENTS[inputs.roofMaterial];
  let storage = capacityL * inputs.startingFillPercent * 0.01;
  let totalDemand = 0;
  let shortage = 0;

  inputs.rainfall.forEach((rainfall, index) => {
    const inflow =
      areaM2 *
      rainfallToMillimeters(rainfall, inputs.units) *
      coefficient;
    const demand = dailyDemandL * (DAYS_PER_MONTH[index] ?? 30);
    const usable = Math.min(capacityL, storage + inflow);
    shortage += Math.max(0, demand - usable);
    storage = Math.max(0, usable - demand);
    totalDemand += demand;
  });

  return totalDemand === 0 ? 100 : ((totalDemand - shortage) / totalDemand) * 100;
}

export function validateInputs(inputs: ProjectInputs): string[] {
  const errors: string[] = [];
  if (!inputs.name.trim()) errors.push("Add a project name.");
  if (!(inputs.roofArea > 0)) errors.push("Roof area must be greater than zero.");
  if (!(inputs.tankCapacity > 0))
    errors.push("Tank capacity must be greater than zero.");
  if (inputs.dailyDemand < 0)
    errors.push("Daily demand cannot be negative.");
  if (
    inputs.rainfall.length !== 12 ||
    inputs.rainfall.some((value) => value < 0 || !Number.isFinite(value))
  ) {
    errors.push("Enter a valid rainfall amount for every month.");
  }
  return errors;
}
