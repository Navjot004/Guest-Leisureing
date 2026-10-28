import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import type { User } from '../types';
import {
  RefreshIcon,
  UsersIcon,
  BriefcaseIcon,
  SearchIcon,
  FileSpreadsheetIcon,
  ArrowLeftIcon,
  EditIcon,
  TrashIcon,
  CloseIcon,
} from '../components/Icons';
import { VerifiedStaffTab } from '../components/VerifiedStaffTab';
import { ManageStaffTab } from '../components/ManageStaffTab';
import { DepartmentsSection } from '../components/DepartmentsSection';

interface SuperAdminPageProps {
  currentUser: User | null;
  token: string | null;
  onNavigateToLogin: () => void;
  onLogout: () => void;
}

export const SuperAdminPage: React.FC<SuperAdminPageProps> = ({
  currentUser,
  token,
  onNavigateToLogin,
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Synchronize view state explicitly with the URL:
  // - /super-admin/departments -> Departments Section (Blank Page Canvas)
  // - /super-admin/manage-staff -> Manage Staff & Promote Dept Admins
  // - /super-admin/verified-staff -> Verified Staff Roster
  // - /super-admin/guests -> Guest Users
  // - /super-admin or /super-admin/staff -> Staff Users
  const isViewingDepartments = location.pathname.includes('/departments');
  const isViewingManageStaff = location.pathname.includes('/manage-staff');
  const isViewingVerifiedRoster = location.pathname.includes('/verified-staff');
  const activeTab: 'staff' | 'guest' = location.pathname.includes('/guests') ? 'guest' : 'staff';

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [feedback, setFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Edit User Modal State
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'staff' as 'staff' | 'guest' | 'vip' | 'dept_admin',
    status: 'active' as 'active' | 'suspended',
    staffId: '',
    department: '',
    designation: '',
    adminDepartment: '',
    password: '',
  });
  const [savingEdit, setSavingEdit] = useState(false);

  // Delete User Confirmation Modal State
  const [userToDelete, setUserToDelete] = useState<{ id: string; name: string; email: string } | null>(null);
  const [deletingUser, setDeletingUser] = useState(false);

  const isSuperAdmin = currentUser?.role === 'superadmin' && (currentUser?.id === '10001' || currentUser?._id === '10001');

  useEffect(() => {
    if (isSuperAdmin && token) {
      loadData();
    }
  }, [isSuperAdmin, token]);

  const loadData = async () => {
    try {
      setLoading(true);
      setFeedback(null);

      if (!token) {
        throw new Error('Authentication token missing. Please sign in again as Super Administrator.');
      }

      const usersRes = await fetch('/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!usersRes.ok) {
        let errorMsg = `Server error (${usersRes.status})`;
        try {
          const errData = await usersRes.json();
          if (errData && errData.message) {
            errorMsg = errData.message;
          }
        } catch (_) {
          if (usersRes.status === 502) {
            errorMsg = 'Backend server is temporarily reconnecting. Please click Refresh.';
          } else if (usersRes.status === 401 || usersRes.status === 403) {
            errorMsg = 'Session expired or unauthorized. Please sign in again as Super Administrator.';
          }
        }
        throw new Error(errorMsg);
      }

      const usersData = await usersRes.json();
      if (usersData.success) {
        setUsers(usersData.users);
      }
    } catch (err: any) {
      setFeedback({ text: 'Error retrieving records: ' + err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEdit = (user: User) => {
    setEditingUser(user);
    setEditFormData({
      name: user.name || '',
      email: user.email || '',
      phone: user.phone || '',
      role: (user.role === 'dept_admin' ? 'dept_admin' : user.role === 'staff' ? 'staff' : user.role === 'vip' ? 'vip' : 'guest'),
      status: user.status || 'active',
      staffId: user.staffId || '',
      department: user.department || '',
      designation: user.designation || '',
      adminDepartment: user.adminDepartment || '',
      password: '',
    });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      setSavingEdit(true);
      const res = await fetch(`/api/admin/users/${editingUser._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(editFormData),
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({ text: data.message || `User "${editFormData.name}" updated successfully.`, type: 'success' });
        setEditingUser(null);
        loadData();
      } else {
        setFeedback({ text: data.message || 'Failed to update user profile.', type: 'error' });
      }
    } catch (err: any) {
      setFeedback({ text: 'Update failed: ' + err.message, type: 'error' });
    } finally {
      setSavingEdit(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    try {
      setDeletingUser(true);
      const res = await fetch(`/api/admin/users/${userToDelete.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({ text: data.message || `User "${userToDelete.name}" deleted successfully.`, type: 'success' });
        setUserToDelete(null);
        loadData();
      } else {
        setFeedback({ text: data.message || 'Delete failed.', type: 'error' });
      }
    } catch (err: any) {
      setFeedback({ text: 'Delete failed: ' + err.message, type: 'error' });
    } finally {
      setDeletingUser(false);
    }
  };

  const handleToggleStatus = async (userId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'active' ? 'suspended' : 'active';
    try {
      const res = await fetch(`/api/admin/users/${userId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({ text: `Status updated to ${nextStatus}`, type: 'success' });
        loadData();
      } else {
        setFeedback({ text: data.message, type: 'error' });
      }
    } catch (err: any) {
      setFeedback({ text: err.message, type: 'error' });
    }
  };

  const handleUpdateRole = async (userId: string, role: string) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role }),
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({ text: `Role updated to ${role.toUpperCase()}`, type: 'success' });
        loadData();
      }
    } catch (err: any) {
      setFeedback({ text: err.message, type: 'error' });
    }
  };

  // Two User Lists Partition: Staff Users & Guest Users
  const staffUsers = users.filter((u) => u.role === 'staff' || u.role === 'dept_admin');
  const guestUsers = users.filter((u) => u.role === 'guest' || u.role === 'vip');

  const currentList = activeTab === 'staff' ? staffUsers : guestUsers;

  const filteredUsers = currentList.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u._id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || u.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (!isSuperAdmin) {
    return (
      <div className="canvas-wrapper">
        <div className="auth-container-card" style={{ textAlign: 'center' }}>
          <h1 className="headline-sm" style={{ marginBottom: '12px' }}>
            Super Admin Login Required
          </h1>
          <p className="body-sm" style={{ marginBottom: '20px' }}>
            Please authenticate using ID <code>10001</code> and password <code>Master@2026</code>.
          </p>
          <button className="btn btn-md btn-primary btn-full" onClick={onNavigateToLogin}>
            Go to Login &rarr;
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="canvas-wrapper">
      {/* Top Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.25rem',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <h1 className="headline-lg">
            {isViewingDepartments
              ? 'Departments'
              : isViewingManageStaff
              ? 'Manage Staff'
              : isViewingVerifiedRoster
              ? 'Verified Staff List'
              : 'Users Management'}
          </h1>
          <p className="body-sm">
            {isViewingDepartments
              ? 'Academic faculties, divisions, and departmental governance workspace'
              : isViewingManageStaff
              ? 'Promote university staff to Department Administrators, assign departmental governance, and manage operational privileges'
              : isViewingVerifiedRoster
              ? 'Upload and manage pre-authorized faculty and staff roster (Excel / CSV)'
              : 'MongoDB Atlas user records partitioned into Staff Users and Guest Users'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          {(isViewingManageStaff || isViewingDepartments) && (
            <button
              type="button"
              className="btn btn-sm btn-secondary"
              onClick={() => navigate('/super-admin')}
              title="Return to Users"
            >
              <ArrowLeftIcon size={14} />
              <span>Back to Users</span>
            </button>
          )}

          {/* IN STAFF USERS: TOGGLE BETWEEN VERIFIED STAFF LIST BUTTON AND BACK BUTTON */}
          {!isViewingManageStaff && !isViewingDepartments && activeTab === 'staff' && (
            isViewingVerifiedRoster ? (
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={() => navigate('/super-admin')}
                title="Return to Staff Users"
              >
                <ArrowLeftIcon size={14} />
                <span>Back to Staff Users</span>
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={() => navigate('/super-admin/verified-staff')}
                title="Manage University Verified Staff Roster & Excel Upload"
              >
                <FileSpreadsheetIcon size={14} />
                <span>Verified Staff List</span>
              </button>
            )
          )}

          <button className="btn btn-sm btn-secondary" onClick={loadData}>
            <RefreshIcon size={14} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div className={`callout callout-${feedback.type}`}>
          {feedback.text}
        </div>
      )}

      {/* Two Tabs: Staff Users & Guest Users (ONLY VISIBLE WHEN NOT IN VERIFIED STAFF, MANAGE STAFF, OR DEPARTMENTS VIEW) */}
      {!isViewingVerifiedRoster && !isViewingManageStaff && !isViewingDepartments && (
        <div
          className="segmented-track"
          style={{
            width: 'fit-content',
            minWidth: '320px',
            maxWidth: '100%',
            marginBottom: '1.25rem',
          }}
        >
          {/* Tab 1: Staff Users */}
          <button
            type="button"
            className={`segmented-segment ${activeTab === 'staff' ? 'active' : ''}`}
            onClick={() => {
              navigate('/super-admin');
              setSearchTerm('');
            }}
          >
            <BriefcaseIcon size={14} />
            <span>Staff Users ({staffUsers.length})</span>
          </button>

          {/* Tab 2: Guest Users */}
          <button
            type="button"
            className={`segmented-segment ${activeTab === 'guest' ? 'active' : ''}`}
            onClick={() => {
              navigate('/super-admin/guests');
              setSearchTerm('');
            }}
          >
            <UsersIcon size={14} />
            <span>Guest Users ({guestUsers.length})</span>
          </button>
        </div>
      )}

      {/* VIEW CONTENT */}
      {isViewingDepartments ? (
        <DepartmentsSection token={token} />
      ) : isViewingManageStaff ? (
        <ManageStaffTab token={token} />
      ) : isViewingVerifiedRoster ? (
        <VerifiedStaffTab token={token} />
      ) : (
        /* Main Registered Users Data Table Card */
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
                {activeTab === 'staff' ? 'Staff Users' : 'Guest Users'} ({filteredUsers.length} Records)
              </span>

              {/* Quick Roster Link Button in Staff Users HUD */}
              {activeTab === 'staff' && (
                <button
                  type="button"
                  className="btn btn-xs btn-secondary"
                  onClick={() => navigate('/super-admin/verified-staff')}
                  style={{ fontSize: '0.6875rem' }}
                >
                  <FileSpreadsheetIcon size={12} />
                  <span>Open Verified Staff List</span>
                </button>
              )}
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  type="text"
                  className="text-input mono"
                  placeholder={`Search ${activeTab === 'staff' ? 'staff' : 'guests'}...`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ height: '32px', width: '220px', fontSize: '0.75rem', paddingRight: '28px' }}
                />
                <span style={{ position: 'absolute', right: '8px', color: 'var(--text-dim)', pointerEvents: 'none' }}>
                  <SearchIcon size={13} />
                </span>
              </div>

              <select
                className="text-input"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ height: '32px', width: 'auto', fontSize: '0.75rem', padding: '0 8px' }}
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
          </div>

          {/* Data Table */}
          <div className="data-table-container" style={{ border: 'none', borderRadius: 0 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Applicant Name</th>
                  <th>Database ID & Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Timestamp</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                      Loading records from MongoDB Atlas...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                      {searchTerm
                        ? `No ${activeTab === 'staff' ? 'staff' : 'guests'} match "${searchTerm}".`
                        : activeTab === 'staff'
                        ? 'No staff user accounts registered yet. Pre-verified staff can register themselves with their institutional email.'
                        : 'No guest user records found in database.'}
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const dateStr = u.createdAt
                      ? new Date(u.createdAt).toISOString().split('T')[0]
                      : '—';

                    return (
                      <tr key={u._id}>
                        <td style={{ fontWeight: 500 }}>{u.name}</td>
                        <td>
                          <div className="label-code-sm" style={{ color: 'var(--text-primary)' }}>
                            {u.email}
                          </div>
                          <div className="label-code-sm" style={{ color: 'var(--text-dim)' }}>
                            ID: {u._id}
                          </div>
                        </td>
                        <td>
                          <select
                            className="text-input mono"
                            value={u.role}
                            onChange={(e) => handleUpdateRole(u._id, e.target.value)}
                            style={{ height: '28px', width: 'auto', padding: '0 6px', fontSize: '0.75rem' }}
                          >
                            <option value="staff">STAFF</option>
                            <option value="dept_admin">DEPT ADMIN</option>
                            <option value="vip">VIP</option>
                            <option value="guest">GUEST</option>
                          </select>
                        </td>
                        <td>
                          <span
                            className={`badge-pill ${
                              u.status === 'active'
                                ? 'badge-cleared'
                                : 'badge-error'
                            }`}
                          >
                            {u.status}
                          </span>
                        </td>
                        <td className="label-code-sm" style={{ color: 'var(--text-muted)' }}>
                          {dateStr}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                            <button
                              type="button"
                              className="btn btn-xs btn-secondary"
                              onClick={() => handleOpenEdit(u)}
                              title="Edit user details"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            >
                              <EditIcon size={12} />
                              <span>Edit</span>
                            </button>
                            <button
                              type="button"
                              className="btn btn-xs btn-secondary"
                              onClick={() => handleToggleStatus(u._id, u.status)}
                            >
                              {u.status === 'active' ? 'Suspend' : 'Activate'}
                            </button>
                            <button
                              type="button"
                              className="btn btn-xs btn-danger"
                              onClick={() => setUserToDelete({ id: u._id, name: u.name, email: u.email })}
                              title="Delete user permanently"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            >
                              <TrashIcon size={12} />
                              <span>Delete</span>
                            </button>
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
      )}

      {/* =========================================================================
          EDIT USER INFORMATION MODAL
         ========================================================================= */}
      {editingUser && (
        <div className="modal-backdrop">
          <div className="modal-container" style={{ maxWidth: '620px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: 'var(--radius-base)',
                    background: 'var(--primary-wash)',
                    color: 'var(--primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <EditIcon size={16} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Edit User Profile
                  </h3>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Database Record ID: <span className="mono">{editingUser._id}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="sidebar-close-btn"
                style={{ display: 'block' }}
                onClick={() => setEditingUser(null)}
                disabled={savingEdit}
              >
                <CloseIcon size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit}>
              <div className="modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                  {/* Full Name */}
                  <div style={{ gridColumn: 'span 2' }}>
                    <label className="label-ui" style={{ display: 'block', marginBottom: '6px' }}>
                      Full Name *
                    </label>
                    <input
                      type="text"
                      className="text-input"
                      required
                      value={editFormData.name}
                      onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                      placeholder="e.g. Dr. Nitin Tandon"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="label-ui" style={{ display: 'block', marginBottom: '6px' }}>
                      Email Address *
                    </label>
                    <input
                      type="email"
                      className="text-input mono"
                      required
                      value={editFormData.email}
                      onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                      placeholder="e.g. drnitin@ctuniversity.in"
                    />
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="label-ui" style={{ display: 'block', marginBottom: '6px' }}>
                      Contact Phone
                    </label>
                    <input
                      type="text"
                      className="text-input mono"
                      value={editFormData.phone}
                      onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                      placeholder="e.g. 9876543210"
                    />
                  </div>

                  {/* Role */}
                  <div>
                    <label className="label-ui" style={{ display: 'block', marginBottom: '6px' }}>
                      Account Role
                    </label>
                    <select
                      className="text-input mono"
                      value={editFormData.role}
                      onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value as any })}
                    >
                      <option value="staff">STAFF</option>
                      <option value="dept_admin">DEPT ADMIN</option>
                      <option value="guest">GUEST</option>
                      <option value="vip">VIP</option>
                    </select>
                  </div>

                  {/* Status */}
                  <div>
                    <label className="label-ui" style={{ display: 'block', marginBottom: '6px' }}>
                      Account Status
                    </label>
                    <select
                      className="text-input mono"
                      value={editFormData.status}
                      onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value as any })}
                    >
                      <option value="active">ACTIVE</option>
                      <option value="suspended">SUSPENDED</option>
                    </select>
                  </div>

                  {/* Staff & Dept Admin Fields */}
                  {(editFormData.role === 'staff' || editFormData.role === 'dept_admin') && (
                    <>
                      <div>
                        <label className="label-ui" style={{ display: 'block', marginBottom: '6px' }}>
                          Institutional Staff ID
                        </label>
                        <input
                          type="text"
                          className="text-input mono"
                          value={editFormData.staffId}
                          onChange={(e) => setEditFormData({ ...editFormData, staffId: e.target.value })}
                          placeholder="e.g. 24051"
                        />
                      </div>

                      <div>
                        <label className="label-ui" style={{ display: 'block', marginBottom: '6px' }}>
                          Primary Department / Faculty
                        </label>
                        <input
                          type="text"
                          className="text-input"
                          value={editFormData.department}
                          onChange={(e) => setEditFormData({ ...editFormData, department: e.target.value })}
                          placeholder="e.g. General University / Research"
                        />
                      </div>

                      <div style={{ gridColumn: editFormData.role === 'dept_admin' ? 'span 1' : 'span 2' }}>
                        <label className="label-ui" style={{ display: 'block', marginBottom: '6px' }}>
                          Official Designation
                        </label>
                        <input
                          type="text"
                          className="text-input"
                          value={editFormData.designation}
                          onChange={(e) => setEditFormData({ ...editFormData, designation: e.target.value })}
                          placeholder="e.g. Vice Chancellor, Executive Director"
                        />
                      </div>

                      {editFormData.role === 'dept_admin' && (
                        <div>
                          <label className="label-ui" style={{ display: 'block', marginBottom: '6px' }}>
                            Administered Department *
                          </label>
                          <input
                            type="text"
                            className="text-input"
                            value={editFormData.adminDepartment}
                            onChange={(e) => setEditFormData({ ...editFormData, adminDepartment: e.target.value })}
                            placeholder="e.g. School of Engineering"
                          />
                        </div>
                      )}
                    </>
                  )}

                  {/* Optional Password Reset */}
                  <div style={{ gridColumn: 'span 2' }}>
                    <label className="label-ui" style={{ display: 'block', marginBottom: '6px' }}>
                      Reset Password <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(Optional - leave empty to keep current)</span>
                    </label>
                    <input
                      type="password"
                      className="text-input mono"
                      value={editFormData.password}
                      onChange={(e) => setEditFormData({ ...editFormData, password: e.target.value })}
                      placeholder="Minimum 6 characters to reset"
                      minLength={6}
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-sm btn-secondary"
                  onClick={() => setEditingUser(null)}
                  disabled={savingEdit}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-sm btn-primary"
                  disabled={savingEdit}
                  style={{ minWidth: '130px' }}
                >
                  {savingEdit ? 'Saving...' : 'Save User Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          CONFIRM DELETE USER MODAL
         ========================================================================= */}
      {userToDelete && (
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
                  <TrashIcon size={16} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--error-text)' }}>
                    Confirm User Deletion
                  </h3>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    This action is permanent and cannot be undone
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="sidebar-close-btn"
                style={{ display: 'block' }}
                onClick={() => setUserToDelete(null)}
                disabled={deletingUser}
              >
                <CloseIcon size={18} />
              </button>
            </div>

            <div className="modal-body">
              <p className="body-sm" style={{ marginBottom: '14px', color: 'var(--text-primary)' }}>
                Are you sure you want to delete user <strong>"{userToDelete.name}"</strong>?
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
                <div><strong>Email:</strong> <span className="mono">{userToDelete.email}</span></div>
                <div><strong>Database ID:</strong> <span className="mono">{userToDelete.id}</span></div>
                <div style={{ marginTop: '6px', color: 'var(--error-text)' }}>
                  All associated booking records will be removed, and verified roster status will be reset.
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={() => setUserToDelete(null)}
                disabled={deletingUser}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-sm btn-danger"
                onClick={handleConfirmDelete}
                disabled={deletingUser}
                style={{ minWidth: '120px' }}
              >
                {deletingUser ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

