import { useEffect, useState, type FormEvent } from 'react';
import { useData } from '../hooks/DataContext';
import { formatDateFr, todayISO } from '../lib/storage';

export function Photos() {
  const { photoMeta, addPhoto, removePhoto, loadPhoto } = useData();
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [date, setDate] = useState(todayISO());
  const [label, setLabel] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const map: Record<string, string> = {};
      for (const p of photoMeta) {
        const url = await loadPhoto(p.id);
        if (url) map[p.id] = url;
      }
      if (!cancelled) setPreviews(map);
    })();
    return () => {
      cancelled = true;
    };
  }, [photoMeta, loadPhoto]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!file) return;
    setBusy(true);
    try {
      await addPhoto(file, label, date);
      setFile(null);
      setLabel('');
      setDate(todayISO());
      const input = document.getElementById('photo-file') as HTMLInputElement | null;
      if (input) input.value = '';
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <header className="page-header">
        <h2>Photos</h2>
        <p className="muted">
          Stockage <strong>local uniquement</strong> (IndexedDB). Rien n’est envoyé au serveur.
        </p>
      </header>

      <form className="card form" onSubmit={onSubmit}>
        <label>
          Date
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </label>
        <label>
          Libellé
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="ex. Avant / Après / Profil"
          />
        </label>
        <label>
          Fichier image
          <input
            id="photo-file"
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            required
          />
        </label>
        <button type="submit" className="btn primary block" disabled={!file || busy}>
          {busy ? 'Ajout…' : 'Ajouter la photo'}
        </button>
      </form>

      {photoMeta.length === 0 ? (
        <section className="card empty">
          <p>Aucune photo locale pour l’instant.</p>
        </section>
      ) : (
        <div className="photo-grid">
          {photoMeta.map((p) => (
            <figure key={p.id} className="photo-card">
              {previews[p.id] ? (
                <img src={previews[p.id]} alt={p.label} />
              ) : (
                <div className="photo-placeholder">Chargement…</div>
              )}
              <figcaption>
                <strong>{p.label}</strong>
                <span className="muted">{formatDateFr(p.date)}</span>
                <button
                  type="button"
                  className="btn small danger"
                  onClick={async () => {
                    if (confirm('Supprimer cette photo locale ?')) await removePhoto(p.id);
                  }}
                >
                  Supprimer
                </button>
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </div>
  );
}
