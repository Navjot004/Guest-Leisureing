import React, { useState, useEffect } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { SuperAdminPage } from './pages/SuperAdminPage';
import { HomePage } from './pages/HomePage';
import { GuestDashboardPage } from './pages/GuestDashboardPage';
import { DepartmentAdminPortal } from './pages/DepartmentAdminPortal';
import { LockIcon, UserPlusIcon, ShieldIcon } from './components/Icons';
import { FirstLoginPasswordChangeModal } from './components/FirstLoginPasswordChangeModal';
import type { User } from './types';

// Centered Unauthenticated Auth Layout
const AuthLayout: React.FC<{
  activeTab: 'login' | 'register';
  children: React.ReactNode;
}> = ({ activeTab, children }) => {
  const navigate = useNavigate();

  return (
    <div className="auth-viewport">
      {/* Return to Guest Portal link */}
      <div style={{ marginBottom: '1.25rem', textAlign: 'center' }}>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="btn-gateway-secondary"
          style={{
            padding: '7px 16px',
            fontSize: '0.8125rem',
            background: 'var(--surface)',
            borderRadius: 'var(--radius-full)',
          }}
        >
          ← Return to Campus Lodging & Mess Portal
        </button>
      </div>

      {/* Brand Crest */}
      <div
        className="auth-header-brand"
        onClick={() => navigate('/')}
        style={{ cursor: 'pointer' }}
        title="Go to Homepage"
      >
        <div className="auth-brand-chip">🏛️</div>
        <h1 className="auth-brand-title">Campus Lodging & Mess Portal</h1>
        <p className="auth-brand-subtitle">
          Faculty Transit Quarters • Hostel Guest Wings • Campus Mess Facilities
        </p>
      </div>

      {/* Centered Auth Card Container */}
      <div style={{ width: '100%', maxWidth: '460px' }}>
        <div className="auth-nav-tabs">
          <button
            type="button"
            className={`auth-nav-tab ${activeTab === 'login' ? 'active' : ''}`}
            onClick={() => navigate('/login')}
          >
            <LockIcon size={14} />
            <span>Sign In</span>
          </button>
          <button
            type="button"
            className={`auth-nav-tab ${activeTab === 'register' ? 'active' : ''}`}
            onClick={() => navigate('/register')}
          >
            <UserPlusIcon size={14} />
            <span>Create Account</span>
          </button>
        </div>

        {children}

        {/* Security Badge */}
        <div className="auth-footer">
          <ShieldIcon size={12} color="var(--text-dim)" />
          <span>Official University Portal • Faculty, Caretaker & Staff Access</span>
        </div>
      </div>
    </div>
  );
};

import { MainHeader } from './components/MainHeader';

// Unified Portal Layout with Clean Institutional Top Header
const PortalLayout: React.FC<{
  currentUser: User | null;
  onLogout: () => void;
  children: React.ReactNode;
}> = ({ currentUser, onLogout, children }) => {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--canvas)' }}>
      {/* Institutional Top Header */}
      <MainHeader
        currentUser={currentUser}
        onLogout={onLogout}
      />

      {/* Main View Area */}
      <div style={{ flex: 1, minHeight: 'calc(100vh - 60px)', overflowY: 'auto' }}>
        {children}
      </div>
    </div>
  );
};

