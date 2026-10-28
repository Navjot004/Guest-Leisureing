import React, { useState } from 'react';
import type { User, AuthResponse } from '../types';
import { BriefcaseIcon, UsersIcon, EyeIcon, EyeOffIcon, CheckCircleIcon } from '../components/Icons';

interface RegisterPageProps {
  onRegisterSuccess: (user: User, token: string) => void;
  onNavigateToLogin: () => void;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({
  onRegisterSuccess,
  onNavigateToLogin,
}) => {
  const [registerType, setRegisterType] = useState<'staff' | 'guest'>('staff');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [staffId, setStaffId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState('');
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
          staffId: registerType === 'staff' ? staffId.trim() : undefined,
          role: registerType,
        }),
      });

      const data: AuthResponse = await res.json();

      if (data.success && data.user && data.token) {
        setCallout({
          type: 'success',
          text: registerType === 'staff'
            ? 'Staff verification confirmed! Account successfully activated.'
            : 'Guest profile intake completed successfully.',
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
        <h1 className="headline-sm" style={{ marginBottom: '4px' }}>
          {registerType === 'staff' ? 'Staff Account Activation' : 'Guest Intake Registration'}
        </h1>
        <p className="body-sm">
          {registerType === 'staff'
            ? 'Staff registration is restricted to personnel on the Verified Staff List uploaded by Super Admin.'
            : 'Provision an individual institutional guest hospitality record.'}
        </p>
      </div>

      {/* Role Switcher Tab */}
      <div className="segmented-track" style={{ marginBottom: '1.25rem' }}>
        <button
          type="button"
          className={`segmented-segment ${registerType === 'staff' ? 'active' : ''}`}
          onClick={() => {
            setRegisterType('staff');
            setCallout(null);
          }}
        >
          <BriefcaseIcon size={14} />
          <span>Staff Registration</span>
        </button>

        <button
          type="button"
          className={`segmented-segment ${registerType === 'guest' ? 'active' : ''}`}
          onClick={() => {
            setRegisterType('guest');
            setCallout(null);
          }}
        >
          <UsersIcon size={14} />
          <span>Guest Registration</span>
        </button>
      </div>

      {callout && <div className={`callout callout-${callout.type}`}>{callout.text}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-field">
          <label className="field-label">Full Legal Name</label>
          <input
            type="text"
            className="text-input"
            placeholder={registerType === 'staff' ? 'e.g. Dr. Nitin Tandon' : 'e.g. John Doe'}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoComplete="name"
          />
        </div>

        {registerType === 'staff' && (
          <div className="form-field">
            <label className="field-label">University Staff / Employee ID</label>
            <input
              type="text"
              className="text-input mono"
              placeholder="e.g. 24051"
              value={staffId}
              onChange={(e) => setStaffId(e.target.value)}
            />
          </div>
        )}

        <div className="form-field">
          <label className="field-label">
            {registerType === 'staff' ? 'Institutional Email (as listed in roster)' : 'Email Address'}
          </label>
          <input
            type="email"
            className="text-input mono"
            placeholder={registerType === 'staff' ? 'drnitin@ctuniversity.in' : 'john.doe@organization.org'}
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
            placeholder="9847230100"
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
            'Verifying Record...'
          ) : (
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <CheckCircleIcon size={15} />
              <span>
                {registerType === 'staff'
                  ? 'Verify & Activate Staff Account'
                  : 'Complete Guest Intake'}
              </span>
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
        <span style={{ color: 'var(--text-muted)' }}>Already registered?</span>
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
