import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import type { User, GuestRequestItem } from '../types';
import {
  BedIcon,
  UtensilsIcon,
  CarIcon,
  RefreshIcon,
  FileSpreadsheetIcon,
  ArrowLeftIcon,
  CheckIcon,
} from '../components/Icons';

interface DepartmentAdminPortalProps {
  currentUser: User | null;
  token: string | null;
  onLogout: () => void;
}

export type DepartmentKey = 'accommodation' | 'catering' | 'transport';

interface DepartmentMeta {
  key: DepartmentKey;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  themeColor: string;
  themeBg: string;
  badgeLabel: string;
}

const DEPARTMENTS: Record<DepartmentKey, DepartmentMeta> = {
  accommodation: {
    key: 'accommodation',
    title: 'Hostel & Transit Room Allotment Desk',
    subtitle: 'Faculty transit quarters, hostel guest wing allocations & stay approvals',
    icon: <BedIcon size={20} color="#1E3A8A" />,
    themeColor: '#1E3A8A',
    themeBg: '#EFF6FF',
    badgeLabel: 'HOSTEL & HOUSING DESK',
  },
  catering: {
    key: 'catering',
    title: 'Campus Mess & Canteen Meal Desk',
    subtitle: 'Hostel mess passes, dietary thali arrangements & dining coupons',
    icon: <UtensilsIcon size={20} color="#059669" />,
    themeColor: '#059669',
    themeBg: '#ECFDF5',
    badgeLabel: 'CAMPUS MESS DESK',
  },
  transport: {
    key: 'transport',
    title: 'Campus Shuttle & Gate Pickup Desk',
    subtitle: 'University gate-to-department shuttles & station arrival pool',
    icon: <CarIcon size={20} color="#2563EB" />,
    themeColor: '#2563EB',
    themeBg: '#EFF6FF',
    badgeLabel: 'CAMPUS TRANSPORT DESK',
  },
};

