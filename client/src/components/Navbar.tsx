import React from 'react';
import type { User } from '../types';

interface NavbarProps {
  currentPage: 'login' | 'register' | 'admin';
  setCurrentPage: (page: 'login' | 'register' | 'admin') => void;
  currentUser: User | null;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentPage,
  setCurrentPage,
  currentUser,
  onLogout,
}) => {
  return (
    <header className="app-header">
      <div className="header-brand">
        <div className="brand-icon-chip">GL</div>
        <div style={{ fontWeight: 600, fontSize: '0.9375rem', letterSpacing: '-0.015em', color: 'var(--text-primary)' }}>
          Guest Leisureing
        </div>
      </div>

      <nav className="header-actions">
        {currentUser ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="label-code-sm" style={{ color: 'var(--text-muted)' }}>
              Logged in: <strong>{currentUser.name}</strong>
            </span>
            <button className="btn btn-sm btn-danger" onClick={onLogout}>
              Logout
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className={`btn btn-sm ${currentPage === 'login' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setCurrentPage('login')}
            >
              Login
            </button>
            <button
              type="button"
              className={`btn btn-sm ${currentPage === 'register' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setCurrentPage('register')}
            >
              Register
            </button>
            <button
              type="button"
              className={`btn btn-sm ${currentPage === 'admin' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setCurrentPage('admin')}
            >
              Super Admin
            </button>
          </div>
        )}
      </nav>
    </header>
  );
};
