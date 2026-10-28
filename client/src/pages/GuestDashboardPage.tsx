import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { User, GuestRequestItem } from '../types';
import {
  UsersIcon,
  BedIcon,
  CarIcon,
  UtensilsIcon,
  RefreshIcon,
  CopyIcon,
  CheckIcon,
} from '../components/Icons';

interface GuestDashboardPageProps {
  currentUser: User | null;
  token: string | null;
  onLogout: () => void;
}

export const GuestDashboardPage: React.FC<GuestDashboardPageProps> = ({
  currentUser,
  token,
  onLogout: _onLogout,
}) => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<GuestRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const fetchMyRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      const authToken = token || localStorage.getItem('token');
      const res = await fetch('/api/guest-requests/my', {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to load your visit requests.');
      }

      setRequests(data.requests || []);
    } catch (err: any) {
      setError(err.message || 'Error communicating with server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyRequests();
  }, [token]);

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  return (
    <div style={{ padding: '1.5rem 1rem' }}>
      {/* Main Content Area */}
      <main style={{ maxWidth: '1100px', margin: '0 auto', width: '100%' }}>
        {/* Welcome Banner */}
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border-structural)',
          borderRadius: 'var(--radius-xl)',
          padding: '2rem',
          marginBottom: '2rem',
          boxShadow: 'var(--shadow-micro)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1.5rem',
        }}>
          <div>
            <div className="gateway-badge" style={{ marginBottom: '8px' }}>
              <UsersIcon size={12} />
              <span>Campus Visitor Account</span>
            </div>
            <h1 className="headline-lg" style={{ marginBottom: '4px' }}>
              Welcome, {currentUser?.name || 'Visitor'}
            </h1>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              View your on-campus stay requests, allocated hostel/transit rooms, and mess meal passes.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              className="btn-gateway-secondary"
              onClick={fetchMyRequests}
              disabled={loading}
            >
              <RefreshIcon size={14} />
              <span>Refresh</span>
            </button>
            <button
              type="button"
              className="btn-gateway-primary"
              onClick={() => navigate('/')}
            >
              <span>+ New Visit Request</span>
            </button>
          </div>
        </div>

        {/* Stats Strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          <div className="card" style={{ padding: '1.25rem', background: 'var(--surface)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
              Total Requests
            </div>
            <div className="headline-md" style={{ color: 'var(--primary)', fontWeight: 700 }}>
              {requests.length}
            </div>
          </div>

          <div className="card" style={{ padding: '1.25rem', background: 'var(--surface)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
              Allocated Stays
            </div>
            <div className="headline-md" style={{ color: '#059669', fontWeight: 700 }}>
              {requests.filter((r) => r.accommodation?.status === 'allocated').length}
            </div>
          </div>

          <div className="card" style={{ padding: '1.25rem', background: 'var(--surface)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
              Dispatched Transport
            </div>
            <div className="headline-md" style={{ color: '#3730A3', fontWeight: 700 }}>
              {requests.filter((r) => r.transport?.status === 'assigned').length}
            </div>
          </div>
        </div>

        {/* Request List */}
        <div>
          <h2 className="headline-sm" style={{ marginBottom: '1rem' }}>
            My Hospitality & Visit Requests
          </h2>

          {loading ? (
            <div className="card" style={{ padding: '3rem', textAlign: 'center', background: 'var(--surface)' }}>
              <RefreshIcon size={24} />
              <div style={{ marginTop: '8px', color: 'var(--text-muted)' }}>Retrieving your guest records...</div>
            </div>
          ) : error ? (
            <div className="card" style={{ padding: '1.5rem', background: 'var(--error-bg)', color: 'var(--error-text)' }}>
              {error}
            </div>
          ) : requests.length === 0 ? (
            <div className="card" style={{ padding: '3.5rem 2rem', textAlign: 'center', background: 'var(--surface)' }}>
              <BedIcon size={36} color="var(--text-dim)" />
              <h3 style={{ marginTop: '1rem', marginBottom: '6px', fontSize: '1.125rem' }}>No Visit Requests Found</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', maxWidth: '420px', margin: '0 auto 1.5rem' }}>
                You have not submitted any visit or facility requests with this account yet.
              </p>
              <button
                type="button"
                className="btn-gateway-primary"
                onClick={() => navigate('/')}
              >
                <span>Request University Facilities Now</span>
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {requests.map((req) => (
                <div
                  key={req._id}
                  className="card"
                  style={{
                    padding: '1.5rem',
                    background: 'var(--surface)',
                    boxShadow: 'var(--shadow-micro)',
                  }}
                >
                  {/* Card Header */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '12px',
                    paddingBottom: '1rem',
                    borderBottom: '1px solid var(--border-structural)',
                    marginBottom: '1rem',
                  }}>
                    <div>
                      <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                        Reference Code
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                        <span className="track-ref-code">{req.referenceCode}</span>
                        <button
                          type="button"
                          onClick={() => copyCode(req.referenceCode)}
                          className="btn-gateway-secondary"
                          style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                        >
                          {copiedCode === req.referenceCode ? <CheckIcon size={12} color="#059669" /> : <CopyIcon size={12} />}
                          <span>{copiedCode === req.referenceCode ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                        {req.purposeOfVisit || 'Campus Visit'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Created: {new Date(req.createdAt || Date.now()).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  {/* 3 Facility Status Blocks */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                    {/* Accommodation */}
                    <div style={{
                      padding: '12px',
                      background: 'var(--canvas)',
                      borderRadius: 'var(--radius-base)',
                      border: '1px solid var(--border-structural)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{ fontSize: '0.8125rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <BedIcon size={14} color="var(--primary)" />
                          Accommodation
                        </span>
                        <span className={`badge-pill ${req.accommodation?.status === 'allocated' ? 'badge-emerald' : 'badge-amber'}`} style={{ fontSize: '0.625rem' }}>
                          {req.accommodation?.selected ? req.accommodation.status?.toUpperCase() : 'NONE'}
                        </span>
                      </div>
                      {req.accommodation?.selected ? (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-primary)' }}>
                          <div>{req.accommodation.roomType} • {req.accommodation.checkInDate || 'TBD'}</div>
                          {req.accommodation.allocatedRoom && (
                            <div style={{ color: '#065F46', fontWeight: 600, marginTop: '4px' }}>
                              Allocated Room: {req.accommodation.allocatedRoom}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Not requested</div>
                      )}
                    </div>

                    {/* Dining */}
                    <div style={{
                      padding: '12px',
                      background: 'var(--canvas)',
                      borderRadius: 'var(--radius-base)',
                      border: '1px solid var(--border-structural)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{ fontSize: '0.8125rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <UtensilsIcon size={14} color="var(--primary)" />
                          Dining Plan
                        </span>
                        <span className={`badge-pill ${req.food?.cateringStatus === 'arranged' ? 'badge-emerald' : 'badge-amber'}`} style={{ fontSize: '0.625rem' }}>
                          {req.food?.selected ? req.food.cateringStatus?.toUpperCase() : 'NONE'}
                        </span>
                      </div>
                      {req.food?.selected ? (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-primary)' }}>
                          <div>{req.food.dietaryPreference} • {req.food.mealsRequired?.join(', ') || 'Meals'}</div>
                        </div>
                      ) : (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Not requested</div>
                      )}
                    </div>

                    {/* Transport */}
                    <div style={{
                      padding: '12px',
                      background: 'var(--canvas)',
                      borderRadius: 'var(--radius-base)',
                      border: '1px solid var(--border-structural)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{ fontSize: '0.8125rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <CarIcon size={14} color="var(--primary)" />
                          Transport
                        </span>
                        <span className={`badge-pill ${req.transport?.status === 'assigned' ? 'badge-emerald' : 'badge-amber'}`} style={{ fontSize: '0.625rem' }}>
                          {req.transport?.selected ? req.transport.status?.toUpperCase() : 'NONE'}
                        </span>
                      </div>
                      {req.transport?.selected ? (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-primary)' }}>
                          <div>{req.transport.vehiclePreference} • {req.transport.pickupLocation || 'Campus Gate'}</div>
                          {req.transport.allocatedDriver && (
                            <div style={{ color: '#3730A3', fontWeight: 600, marginTop: '4px' }}>
                              Driver: {req.transport.allocatedDriver} ({req.transport.driverPhone || 'N/A'})
                            </div>
                          )}
                        </div>
                      ) : (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Not requested</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
