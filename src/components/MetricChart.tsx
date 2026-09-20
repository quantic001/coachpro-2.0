import { useEffect, useMemo, useState } from 'react';
import { METRICS, type ChartSeriesMap, type MetricKey } from '../lib/metrics';
import { ChartCard } from './ChartCard';

export function MetricChart({
  series,
  defaultKey = 'weight',
}: {
  series: ChartSeriesMap;
  defaultKey?: MetricKey;
}) {
  const available = useMemo(
    () => METRICS.filter((m) => (series[m.key]?.length ?? 0) > 0),
    [series],
  );

  const [selected, setSelected] = useState<MetricKey>(defaultKey);

  useEffect(() => {
    if (available.length === 0) return;
    if (!available.some((m) => m.key === selected)) {
      const fallback =
        available.find((m) => m.key === defaultKey)?.key ?? available[0].key;
      setSelected(fallback);
    }
  }, [available, selected, defaultKey]);

  if (available.length === 0) {
    return (
      <section className="card chart-card">
        <h3>Graphiques</h3>
        <p className="muted">Aucune donnée numérique pour le moment.</p>
      </section>
    );
  }

  const meta = METRICS.find((m) => m.key === selected) ?? available[0];
  const data = series[meta.key] ?? [];

  return (
    <section className="card chart-card metric-chart">
      <div className="card-head">
        <h3>Graphiques</h3>
        <span className="badge">{available.length} mesures</span>
      </div>
      <label className="metric-select-label">
        Courbe affichée
        <select
          className="metric-select"
          value={meta.key}
          onChange={(e) => setSelected(e.target.value as MetricKey)}
          aria-label="Choisir la mesure à afficher"
        >
          {available.map((m) => (
            <option key={m.key} value={m.key}>
              {m.label} ({m.unit})
            </option>
          ))}
        </select>
      </label>
      <div className="metric-chips" role="tablist" aria-label="Raccourcis mesures">
        {available.map((m) => (
          <button
            key={m.key}
            type="button"
            role="tab"
            aria-selected={m.key === meta.key}
            className={m.key === meta.key ? 'metric-chip active' : 'metric-chip'}
            onClick={() => setSelected(m.key)}
          >
            {m.shortLabel}
          </button>
        ))}
      </div>
      <div className="card-head chart-subhead">
        <h3>{meta.label}</h3>
        <span className="badge">{meta.unit}</span>
      </div>
      <ChartCard title={meta.label} unit={meta.unit} data={data} color={meta.color} bare />
    </section>
  );
}
