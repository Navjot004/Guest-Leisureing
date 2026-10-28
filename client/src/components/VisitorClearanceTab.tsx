import React, { useState, useEffect } from 'react';
import type { GuestRequestItem } from '../types';
import {
  SearchIcon,
  RefreshIcon,
  CheckIcon,
  CloseIcon,
  CopyIcon,
  BedIcon,
  UtensilsIcon,
  CarIcon,
} from './Icons';

interface VisitorClearanceTabProps {
  token: string | null;
}

interface EmailAuditItem {
  id: string;
  to: string;
  subject: string;
  logType: string;
  referenceCode?: string;
  sentAt: string;
  status: string;
}

export const VisitorClearanceTab: React.FC<VisitorClearanceTabProps> = ({ token }) => {
  const [requests, setRequests] = useState<GuestRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [feedback, setFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  });

  // Action states
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [rejectingItem, setRejectingItem] = useState<GuestRequestItem | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [approvalNotes, setApprovalNotes] = useState('');

  // Email Audit Log Modal
  const [showEmailLogs, setShowEmailLogs] = useState(false);
  const [emailLogs, setEmailLogs] = useState<EmailAuditItem[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      loadClearanceData();
    }
  }, [token, statusFilter]);

  const loadClearanceData = async () => {
    try {
      setLoading(true);
      setFeedback(null);

      const [reqRes, statsRes] = await Promise.all([
        fetch(`/api/admin/clearance/requests?status=${statusFilter}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/admin/clearance/stats', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const reqData = await reqRes.json();
      if (reqData.success && Array.isArray(reqData.requests)) {
        setRequests(reqData.requests);
      }

      const statsData = await statsRes.json();
      if (statsData.success && statsData.stats) {
        setStats(statsData.stats);
      }
    } catch (err: any) {
      setFeedback({ text: 'Error retrieving visitor requests: ' + err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (item: GuestRequestItem) => {
    try {
      setActionLoadingId(item._id);
      setFeedback(null);

      const res = await fetch(`/api/admin/clearance/requests/${item._id}/decision`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          decision: 'approved',
          notes: approvalNotes.trim() || 'Visit clearance approved by Dean / Super Admin Office.',
        }),
      });

      const data = await res.json();
      if (data.success) {
        setFeedback({
          text: `✓ Approved #${item.referenceCode} for "${item.guestName}". Official gate reference issued & email notification dispatched!`,
          type: 'success',
        });
        setApprovalNotes('');
        loadClearanceData();
      } else {
        setFeedback({ text: data.message || 'Failed to approve clearance.', type: 'error' });
      }
    } catch (err: any) {
      setFeedback({ text: 'Approval failed: ' + err.message, type: 'error' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async () => {
    if (!rejectingItem) return;
    try {
      setActionLoadingId(rejectingItem._id);
      setFeedback(null);

      const res = await fetch(`/api/admin/clearance/requests/${rejectingItem._id}/decision`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          decision: 'rejected',
          notes: rejectReason.trim() || 'Institutional schedule conflict or incomplete department clearance.',
        }),
      });

      const data = await res.json();
      if (data.success) {
        setFeedback({
          text: `Request #${rejectingItem.referenceCode} rejected. Notification email sent to ${rejectingItem.guestEmail}.`,
          type: 'success',
        });
        setRejectingItem(null);
        setRejectReason('');
        loadClearanceData();
      } else {
        setFeedback({ text: data.message || 'Failed to reject request.', type: 'error' });
      }
    } catch (err: any) {
      setFeedback({ text: 'Rejection failed: ' + err.message, type: 'error' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const loadEmailAuditLogs = async () => {
    try {
      setLoadingLogs(true);
      setShowEmailLogs(true);
      const res = await fetch('/api/admin/email-logs', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.logs)) {
        setEmailLogs(data.logs);
      }
    } catch (err: any) {
      console.error('Failed to load email logs:', err);
    } finally {
      setLoadingLogs(false);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const filteredRequests = requests.filter((r) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      r.guestName.toLowerCase().includes(q) ||
      r.guestEmail.toLowerCase().includes(q) ||
      (r.guestPhone && r.guestPhone.includes(q)) ||
      (r.institution && r.institution.toLowerCase().includes(q)) ||
      (r.referenceCode && r.referenceCode.toLowerCase().includes(q)) ||
      (r.purposeOfVisit && r.purposeOfVisit.toLowerCase().includes(q))
    );
  });

  return (
    <div>
      {/* KPI Stats HUD */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '12px',
          marginBottom: '1.25rem',
        }}
      >
        <div
          style={{
            background: '#FEF3C7',
            border: '1.5px solid #F59E0B',
            borderRadius: '8px',
            padding: '1rem 1.25rem',
            cursor: 'pointer',
          }}
          onClick={() => setStatusFilter('pending')}
        >
          <div style={{ fontSize: '0.75rem', color: '#92400E', fontWeight: 700, textTransform: 'uppercase' }}>
            ⏳ Pending Dean Review
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#78350F', marginTop: '4px' }}>
            {stats.pending}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#B45309', marginTop: '2px' }}>
            Awaiting Super Admin clearance decision
          </div>
        </div>

        <div
          style={{
            background: '#ECFDF5',
            border: '1.5px solid #10B981',
            borderRadius: '8px',
            padding: '1rem 1.25rem',
            cursor: 'pointer',
          }}
          onClick={() => setStatusFilter('approved')}
        >
          <div style={{ fontSize: '0.75rem', color: '#065F46', fontWeight: 700, textTransform: 'uppercase' }}>
            ✓ Approved & Dispatched
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#047857', marginTop: '4px' }}>
            {stats.approved}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#059669', marginTop: '2px' }}>
            Dispatched to Hostel, Mess & Shuttle Desks
          </div>
        </div>

        <div
          style={{
            background: '#FEF2F2',
            border: '1px solid #FCA5A5',
            borderRadius: '8px',
            padding: '1rem 1.25rem',
            cursor: 'pointer',
          }}
          onClick={() => setStatusFilter('rejected')}
        >
          <div style={{ fontSize: '0.75rem', color: '#991B1B', fontWeight: 700, textTransform: 'uppercase' }}>
            ✕ Requests Rejected
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#B91C1C', marginTop: '4px' }}>
            {stats.rejected}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#DC2626', marginTop: '2px' }}>
            Denied clearance with reason
          </div>
        </div>

        <div
          style={{
            background: '#EFF6FF',
            border: '1px solid #BFDBFE',
            borderRadius: '8px',
            padding: '1rem 1.25rem',
            cursor: 'pointer',
          }}
          onClick={() => setStatusFilter('all')}
        >
          <div style={{ fontSize: '0.75rem', color: '#1E40AF', fontWeight: 700, textTransform: 'uppercase' }}>
            📋 Total Intake
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#1E3A8A', marginTop: '4px' }}>
            {stats.total}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#2563EB', marginTop: '2px' }}>
            All campus visitor applications
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        className="bento-card"
        style={{
          padding: '1rem 1.25rem',
          marginBottom: '1.25rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className={`btn btn-sm ${statusFilter === 'pending' ? 'btn-primary' : 'btn-secondary'}`}
            style={statusFilter === 'pending' ? { background: '#D97706', borderColor: '#D97706' } : {}}
            onClick={() => setStatusFilter('pending')}
          >
            ⏳ Pending Review ({stats.pending})
          </button>
          <button
            type="button"
            className={`btn btn-sm ${statusFilter === 'approved' ? 'btn-primary' : 'btn-secondary'}`}
            style={statusFilter === 'approved' ? { background: '#059669', borderColor: '#059669' } : {}}
            onClick={() => setStatusFilter('approved')}
          >
            ✓ Approved & Active ({stats.approved})
          </button>
          <button
            type="button"
            className={`btn btn-sm ${statusFilter === 'rejected' ? 'btn-primary' : 'btn-secondary'}`}
            style={statusFilter === 'rejected' ? { background: '#DC2626', borderColor: '#DC2626' } : {}}
            onClick={() => setStatusFilter('rejected')}
          >
            ✕ Rejected ({stats.rejected})
          </button>
          <button
            type="button"
            className={`btn btn-sm ${statusFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setStatusFilter('all')}
          >
            All Requests ({stats.total})
          </button>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', minWidth: '240px' }}>
            <input
              type="text"
              className="input-text"
              placeholder="Search visitor, email, ref code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ fontSize: '0.8125rem', paddingLeft: '28px' }}
            />
            <span style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }}>
              <SearchIcon size={14} />
            </span>
          </div>

          <button
            type="button"
            className="btn btn-sm btn-secondary"
            onClick={loadEmailAuditLogs}
            title="Inspect all live dispatched system emails and delivery states"
          >
            <span>📧 Live Email Log</span>
          </button>

          <button
            type="button"
            className="btn btn-sm btn-secondary"
            onClick={loadClearanceData}
            title="Reload Clearance Requests"
          >
            <RefreshIcon size={14} />
          </button>
        </div>
      </div>

      {feedback && (
        <div className={`callout callout-${feedback.type}`} style={{ marginBottom: '1.25rem' }}>
          {feedback.text}
        </div>
      )}

      {/* Requests Feed */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#64748B' }}>
          <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>🔄</div>
          <div>Loading campus visit clearance applications from MongoDB...</div>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="bento-card" style={{ textAlign: 'center', padding: '3rem 1.5rem', color: '#64748B' }}>
          <div style={{ fontSize: '2rem', marginBottom: '10px' }}>
            {statusFilter === 'pending' ? '🎉' : '📂'}
          </div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0F172A', marginBottom: '6px' }}>
            {statusFilter === 'pending'
              ? 'Clearance Queue Clear!'
              : `No ${statusFilter} visitor clearance applications found`}
          </h3>
          <p style={{ fontSize: '0.85rem', maxWidth: '460px', margin: '0 auto' }}>
            {statusFilter === 'pending'
              ? 'All external visit clearance requests have been reviewed by the Dean Office.'
              : 'Try selecting a different status filter or clear your search term.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filteredRequests.map((req) => {
            const isPending = req.clearanceStatus === 'pending' || !req.clearanceStatus;
            const isApproved = req.clearanceStatus === 'approved';
            const isRejected = req.clearanceStatus === 'rejected';

            return (
              <div
                key={req._id}
                className="bento-card"
                style={{
                  borderLeft: isPending
                    ? '4px solid #F59E0B'
                    : isApproved
                    ? '4px solid #10B981'
                    : '4px solid #EF4444',
                  padding: '1.25rem 1.5rem',
                }}
              >
                {/* Header Row: Visitor Meta + Reference Code */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    flexWrap: 'wrap',
                    gap: '12px',
                    borderBottom: '1px solid #E2E8F0',
                    paddingBottom: '0.875rem',
                    marginBottom: '0.875rem',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                        {req.guestName}
                      </h3>
                      {req.designation && (
                        <span
                          style={{
                            background: '#EFF6FF',
                            color: '#1E3A8A',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '4px',
                          }}
                        >
                          {req.designation}
                        </span>
                      )}
                      <span
                        style={{
                          background: isPending ? '#FEF3C7' : isApproved ? '#DCFCE7' : '#FEE2E2',
                          color: isPending ? '#92400E' : isApproved ? '#166534' : '#991B1B',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '2px 10px',
                          borderRadius: '4px',
                          textTransform: 'uppercase',
                        }}
                      >
                        {isPending ? '⏳ Pending Dean Review' : isApproved ? '✓ Cleared by Dean Office' : '✕ Rejected'}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.8125rem', color: '#475569', marginTop: '4px' }}>
                      <strong>{req.institution || 'External Visitor'}</strong> • ✉️ {req.guestEmail}
                      {req.guestPhone && ` • 📞 ${req.guestPhone}`}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: '#F1F5F9',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        border: '1px solid #CBD5E1',
                      }}
                    >
                      <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#1E3A8A' }}>
                        {req.referenceCode}
                      </span>
                      <button
                        type="button"
                        onClick={() => copyCode(req.referenceCode)}
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
                        title="Copy Reference Code"
                      >
                        {copiedCode === req.referenceCode ? (
                          <CheckIcon size={12} color="#059669" />
                        ) : (
                          <CopyIcon size={12} />
                        )}
                      </button>
                    </div>
                    <div style={{ fontSize: '0.6875rem', color: '#94A3B8', marginTop: '3px' }}>
                      Submitted: {req.createdAt ? new Date(req.createdAt).toLocaleDateString() : 'Recent'}
                    </div>
                  </div>
                </div>

                {/* Purpose of Visit Note */}
                <div
                  style={{
                    background: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    fontSize: '0.8125rem',
                    color: '#334155',
                    marginBottom: '1rem',
                  }}
                >
                  <strong style={{ color: '#0F172A' }}>Visit Purpose / Host:</strong>{' '}
                  {req.purposeOfVisit || 'Campus Visit & Academic Clearance'}
                </div>

                {/* Facilities Requested Grid */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                    gap: '10px',
                    marginBottom: '1rem',
                  }}
                >
                  {/* Lodging */}
                  <div
                    style={{
                      border: req.accommodation?.selected ? '1px solid #BFDBFE' : '1px dashed #CBD5E1',
                      background: req.accommodation?.selected ? '#EFF6FF' : '#F8FAFC',
                      borderRadius: '6px',
                      padding: '10px 12px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                      <BedIcon size={14} color="#1E3A8A" />
                      <strong style={{ fontSize: '0.8125rem', color: '#1E3A8A' }}>Hostel Lodging</strong>
                    </div>
                    {req.accommodation?.selected ? (
                      <div style={{ fontSize: '0.75rem', color: '#334155', lineHeight: 1.45 }}>
                        <div><strong>Type:</strong> {req.accommodation.roomType || 'Standard'} ({req.accommodation.guestsCount || 1} guest)</div>
                        <div><strong>Dates:</strong> {req.accommodation.checkInDate} to {req.accommodation.checkOutDate}</div>
                        <div style={{ marginTop: '4px' }}>
                          <span style={{ color: req.accommodation.allocatedRoom ? '#059669' : '#D97706', fontWeight: 700 }}>
                            {req.accommodation.allocatedRoom ? `Room Allotted: ${req.accommodation.allocatedRoom}` : '⏳ Pending Hostel Warden Allotment'}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>Not requested (Day visit only)</div>
                    )}
                  </div>

                  {/* Mess Dining */}
                  <div
                    style={{
                      border: req.food?.selected ? '1px solid #A7F3D0' : '1px dashed #CBD5E1',
                      background: req.food?.selected ? '#ECFDF5' : '#F8FAFC',
                      borderRadius: '6px',
                      padding: '10px 12px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                      <UtensilsIcon size={14} color="#059669" />
                      <strong style={{ fontSize: '0.8125rem', color: '#059669' }}>Mess Dining</strong>
                    </div>
                    {req.food?.selected ? (
                      <div style={{ fontSize: '0.75rem', color: '#334155', lineHeight: 1.45 }}>
                        <div><strong>Meals:</strong> {req.food.mealsRequired?.join(', ') || 'Thali'}</div>
                        <div><strong>Diet:</strong> {req.food.dietaryPreference || 'Vegetarian'}</div>
                        <div style={{ marginTop: '4px' }}>
                          <span style={{ color: req.food.cateringStatus === 'arranged' ? '#059669' : '#D97706', fontWeight: 700 }}>
                            {req.food.cateringStatus === 'arranged' ? '✓ Mess Pass Issued' : '⏳ Pending Mess In-Charge'}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>Not requested</div>
                    )}
                  </div>

                  {/* Campus Shuttle */}
                  <div
                    style={{
                      border: req.transport?.selected ? '1px solid #BAE6FD' : '1px dashed #CBD5E1',
                      background: req.transport?.selected ? '#F0F9FF' : '#F8FAFC',
                      borderRadius: '6px',
                      padding: '10px 12px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                      <CarIcon size={14} color="#0284C7" />
                      <strong style={{ fontSize: '0.8125rem', color: '#0284C7' }}>Campus Transit</strong>
                    </div>
                    {req.transport?.selected ? (
                      <div style={{ fontSize: '0.75rem', color: '#334155', lineHeight: 1.45 }}>
                        <div><strong>Pickup:</strong> {req.transport.pickupLocation || 'Main Gate'}</div>
                        <div><strong>Arrival:</strong> {req.transport.pickupDateTime || 'Scheduled'}</div>
                        <div style={{ marginTop: '4px' }}>
                          <span style={{ color: req.transport.allocatedDriver ? '#059669' : '#D97706', fontWeight: 700 }}>
                            {req.transport.allocatedDriver ? `Driver: ${req.transport.allocatedDriver}` : '⏳ Pending Fleet Allocation'}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>Own conveyance</div>
                    )}
                  </div>
                </div>

                {/* Dean Remarks / Decision Status Box */}
                {(req.clearedBy || req.clearanceNotes) && (
                  <div
                    style={{
                      background: isApproved ? '#F0FDF4' : '#FEF2F2',
                      border: isApproved ? '1px solid #BBF7D0' : '1px solid #FECACA',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      color: isApproved ? '#166534' : '#991B1B',
                      marginBottom: '1rem',
                    }}
                  >
                    <strong>Dean Remarks:</strong> {req.clearanceNotes || 'Clearance recorded.'} (Reviewed by{' '}
                    {req.clearedBy || 'Super Admin'} on{' '}
                    {req.clearedAt ? new Date(req.clearedAt).toLocaleString() : 'Recent'})
                  </div>
                )}

                {/* Action Buttons Row */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '10px',
                    paddingTop: '0.75rem',
                    borderTop: '1px solid #F1F5F9',
                  }}
                >
                  <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                    {isPending && '⚠️ Awaiting Dean clearance decision before caretakers can allot rooms.'}
                    {isApproved && '✓ Cleared! Respective department caretakers can now allocate facilities.'}
                    {isRejected && '✕ Denied. Visitor notified by email.'}
                  </div>

                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {isPending ? (
                      <>
                        <button
                          type="button"
                          className="btn btn-sm btn-primary"
                          style={{ background: '#059669', borderColor: '#059669' }}
                          disabled={actionLoadingId === req._id}
                          onClick={() => handleApprove(req)}
                        >
                          <CheckIcon size={14} />
                          <span>{actionLoadingId === req._id ? 'Approving...' : '✓ Approve & Dispatch'}</span>
                        </button>

                        <button
                          type="button"
                          className="btn btn-sm btn-secondary"
                          style={{ color: '#DC2626', borderColor: '#FCA5A5' }}
                          disabled={actionLoadingId === req._id}
                          onClick={() => {
                            setRejectingItem(req);
                            setRejectReason('');
                          }}
                        >
                          <CloseIcon size={14} />
                          <span>Reject Request</span>
                        </button>
                      </>
                    ) : isRejected ? (
                      <button
                        type="button"
                        className="btn btn-sm btn-secondary"
                        onClick={() => handleApprove(req)}
                      >
                        <span>Re-evaluate & Approve</span>
                      </button>
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 600 }}>
                        ✓ Dispatched to Downstream Caretakers
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reject Confirmation Modal */}
      {rejectingItem && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '480px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#991B1B', margin: 0 }}>
                Reject Campus Visit Request
              </h3>
              <button
                type="button"
                className="btn-icon"
                onClick={() => setRejectingItem(null)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
              >
                <CloseIcon size={18} />
              </button>
            </div>

            <p style={{ fontSize: '0.875rem', color: '#475569', marginBottom: '1rem' }}>
              Are you sure you want to deny visit clearance for <strong>{rejectingItem.guestName}</strong> (#{rejectingItem.referenceCode})? An official rejection notification email will be dispatched.
            </p>

            <div style={{ marginBottom: '1.25rem' }}>
              <label className="label-ui" style={{ display: 'block', marginBottom: '4px' }}>
                Rejection Reason / Dean Remarks:
              </label>
              <textarea
                className="input-text"
                rows={3}
                placeholder="e.g. Host Department conference dates rescheduled or unverified invitation."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={() => setRejectingItem(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-sm btn-primary"
                style={{ background: '#DC2626', borderColor: '#DC2626' }}
                disabled={actionLoadingId === rejectingItem._id}
                onClick={handleReject}
              >
                {actionLoadingId === rejectingItem._id ? 'Rejecting...' : 'Confirm Rejection & Send Email'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Email Audit Log Drawer Modal */}
      {showEmailLogs && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '720px', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E2E8F0', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#1E3A8A', margin: 0 }}>
                  📧 System Email Dispatch Audit Log
                </h3>
                <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                  Real-time log of automated university notifications sent via Nodemailer
                </div>
              </div>
              <button
                type="button"
                className="btn-icon"
                onClick={() => setShowEmailLogs(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
              >
                <CloseIcon size={18} />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
              {loadingLogs ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#64748B' }}>
                  Loading email dispatch logs...
                </div>
              ) : emailLogs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#64748B' }}>
                  No emails have been dispatched yet in this runtime session.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {emailLogs.map((log) => (
                    <div
                      key={log.id}
                      style={{
                        background: '#F8FAFC',
                        border: '1px solid #E2E8F0',
                        borderRadius: '6px',
                        padding: '10px 14px',
                        fontSize: '0.8125rem',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span
                          style={{
                            background: log.logType.includes('APPROVED')
                              ? '#DCFCE7'
                              : log.logType.includes('REJECTED')
                              ? '#FEE2E2'
                              : '#EFF6FF',
                            color: log.logType.includes('APPROVED')
                              ? '#166534'
                              : log.logType.includes('REJECTED')
                              ? '#991B1B'
                              : '#1E3A8A',
                            fontSize: '0.6875rem',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '4px',
                          }}
                        >
                          {log.logType}
                        </span>
                        <span style={{ fontSize: '0.6875rem', color: '#94A3B8' }}>
                          {new Date(log.sentAt).toLocaleTimeString()} • {new Date(log.sentAt).toLocaleDateString()}
                        </span>
                      </div>

                      <div style={{ fontWeight: 600, color: '#0F172A', marginBottom: '2px' }}>
                        {log.subject}
                      </div>

                      <div style={{ fontSize: '0.75rem', color: '#475569', display: 'flex', justifyContent: 'space-between' }}>
                        <span>To: <strong>{log.to}</strong></span>
                        {log.referenceCode && <span>Ref: <code>{log.referenceCode}</code></span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={() => setShowEmailLogs(false)}
              >
                Close Audit Log
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
