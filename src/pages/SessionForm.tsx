import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useData } from '../hooks/DataContext';
import { newId, todayISO } from '../lib/storage';

export function SessionForm() {
  const { id: routeId } = useParams();
  const navigate = useNavigate();
  const { sessions, upsertSession, activeClientId } = useData();
  const existing = routeId ? sessions.find((s) => s.id === routeId) : undefined;

  const draftId = useRef(existing?.id ?? newId());
  const [title, setTitle] = useState(existing?.title ?? '');
  const [content, setContent] = useState(existing?.content ?? '');
  const [date, setDate] = useState(existing?.date ?? todayISO());
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const timer = useRef<number | null>(null);
  const seeded = useRef(Boolean(existing));

  useEffect(() => {
    if (existing) {
      draftId.current = existing.id;
      setTitle(existing.title);
      setContent(existing.content);
      setDate(existing.date);
      seeded.current = true;
    }
  }, [existing]);

  useEffect(() => {
    if (!activeClientId) return;
    // Auto-save on every change (debounced) — no Save button required
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      const hasContent = title.trim() || content.trim() || seeded.current;
      if (!hasContent && !existing) return;
      setSaveState('saving');
      upsertSession({
        id: draftId.current,
        title,
        content,
        date,
        clientId: activeClientId,
      });
      seeded.current = true;
      setSaveState('saved');
      // If we were on /nouvelle, switch URL to edit without remounting awkwardly
      if (!routeId) {
        navigate(`/seances/${draftId.current}/edit`, { replace: true });
      }
    }, 450);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [title, content, date, activeClientId, upsertSession, existing, navigate, routeId]);

  return (
    <div className="page">
      <header className="page-header">
        <Link to={seeded.current ? `/seances/${draftId.current}` : '/seances'} className="back">
          ← Retour
        </Link>
        <h2>{existing || seeded.current ? 'Séance' : 'Nouvelle séance'}</h2>
        <p className="autosave-status muted">
          {saveState === 'saving'
            ? 'Enregistrement…'
            : saveState === 'saved'
              ? 'Enregistré automatiquement'
              : 'Les modifications sont enregistrées automatiquement'}
        </p>
      </header>

      <div className="card form">
        <label>
          Date
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </label>
        <label>
          Titre <span className="optional">(optionnel)</span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Laissé vide → date + extrait"
          />
        </label>
        <label>
          Contenu
          <textarea
            rows={10}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Notes de séance, ressenti, exercices…"
          />
        </label>
        <Link className="btn primary block" to={`/seances/${draftId.current}`}>
          Voir la séance
        </Link>
      </div>
    </div>
  );
}
