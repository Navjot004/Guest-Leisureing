import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { User } from '../types';

interface StaffNoticeProps {
  currentUser: User | null;
}

export const StaffNotice: React.FC<StaffNoticeProps> = ({ currentUser }) => {
  const navigate = useNavigate();

  const isStaffOrAdmin = Boolean(
    currentUser && (
      currentUser.role === 'staff' ||
      currentUser.role === 'dept_admin' ||
      currentUser.role === 'superadmin' ||
      currentUser.isDeptAdmin ||
      currentUser.isSuperAdmin
    )
  );

  if (!isStaffOrAdmin || !currentUser) return null;

  const isSuperAdmin =
    currentUser.role === 'superadmin' ||
    currentUser.isSuperAdmin ||
    currentUser.id === '10001';

  const openDepartmentDesk = () => {
    const dept = (currentUser.adminDepartment || currentUser.department || '').toLowerCase();
    if (dept.includes('cater') || dept.includes('food')) navigate('/dept-admin/catering');
    else if (dept.includes('transport')) navigate('/dept-admin/transport');
    else navigate('/dept-admin/accommodation');
  };

  return (
    <aside className="staff-notice" aria-label="University staff notice">
      <div className="staff-notice-copy">
        <span className="staff-notice-icon" aria-hidden="true">🛡️</span>
        <div>
          <div className="staff-notice-title">CT University Staff Notice ({currentUser.name})</div>
          <p>
            You are logged in as <strong>{currentUser.name}</strong> ({currentUser.email}).
            <strong> Ye form sirf external guests, examiners aur parents ke liye hai.</strong>
            {' '}University staff yahan visit permission apply nahi karte — aapka kaam caretaker desk par room aur mess allot karna hai.
          </p>
        </div>
      </div>
      <div className="staff-notice-actions">
        {isSuperAdmin ? (
          <>
            <button type="button" className="btn btn-primary" onClick={() => navigate('/super-admin')}>
              🏛️ Open Visitor Approvals Desk ➔
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => navigate('/super-admin/staff')}>
              ⚙️ Staff & Users Console ➔
            </button>
          </>
        ) : (
          <button type="button" className="btn btn-primary" onClick={openDepartmentDesk}>
            🏢 Open Department Allotment Desk ➔
          </button>
        )}
      </div>
    </aside>
  );
};
