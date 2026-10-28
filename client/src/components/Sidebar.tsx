import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import type { User } from '../types';
import {
  UsersIcon,
  LogOutIcon,
  CloseIcon,
  BriefcaseIcon,
  BuildingIcon,
  BedIcon,
  UtensilsIcon,
  CarIcon,
  SearchIcon,
  ClockIcon,
} from './Icons';

interface SidebarProps {
  currentUser: User | null;
  onLogout: () => void;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentUser,
  onLogout,
  isOpen,
  onClose,
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavClick = (path: string) => {
    navigate(path);
    onClose();
  };

  const isSuperAdmin =
    currentUser?.isSuperAdmin ||
    currentUser?.role === 'superadmin' ||
    currentUser?.id === '10001';

  const currentPath = location.pathname;

  return (
    <>
      {/* Slide Drawer Backdrop Overlay */}
      <div
        className={`portal-slide-overlay ${isOpen ? 'open' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide Navigation Drawer */}
      <aside className={`portal-slide-drawer ${isOpen ? 'open' : ''}`}>
        <div>
          {/* Drawer Top Header */}
          <div className="slide-drawer-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  background: 'var(--primary)',
                  color: '#FFFFFF',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1rem',
                }}
              >
                🏛️
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                  University Portal
                </div>
                <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                  Slide Navigation Menu
                </div>
              </div>
            </div>

            <button
              type="button"
              className="portal-hamburger-btn"
              onClick={onClose}
              title="Close Navigation"
              aria-label="Close navigation"
              style={{ width: '32px', height: '32px' }}
            >
              <CloseIcon size={16} />
            </button>
          </div>

          {/* Navigation Items */}
          <div className="slide-drawer-body">
            {/* Group 1: Public Intake */}
            <div className="slide-section-label">Campus Stay & Mess Intake</div>

            <button
              type="button"
              className={`slide-nav-item ${currentPath === '/' ? 'active' : ''}`}
              onClick={() => handleNavClick('/')}
            >
              <BedIcon size={16} />
              <span>Apply for Campus Stay</span>
            </button>

            <button
              type="button"
              className="slide-nav-item"
              onClick={() => handleNavClick('/?tab=track')}
            >
              <SearchIcon size={16} />
              <span>Track Application Status</span>
            </button>

            <button
              type="button"
              className="slide-nav-item"
              onClick={() => handleNavClick('/?tab=guidelines')}
            >
              <ClockIcon size={16} />
              <span>Hostel & Mess Rules</span>
            </button>

            {/* Group 2: Caretaker & Department Desks */}
            <div className="slide-section-label" style={{ marginTop: '12px' }}>
              Hostel Caretaker Desks
            </div>

            <button
              type="button"
              className={`slide-nav-item ${currentPath.includes('/dept-admin/accommodation') ? 'active' : ''}`}
              onClick={() => handleNavClick('/dept-admin/accommodation')}
            >
              <BedIcon size={16} />
              <span>Hostel & Rooms Desk</span>
            </button>

            <button
              type="button"
              className={`slide-nav-item ${currentPath.includes('/dept-admin/catering') ? 'active' : ''}`}
              onClick={() => handleNavClick('/dept-admin/catering')}
            >
              <UtensilsIcon size={16} />
              <span>Mess Meals & Coupons</span>
            </button>

            <button
              type="button"
              className={`slide-nav-item ${currentPath.includes('/dept-admin/transport') ? 'active' : ''}`}
              onClick={() => handleNavClick('/dept-admin/transport')}
            >
              <CarIcon size={16} />
              <span>Campus Gate Shuttle</span>
            </button>

            {/* Group 3: Super Admin Console (Visible to Super Admin) */}
            {isSuperAdmin && (
              <>
                <div className="slide-section-label" style={{ marginTop: '12px' }}>
                  Super Admin Console
                </div>

                <button
                  type="button"
                  className={`slide-nav-item ${currentPath === '/super-admin' || currentPath.includes('/super-admin/verified-staff') ? 'active' : ''}`}
                  onClick={() => handleNavClick('/super-admin')}
                >
                  <UsersIcon size={16} />
                  <span>Users & Staff Roster</span>
                </button>

                <button
                  type="button"
                  className={`slide-nav-item ${currentPath.includes('/super-admin/manage-staff') ? 'active' : ''}`}
                  onClick={() => handleNavClick('/super-admin/manage-staff')}
                >
                  <BriefcaseIcon size={16} />
                  <span>Manage Staff Clearance</span>
                </button>

                <button
                  type="button"
                  className={`slide-nav-item ${currentPath.includes('/super-admin/departments') ? 'active' : ''}`}
                  onClick={() => handleNavClick('/super-admin/departments')}
                >
                  <BuildingIcon size={16} />
                  <span>Departments Overview</span>
                </button>
              </>
            )}

            {/* Group 4: Visitor Dashboard */}
            {currentUser && currentUser.role === 'guest' && (
              <>
                <div className="slide-section-label" style={{ marginTop: '12px' }}>
                  Visitor Account
                </div>
                <button
                  type="button"
                  className={`slide-nav-item ${currentPath.includes('/guest-dashboard') ? 'active' : ''}`}
                  onClick={() => handleNavClick('/guest-dashboard')}
                >
                  <UsersIcon size={16} />
                  <span>My Applications</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Drawer Footer with Identity & Logout */}
        <div className="slide-drawer-footer">
          {currentUser ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                  Logged In Identity
                </span>
                <span
                  style={{
                    fontSize: '0.625rem',
                    fontWeight: 700,
                    padding: '2px 6px',
                    borderRadius: '4px',
                    background: isSuperAdmin ? '#DBEAFE' : '#ECFDF5',
                    color: isSuperAdmin ? '#1E3A8A' : '#065F46',
                  }}
                >
                  {isSuperAdmin ? 'SUPER ADMIN' : (currentUser.role || 'STAFF').toUpperCase()}
                </span>
              </div>

              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px' }}>
                {currentUser.name}
              </div>

              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
                {currentUser.email}
              </div>

              <button
                type="button"
                className="btn btn-sm btn-secondary btn-full"
                onClick={() => {
                  onLogout();
                  onClose();
                }}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: '#991B1B' }}
              >
                <LogOutIcon size={14} />
                <span>Sign Out</span>
              </button>
            </div>
          ) : (
            <div>
              <button
                type="button"
                className="btn btn-sm btn-primary btn-full"
                onClick={() => handleNavClick('/login')}
              >
                <span>Faculty & Staff Login</span>
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
