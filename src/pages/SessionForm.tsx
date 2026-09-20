import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useData } from '../hooks/DataContext';
import { todayISO } from '../lib/storage';

export function SessionForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { sessions, upsertSession } = useData();
  const existing = id ? sessions.find((s) => s.id === id) : undefined;

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [date, setDate] = useState(todayISO());

  useEffect(() => {
    if (existing) {
      setTitle(existing.title);
      setContent(existing.content);
      setDate(existing.date);
    }
  }, [existing]);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    upsertSession({
      id: existing?.id,
      title,
      content,
      date,
    });
    navigate(existing ? `/seances/${existing.id}` : '/seances');
  }

  return (
    <div className="page">
      <header className="page-header">
        <Link to={existing ? `/seances/${existing.id}` : '/seances'} className="back">
          ← Retour
        </Link>
        <h2>{existing ? 'Modifier la séance' : 'Nouvelle séance'}</h2>
      </header>

      <form className="card form" onSubmit={onSubmit}>
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
        <button type="submit" className="btn primary block">
          Enregistrer
        </button>
      </form>
    </div>
  );
}
