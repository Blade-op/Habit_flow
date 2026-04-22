import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = [
  { to: '/',          icon: '🏠', label: 'Dashboard'  },
  { to: '/analytics', icon: '📊', label: 'Analytics'  },
  { to: '/add-habit', icon: '➕', label: 'Add Habit'  },
];

const ADMIN_NAV = [
  { to: '/admin/users', icon: '👥', label: 'Users'     },
];

export default function Sidebar() {
  const { dark, toggle } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const closeMobile = () => setMobileOpen(false);

  return (
    <>
      {/* ── Mobile top-bar ───────────────────────────────────────── */}
      <header className="mobile-topbar">
        <div className="mobile-topbar-logo">
          <span>🌱</span>
          <span className="mobile-logo-text">HabitFlow</span>
        </div>
        <button
          className="hamburger"
          onClick={() => setMobileOpen((o) => !o)}
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          id="hamburger-btn"
        >
          {mobileOpen ? '✕' : '☰'}
        </button>
      </header>

      {/* ── Backdrop (mobile) ────────────────────────────────────── */}
      {mobileOpen && (
        <div className="sidebar-backdrop" onClick={closeMobile} />
      )}

      {/* ── Sidebar ─────────────────────────────────────────────── */}
      <aside className={`sidebar${mobileOpen ? ' sidebar-open' : ''}`}>
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">🌱</div>
          <div className="sidebar-logo-text">
            <h2>HabitFlow</h2>
            <p>Track · Grow · Thrive</p>
          </div>
        </div>

        {/* User info pill */}
        {user && (
          <div className="sidebar-user">
            <div className="sidebar-user-avatar">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">
                {user.name}
                {user.isAdmin && <span className="admin-badge-pill">👑</span>}
              </div>
              <div className="sidebar-user-email">{user.email}</div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="sidebar-nav">
          <span className="sidebar-section-label">Menu</span>
          {NAV_ITEMS.map(({ to, icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
              onClick={closeMobile}
            >
              <span className="nav-icon">{icon}</span>
              {label}
            </NavLink>
          ))}

          {/* Admin section — only visible to admins */}
          {user?.isAdmin && (
            <>
              <span className="sidebar-section-label" style={{ marginTop: 12 }}>Admin</span>
              {ADMIN_NAV.map(({ to, icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
                  onClick={closeMobile}
                >
                  <span className="nav-icon">{icon}</span>
                  {label}
                </NavLink>
              ))}
            </>
          )}
        </nav>

        {/* Bottom controls */}
        <div className="sidebar-bottom">
          <button className="theme-toggle-btn" onClick={toggle} id="theme-toggle">
            <span className="nav-icon">{dark ? '☀️' : '🌙'}</span>
            {dark ? 'Light Mode' : 'Dark Mode'}
            <div className={`toggle-track${dark ? ' on' : ''}`}>
              <div className="toggle-thumb" />
            </div>
          </button>

          <button className="logout-btn" onClick={handleLogout} id="logout-btn">
            <span className="nav-icon">🚪</span>
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}
