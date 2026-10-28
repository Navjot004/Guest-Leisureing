import React, { useState } from 'react';
import type { User, AuthResponse } from '../types';
import { UsersIcon, EyeIcon, EyeOffIcon, CheckCircleIcon, ShieldIcon } from '../components/Icons';

interface RegisterPageProps {
  onRegisterSuccess: (user: User, token: string) => void;
  onNavigateToLogin: () => void;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({
  onRegisterSuccess,
  onNavigateToLogin,
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [callout, setCallout] = useState<{ text: string; type: 'error' | 'success' } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password.trim()) {
      setCallout({ type: 'error', text: 'Full Name, Email, and Password are required.' });
      return;
    }

    if (password.length < 6) {
      setCallout({ type: 'error', text: 'Password requirement: Minimum 6 characters.' });
      return;
    }

    try {
      setLoading(true);
      setCallout(null);

      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password: password.trim(),
          phone: phone.trim(),
          role: 'guest',
        }),
      });

      const data: AuthResponse = await res.json();

      if (data.success && data.user && data.token) {
        setCallout({
          type: 'success',
          text: data.message || 'Guest account created! Prior visitor applications have been linked to your profile.',
        });
        setTimeout(() => {
          onRegisterSuccess(data.user!, data.token!);
        }, 400);
      } else {
        setCallout({ type: 'error', text: data.message || 'Registration rejected.' });
      }
    } catch (err: any) {
      setCallout({ type: 'error', text: 'Server communication error: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-card">
      <div style={{ marginBottom: '1.25rem', textAlign: 'left' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <UsersIcon size={20} color="var(--primary)" />
          <h1 className="headline-sm" style={{ margin: 0 }}>
            Guest Profile Registration
          </h1>
        </div>
        <p className="body-sm" style={{ color: 'var(--text-muted)' }}>
          Create an account to track your campus visit passes, room allotments, and dining requests.
        </p>
      </div>

      {/* Helpful Pre-Login Guest Booking Note */}
      <div
        style={{
          marginBottom: '1rem',
          padding: '10px 14px',
          background: '#EFF6FF',
          border: '1px solid #BFDBFE',
          borderRadius: 'var(--radius-base)',
          fontSize: '0.75rem',
          color: '#1E40AF',
          lineHeight: '1.4',
        }}
      >
        <strong>✨ Already submitted a visitor entry form?</strong>
        <p style={{ margin: '4px 0 0 0' }}>
          Use the <strong>same email address</strong> you used on the guest form. All your existing bookings, pass tickets, and approval updates will be linked to your dashboard automatically!
        </p>
      </div>

      {callout && <div className={`callout callout-${callout.type}`}>{callout.text}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-field">
          <label className="field-label">Full Legal Name</label>
          <input
            type="text"
            className="text-input"
            placeholder="e.g. Dr. Jane Smith"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoComplete="name"
          />
        </div>

        <div className="form-field">
          <label className="field-label">Email Address</label>
          <input
            type="email"
            className="text-input mono"
            placeholder="e.g. jane.smith@example.org"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>

        <div className="form-field">
          <label className="field-label">Phone Number (Optional)</label>
          <input
            type="tel"
            className="text-input mono"
            placeholder="e.g. 9876543210"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            autoComplete="tel"
          />
        </div>

        <div className="form-field">
          <label className="field-label">Password (Min 6 Characters)</label>
          <div className="auth-input-wrapper">
            <input
              type={showPassword ? 'text' : 'password'}
              className="text-input mono"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
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
          style={{ marginTop: '0.75rem' }}
        >
          {loading ? (
            'Creating Profile...'
          ) : (
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <CheckCircleIcon size={15} />
              <span>Complete Guest Registration</span>
            </span>
          )}
        </button>
      </form>

      {/* Notice for University Staff */}
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
          <strong>University Staff:</strong> Staff self-registration is closed. Staff Login IDs and temporary passwords are issued directly by the Dean's Office / Super Admin to your institutional email.
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
        <span style={{ color: 'var(--text-muted)' }}>Already registered or University Staff?</span>
        <button
          type="button"
          onClick={onNavigateToLogin}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--primary)',
            fontWeight: 600,
            cursor: 'pointer',
            padding: 0,
          }}
        >
          Sign In &rarr;
        </button>
      </div>
    </div>
  );
};