export const DepartmentAdminPortal: React.FC<DepartmentAdminPortalProps> = ({
  currentUser,
  token,
  onLogout,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { dept } = useParams<{ dept?: string }>();

  const isSuperAdmin =
    currentUser?.role === 'superadmin' ||
    currentUser?.id === '10001' ||
    currentUser?.isSuperAdmin === true;

  // Determine current active desk
  const resolveDeptKey = (): DepartmentKey => {
    // If not super admin, lock strictly to the user's assigned department
    if (!isSuperAdmin && currentUser) {
      const userDept = (currentUser.adminDepartment || currentUser.department || '').toLowerCase();
      if (userDept.includes('cater') || userDept.includes('food') || userDept.includes('dining') || userDept.includes('mess')) return 'catering';
      if (userDept.includes('transport') || userDept.includes('shuttle')) return 'transport';
      return 'accommodation';
    }

    const raw = (dept || location.pathname.split('/').pop() || '').toLowerCase();
    if (raw === 'catering' || raw === 'food' || raw === 'dining') return 'catering';
    if (raw === 'transport' || raw === 'shuttle') return 'transport';
    return 'accommodation';
  };

  const activeDeptKey = resolveDeptKey();
  const activeMeta = DEPARTMENTS[activeDeptKey];

  // Requests state
  const [requests, setRequests] = useState<GuestRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Filters
  const [statusTab, setStatusTab] = useState<'pending' | 'allocated' | 'all'>('pending');
  const [searchTerm, setSearchTerm] = useState('');

  // Inline allocation state for cards: { [requestId]: { room: string, notes: string, status: string } }
  const [inlineAllotments, setInlineAllotments] = useState<Record<string, { room: string; notes: string; status: string }>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  // Auto redirect staff if they try to access a department desk outside their jurisdiction
  useEffect(() => {
    if (!isSuperAdmin && currentUser) {
      const myDept = resolveDeptKey();
      const raw = (dept || location.pathname.split('/').pop() || '').toLowerCase();
      const norm = raw === 'food' || raw === 'dining' ? 'catering' : raw;
      if (norm && norm !== myDept) {
        navigate(`/dept-admin/${myDept}`, { replace: true });
      }
    }
  }, [dept, isSuperAdmin, currentUser]);

  useEffect(() => {
    if (token) {
      loadDepartmentData();
    }
  }, [activeDeptKey, token]);

  const loadDepartmentData = async () => {
    try {
      setLoading(true);
      setFeedback(null);

      let reqRes = await fetch(`/api/dept-admin/${activeDeptKey}/requests`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if ((reqRes.status === 404 || reqRes.status === 403) && isSuperAdmin) {
        reqRes = await fetch(`/api/admin/departments/requests?department=${activeDeptKey === 'catering' ? 'food' : activeDeptKey}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      const reqData = await reqRes.json();
      if (reqData.success && Array.isArray(reqData.requests)) {
        setRequests(reqData.requests);
        // Initialize inline allotment state for all loaded requests
        const initialMap: Record<string, { room: string; notes: string; status: string }> = {};
        reqData.requests.forEach((r: GuestRequestItem) => {
          initialMap[r._id] = {
            room: r.accommodation?.allocatedRoom || '',
            notes: r.accommodation?.adminNotes || r.food?.adminNotes || '',
            status: r.accommodation?.status || 'pending',
          };
        });
        setInlineAllotments(initialMap);
      } else {
        setFeedback({ text: reqData.message || 'Error loading requests', type: 'error' });
      }
    } catch (err: any) {
      setFeedback({ text: 'Error connecting to department service: ' + err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAllocation = async (requestId: string, overrideStatus?: string) => {
    try {
      setSavingId(requestId);
      const reqItem = requests.find((r) => r._id === requestId);
      if (!reqItem) return;

      const currentForm = inlineAllotments[requestId] || { room: '', notes: '', status: 'allocated' };
      const newStatus = overrideStatus || currentForm.status || 'allocated';

      let assignmentData: any = {};
      if (activeDeptKey === 'accommodation') {
        assignmentData = {
          allocatedRoom: currentForm.room || 'Room 101',
          status: newStatus,
          adminNotes: currentForm.notes,
        };
      } else if (activeDeptKey === 'catering') {
        assignmentData = {
          cateringStatus: newStatus === 'pending' ? 'pending' : 'arranged',
          adminNotes: currentForm.notes,
        };
      } else if (activeDeptKey === 'transport') {
        assignmentData = {
          allocatedVehicle: 'Campus Shuttle',
          status: newStatus === 'pending' ? 'pending' : 'assigned',
          adminNotes: currentForm.notes,
        };
      }

      let res = await fetch(`/api/dept-admin/${activeDeptKey}/requests/${requestId}/assign`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ assignmentData }),
      });

      if (!res.ok) {
        // Fallback to admin department route
        res = await fetch(`/api/admin/departments/requests/${requestId}/assign`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            department: activeDeptKey === 'catering' ? 'food' : activeDeptKey,
            assignmentData,
          }),
        });
      }

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to update record.');
      }

      setFeedback({
        text: `Updated stay status for ${reqItem.guestName} (${reqItem.referenceCode}) successfully!`,
        type: 'success',
      });
      loadDepartmentData();
    } catch (err: any) {
      setFeedback({ text: err.message || 'Error updating status.', type: 'error' });
    } finally {
      setSavingId(null);
    }
  };

  // Filter requests based on status tab and search
  const filteredRequests = requests.filter((r) => {
    let currentStatus = 'pending';
    if (activeDeptKey === 'accommodation') {
      currentStatus = r.accommodation?.status || 'pending';
    } else if (activeDeptKey === 'catering') {
      currentStatus = r.food?.cateringStatus === 'arranged' ? 'allocated' : (r.food?.cateringStatus || 'pending');
    } else if (activeDeptKey === 'transport') {
      currentStatus = r.transport?.status === 'assigned' ? 'allocated' : (r.transport?.status || 'pending');
    }

    if (statusTab === 'pending' && currentStatus !== 'pending') return false;
    if (statusTab === 'allocated' && currentStatus !== 'allocated' && currentStatus !== 'completed') return false;

    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      r.guestName.toLowerCase().includes(q) ||
      (r.referenceCode || '').toLowerCase().includes(q) ||
      (r.institution || '').toLowerCase().includes(q) ||
      (r.purposeOfVisit || '').toLowerCase().includes(q) ||
      (r.guestEmail || '').toLowerCase().includes(q)
    );
  });

  const pendingCount = requests.filter((r) => {
    if (activeDeptKey === 'accommodation') return (r.accommodation?.status || 'pending') === 'pending';
    if (activeDeptKey === 'catering') return (r.food?.cateringStatus || 'pending') === 'pending';
    return (r.transport?.status || 'pending') === 'pending';
  }).length;

  const allocatedCount = requests.filter((r) => {
    if (activeDeptKey === 'accommodation') return r.accommodation?.status === 'allocated' || r.accommodation?.status === 'completed';
    if (activeDeptKey === 'catering') return r.food?.cateringStatus === 'arranged' || r.food?.cateringStatus === 'completed';
    return r.transport?.status === 'assigned' || r.transport?.status === 'completed';
  }).length;

  const handleExportCSV = () => {
    const headers = [
      'Ref Code',
      'Guest Name',
      'Email',
      'Phone',
      'Visitor Category',
      'Host Dept / Purpose',
      'Check-In',
      'Check-Out',
      'Room Type',
      'Allotted Room / Details',
      'Status',
    ];

    const rows = filteredRequests.map((r) => [
      `"${r.referenceCode}"`,
      `"${r.guestName}"`,
      `"${r.guestEmail}"`,
      `"${r.guestPhone || ''}"`,
      `"${r.designation || 'Visitor'}"`,
      `"${(r.purposeOfVisit || '').replace(/"/g, '""')}"`,
      `"${r.accommodation?.checkInDate || ''}"`,
      `"${r.accommodation?.checkOutDate || ''}"`,
      `"${r.accommodation?.roomType || 'Standard'}"`,
      `"${r.accommodation?.allocatedRoom || 'Unassigned'}"`,
      `"${r.accommodation?.status || 'pending'}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${activeDeptKey}_applications_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ background: 'var(--canvas)', minHeight: '100vh', padding: '1.5rem 1rem' }}>
      <div style={{ maxWidth: '1180px', margin: '0 auto' }}>
        {/* Top Header Card */}
        <div className="uni-card" style={{ marginBottom: '1.25rem', padding: '1.25rem 1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '8px',
                  background: activeMeta.themeBg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: `1px solid ${activeMeta.themeColor}33`,
                }}
              >
                {activeMeta.icon}
              </div>
              <div>
                <span className="uni-room-tag" style={{ background: activeMeta.themeBg, color: activeMeta.themeColor }}>
                  {activeMeta.badgeLabel}
                </span>
                <h1 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#0F172A', margin: '2px 0 0' }}>
                  {activeMeta.title}
                </h1>
                <p style={{ fontSize: '0.8125rem', color: '#64748B', margin: 0 }}>
                  {activeMeta.subtitle}
                </p>
              </div>
            </div>

            {/* Operator Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={() => navigate('/')}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <ArrowLeftIcon size={14} />
                <span>Return to Portal</span>
              </button>

              {isSuperAdmin && (
                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  onClick={() => navigate('/super-admin')}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <span>Super Admin Hub</span>
                </button>
              )}

              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={loadDepartmentData}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <RefreshIcon size={14} />
                <span>Refresh</span>
              </button>

              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={onLogout}
              >
                Sign Out
              </button>
            </div>
          </div>

          {/* Department Switcher Tabs */}
          <div
            style={{
              marginTop: '1.25rem',
              paddingTop: '0.875rem',
              borderTop: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            {isSuperAdmin ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
                  Super Admin Desk Switcher:
                </span>
                <button
                  type="button"
                  className={`btn btn-sm ${activeDeptKey === 'accommodation' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => navigate('/dept-admin/accommodation')}
                >
                  <BedIcon size={13} />
                  <span>Hostel & Rooms</span>
                </button>

                <button
                  type="button"
                  className={`btn btn-sm ${activeDeptKey === 'catering' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => navigate('/dept-admin/catering')}
                >
                  <UtensilsIcon size={13} />
                  <span>Mess & Dining</span>
                </button>

                <button
                  type="button"
                  className={`btn btn-sm ${activeDeptKey === 'transport' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => navigate('/dept-admin/transport')}
                >
                  <CarIcon size={13} />
                  <span>Campus Shuttle</span>
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.75rem', color: '#64748B' }}>Assigned Department Desk:</span>
                <strong style={{ fontSize: '0.8125rem', color: '#1E3A8A' }}>{activeMeta.title}</strong>
              </div>
            )}

            <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
              Logged in: <strong>{currentUser?.name || 'Staff Member'}</strong> ({currentUser?.email})
            </div>
          </div>
        </div>

        {/* Feedback message */}
        {feedback && (
          <div
            style={{
              padding: '12px 16px',
              borderRadius: '6px',
              background: feedback.type === 'error' ? '#FEF2F2' : '#ECFDF5',
              color: feedback.type === 'error' ? '#991B1B' : '#065F46',
              border: `1px solid ${feedback.type === 'error' ? '#FECACA' : '#A7F3D0'}`,
              marginBottom: '1rem',
              fontSize: '0.875rem',
            }}
          >
            {feedback.text}
          </div>
        )}

        {/* Control Bar: Status Tabs & Search */}
        <div className="uni-card" style={{ marginBottom: '1.25rem', padding: '10px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className={`uni-tab-btn ${statusTab === 'pending' ? 'active' : ''}`}
                onClick={() => setStatusTab('pending')}
                style={{ padding: '6px 14px', fontSize: '0.8125rem' }}
              >
                <span>🟡 Pending Action ({pendingCount})</span>
              </button>

              <button
                type="button"
                className={`uni-tab-btn ${statusTab === 'allocated' ? 'active' : ''}`}
                onClick={() => setStatusTab('allocated')}
                style={{ padding: '6px 14px', fontSize: '0.8125rem' }}
              >
                <span>🟢 Allotted & Active ({allocatedCount})</span>
              </button>

              <button
                type="button"
                className={`uni-tab-btn ${statusTab === 'all' ? 'active' : ''}`}
                onClick={() => setStatusTab('all')}
                style={{ padding: '6px 14px', fontSize: '0.8125rem' }}
              >
                <span>All Applications ({requests.length})</span>
              </button>
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type="text"
                className="input-text"
                placeholder="Search guest, code, department..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ height: '34px', width: '240px', fontSize: '0.8125rem' }}
              />

              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={handleExportCSV}
                title="Export applications as CSV"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <FileSpreadsheetIcon size={14} />
                <span>Export</span>
              </button>
            </div>
          </div>
        </div>

        {/* Request List */}
        {loading ? (
          <div className="uni-card" style={{ padding: '3rem', textAlign: 'center', color: '#64748B' }}>
            <RefreshIcon size={24} />
            <div style={{ marginTop: '8px', fontSize: '0.875rem' }}>Loading campus requests...</div>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="uni-card" style={{ padding: '3rem', textAlign: 'center', color: '#64748B' }}>
            <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#0F172A', marginBottom: '4px' }}>
              No requests found in this view
            </div>
            <p style={{ fontSize: '0.8125rem', margin: 0 }}>
              {statusTab === 'pending'
                ? 'All incoming requests for this desk have been processed! Great job.'
                : 'Try clearing your search query or switching tabs.'}
            </p>
          </div>
        ) : (
          <div>
            {filteredRequests.map((r) => {
              const currentInline = inlineAllotments[r._id] || { room: '', notes: '', status: 'pending' };
              const isAllocated =
                activeDeptKey === 'accommodation'
                  ? r.accommodation?.status === 'allocated' || r.accommodation?.status === 'completed'
                  : activeDeptKey === 'catering'
                  ? r.food?.cateringStatus === 'arranged'
                  : r.transport?.status === 'assigned';

              return (
                <div key={r._id} className="dept-request-card">
                  {/* Top Bar of Request */}
                  <div className="dept-request-top">
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '1rem', fontWeight: 700, color: '#0F172A' }}>
                          {r.guestName}
                        </span>
                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            padding: '2px 8px',
                            borderRadius: '4px',
                            background: '#EFF6FF',
                            color: '#1E3A8A',
                          }}
                        >
                          {r.designation || 'Academic Visitor'}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: '#64748B' }}>
                          • Ref: <strong style={{ color: '#1E3A8A' }}>{r.referenceCode}</strong>
                        </span>
                      </div>
                      <div style={{ fontSize: '0.8125rem', color: '#475569', marginTop: '2px' }}>
                        {r.institution ? `${r.institution} • ` : ''}
                        Email: {r.guestEmail} • Phone: {r.guestPhone || 'N/A'}
                      </div>
                    </div>

                    <div>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '4px 10px',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          background: isAllocated ? '#ECFDF5' : '#FEF3C7',
                          color: isAllocated ? '#065F46' : '#92400E',
                        }}
                      >
                        {isAllocated ? '✓ Allotted & Approved' : '🟡 Awaiting Room Allotment'}
                      </span>
                    </div>
                  </div>

                  {/* Purpose & Schedule Meta */}
                  <div className="dept-request-meta-grid">
                    <div>
                      <div style={{ fontSize: '0.6875rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 600 }}>
                        Host Dept & Purpose
                      </div>
                      <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#0F172A', marginTop: '2px' }}>
                        {r.purposeOfVisit || 'Academic Consultation'}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '0.6875rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 600 }}>
                        Stay Schedule
                      </div>
                      <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#0F172A', marginTop: '2px' }}>
                        {r.accommodation?.checkInDate || 'TBD'} to {r.accommodation?.checkOutDate || 'TBD'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                        {r.accommodation?.guestsCount || 1} Guest(s)
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '0.6875rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 600 }}>
                        Requested Facilities
                      </div>
                      <div style={{ fontSize: '0.8125rem', color: '#0F172A', marginTop: '2px' }}>
                        🛏️ {r.accommodation?.roomType || 'Faculty Transit Room'}
                      </div>
                      {r.food?.selected && (
                        <div style={{ fontSize: '0.75rem', color: '#059669', marginTop: '2px' }}>
                          🍽️ Mess Food ({(r.food.mealsRequired || []).join(', ')})
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Inline Caretaker Allocation Controls */}
                  <div className="dept-quick-actions">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', flex: 1 }}>
                      {activeDeptKey === 'accommodation' ? (
                        <>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#0F172A', whiteSpace: 'nowrap' }}>
                              Allot Room:
                            </label>
                            <input
                              type="text"
                              className="input-text"
                              placeholder="e.g. Hostel-3 Room 104 / Transit Block A Room 2"
                              value={currentInline.room}
                              onChange={(e) =>
                                setInlineAllotments({
                                  ...inlineAllotments,
                                  [r._id]: { ...currentInline, room: e.target.value },
                                })
                              }
                              style={{ width: '260px', height: '32px', fontSize: '0.8125rem' }}
                            />
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <label style={{ fontSize: '0.75rem', color: '#64748B', whiteSpace: 'nowrap' }}>
                              Caretaker Note:
                            </label>
                            <input
                              type="text"
                              className="input-text"
                              placeholder="Key issued / ground floor"
                              value={currentInline.notes}
                              onChange={(e) =>
                                setInlineAllotments({
                                  ...inlineAllotments,
                                  [r._id]: { ...currentInline, notes: e.target.value },
                                })
                              }
                              style={{ width: '180px', height: '32px', fontSize: '0.8125rem' }}
                            />
                          </div>
                        </>
                      ) : activeDeptKey === 'catering' ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '0.8125rem', color: '#059669', fontWeight: 600 }}>
                            Mess Slip: {r.food?.dietaryPreference || 'Hostel Mess Thali'}
                          </span>
                          <input
                            type="text"
                            className="input-text"
                            placeholder="Mess Token / Coupon No."
                            value={currentInline.notes}
                            onChange={(e) =>
                              setInlineAllotments({
                                ...inlineAllotments,
                                [r._id]: { ...currentInline, notes: e.target.value },
                              })
                            }
                            style={{ width: '220px', height: '32px', fontSize: '0.8125rem' }}
                          />
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '0.8125rem', color: '#1E3A8A', fontWeight: 600 }}>
                            Pickup: {r.transport?.pickupLocation || 'University Main Gate'} ({r.transport?.pickupDateTime || 'TBD'})
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        disabled={savingId === r._id}
                        onClick={() => handleUpdateAllocation(r._id, 'allocated')}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                      >
                        <CheckIcon size={13} />
                        <span>{savingId === r._id ? 'Saving...' : isAllocated ? 'Update Allotment' : 'Approve & Allot Room'}</span>
                      </button>

                      {isAllocated && (
                        <button
                          type="button"
                          className="btn btn-sm btn-secondary"
                          disabled={savingId === r._id}
                          onClick={() => handleUpdateAllocation(r._id, 'completed')}
                        >
                          Mark Check-Out
                        </button>
                      )}

                      {!isAllocated && (
                        <button
                          type="button"
                          className="btn btn-sm btn-secondary"
                          disabled={savingId === r._id}
                          onClick={() => handleUpdateAllocation(r._id, 'cancelled')}
                          style={{ color: '#991B1B' }}
                        >
                          Decline
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
