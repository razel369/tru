import type { HealthRecord } from "./types";

const MIN_BAR_HEIGHT = 18;
const MAX_BAR_HEIGHT = 62;

export type WeightTrendPoint = {
  date: string;
  label: string;
  value: number;
  barHeight: number;
};

export type WeightTrend = {
  accessibleSummary: string;
  delta: number;
  firstDateLabel: string;
  latestValue: number;
  points: WeightTrendPoint[];
  unit: string;
};

function parseWeight(value?: string) {
  if (!value) return null;
  const normalized = value.trim().replace(",", ".");
  if (!/^\d+(?:\.\d+)?$/.test(normalized)) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function normalizedUnit(value?: string) {
  return value?.trim().toLocaleLowerCase() ?? "";
}

function shortDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  if (!year || !month || !day) return date;
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

function displayNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export function buildWeightTrend(
  records: HealthRecord[],
  maximumPoints = 7,
): WeightTrend | null {
  if (maximumPoints < 2) return null;

  const newestWeights = records
    .filter((record) => record.type === "weight")
    .map((record) => ({
      createdAt: record.createdAt,
      date: record.date,
      unit: record.unit?.trim() || "kg",
      unitKey: normalizedUnit(record.unit || "kg"),
      value: parseWeight(record.value),
    }))
    .filter((record): record is typeof record & { value: number } => record.value !== null)
    .sort(
      (a, b) =>
        b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt),
    );

  const latest = newestWeights[0];
  if (!latest) return null;

  const seenDates = new Set<string>();
  const points = newestWeights
    .filter((record) => {
      if (record.unitKey !== latest.unitKey || seenDates.has(record.date)) return false;
      seenDates.add(record.date);
      return true;
    })
    .slice(0, maximumPoints)
    .reverse();

  if (points.length < 2) return null;

  const minimum = Math.min(...points.map((point) => point.value));
  const maximum = Math.max(...points.map((point) => point.value));
  const span = maximum - minimum;
  const visualPoints = points.map((point) => ({
    date: point.date,
    label: shortDate(point.date),
    value: point.value,
    barHeight:
      span < 0.001
        ? Math.round((MIN_BAR_HEIGHT + MAX_BAR_HEIGHT) / 2)
        : Math.round(
            MIN_BAR_HEIGHT +
              ((point.value - minimum) / span) * (MAX_BAR_HEIGHT - MIN_BAR_HEIGHT),
          ),
  }));
  const first = visualPoints[0]!;
  const current = visualPoints[visualPoints.length - 1]!;
  const delta = current.value - first.value;
  const direction = delta > 0 ? "up" : delta < 0 ? "down" : "unchanged";
  const change = delta === 0 ? "no net change" : `${displayNumber(Math.abs(delta))} ${latest.unit} ${direction}`;

  return {
    accessibleSummary: `Weight trend. Latest ${displayNumber(current.value)} ${latest.unit}. ${change} since ${first.label}. ${visualPoints.length} measurements shown.`,
    delta,
    firstDateLabel: first.label,
    latestValue: current.value,
    points: visualPoints,
    unit: latest.unit,
  };
}

export function formatWeightTrendNumber(value: number) {
  return displayNumber(value);
}
