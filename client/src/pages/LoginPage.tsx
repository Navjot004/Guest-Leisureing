import React, { useState } from 'react';
import type { User, AuthResponse } from '../types';
import { LockIcon, EyeIcon, EyeOffIcon, ShieldIcon } from '../components/Icons';

interface LoginPageProps {
  onLoginSuccess: (user: User, token: string) => void;
  onNavigateToRegister: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onLoginSuccess,
  onNavigateToRegister,
}) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [callout, setCallout] = useState<{ text: string; type: 'error' | 'success' | 'info' } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password.trim()) {
      setCallout({ type: 'error', text: 'Please enter your Staff ID (or Email) and password.' });
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
          Portal Sign In
        </h1>
        <p className="body-sm" style={{ color: 'var(--text-muted)' }}>
          Authorized access for University Staff, Department Administrators, and Registered Guests.
        </p>
      </div>

      {callout && <div className={`callout callout-${callout.type}`}>{callout.text}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-field">
          <label className="field-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Staff ID / Email Address</span>
            <span style={{ fontSize: '0.6875rem', color: 'var(--text-dim)', fontWeight: 'normal' }}>
              Staff ID preferred
            </span>
          </label>
          <input
            type="text"
            className="text-input mono"
            placeholder="e.g. CTU-STF-102, 10001, or name@ctu.edu.in"
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
              <span>Sign In to Portal</span>
            </span>
          )}
        </button>
      </form>

      {/* Institutional Staff Notice */}
      <div
        style={{
          marginTop: '1rem',
          padding: '10px 12px',
          background: 'var(--surface-wash)',
          border: '1px solid var(--border-structural)',
          borderRadius: 'var(--radius-base)',
          fontSize: '0.75rem',
          color: 'var(--text-muted)',
          display: 'flex',
          gap: '8px',
          alignItems: 'flex-start',
        }}
      >
        <span style={{ flexShrink: 0, marginTop: '2px', display: 'inline-flex' }}>
          <ShieldIcon size={14} color="var(--primary)" />
        </span>
        <span>
          <strong>Faculty & Staff:</strong> Use your official Staff ID and password issued to your verified email. On first login, you will be prompted to set your personal password.
        </span>
      </div>

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
        <span style={{ color: 'var(--text-muted)' }}>New Guest Visitor?</span>
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
          Register Guest Profile &rarr;
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
          No login needed to request rooms, dining, or view active visitor passes.
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
