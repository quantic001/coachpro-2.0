import { Link } from 'react-router-dom';
import { ChartCard } from '../components/ChartCard';
import { useData } from '../hooks/DataContext';
import { formatDateFr } from '../lib/storage';

function summarize(m: {
  weightLb?: number;
  bodyFatPct?: number;
  waist?: number;
  notes: string;
}) {
  const bits = [
    m.weightLb != null ? `${m.weightLb} lb` : null,
    m.bodyFatPct != null ? `${m.bodyFatPct} %` : null,
    m.waist != null ? `taille ${m.waist} po` : null,
  ].filter(Boolean);
  if (bits.length) return bits.join(' · ');
  return m.notes.trim() || 'Mesures corporelles';
}

export function Measurements() {
  const { measurements, chartSeries, deleteMeasurement } = useData();

  return (
    <div className="page">
      <header className="page-header row">
        <div>
          <h2>Mesures</h2>
          <p className="muted">Poids, % graisse et circonférences (pouces).</p>
        </div>
        <Link className="btn primary" to="/mesures/nouvelle">
          + Nouvelle
        </Link>
      </header>

      <ChartCard title="Poids" unit="lb" data={chartSeries.weight} color="#38bdf8" />
      <ChartCard title="Graisse corporelle" unit="%" data={chartSeries.bodyFat} color="#a78bfa" />
      <ChartCard title="Tour de taille (min suivi)" unit="po" data={chartSeries.waist} color="#34d399" />

      {measurements.length === 0 ? (
        <section className="card empty">
          <p>Aucune mesure enregistrée.</p>
          <Link className="btn primary" to="/mesures/nouvelle">
            Ajouter une mesure
          </Link>
        </section>
      ) : (
        <ul className="list">
          {measurements.map((m) => (
            <li key={m.id} className="list-item static">
              <div>
                <strong>{formatDateFr(m.date)}</strong>
                <p className="muted">{summarize(m)}</p>
              </div>
              <div className="mini-actions">
                <Link className="btn small" to={`/mesures/${m.id}/edit`}>
                  Éditer
                </Link>
                <button
                  type="button"
                  className="btn small danger"
                  onClick={() => {
                    if (confirm('Supprimer cette mesure ?')) deleteMeasurement(m.id);
                  }}
                >
                  ×
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
