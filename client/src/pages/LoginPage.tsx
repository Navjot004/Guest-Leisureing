import React, { useState } from 'react';
import type { User, AuthResponse } from '../types';
import { LockIcon, UsersIcon, ShieldIcon, EyeIcon, EyeOffIcon, KeyIcon } from '../components/Icons';

interface LoginPageProps {
  onLoginSuccess: (user: User, token: string) => void;
  onNavigateToRegister: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onLoginSuccess,
  onNavigateToRegister,
}) => {
  const [accessMode, setAccessMode] = useState<'standard' | 'superadmin'>('standard');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [callout, setCallout] = useState<{ text: string; type: 'error' | 'success' | 'info' } | null>(null);

  const handleModeSwitch = (mode: 'standard' | 'superadmin') => {
    setAccessMode(mode);
    setCallout(null);
    if (mode === 'superadmin') {
      setIdentifier('10001');
      setPassword('Master@2026');
      setCallout({
        type: 'info',
        text: 'Super Admin credentials loaded: ID 10001 • Key: Master@2026',
      });
    } else {
      setIdentifier('');
      setPassword('');
    }
  };

  const handleQuickFillSuperAdmin = () => {
    setAccessMode('superadmin');
    setIdentifier('10001');
    setPassword('Master@2026');
    setCallout({
      type: 'info',
      text: 'Super Admin credentials loaded: ID 10001 • Key: Master@2026',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password.trim()) {
      setCallout({ type: 'error', text: 'Please provide both your ID / Email and password.' });
      return;
    }

    try {
      setLoading(true);
      setCallout(null);

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: identifier.trim(), password: password.trim() }),
      });

      const data: AuthResponse = await res.json();

      if (data.success && data.user && data.token) {
        setCallout({ type: 'success', text: data.message || 'Authentication clearance verified.' });
        setTimeout(() => {
          onLoginSuccess(data.user!, data.token!);
        }, 350);
      } else {
        setCallout({ type: 'error', text: data.message || 'Invalid credentials or clearance denied.' });
      }
    } catch (err: any) {
      setCallout({ type: 'error', text: 'Gateway communication failure: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-card">
      <div style={{ marginBottom: '1.25rem', textAlign: 'left' }}>
        <h1 className="headline-sm" style={{ marginBottom: '4px' }}>
          {accessMode === 'superadmin' ? 'Super Admin Portal' : 'Sign In to Account'}
        </h1>
        <p className="body-sm">
          {accessMode === 'superadmin'
            ? 'Authorized root operations and roster governance access.'
            : 'Access verified staff roster services or guest hospitality records.'}
        </p>
      </div>

      {/* Mode Switcher */}
      <div className="segmented-track" style={{ marginBottom: '1rem' }}>
        <button
          type="button"
          className={`segmented-segment ${accessMode === 'standard' ? 'active' : ''}`}
          onClick={() => handleModeSwitch('standard')}
        >
          <UsersIcon size={14} />
          <span>Staff & Guest</span>
        </button>
        <button
          type="button"
          className={`segmented-segment ${accessMode === 'superadmin' ? 'active' : ''}`}
          onClick={() => handleModeSwitch('superadmin')}
        >
          <ShieldIcon size={14} />
          <span>Super Admin (10001)</span>
        </button>
      </div>

      {/* Quick Fill Demo Helper Button for Super Admin */}
      {accessMode === 'standard' && (
        <button
          type="button"
          className="quick-fill-btn"
          onClick={handleQuickFillSuperAdmin}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <KeyIcon size={13} color="var(--primary)" />
            <span>Quick Fill Super Admin</span>
          </span>
          <span className="code-chip" style={{ fontSize: '0.6875rem' }}>10001 / Master@2026</span>
        </button>
      )}

      {/* Hardcoded Super Admin Specification Box */}
      {accessMode === 'superadmin' && (
        <div
          style={{
            background: 'var(--primary-wash)',
            border: '1px solid var(--indigo-border)',
            borderRadius: 'var(--radius-base)',
            padding: '10px 14px',
            marginBottom: '1rem',
          }}
        >
          <div className="label-ui" style={{ color: 'var(--indigo-text)', marginBottom: '4px', fontSize: '0.75rem' }}>
            Hardcoded Root Credentials
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
            <span className="code-chip">ID: 10001</span>
            <span className="code-chip">KEY: Master@2026</span>
          </div>
          <div className="label-code-sm" style={{ color: 'var(--indigo-text)', fontSize: '0.6875rem' }}>
            Authority level: Sovereign Master Administrator
          </div>
        </div>
      )}

      {callout && <div className={`callout callout-${callout.type}`}>{callout.text}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-field">
          <label className="field-label">
            {accessMode === 'superadmin' ? 'Super Admin ID / Identifier' : 'Staff ID or Email Address'}
          </label>
          <input
            type="text"
            className="text-input mono"
            placeholder={accessMode === 'superadmin' ? '10001' : 'e.g. 24051 or user@domain.com'}
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            required
            autoComplete="username"
          />
        </div>

        <div className="form-field">
          <label className="field-label">Password</label>
          <div className="auth-input-wrapper">
            <input
              type={showPassword ? 'text' : 'password'}
              className="text-input mono"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
            <button
              type="button"
              className="auth-input-toggle-pwd"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          className="btn btn-md btn-primary btn-full"
          disabled={loading}
          style={{ marginTop: '0.5rem' }}
        >
          {loading ? (
            'Validating Credentials...'
          ) : (
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <LockIcon size={14} />
              <span>{accessMode === 'superadmin' ? 'Authorize Super Admin' : 'Sign In'}</span>
            </span>
          )}
        </button>
      </form>

      <div
        style={{
          marginTop: '1.25rem',
          paddingTop: '1rem',
          borderTop: '1px solid var(--border-structural)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.8125rem',
        }}
      >
        <span style={{ color: 'var(--text-muted)' }}>Need an account?</span>
        <button
          type="button"
          onClick={onNavigateToRegister}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--primary)',
            fontWeight: 600,
            cursor: 'pointer',
            padding: 0,
          }}
        >
          Register or Activate Staff &rarr;
        </button>
      </div>

      {/* Guest Shortcut Notice */}
      <div
        style={{
          marginTop: '1rem',
          padding: '12px 14px',
          background: '#ECFDF5',
          border: '1px solid #A7F3D0',
          borderRadius: 'var(--radius-base)',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#065F46', marginBottom: '2px' }}>
          Visiting the University?
        </div>
        <p style={{ fontSize: '0.75rem', color: '#047857', marginBottom: '8px' }}>
          No password needed to request rooms, dining, or track your visit.
        </p>
        <a
          href="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.8125rem',
            fontWeight: 600,
            color: '#059669',
            textDecoration: 'underline',
          }}
        >
          <span>Open Guest Intake Portal (No Login Required) &rarr;</span>
        </a>
      </div>
    </div>
  );
};
