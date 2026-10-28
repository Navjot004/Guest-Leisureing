import React, { useState } from 'react';
import type { User } from '../types';
import { KeyIcon, EyeIcon, EyeOffIcon, CheckCircleIcon } from './Icons';

interface FirstLoginPasswordChangeModalProps {
  currentUser: User;
  token: string | null;
  onPasswordChanged: (updatedUser: User, updatedToken: string) => void;
  onLogout: () => void;
}

export const FirstLoginPasswordChangeModal: React.FC<FirstLoginPasswordChangeModalProps> = ({
  currentUser,
  token,
  onPasswordChanged,
  onLogout,
}) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!currentPassword.trim()) {
      setError('Please provide the temporary password sent to your email.');
      return;
    }

    if (newPassword.length < 6) {
      setError('Your new password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }

    if (newPassword === currentPassword) {
      setError('New password must be different from your temporary password.');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword: currentPassword.trim(),
          newPassword: newPassword.trim(),
        }),
      });

      const data = await res.json();

      if (data.success && data.user && data.token) {
        onPasswordChanged(data.user, data.token);
      } else {
        setError(data.message || 'Failed to update password. Please verify your current temporary password.');
      }
    } catch (err: any) {
      setError('Communication failure: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.25rem',
      }}
    >
      <div
        className="auth-card"
        style={{
          width: '100%',
          maxWidth: '460px',
          background: 'var(--surface)',
          borderRadius: 'var(--radius-lg, 12px)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.45)',
          border: '1px solid var(--border-structural)',
          padding: '1.75rem',
          margin: 0,
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: 'var(--primary-wash)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '12px',
              border: '1px solid var(--indigo-border)',
            }}
          >
            <KeyIcon size={24} color="var(--primary)" />
          </div>

          <h2 className="headline-sm" style={{ marginBottom: '6px' }}>
            Set Your Permanent Password
          </h2>

          <p className="body-sm" style={{ color: 'var(--text-muted)' }}>
            Welcome, <strong>{currentUser.name}</strong> ({currentUser.staffId || currentUser.email}).
            You have logged in with a temporary password. For enterprise institutional security, you must set a permanent password to access your dashboard.
          </p>
        </div>

        {error && (
          <div
            className="callout callout-error"
            style={{ marginBottom: '1rem', fontSize: '0.8125rem' }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-field" style={{ marginBottom: '0.875rem' }}>
            <label className="field-label">Current / Temporary Password</label>
            <div className="auth-input-wrapper">
              <input
                type={showCurrent ? 'text' : 'password'}
                className="text-input mono"
                placeholder="Temporary password from email"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                className="auth-input-toggle-pwd"
                onClick={() => setShowCurrent(!showCurrent)}
                aria-label={showCurrent ? 'Hide password' : 'Show password'}
              >
                {showCurrent ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
              </button>
            </div>
          </div>

          <div className="form-field" style={{ marginBottom: '0.875rem' }}>
            <label className="field-label">New Permanent Password (Min 6 chars)</label>
            <div className="auth-input-wrapper">
              <input
                type={showNew ? 'text' : 'password'}
                className="text-input mono"
                placeholder="Enter strong new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
              />
              <button
                type="button"
                className="auth-input-toggle-pwd"
                onClick={() => setShowNew(!showNew)}
                aria-label={showNew ? 'Hide password' : 'Show password'}
              >
                {showNew ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
              </button>
            </div>
          </div>

          <div className="form-field" style={{ marginBottom: '1.25rem' }}>
            <label className="field-label">Confirm New Password</label>
            <div className="auth-input-wrapper">
              <input
                type="password"
                className="text-input mono"
                placeholder="Repeat new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-md btn-primary btn-full"
            disabled={loading}
          >
            {loading ? (
              'Securing Account...'
            ) : (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <CheckCircleIcon size={15} />
                <span>Save Password & Unlock Dashboard</span>
              </span>
            )}
          </button>
        </form>

        <div
          style={{
            marginTop: '1.25rem',
            paddingTop: '1rem',
            borderTop: '1px solid var(--border-structural)',
            textAlign: 'center',
          }}
        >
          <button
            type="button"
            onClick={onLogout}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              fontSize: '0.8125rem',
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            Cancel and Sign Out
          </button>
        </div>
      </div>
    </div>
  );
};
