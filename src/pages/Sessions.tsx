import { Link } from 'react-router-dom';
import { useData } from '../hooks/DataContext';
import { formatDateFr } from '../lib/storage';

export function Sessions() {
  const { sessions } = useData();

  return (
    <div className="page">
      <header className="page-header row">
        <div>
          <h2>Séances</h2>
          <p className="muted">Notes de coaching et bilans.</p>
        </div>
        <Link className="btn primary" to="/seances/nouvelle">
          + Nouvelle
        </Link>
      </header>

      {sessions.length === 0 ? (
        <section className="card empty">
          <p>Aucune séance. Créez-en une pour commencer.</p>
          <Link className="btn primary" to="/seances/nouvelle">
            Ajouter une séance
          </Link>
        </section>
      ) : (
        <ul className="list">
          {sessions.map((s) => (
            <li key={s.id}>
              <Link to={`/seances/${s.id}`} className="list-item">
                <div>
                  <strong>{s.title}</strong>
                  <p className="muted clamp">
                    {s.content.trim() || 'Sans contenu'}
                  </p>
                </div>
                <span className="date-chip">{formatDateFr(s.date)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
