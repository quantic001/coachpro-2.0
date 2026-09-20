import { ChartCard } from '../components/ChartCard';
import { useData } from '../hooks/DataContext';
import { formatDateFr } from '../lib/storage';

const COLS: Array<{ key: string; label: string; get: (m: {
  weightLb?: number;
  bodyFatPct?: number;
  neck?: number;
  shoulders?: number;
  chest?: number;
  waist?: number;
  hips?: number;
  thighL?: number;
  thighR?: number;
  armL?: number;
  armR?: number;
}) => number | undefined }> = [
  { key: 'weight', label: 'Poids (lb)', get: (m) => m.weightLb },
  { key: 'bf', label: 'Graisse %', get: (m) => m.bodyFatPct },
  { key: 'neck', label: 'Cou', get: (m) => m.neck },
  { key: 'shoulders', label: 'Épaules', get: (m) => m.shoulders },
  { key: 'chest', label: 'Poitrine', get: (m) => m.chest },
  { key: 'waist', label: 'Taille', get: (m) => m.waist },
  { key: 'hips', label: 'Hanches', get: (m) => m.hips },
  { key: 'thighL', label: 'Cuisse G', get: (m) => m.thighL },
  { key: 'thighR', label: 'Cuisse D', get: (m) => m.thighR },
  { key: 'armL', label: 'Bras G', get: (m) => m.armL },
  { key: 'armR', label: 'Bras D', get: (m) => m.armR },
];

export function History() {
  const { measurements, chartSeries, activeClient } = useData();
  const rows = [...measurements].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="page">
      <header className="page-header">
        <h2>Données antérieures</h2>
        <p className="muted">
          {activeClient
            ? `Historique de ${activeClient.name} — tableau + graphiques.`
            : 'Sélectionnez un client.'}
        </p>
      </header>

      <ChartCard title="Poids" unit="lb" data={chartSeries.weight} color="#38bdf8" />
      <ChartCard title="Graisse corporelle" unit="%" data={chartSeries.bodyFat} color="#a78bfa" />
      <ChartCard title="Tour de taille" unit="po" data={chartSeries.waist} color="#34d399" />

      {rows.length === 0 ? (
        <section className="card empty">
          <p>Aucune mesure pour ce client.</p>
        </section>
      ) : (
        <section className="card table-card">
          <h3>Tableau des mesures</h3>
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  {COLS.map((c) => (
                    <th key={c.key}>{c.label}</th>
                  ))}
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((m) => (
                  <tr key={m.id}>
                    <td className="sticky-col">{formatDateFr(m.date)}</td>
                    {COLS.map((c) => {
                      const v = c.get(m);
                      return <td key={c.key}>{v != null ? v : '—'}</td>;
                    })}
                    <td className="notes-cell">{m.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
