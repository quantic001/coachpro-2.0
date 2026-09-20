import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MetricChart } from '../components/MetricChart';
import { useData } from '../hooks/DataContext';
import { formatDateFr } from '../lib/storage';

export function Dashboard() {
  const {
    sessions,
    measurements,
    photoMeta,
    chartSeries,
    activeClient,
    cloudConfigured,
    syncMeta,
    syncStatus,
    syncNow,
  } = useData();
  const lastSession = sessions[0];
  const lastMeasure = measurements[0];
  const [syncing, setSyncing] = useState(false);

  async function onSync() {
    setSyncing(true);
    try {
      await syncNow();
    } finally {
      setSyncing(false);
    }
  }

  const lastSyncLabel = syncMeta.lastFullSyncAt
    ? new Date(syncMeta.lastFullSyncAt).toLocaleString('fr-CA')
    : 'jamais';

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

      <section className="card cloud-status">
        <h3>Cloud</h3>
        {cloudConfigured ? (
          <>
            <p className="muted">
              Configuré · Dernière sync : {lastSyncLabel}
            </p>
            {syncMeta.lastError && (
              <p className="toast err">{syncMeta.lastError}</p>
            )}
            {syncStatus && !syncMeta.lastError && (
              <p className="muted">{syncStatus}</p>
            )}
            <button
              type="button"
              className="btn primary"
              disabled={syncing}
              onClick={() => void onSync()}
            >
              {syncing ? 'Sync…' : 'Synchroniser'}
            </button>
          </>
        ) : (
          <p className="muted">Non configuré — données locales seules.</p>
        )}
      </section>

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
        <Link className="btn" to="/mesures">
          + Mesure
        </Link>
        <Link className="btn" to="/mesures#historique">
          Données antérieures
        </Link>
        <Link className="btn" to="/photos">
          Photos
        </Link>
      </div>

      <MetricChart series={chartSeries} defaultKey="weight" />

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
