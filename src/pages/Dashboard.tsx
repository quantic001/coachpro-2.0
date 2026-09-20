import { Link } from 'react-router-dom';
import { ChartCard } from '../components/ChartCard';
import { useData } from '../hooks/DataContext';
import { formatDateFr } from '../lib/storage';

export function Dashboard() {
  const { sessions, measurements, photoMeta, chartSeries, activeClient } = useData();
  const lastSession = sessions[0];
  const lastMeasure = measurements[0];

  return (
    <div className="page">
      <header className="page-header">
        <h2>Tableau de bord</h2>
        <p className="muted">
          {activeClient
            ? `Progression de ${activeClient.name} (sauvegarde locale auto).`
            : 'Sélectionnez ou créez un client.'}
        </p>
      </header>

      <div className="stat-grid">
        <div className="stat">
          <span className="stat-value">{sessions.length}</span>
          <span className="stat-label">Séances</span>
        </div>
        <div className="stat">
          <span className="stat-value">{measurements.length}</span>
          <span className="stat-label">Mesures</span>
        </div>
        <div className="stat">
          <span className="stat-value">{photoMeta.length}</span>
          <span className="stat-label">Photos</span>
        </div>
      </div>

      <div className="quick-actions">
        <Link className="btn primary" to="/seances/nouvelle">
          + Séance
        </Link>
        <Link className="btn" to="/mesures/nouvelle">
          + Mesure
        </Link>
        <Link className="btn" to="/historique">
          Historique
        </Link>
        <Link className="btn" to="/photos">
          Photos
        </Link>
      </div>

      <ChartCard title="Poids" unit="lb" data={chartSeries.weight} color="#38bdf8" />
      <ChartCard title="Graisse corporelle" unit="%" data={chartSeries.bodyFat} color="#a78bfa" />
      <ChartCard title="Tour de taille" unit="po" data={chartSeries.waist} color="#34d399" />

      <section className="card">
        <h3>Dernière séance</h3>
        {lastSession ? (
          <Link to={`/seances/${lastSession.id}`} className="list-link">
            <strong>{lastSession.title}</strong>
            <span className="muted">{formatDateFr(lastSession.date)}</span>
          </Link>
        ) : (
          <p className="muted">Aucune séance encore.</p>
        )}
      </section>

      <section className="card">
        <h3>Dernière mesure</h3>
        {lastMeasure ? (
          <Link to="/mesures" className="list-link">
            <strong>{formatDateFr(lastMeasure.date)}</strong>
            <span className="muted">
              {[
                lastMeasure.weightLb != null ? `${lastMeasure.weightLb} lb` : null,
                lastMeasure.bodyFatPct != null ? `${lastMeasure.bodyFatPct} %` : null,
                lastMeasure.waist != null ? `taille ${lastMeasure.waist} po` : null,
              ]
                .filter(Boolean)
                .join(' · ') || 'Sans chiffres'}
            </span>
          </Link>
        ) : (
          <p className="muted">Aucune mesure encore.</p>
        )}
      </section>
    </div>
  );
}
