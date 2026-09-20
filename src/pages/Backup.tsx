import { useRef, useState } from 'react';
import { useData } from '../hooks/DataContext';
import { buildBackup, restoreBackup } from '../lib/storage';
import type { AppBackup } from '../lib/types';

export function Backup() {
  const { reload } = useData();
  const inputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onExport() {
    setError(null);
    try {
      const backup = await buildBackup();
      const blob = new Blob([JSON.stringify(backup, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const stamp = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `coachpro-2.0-backup-${stamp}.json`;
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
      const data = JSON.parse(text) as AppBackup;
      if (!confirm('Remplacer toutes les données locales par ce fichier ?')) return;
      await restoreBackup(data);
      reload();
      setMessage('Import terminé. Données rechargées.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fichier invalide');
    }
  }

  return (
    <div className="page">
      <header className="page-header">
        <h2>Sauvegarde</h2>
        <p className="muted">
          Export / import JSON (séances, mesures, photos en data URL). Tout reste sur cet appareil.
        </p>
      </header>

      <section className="card">
        <h3>Exporter</h3>
        <p className="muted">Téléchargez une copie de sécurité complète.</p>
        <button type="button" className="btn primary" onClick={onExport}>
          Exporter JSON
        </button>
      </section>

      <section className="card">
        <h3>Importer</h3>
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
          CoachPro 2.0 est une démo indépendante (proposition). Les données ne quittent pas votre
          navigateur. Distinct de CoachPro Lite.
        </p>
      </section>
    </div>
  );
}