// Main App Inner Component handling state & routing
const AppRoutes: React.FC = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        return JSON.parse(savedUser);
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('token');
  });

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUserStr = localStorage.getItem('user');
    if (!savedToken || !savedUserStr) {
      setCurrentUser(null);
      setToken(null);
    }
  }, []);

  const getDeptRedirect = (user: User) => {
    const dept = (user.adminDepartment || user.department || '').toLowerCase();
    if (dept.includes('cater') || dept.includes('food')) return '/dept-admin/catering';
    if (dept.includes('transport')) return '/dept-admin/transport';
    return '/dept-admin/accommodation';
  };

  const handleLoginSuccess = (user: User, authToken: string) => {
    setCurrentUser(user);
    setToken(authToken);
    localStorage.setItem('token', authToken);
    localStorage.setItem('user', JSON.stringify(user));
    if (user.role === 'superadmin' || user.isSuperAdmin) {
      navigate('/super-admin');
    } else if (user.role === 'dept_admin' || user.isDeptAdmin || user.role === 'staff') {
      navigate(getDeptRedirect(user));
    } else {
      navigate('/guest-dashboard');
    }
  };

  const handleRegisterSuccess = (user: User, authToken: string) => {
    setCurrentUser(user);
    setToken(authToken);
    localStorage.setItem('token', authToken);
    localStorage.setItem('user', JSON.stringify(user));
    if (user.role === 'superadmin' || user.isSuperAdmin) {
      navigate('/super-admin');
    } else if (user.role === 'dept_admin' || user.isDeptAdmin || user.role === 'staff') {
      navigate(getDeptRedirect(user));
    } else {
      navigate('/guest-dashboard');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  const handlePasswordChanged = (updatedUser: User, updatedToken: string) => {
    setCurrentUser(updatedUser);
    setToken(updatedToken);
    localStorage.setItem('user', JSON.stringify(updatedUser));
    localStorage.setItem('token', updatedToken);
  };

  return (
    <>
      {currentUser && currentUser.mustChangePassword && (
        <FirstLoginPasswordChangeModal
          currentUser={currentUser}
          token={token}
          onPasswordChanged={handlePasswordChanged}
          onLogout={handleLogout}
        />
      )}
      <Routes>
        {/* 1. Public Arrival Gateway Homepage */}
        <Route
          path="/"
          element={
            <PortalLayout currentUser={currentUser} onLogout={handleLogout}>
              <HomePage currentUser={currentUser} onLogout={handleLogout} />
            </PortalLayout>
          }
        />

        {/* 2. Guest Dashboard (Protected for guests or login) */}
        <Route
          path="/guest-dashboard"
          element={
            currentUser ? (
              <PortalLayout currentUser={currentUser} onLogout={handleLogout}>
                <GuestDashboardPage
                  currentUser={currentUser}
                  token={token}
                  onLogout={handleLogout}
                />
              </PortalLayout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        {/* 3. Login Route */}
        <Route
          path="/login"
          element={
            currentUser ? (
              (currentUser.role === 'superadmin' || currentUser.isSuperAdmin) ? (
                <Navigate to="/super-admin" replace />
              ) : (currentUser.role === 'dept_admin' || currentUser.isDeptAdmin || currentUser.role === 'staff') ? (
                <Navigate to={getDeptRedirect(currentUser)} replace />
              ) : (
                <Navigate to="/guest-dashboard" replace />
              )
            ) : (
              <AuthLayout activeTab="login">
                <LoginPage
                  onLoginSuccess={handleLoginSuccess}
                  onNavigateToRegister={() => navigate('/register')}
                />
              </AuthLayout>
            )
          }
        />

        {/* 4. Register Route */}
        <Route
          path="/register"
          element={
            currentUser ? (
              (currentUser.role === 'superadmin' || currentUser.isSuperAdmin) ? (
                <Navigate to="/super-admin" replace />
              ) : (currentUser.role === 'dept_admin' || currentUser.isDeptAdmin || currentUser.role === 'staff') ? (
                <Navigate to={getDeptRedirect(currentUser)} replace />
              ) : (
                <Navigate to="/guest-dashboard" replace />
              )
            ) : (
              <AuthLayout activeTab="register">
                <RegisterPage
                  onRegisterSuccess={handleRegisterSuccess}
                  onNavigateToLogin={() => navigate('/login')}
                />
              </AuthLayout>
            )
          }
        />

        {/* 5. Dedicated Department Admin Portals */}
        <Route
          path="/dept-admin/:dept"
          element={
            currentUser ? (
              <PortalLayout currentUser={currentUser} onLogout={handleLogout}>
                <DepartmentAdminPortal
                  currentUser={currentUser}
                  token={token}
                  onLogout={handleLogout}
                />
              </PortalLayout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route path="/dept-admin" element={<Navigate to="/dept-admin/accommodation" replace />} />

        {/* 6. Super Admin Route (Protected, supports /super-admin, /super-admin/verified-staff, /super-admin/guests) */}
        <Route
          path="/super-admin/*"
          element={
            currentUser ? (
              <PortalLayout currentUser={currentUser} onLogout={handleLogout}>
                <SuperAdminPage
                  currentUser={currentUser}
                  token={token}
                  onNavigateToLogin={handleLogout}
                  onLogout={handleLogout}
                />
              </PortalLayout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        {/* 7. Aliases and Default Fallback */}
        <Route path="/admin" element={<Navigate to="/super-admin" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
};

export default App;
