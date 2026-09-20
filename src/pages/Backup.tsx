import { useRef, useState } from 'react';
import { useData } from '../hooks/DataContext';
import {
  exportAllClientsCsv,
  exportAllClientsExcel,
  exportClientCsv,
  exportClientExcel,
} from '../lib/export';
import { buildBackup, restoreBackup } from '../lib/storage';
import type { AppBackup, AppBackupV1 } from '../lib/types';

export function Backup() {
  const {
    reload,
    activeClient,
    cloudConfigured,
    syncNow,
    syncMeta,
    syncStatus,
  } = useData();
  const inputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onExportJson(scope: 'client' | 'all') {
    setError(null);
    try {
      const backup = await buildBackup(
        scope === 'client' ? activeClient?.id : null,
      );
      const blob = new Blob([JSON.stringify(backup, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const stamp = new Date().toISOString().slice(0, 10);
      const who =
        scope === 'client' && activeClient
          ? activeClient.name.replace(/\s+/g, '-').toLowerCase()
          : 'tous';
      a.href = url;
      a.download = `coachpro-2.0-${who}-${stamp}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setMessage('Export JSON téléchargé.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Échec de l’export');
    }
  }

  async function onImportFile(file: File) {
    setError(null);
    setMessage(null);
    try {
      const text = await file.text();
      const data = JSON.parse(text) as AppBackup | AppBackupV1;
      if (!confirm('Remplacer / fusionner les données locales avec ce fichier ?')) return;
      await restoreBackup(data, 'replace');
      reload();
      setMessage('Import terminé. Données rechargées.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fichier invalide');
    }
  }

  async function onSync() {
    setBusy(true);
    setError(null);
    try {
      await syncNow();
      setMessage(syncStatus || 'Synchronisation terminée.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Échec sync');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <header className="page-header">
        <h2>Sauvegarde &amp; sync</h2>
        <p className="muted">
          Export Excel/CSV pour Excel, JSON complet, sync cloud Supabase (données structurées).
          Photos restent locales.
        </p>
      </header>

      <section className="card">
        <h3>Cloud Supabase</h3>
        {cloudConfigured ? (
          <>
            <p className="muted">
              Dernière sync complète :{' '}
              {syncMeta.lastFullSyncAt
                ? new Date(syncMeta.lastFullSyncAt).toLocaleString('fr-CA')
                : 'jamais'}
            </p>
            {syncMeta.lastError && (
              <p className="toast err">{syncMeta.lastError}</p>
            )}
            <button
              type="button"
              className="btn primary"
              disabled={busy}
              onClick={() => void onSync()}
            >
              {busy ? 'Sync…' : 'Synchroniser maintenant'}
            </button>
          </>
        ) : (
          <p className="muted">
            Cloud non configuré — données locales seules. Voir le README pour
            <code> VITE_SUPABASE_URL </code>et<code> VITE_SUPABASE_ANON_KEY</code>.
          </p>
        )}
      </section>

      <section className="card">
        <h3>Export Excel / CSV</h3>
        <p className="muted">
          Fichiers ouverts dans Excel (CSV fr-CA avec « ; », ou .xls).
          {activeClient ? ` Client actif : ${activeClient.name}.` : ''}
        </p>
        <div className="row-actions">
          <button
            type="button"
            className="btn primary"
            disabled={!activeClient}
            onClick={() => activeClient && exportClientExcel(activeClient)}
          >
            Excel (client)
          </button>
          <button
            type="button"
            className="btn"
            disabled={!activeClient}
            onClick={() => activeClient && exportClientCsv(activeClient)}
          >
            CSV (client)
          </button>
          <button type="button" className="btn" onClick={() => exportAllClientsExcel()}>
            Excel (tous)
          </button>
          <button type="button" className="btn" onClick={() => exportAllClientsCsv()}>
            CSV (tous)
          </button>
        </div>
      </section>

      <section className="card">
        <h3>Export JSON</h3>
        <p className="muted">Sauvegarde complète (inclut photos en data URL).</p>
        <div className="row-actions">
          <button
            type="button"
            className="btn primary"
            disabled={!activeClient}
            onClick={() => void onExportJson('client')}
          >
            JSON (client)
          </button>
          <button type="button" className="btn" onClick={() => void onExportJson('all')}>
            JSON (tous)
          </button>
        </div>
      </section>

      <section className="card">
        <h3>Importer JSON</h3>
        <p className="muted">Remplace les données actuelles par le fichier choisi.</p>
        <input
          ref={inputRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onImportFile(f);
            e.target.value = '';
          }}
        />
        <button type="button" className="btn" onClick={() => inputRef.current?.click()}>
          Importer JSON…
        </button>
      </section>

      {message && <p className="toast ok">{message}</p>}
      {error && <p className="toast err">{error}</p>}

      <section className="card">
        <h3>À propos</h3>
        <p className="muted">
          CoachPro 2.0 — proposition indépendante (fr-CA). Ne touche pas à CoachPro Lite.
          Persistance locale immédiate ; sync cloud optionnelle (free tier Supabase).
        </p>
      </section>
    </div>
  );
}
