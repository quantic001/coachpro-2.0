import { Link, useNavigate, useParams } from 'react-router-dom';
import { useData } from '../hooks/DataContext';
import { formatDateFr } from '../lib/storage';

export function SessionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { sessions, deleteSession } = useData();
  const session = sessions.find((s) => s.id === id);

  if (!session) {
    return (
      <div className="page">
        <p>Séance introuvable.</p>
        <Link to="/seances">Retour à la liste</Link>
      </div>
    );
  }

  function onDelete() {
    if (!confirm('Supprimer cette séance ?')) return;
    deleteSession(session!.id);
    navigate('/seances');
  }

  return (
    <div className="page">
      <header className="page-header">
        <Link to="/seances" className="back">
          ← Séances
        </Link>
        <h2>{session.title}</h2>
        <p className="muted">{formatDateFr(session.date)}</p>
      </header>

      <section className="card">
        <pre className="session-body">{session.content || 'Aucun contenu.'}</pre>
      </section>

      <div className="row-actions">
        <Link className="btn" to={`/seances/${session.id}/edit`}>
          Modifier
        </Link>
        <button type="button" className="btn danger" onClick={onDelete}>
          Supprimer
        </button>
      </div>
    </div>
  );
}
