import type { CareTaskDetails } from "./types";

function normalizedUnits(value: number | undefined) {
  return Number.isFinite(value) && (value ?? 0) > 0 ? (value as number) : 1;
}

export function inventoryUnitsUsed(
  availableStocks: (number | undefined)[],
  requestedUnits: number | undefined,
) {
  const units = normalizedUnits(requestedUnits);
  const stocks = availableStocks.filter(
    (stock): stock is number => Number.isFinite(stock) && (stock ?? -1) >= 0,
  );
  return stocks.length > 0 ? Math.min(units, ...stocks) : units;
}

export function inventoryUnitsFromPlan(
  planned: CareTaskDetails | undefined,
  fallbackUnits: number | undefined,
) {
  return inventoryUnitsUsed(
    planned?.stock === undefined ? [] : [planned.stock],
    planned?.unitsPerDose ?? fallbackUnits,
  );
}
