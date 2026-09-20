import { NavLink, Outlet } from 'react-router-dom';
import { useData } from '../hooks/DataContext';
import { ClientPicker } from './ClientPicker';

const links = [
  { to: '/', label: 'Tableau', end: true },
  { to: '/seances', label: 'Séances' },
  { to: '/mesures', label: 'Mesures' },
  { to: '/photos', label: 'Photos' },
  { to: '/sauvegarde', label: 'Backup' },
];

export function Layout() {
  const { cloudConfigured, ready, activeClient, syncMeta } = useData();

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden>
            2.0
          </span>
          <div>
            <h1>CoachPro</h1>
            <p className="tagline">
              {activeClient
                ? `Suivi — ${activeClient.name}`
                : 'Suivi coaching multi-clients'}
            </p>
          </div>
        </div>
        {ready && <ClientPicker />}
      </header>

      {!cloudConfigured && (
        <div className="banner warn" role="status">
          Cloud non configuré — données locales seules
        </div>
      )}
      {cloudConfigured && syncMeta.lastError && (
        <div className="banner err" role="status">
          Sync : {syncMeta.lastError}
        </div>
      )}

      <main className="content">
        <Outlet />
      </main>

      <nav className="bottom-nav nav-5" aria-label="Navigation principale">
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.end}
            className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}
          >
            {l.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
