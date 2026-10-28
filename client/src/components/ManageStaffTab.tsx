import React, { useState, useEffect } from 'react';
import type { User } from '../types';
import {
  ShieldIcon,
  SearchIcon,
  RefreshIcon,
  CloseIcon,
  CheckCircleIcon,
} from './Icons';

interface ManageStaffTabProps {
  token: string | null;
}

interface StaffStats {
  totalStaff: number;
  deptAdminsCount: number;
  regularStaffCount: number;
  departmentCount: number;
}

export const ManageStaffTab: React.FC<ManageStaffTabProps> = ({ token }) => {
  const [staffMembers, setStaffMembers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [stats, setStats] = useState<StaffStats>({
    totalStaff: 0,
    deptAdminsCount: 0,
    regularStaffCount: 0,
    departmentCount: 0,
  });
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'dept_admin' | 'staff'>('all');
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [feedback, setFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Promotion Modal State
  const [promotingStaff, setPromotingStaff] = useState<User | null>(null);
  const [promotionDept, setPromotionDept] = useState('');
  const [promotionDesignation, setPromotionDesignation] = useState('');
  const [savingPromotion, setSavingPromotion] = useState(false);

  // Demotion Modal State
  const [demotingStaff, setDemotingStaff] = useState<User | null>(null);
  const [savingDemotion, setSavingDemotion] = useState(false);

  useEffect(() => {
    if (token) {
      loadStaffData();
    }
  }, [token]);

  const loadStaffData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/staff', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setStaffMembers(data.staff);
        setDepartments(data.departments || []);
        if (data.stats) {
          setStats(data.stats);
        }
      } else {
        setFeedback({ text: data.message || 'Error loading staff records.', type: 'error' });
      }
    } catch (err: any) {
      setFeedback({ text: 'Error connecting to staff database: ' + err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPromote = (staff: User) => {
    setPromotingStaff(staff);
    let initialDept = staff.adminDepartment;
    if (!initialDept) {
      const d = (staff.department || '').toLowerCase();
      if (d.includes('transport') || d.includes('fleet')) {
        initialDept = 'Transport';
      } else if (d.includes('food') || d.includes('cater') || d.includes('dining') || d.includes('hospitality')) {
        initialDept = 'Food';
      } else {
        initialDept = 'Accommodation';
      }
    }
    setPromotionDept(initialDept);
    setPromotionDesignation(staff.designation || 'Department Administrator');
  };

  const handleConfirmPromote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promotingStaff) return;
    if (!promotionDept.trim()) {
      setFeedback({ text: 'Please specify the department to administer.', type: 'error' });
      return;
    }

    try {
      setSavingPromotion(true);
      const res = await fetch(`/api/admin/staff/${promotingStaff._id}/promote`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          adminDepartment: promotionDept.trim(),
          designation: promotionDesignation.trim(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        setFeedback({ text: data.message, type: 'success' });
        setPromotingStaff(null);
        loadStaffData();
      } else {
        setFeedback({ text: data.message || 'Promotion failed.', type: 'error' });
      }
    } catch (err: any) {
      setFeedback({ text: 'Promotion failed: ' + err.message, type: 'error' });
    } finally {
      setSavingPromotion(false);
    }
  };

  const handleConfirmDemote = async () => {
    if (!demotingStaff) return;
    try {
      setSavingDemotion(true);
      const res = await fetch(`/api/admin/staff/${demotingStaff._id}/demote`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (data.success) {
        setFeedback({ text: data.message, type: 'success' });
        setDemotingStaff(null);
        loadStaffData();
      } else {
        setFeedback({ text: data.message || 'Demotion failed.', type: 'error' });
      }
    } catch (err: any) {
      setFeedback({ text: 'Demotion failed: ' + err.message, type: 'error' });
    } finally {
      setSavingDemotion(false);
    }
  };

  // Filter staff list
  const filteredStaff = staffMembers.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.staffId && s.staffId.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (s.department && s.department.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (s.adminDepartment && s.adminDepartment.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (s.designation && s.designation.toLowerCase().includes(searchTerm.toLowerCase()));

    const isDeptAdmin = s.role === 'dept_admin' || s.isDeptAdmin;
    const matchesRole =
      roleFilter === 'all'
        ? true
        : roleFilter === 'dept_admin'
        ? isDeptAdmin
        : !isDeptAdmin;

    const matchesDept =
      selectedDept === 'all'
        ? true
        : (s.department && s.department.toLowerCase().includes(selectedDept.toLowerCase())) ||
          (s.adminDepartment && s.adminDepartment.toLowerCase().includes(selectedDept.toLowerCase()));

    return matchesSearch && matchesRole && matchesDept;
  });

  return (
    <div>
      {feedback && (
        <div className={`callout callout-${feedback.type}`} style={{ marginBottom: '1.25rem' }}>
          {feedback.text}
        </div>
      )}

      {/* Metric Cards Banner */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '12px',
          marginBottom: '1.5rem',
        }}
      >
        <div
          className="bento-card"
          style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}
        >
          <div className="label-ui" style={{ color: 'var(--text-muted)' }}>
            TOTAL REGISTERED STAFF
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {stats.totalStaff}
          </div>
          <div className="label-code-sm" style={{ color: 'var(--text-dim)' }}>
            University Verified Faculty & Staff
          </div>
        </div>

        <div
          className="bento-card"
          style={{
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            borderLeft: '3px solid var(--primary)',
          }}
        >
          <div className="label-ui" style={{ color: 'var(--primary)' }}>
            DEPARTMENT ADMINISTRATORS
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--primary)' }}>
            {stats.deptAdminsCount}
          </div>
          <div className="label-code-sm" style={{ color: 'var(--primary)' }}>
            Promoted with Governance Clearance
          </div>
        </div>

        <div
          className="bento-card"
          style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}
        >
          <div className="label-ui" style={{ color: 'var(--text-muted)' }}>
            STANDARD STAFF MEMBERS
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {stats.regularStaffCount}
          </div>
          <div className="label-code-sm" style={{ color: 'var(--text-dim)' }}>
            Eligible for Dept Admin Promotion
          </div>
        </div>

        <div
          className="bento-card"
          style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}
        >
          <div className="label-ui" style={{ color: 'var(--text-muted)' }}>
            FACILITY DEPARTMENTS
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {departments.length}
          </div>
          <div className="label-code-sm" style={{ color: 'var(--text-dim)' }}>
            Accommodation, Food & Transport
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bento-card" style={{ padding: 0 }}>
        {/* Table Filter HUD */}
        <div
          className="table-filter-hud"
          style={{
            padding: '12px 16px',
            borderBottom: '1px solid var(--border-structural)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
            background: 'var(--surface-hover)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="label-ui" style={{ color: 'var(--text-primary)' }}>
              Staff Records ({filteredStaff.length})
            </span>
            <span className="code-chip">
              {stats.deptAdminsCount} Dept Admin{stats.deptAdminsCount !== 1 ? 's' : ''} Active
            </span>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Search Input */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                type="text"
                className="text-input mono"
                placeholder="Search staff, dept, ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ height: '32px', width: '220px', fontSize: '0.75rem', paddingRight: '28px' }}
              />
              <span style={{ position: 'absolute', right: '8px', color: 'var(--text-dim)', pointerEvents: 'none' }}>
                <SearchIcon size={13} />
              </span>
            </div>

            {/* Role Filter */}
            <select
              className="text-input"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as any)}
              style={{ height: '32px', width: 'auto', fontSize: '0.75rem', padding: '0 8px' }}
            >
              <option value="all">All Roles</option>
              <option value="dept_admin">Dept Admins Only</option>
              <option value="staff">Standard Staff Only</option>
            </select>

            {/* Department Filter */}
            {departments.length > 0 && (
              <select
                className="text-input"
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                style={{ height: '32px', width: 'auto', maxWidth: '200px', fontSize: '0.75rem', padding: '0 8px' }}
              >
                <option value="all">All Departments</option>
                {departments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            )}

            <button
              type="button"
              className="btn btn-sm btn-secondary"
              onClick={loadStaffData}
              disabled={loading}
              title="Refresh staff records"
              style={{ height: '32px', padding: '0 10px' }}
            >
              <RefreshIcon size={13} />
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div className="data-table-container" style={{ border: 'none', borderRadius: 0 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Staff Member</th>
                <th>Staff ID</th>
                <th>Academic Department</th>
                <th>Administrative Clearance</th>
                <th>Official Designation</th>
                <th style={{ textAlign: 'right' }}>Governance Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                    Loading university staff personnel records...
                  </td>
                </tr>
              ) : filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    {searchTerm
                      ? `No staff members found matching "${searchTerm}".`
                      : 'No staff users registered in the system yet. Pre-verified staff can register with their university email.'}
                  </td>
                </tr>
              ) : (
                filteredStaff.map((member) => {
                  const isDeptAdmin = member.role === 'dept_admin' || member.isDeptAdmin;
                  const adminDept = member.adminDepartment || member.department || 'General Administration';

                  return (
                    <tr key={member._id}>
                      {/* Name & Email */}
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          {member.name}
                        </div>
                        <div className="label-code-sm" style={{ color: 'var(--text-muted)' }}>
                          {member.email}
                        </div>
                      </td>

                      {/* Staff ID */}
                      <td>
                        <span className="code-chip" style={{ fontWeight: 600 }}>
                          {member.staffId || 'PENDING'}
                        </span>
                      </td>

                      {/* Department */}
                      <td>
                        <div style={{ fontSize: '0.8125rem', color: 'var(--text-primary)' }}>
                          {member.department || 'General University'}
                        </div>
                      </td>

                      {/* Role & Admin Clearance */}
                      <td>
                        {isDeptAdmin ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            <span
                              className="badge-pill"
                              style={{
                                background: '#EDE9FE',
                                color: '#5B21B6',
                                width: 'fit-content',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontWeight: 700,
                              }}
                            >
                              <ShieldIcon size={11} />
                              <span>DEPT ADMIN</span>
                            </span>
                            <div className="label-code-sm" style={{ color: 'var(--primary)', fontWeight: 500 }}>
                              Oversight: {adminDept}
                            </div>
                          </div>
                        ) : (
                          <span
                            className="badge-pill badge-neutral"
                            style={{ width: 'fit-content', fontSize: '0.6875rem' }}
                          >
                            STANDARD STAFF
                          </span>
                        )}
                      </td>

                      {/* Designation */}
                      <td>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {member.designation || 'Staff Member'}
                        </div>
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                          {isDeptAdmin ? (
                            <>
                              <button
                                type="button"
                                className="btn btn-xs btn-secondary"
                                onClick={() => handleOpenPromote(member)}
                                title="Reassign administered department"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                              >
                                <ShieldIcon size={12} />
                                <span>Reassign Dept</span>
                              </button>
                              <button
                                type="button"
                                className="btn btn-xs btn-danger"
                                onClick={() => setDemotingStaff(member)}
                                title="Demote to standard staff"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                              >
                                <span>Demote</span>
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              className="btn btn-xs btn-primary"
                              onClick={() => handleOpenPromote(member)}
                              title="Promote to Department Administrator"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                            >
                              <ShieldIcon size={12} />
                              <span>Promote to Dept Admin</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* =========================================================================
          PROMOTION TO DEPT ADMIN MODAL
         ========================================================================= */}
      {promotingStaff && (
        <div className="modal-backdrop">
          <div className="modal-container" style={{ maxWidth: '560px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: 'var(--radius-base)',
                    background: 'var(--primary-wash)',
                    color: 'var(--primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <ShieldIcon size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {promotingStaff.isDeptAdmin || promotingStaff.role === 'dept_admin'
                      ? 'Reassign Department Administrator'
                      : 'Promote Staff to Dept Admin'}
                  </h3>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Grant administrative governance & departmental clearance authority
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="sidebar-close-btn"
                style={{ display: 'block' }}
                onClick={() => setPromotingStaff(null)}
                disabled={savingPromotion}
              >
                <CloseIcon size={18} />
              </button>
            </div>

            <form onSubmit={handleConfirmPromote}>
              <div className="modal-body">
                {/* Staff Member Info Summary Card */}
                <div
                  style={{
                    background: 'var(--surface-hover)',
                    border: '1px solid var(--border-structural)',
                    borderRadius: 'var(--radius-base)',
                    padding: '12px 14px',
                    marginBottom: '1.25rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--text-primary)' }}>
                      {promotingStaff.name}
                    </div>
                    <div className="label-code-sm" style={{ color: 'var(--text-muted)' }}>
                      {promotingStaff.email}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span className="code-chip">ID: {promotingStaff.staffId || 'N/A'}</span>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                      Current: {promotingStaff.department || 'General'}
                    </div>
                  </div>
                </div>

                {/* Form Fields */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {/* Department Assignment */}
                  <div>
                    <label className="label-ui" style={{ display: 'block', marginBottom: '6px' }}>
                      Administered Department *
                    </label>

                    <select
                      className="text-input"
                      required
                      value={promotionDept}
                      onChange={(e) => setPromotionDept(e.target.value)}
                    >
                      <option value="Accommodation">Accommodation</option>
                      <option value="Food">Food</option>
                      <option value="Transport">Transport</option>
                    </select>
                    <div className="label-code-sm" style={{ color: 'var(--text-muted)', marginTop: '4px' }}>
                      Designate which facility department (Accommodation, Food, or Transport) this user will administer.
                    </div>
                  </div>

                  {/* Administrative Title / Designation */}
                  <div>
                    <label className="label-ui" style={{ display: 'block', marginBottom: '6px' }}>
                      Administrative Designation / Title
                    </label>
                    <input
                      type="text"
                      className="text-input"
                      placeholder="e.g. Head of Department (HOD) / Dept Administrator"
                      value={promotionDesignation}
                      onChange={(e) => setPromotionDesignation(e.target.value)}
                    />
                  </div>

                  {/* Governance Privileges Callout */}
                  <div
                    style={{
                      background: 'var(--primary-wash)',
                      border: '1px solid rgba(79, 70, 229, 0.2)',
                      borderRadius: 'var(--radius-base)',
                      padding: '10px 14px',
                      fontSize: '0.75rem',
                      lineHeight: '1.5',
                      color: 'var(--text-primary)',
                    }}
                  >
                    <div style={{ fontWeight: 600, color: 'var(--primary)', marginBottom: '3px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <CheckCircleIcon size={13} />
                      <span>Privileges Granted with Dept Admin Clearance:</span>
                    </div>
                    <ul style={{ margin: 0, paddingLeft: '18px', color: 'var(--text-muted)' }}>
                      <li>Full visibility over staff roster within the assigned department</li>
                      <li>Authority to review and endorse departmental hospitality requests</li>
                      <li>Priority booking clearance for department academic guests & delegations</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-sm btn-secondary"
                  onClick={() => setPromotingStaff(null)}
                  disabled={savingPromotion}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-sm btn-primary"
                  disabled={savingPromotion}
                  style={{ minWidth: '170px' }}
                >
                  {savingPromotion ? 'Processing...' : 'Confirm Promotion to Dept Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          CONFIRM DEMOTION MODAL
         ========================================================================= */}
      {demotingStaff && (
        <div className="modal-backdrop">
          <div className="modal-container" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: 'var(--radius-base)',
                    background: '#FEE2E2',
                    color: 'var(--error-text)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <ShieldIcon size={16} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--error-text)' }}>
                    Revoke Dept Admin Clearance
                  </h3>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Revert user back to standard staff privileges
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="sidebar-close-btn"
                style={{ display: 'block' }}
                onClick={() => setDemotingStaff(null)}
                disabled={savingDemotion}
              >
                <CloseIcon size={18} />
              </button>
            </div>

            <div className="modal-body">
              <p className="body-sm" style={{ marginBottom: '14px', color: 'var(--text-primary)' }}>
                Are you sure you want to demote <strong>"{demotingStaff.name}"</strong>?
              </p>
              <div
                style={{
                  background: 'var(--surface-hover)',
                  border: '1px solid var(--border-structural)',
                  borderRadius: 'var(--radius-base)',
                  padding: '10px 14px',
                  fontSize: '0.75rem',
                  lineHeight: '1.5',
                }}
              >
                <div><strong>Current Admin Department:</strong> {demotingStaff.adminDepartment || demotingStaff.department}</div>
                <div><strong>Staff ID:</strong> <span className="mono">{demotingStaff.staffId || 'N/A'}</span></div>
                <div style={{ marginTop: '6px', color: 'var(--error-text)' }}>
                  This will revoke all Department Administrator clearances and privileges. The user will remain an active standard staff member.
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={() => setDemotingStaff(null)}
                disabled={savingDemotion}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-sm btn-danger"
                onClick={handleConfirmDemote}
                disabled={savingDemotion}
                style={{ minWidth: '140px' }}
              >
                {savingDemotion ? 'Demoting...' : 'Confirm Demotion'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
