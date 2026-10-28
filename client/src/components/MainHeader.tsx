import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import type { User } from '../types';
import {
  LockIcon,
  SearchIcon,
} from './Icons';

interface MainHeaderProps {
  currentUser: User | null;
  onLogout: () => void;
}

export const MainHeader: React.FC<MainHeaderProps> = ({
  currentUser,
  onLogout,
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  const isSuperAdmin =
    currentUser?.role === 'superadmin' ||
    currentUser?.id === '10001' ||
    currentUser?.isSuperAdmin === true;

  const currentPath = location.pathname;

  return (
    <header className="portal-topbar">
      {/* Left: Brand Crest & Institutional Identity */}
      <div className="portal-topbar-left">
        <a href="/" className="portal-brand-link">
          <div className="portal-brand-crest">🏛️</div>
          <div className="portal-brand-text">
            <span className="portal-brand-name">CT University • Campus Visitor & Entry Portal</span>
            <span className="portal-brand-sub">Department of Computer Science & Engineering</span>
          </div>
        </a>
      </div>

      {/* Middle: Role-Aware Quick Links on Desktop (Clean for Super Admin) */}
      <nav className="portal-header-nav">
        {isSuperAdmin ? null : currentUser && (currentUser.role === 'dept_admin' || currentUser.isDeptAdmin || currentUser.role === 'staff') ? (
          <>
            <button
              type="button"
              className={`portal-nav-pill ${currentPath.startsWith('/dept-admin') ? 'active' : ''}`}
              onClick={() => {
                const dept = (currentUser.adminDepartment || currentUser.department || '').toLowerCase();
                if (dept.includes('cater') || dept.includes('food')) navigate('/dept-admin/catering');
                else if (dept.includes('transport')) navigate('/dept-admin/transport');
                else navigate('/dept-admin/accommodation');
              }}
            >
              <span>
                {(() => {
                  const dept = (currentUser.adminDepartment || currentUser.department || '').toLowerCase();
                  if (dept.includes('cater') || dept.includes('food')) return '🍽️ Mess Dining Desk';
                  if (dept.includes('transport')) return '🚗 Campus Transit Desk';
                  return '🏠 Hostel Allotment Desk';
                })()}
              </span>
            </button>

            <button
              type="button"
              className={`portal-nav-pill ${currentPath === '/' ? 'active' : ''}`}
              onClick={() => navigate('/')}
            >
              <span>📋 Visitor Entry Form</span>
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className="portal-nav-pill"
              onClick={() => navigate('/?tab=track')}
            >
              <SearchIcon size={14} />
              <span>Track Entry Pass</span>
            </button>

            <button
              type="button"
              className="portal-nav-pill"
              onClick={() => navigate('/?tab=guidelines')}
            >
              <span>🕒 Campus Visitor Guidelines</span>
            </button>
          </>
        )}
      </nav>

      {/* Right: User Status & Sign Out */}
      <div className="portal-topbar-right">
        {currentUser ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="portal-user-meta" style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                {currentUser.name}
              </div>
              <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                {currentUser.role === 'superadmin'
                  ? 'Super Administrator'
                  : currentUser.role === 'dept_admin' || currentUser.isDeptAdmin
                  ? `${currentUser.adminDepartment || currentUser.department || 'Department'} Admin`
                  : `${currentUser.role || 'Staff'} Account`}
              </div>
            </div>

            <button
              type="button"
              className="btn btn-sm btn-secondary"
              onClick={onLogout}
              style={{ fontSize: '0.75rem', padding: '6px 12px' }}
            >
              Sign Out
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={() => navigate('/login')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.8125rem' }}
          >
            <LockIcon size={13} />
            <span>Faculty & Staff Login</span>
          </button>
        )}
      </div>
    </header>
  );
};
