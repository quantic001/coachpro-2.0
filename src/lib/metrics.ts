import type { Measurement } from './types';

export type MetricKey =
  | 'weight'
  | 'bodyFat'
  | 'neck'
  | 'shoulders'
  | 'chest'
  | 'waist'
  | 'hips'
  | 'thighL'
  | 'thighR'
  | 'armL'
  | 'armR';

export type MetricField = keyof Pick<
  Measurement,
  | 'weightLb'
  | 'bodyFatPct'
  | 'neck'
  | 'shoulders'
  | 'chest'
  | 'waist'
  | 'hips'
  | 'thighL'
  | 'thighR'
  | 'armL'
  | 'armR'
>;

export interface MetricDef {
  key: MetricKey;
  field: MetricField;
  label: string;
  shortLabel: string;
  unit: string;
  color: string;
}

/** All numeric measurement fields charted in Mesures (fr-CA labels). */
export const METRICS: MetricDef[] = [
  { key: 'weight', field: 'weightLb', label: 'Poids', shortLabel: 'Poids', unit: 'lb', color: '#38bdf8' },
  { key: 'bodyFat', field: 'bodyFatPct', label: 'Graisse corporelle', shortLabel: 'Graisse', unit: '%', color: '#a78bfa' },
  { key: 'neck', field: 'neck', label: 'Cou', shortLabel: 'Cou', unit: 'po', color: '#f472b6' },
  { key: 'shoulders', field: 'shoulders', label: 'Épaules', shortLabel: 'Épaules', unit: 'po', color: '#fb923c' },
  { key: 'chest', field: 'chest', label: 'Poitrine', shortLabel: 'Poitrine', unit: 'po', color: '#fbbf24' },
  { key: 'waist', field: 'waist', label: 'Taille', shortLabel: 'Taille', unit: 'po', color: '#34d399' },
  { key: 'hips', field: 'hips', label: 'Hanches', shortLabel: 'Hanches', unit: 'po', color: '#2dd4bf' },
  { key: 'thighL', field: 'thighL', label: 'Cuisse G', shortLabel: 'Cuisse G', unit: 'po', color: '#22d3ee' },
  { key: 'thighR', field: 'thighR', label: 'Cuisse D', shortLabel: 'Cuisse D', unit: 'po', color: '#67e8f9' },
  { key: 'armL', field: 'armL', label: 'Bras G', shortLabel: 'Bras G', unit: 'po', color: '#818cf8' },
  { key: 'armR', field: 'armR', label: 'Bras D', shortLabel: 'Bras D', unit: 'po', color: '#c084fc' },
];

export type ChartSeriesMap = Record<MetricKey, Array<{ date: string; value: number }>>;

export function buildChartSeries(measurements: Measurement[]): ChartSeriesMap {
  const byDate = [...measurements].sort((a, b) => a.date.localeCompare(b.date));
  const out = {} as ChartSeriesMap;
  for (const m of METRICS) {
    out[m.key] = byDate
      .filter((row) => row[m.field] != null)
      .map((row) => ({ date: row.date, value: row[m.field] as number }));
  }
  return out;
}

/** Table columns for Données antérieures (same order as METRICS). */
export const TABLE_COLS = METRICS.map((m) => ({
  key: m.key,
  label:
    m.key === 'weight'
      ? 'Poids (lb)'
      : m.key === 'bodyFat'
        ? 'Graisse %'
        : m.shortLabel,
  get: (row: Measurement) => row[m.field],
}));
