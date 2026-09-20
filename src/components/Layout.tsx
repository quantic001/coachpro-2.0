import { NavLink, Outlet } from 'react-router-dom';

const links = [
  { to: '/', label: 'Tableau', end: true },
  { to: '/seances', label: 'Séances' },
  { to: '/mesures', label: 'Mesures' },
  { to: '/photos', label: 'Photos' },
  { to: '/sauvegarde', label: 'Backup' },
];

export function Layout() {
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden>
            2.0
          </span>
          <div>
            <h1>CoachPro</h1>
            <p className="tagline">Suivi coaching — démo locale</p>
          </div>
        </div>
      </header>

      <main className="content">
        <Outlet />
      </main>

      <nav className="bottom-nav" aria-label="Navigation principale">
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
