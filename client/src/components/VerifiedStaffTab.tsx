import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import type { VerifiedStaffMember, VerifiedStaffStats } from '../types';
import {
  UploadCloudIcon,
  FileSpreadsheetIcon,
  CheckCircleIcon,
  TrashIcon,
  DownloadIcon,
  SearchIcon,
  RefreshIcon,
  CloseIcon,
  PlusIcon,
  EditIcon,
  UserPlusIcon,
} from './Icons';

interface VerifiedStaffTabProps {
  token: string | null;
}

interface PendingUpload {
  fileName: string;
  fileSize: string;
  records: any[];
  total: number;
  teachingCount: number;
  adminCount: number;
  sheetNames: string[];
}

export const VerifiedStaffTab: React.FC<VerifiedStaffTabProps> = ({ token }) => {
  const [staffList, setStaffList] = useState<VerifiedStaffMember[]>([]);
  const [stats, setStats] = useState<VerifiedStaffStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [feedback, setFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Single Staff Add / Edit Modal State
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [staffFormData, setStaffFormData] = useState({
    staffId: '',
    name: '',
    category: 'Teaching Faculty',
    department: '',
    designation: '',
    email: '',
    phone: '',
    dateOfJoining: '',
  });
  const [savingStaff, setSavingStaff] = useState(false);

  // Drag & drop & modal state
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pendingUpload, setPendingUpload] = useState<PendingUpload | null>(null);
  const [selectedMode, setSelectedMode] = useState<'append' | 'replace' | 'remove'>('append');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Staff Account Provisioning State
  const [provisioningId, setProvisioningId] = useState<string | null>(null);
  const [provisionedCredentialModal, setProvisionedCredentialModal] = useState<{
    staffName: string;
    staffId: string;
    email: string;
    tempPassword: string;
    emailSent: boolean;
  } | null>(null);

  const handleProvisionStaff = async (member: VerifiedStaffMember) => {
    try {
      setProvisioningId(member._id);
      setFeedback(null);
      const res = await fetch(`/api/admin/verified-staff/${member._id}/provision-account`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({ type: 'success', text: data.message });
        setProvisionedCredentialModal({
          staffName: member.name,
          staffId: data.staffId || member.staffId,
          email: member.email,
          tempPassword: data.tempPassword,
          emailSent: Boolean(data.emailSent),
        });
        loadVerifiedStaff();
      } else {
        setFeedback({ type: 'error', text: data.message || 'Failed to provision staff account.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', text: 'Error provisioning staff account: ' + err.message });
    } finally {
      setProvisioningId(null);
    }
  };

  useEffect(() => {
    if (token) {
      loadVerifiedStaff();
    }
  }, [token, activeCategory]);

  const loadVerifiedStaff = async () => {
    try {
      setLoading(true);
      const url =
        activeCategory === 'all'
          ? '/api/admin/verified-staff'
          : `/api/admin/verified-staff?category=${encodeURIComponent(activeCategory)}`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setStaffList(data.staff);
        setStats(data.stats);
      } else {
        setFeedback({ text: data.message || 'Error loading roster', type: 'error' });
      }
    } catch (err: any) {
      setFeedback({ text: 'Roster load error: ' + err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Helper to parse file and open Strategy Selection Modal
  const handleFileProcess = async (file: File) => {
    const validExtensions = ['.xlsx', '.xls', '.csv'];
    const fileName = file.name.toLowerCase();
    const isValid = validExtensions.some((ext) => fileName.endsWith(ext));

    if (!isValid) {
      setFeedback({ text: 'Please provide an Excel (.xlsx, .xls) or CSV (.csv) file.', type: 'error' });
      return;
    }

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });

      const allRecords: any[] = [];
      let teachingCount = 0;
      let adminCount = 0;

      workbook.SheetNames.forEach((sheetName) => {
        const worksheet = workbook.Sheets[sheetName];
        const rawJson: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (!rawJson || rawJson.length < 2) return;

        // Find header row
        let headerRowIndex = -1;
        for (let i = 0; i < Math.min(rawJson.length, 6); i++) {
          const rowStr = rawJson[i].map((c) => String(c || '').toLowerCase()).join(' ');
          if (rowStr.includes('name') || rowStr.includes('id') || rowStr.includes('designation')) {
            headerRowIndex = i;
            break;
          }
        }

        if (headerRowIndex === -1) headerRowIndex = 0;

        const headers = rawJson[headerRowIndex].map((h) => String(h || '').trim());
        const getColIdx = (pattern: RegExp) => headers.findIndex((h) => pattern.test(h));

        const srNoIdx = getColIdx(/sr\.?\s*no/i);
        const deptIdx = getColIdx(/dept|department/i);
        const idIdx = getColIdx(/^id$|staff\s*id|emp(loyee)?\s*id|code/i);
        const nameIdx = getColIdx(/^name$|faculty\s*name|staff\s*name/i);
        const desigIdx = getColIdx(/designation|post|role/i);
        const dojIdx = getColIdx(/date\s*of\s*joining|doj|joining\s*date|date/i);
        const emailIdx = getColIdx(/email|mail/i);
        const phoneIdx = getColIdx(/phone|mobile|contact/i);

        // Unified Category: Admin & Non-Teaching are the SAME category
        const lowerSheet = sheetName.toLowerCase();
        let sheetCategory = 'Admin & Non-Teaching';
        if (
          lowerSheet.includes('teaching') ||
          (lowerSheet.includes('faculty') && !lowerSheet.includes('admin') && !lowerSheet.includes('non'))
        ) {
          sheetCategory = 'Teaching Faculty';
        } else {
          sheetCategory = 'Admin & Non-Teaching';
        }

        for (let r = headerRowIndex + 1; r < rawJson.length; r++) {
          const row = rawJson[r];
          if (!row || row.length === 0) continue;

          const staffId = idIdx !== -1 ? String(row[idIdx] || '').trim() : '';
          const name = nameIdx !== -1 ? String(row[nameIdx] || '').trim() : '';
          const email = emailIdx !== -1 ? String(row[emailIdx] || '').trim().toLowerCase() : '';

          if (!name && !email && !staffId) continue;

          let dojValue = dojIdx !== -1 ? String(row[dojIdx] || '').trim() : '';
          if (dojValue && !isNaN(Number(dojValue)) && Number(dojValue) > 30000) {
            try {
              const excelDate = new Date(Math.round((Number(dojValue) - 25569) * 86400 * 1000));
              dojValue = excelDate.toISOString().split('T')[0];
            } catch (e) {
              // ignore
            }
          }

          if (sheetCategory === 'Teaching Faculty') {
            teachingCount++;
          } else {
            adminCount++;
          }

          allRecords.push({
            srNo: srNoIdx !== -1 ? Number(row[srNoIdx]) || (allRecords.length + 1) : allRecords.length + 1,
            department: deptIdx !== -1 ? String(row[deptIdx] || '').trim() : '',
            staffId: staffId || `P-${allRecords.length + 1}`,
            name: name || 'Unknown Staff',
            designation: desigIdx !== -1 ? String(row[desigIdx] || '').trim() : '',
            dateOfJoining: dojValue,
            email: email,
            phone: phoneIdx !== -1 ? String(row[phoneIdx] || '').trim() : '',
            category: sheetCategory,
          });
        }
      });

      if (allRecords.length === 0) {
        setFeedback({ text: 'No staff rows could be parsed from this file.', type: 'error' });
        return;
      }

      // Format file size
      const sizeKb = (file.size / 1024).toFixed(1) + ' KB';

      // Open Strategy Selection Dialog with parsed details
      setPendingUpload({
        fileName: file.name,
        fileSize: sizeKb,
        records: allRecords,
        total: allRecords.length,
        teachingCount,
        adminCount,
        sheetNames: workbook.SheetNames,
      });
      setSelectedMode('append'); // default to Add / Append
    } catch (err: any) {
      setFeedback({ text: 'Error parsing spreadsheet: ' + err.message, type: 'error' });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Execute the confirmed upload strategy
  const handleConfirmUpload = async () => {
    if (!pendingUpload) return;

    try {
      setUploading(true);

      const res = await fetch('/api/admin/verified-staff/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          records: pendingUpload.records,
          mode: selectedMode,
          targetCategory: activeCategory,
        }),
      });

      const contentType = res.headers.get('content-type') || '';
      let data: any = null;

      if (contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const rawText = await res.text();
        if (res.status === 413) {
          throw new Error('Payload Too Large (413): The uploaded file exceeds the server payload limit.');
        }
        throw new Error(`Server returned status ${res.status}: ${rawText.slice(0, 120)}`);
      }

      if (res.ok && data?.success) {
        setFeedback({
          text: data.message,
          type: 'success',
        });
        setPendingUpload(null);
        loadVerifiedStaff();
      } else {
        setFeedback({ text: data?.message || 'Upload execution failed.', type: 'error' });
      }
    } catch (err: any) {
      setFeedback({ text: 'Upload failed: ' + err.message, type: 'error' });
    } finally {
      setUploading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileProcess(e.target.files[0]);
    }
  };

  const handleOpenAddStaff = () => {
    setEditingStaffId(null);
    setStaffFormData({
      staffId: '',
      name: '',
      category: activeCategory !== 'all' ? activeCategory : 'Teaching Faculty',
      department: '',
      designation: '',
      email: '',
      phone: '',
      dateOfJoining: '',
    });
    setShowStaffModal(true);
  };

  const handleOpenEditStaff = (staff: VerifiedStaffMember) => {
    setEditingStaffId(staff._id);
    setStaffFormData({
      staffId: staff.staffId || '',
      name: staff.name || '',
      category: staff.category || 'Teaching Faculty',
      department: staff.department || '',
      designation: staff.designation || '',
      email: staff.email || '',
      phone: staff.phone || '',
      dateOfJoining: staff.dateOfJoining || '',
    });
    setShowStaffModal(true);
  };

  const handleSaveSingleStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffFormData.staffId.trim() || !staffFormData.name.trim() || !staffFormData.email.trim()) {
      setFeedback({ text: 'Staff ID, Full Name, and Official Email are mandatory.', type: 'error' });
      return;
    }

    try {
      setSavingStaff(true);
      const isEdit = !!editingStaffId;
      const url = isEdit ? `/api/admin/verified-staff/${editingStaffId}` : '/api/admin/verified-staff';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(staffFormData),
      });

      const data = await res.json();
      if (data.success) {
        setFeedback({
          text: data.message || `Staff member "${staffFormData.name}" ${isEdit ? 'updated' : 'added'} successfully.`,
          type: 'success',
        });
        setShowStaffModal(false);
        loadVerifiedStaff();
      } else {
        setFeedback({ text: data.message || `Failed to ${isEdit ? 'update' : 'add'} staff member.`, type: 'error' });
      }
    } catch (err: any) {
      setFeedback({ text: 'Save failed: ' + err.message, type: 'error' });
    } finally {
      setSavingStaff(false);
    }
  };

  const handleDeleteStaff = async (id: string, name: string) => {
    if (!window.confirm(`Expunge verified record for "${name}"?`)) return;
    try {
      const res = await fetch(`/api/admin/verified-staff/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({ text: `Record expunged: ${name}`, type: 'success' });
        loadVerifiedStaff();
      } else {
        setFeedback({ text: data.message, type: 'error' });
      }
    } catch (err: any) {
      setFeedback({ text: 'Delete failed: ' + err.message, type: 'error' });
    }
  };

  const handleClearCategory = async () => {
    const categoryName = activeCategory === 'all' ? 'ALL verified staff records' : `all records in "${activeCategory}"`;
    if (!window.confirm(`Warning: Are you sure you want to completely clear ${categoryName}?`)) return;

    try {
      const url =
        activeCategory === 'all'
          ? '/api/admin/verified-staff?category=all'
          : `/api/admin/verified-staff?category=${encodeURIComponent(activeCategory)}`;

      const res = await fetch(url, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({ text: data.message, type: 'success' });
        loadVerifiedStaff();
      }
    } catch (err: any) {
      setFeedback({ text: 'Clear failed: ' + err.message, type: 'error' });
    }
  };

  const handleDownloadTemplate = () => {
    const wb = XLSX.utils.book_new();

    const headers = [
      'Sr.No.',
      'Department',
      'ID',
      'Name',
      'Designation',
      'Date of Joining',
      'Email',
      'Phone No.',
    ];

    const teachingData = [
      headers,
      [1, 'Vice Chancellor, Executive Director cum Dean Research', '24051', 'Dr. Nitin Tandon', 'Vice Chancellor, Executive Director cum Dean Research', '20-01-2024', 'drnitin@ctuniversity.in', '9847230100'],
      [2, 'Department of Computer Science & Engineering', '24088', 'Dr. Simranjeet Kaur', 'Associate Professor & HOD', '12-07-2023', 'simranjeet.cse@ctuniversity.in', '9878123450'],
    ];

    const adminNonTeachingData = [
      headers,
      [1, 'Office of General Administration', '23012', 'Rajesh Kumar Sharma', 'Registrar & Head of Administration', '15-08-2023', 'registrar@ctuniversity.in', '9876543210'],
      [2, 'Facilities & Campus Operations', '22104', 'Harpreet Singh', 'Estate & Campus Facility Manager', '10-02-2022', 'harpreet.ops@ctuniversity.in', '9812345678'],
      [3, 'Finance & Accounts Division', '23015', 'Meenakshi Aggarwal', 'Chief Finance Officer', '01-09-2023', 'cfo@ctuniversity.in', '9876543211'],
    ];

    const wsTeaching = XLSX.utils.aoa_to_sheet(teachingData);
    const wsAdminNonTeaching = XLSX.utils.aoa_to_sheet(adminNonTeachingData);

    // 2 Clean Unified Sheets: Teaching Faculty & Admin & Non-Teaching
    XLSX.utils.book_append_sheet(wb, wsTeaching, 'Teaching Faculty');
    XLSX.utils.book_append_sheet(wb, wsAdminNonTeaching, 'Admin & Non-Teaching');

    XLSX.writeFile(wb, 'Verified_Staff_Roster_Template.xlsx');
  };

  // Filtered display list
  const filteredList = staffList.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.staffId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.designation.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.phone.includes(searchTerm);

    const matchesStatus =
      statusFilter === 'all'
        ? true
        : statusFilter === 'registered'
        ? s.isRegistered
        : !s.isRegistered;

    return matchesSearch && matchesStatus;
  });

  // Category Tabs: Unified into Teaching Faculty and Admin & Non-Teaching
  const defaultTabs = ['Teaching Faculty', 'Admin & Non-Teaching'];
  const serverCategories = (stats?.categories || []).map((c) => c.name);
  const categoryTabList = Array.from(new Set([...defaultTabs, ...serverCategories])).filter(
    (c) => c !== 'Admin Faculty' && c !== 'Non Teaching'
  );

  return (
    <div>
      {feedback && (
        <div className={`callout callout-${feedback.type}`} style={{ marginBottom: '1.25rem' }}>
          {feedback.text}
        </div>
      )}

      {/* Drag & Drop Upload Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: isDragging
            ? '2px dashed var(--primary)'
            : '1px dashed var(--border-interactive)',
          background: isDragging ? 'var(--primary-wash)' : 'var(--surface)',
          borderRadius: 'var(--radius-base)',
          padding: '2rem 1.5rem',
          textAlign: 'center',
          cursor: 'pointer',
          marginBottom: '1.5rem',
          transition: 'all 0.15s ease',
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleFileInputChange}
          style={{ display: 'none' }}
        />

        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            background: 'var(--primary-wash)',
            color: 'var(--primary)',
            marginBottom: '0.75rem',
          }}
        >
          <UploadCloudIcon size={22} />
        </div>

        <div style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--text-primary)', marginBottom: '4px' }}>
          Drop University Staff List (.xlsx, .xls, .csv) or click to browse
        </div>
        <p className="body-sm" style={{ maxWidth: '580px', margin: '0 auto 12px auto' }}>
          Supports multi-sheet workbooks. Categorizes into <strong>Teaching Faculty</strong> and <strong>Admin & Non-Teaching</strong> automatically.
        </p>

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <span className="code-chip">Cols: Sr.No. • Dept • ID • Name • Designation • DOJ • Email • Phone</span>
          <button
            type="button"
            className="btn btn-sm btn-secondary"
            onClick={(e) => {
              e.stopPropagation();
              handleDownloadTemplate();
            }}
            style={{ fontSize: '0.75rem', padding: '4px 8px' }}
          >
            <DownloadIcon size={12} />
            <span>Download Clean Template</span>
          </button>
        </div>
      </div>

      {/* Category Tabs: All, Teaching Faculty, Admin & Non-Teaching */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid var(--border-structural)',
          marginBottom: '1.25rem',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div className="segmented-track" style={{ marginBottom: '8px' }}>
          <button
            type="button"
            className={`segmented-segment ${activeCategory === 'all' ? 'active' : ''}`}
            onClick={() => setActiveCategory('all')}
          >
            <span>All Categories</span>
            <span
              className="code-chip"
              style={{
                fontSize: '0.6875rem',
                padding: '1px 6px',
                background: activeCategory === 'all' ? 'var(--primary-wash)' : 'var(--surface)',
                color: activeCategory === 'all' ? 'var(--primary)' : 'var(--text-muted)',
                fontWeight: 600,
              }}
            >
              {stats?.total || 0}
            </span>
          </button>
          {categoryTabList.map((catName) => {
            const catStat = stats?.categories.find((c) => c.name === catName);
            const count = catStat ? catStat.count : 0;
            const isActive = activeCategory === catName;
            return (
              <button
                key={catName}
                type="button"
                className={`segmented-segment ${isActive ? 'active' : ''}`}
                onClick={() => setActiveCategory(catName)}
              >
                <span>{catName}</span>
                <span
                  className="code-chip"
                  style={{
                    fontSize: '0.6875rem',
                    padding: '1px 6px',
                    background: isActive ? 'var(--primary-wash)' : 'var(--surface)',
                    color: isActive ? 'var(--primary)' : 'var(--text-muted)',
                    fontWeight: 600,
                  }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: '8px', paddingBottom: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={handleOpenAddStaff}
            title="Add single verified staff member"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <PlusIcon size={14} />
            <span>Add Verified Staff</span>
          </button>
          <button
            type="button"
            className="btn btn-sm btn-secondary"
            onClick={loadVerifiedStaff}
            disabled={loading}
          >
            <RefreshIcon size={13} />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            className="btn btn-sm btn-danger"
            onClick={handleClearCategory}
            style={{ fontSize: '0.75rem' }}
          >
            <TrashIcon size={13} />
            <span>Clear {activeCategory === 'all' ? 'All' : activeCategory}</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div
        style={{
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1rem',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ position: 'relative', width: '320px', maxWidth: '100%' }}>
          <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }}>
            <SearchIcon size={14} />
          </span>
          <input
            type="text"
            className="text-input"
            placeholder="Search by ID, Name, Dept, Email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ paddingLeft: '32px' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <label className="label-code-sm" style={{ color: 'var(--text-muted)' }}>STATUS:</label>
          <select
            className="text-input"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ width: 'auto', padding: '6px 12px' }}
          >
            <option value="all">All Status</option>
            <option value="registered">Registered Only</option>
            <option value="pending">Pending Registration</option>
          </select>
        </div>
      </div>

      {/* Staff Roster Data Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          Loading verified university roster records...
        </div>
      ) : filteredList.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '3rem 1.5rem',
            background: 'var(--surface)',
            border: '1px solid var(--border-structural)',
            borderRadius: 'var(--radius-base)',
          }}
        >
          <FileSpreadsheetIcon size={32} color="var(--text-dim)" />
          <div style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--text-primary)', marginTop: '8px' }}>
            No verified staff members found
          </div>
          <p className="body-sm" style={{ marginTop: '4px' }}>
            Drop an Excel spreadsheet above to populate verified roster.
          </p>
        </div>
      ) : (
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '60px' }}>SR</th>
                <th>STAFF ID</th>
                <th>MEMBER & EMAIL</th>
                <th>DEPARTMENT & ROLE</th>
                <th>CATEGORY</th>
                <th>ACCOUNT CLEARANCE</th>
                <th style={{ textAlign: 'right' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filteredList.map((member) => (
                <tr key={member._id}>
                  <td className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                    {member.srNo || '-'}
                  </td>
                  <td>
                    <span className="code-chip" style={{ fontWeight: 600 }}>
                      {member.staffId}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{member.name}</div>
                    <div className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {member.email}
                      {member.phone && ` • ${member.phone}`}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-primary)' }}>
                      {member.department || 'General University'}
                    </div>
                    <div className="label-code-sm" style={{ color: 'var(--text-muted)' }}>
                      {member.designation || 'Staff Member'}
                    </div>
                  </td>
                  <td>
                    <span
                      className={`badge-pill ${
                        member.category === 'Teaching Faculty' ? 'badge-primary' : 'badge-cleared'
                      }`}
                      style={{ fontSize: '0.6875rem' }}
                    >
                      {member.category}
                    </span>
                  </td>
                  <td>
                    {member.isRegistered ? (
                      <span className="badge-pill badge-cleared" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <CheckCircleIcon size={12} />
                        <span>Active Account</span>
                      </span>
                    ) : (
                      <span className="badge-pill" style={{ background: '#F1F5F9', color: 'var(--text-muted)' }}>
                        No Login Created
                      </span>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                      {!member.isRegistered ? (
                        <button
                          type="button"
                          className="btn btn-xs btn-primary"
                          onClick={() => handleProvisionStaff(member)}
                          disabled={provisioningId === member._id}
                          title="Generate credentials and send email invitation to staff"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#1E3A8A' }}
                        >
                          <UserPlusIcon size={12} />
                          <span>{provisioningId === member._id ? 'Creating...' : 'Create Login'}</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-xs btn-secondary"
                          onClick={() => handleProvisionStaff(member)}
                          disabled={provisioningId === member._id}
                          title="Generate new temporary password and resend email"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                          <RefreshIcon size={12} />
                          <span>{provisioningId === member._id ? 'Resetting...' : 'Reset Pass'}</span>
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn btn-xs btn-secondary"
                        onClick={() => handleOpenEditStaff(member)}
                        title="Edit verified staff record"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      >
                        <EditIcon size={12} />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        className="btn btn-xs btn-danger"
                        onClick={() => handleDeleteStaff(member._id, member.name)}
                        title="Delete from verified roster"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      >
                        <TrashIcon size={12} />
                        <span>Delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* =========================================================================
          UPLOAD STRATEGY CONFIRMATION MODAL
          Asks whether to:
          1. Add / Append this data to existing
          2. Change / Replace whole data with this one
          3. Remove this data from roster
         ========================================================================= */}
      {pendingUpload && (
        <div className="modal-backdrop">
          <div className="modal-container">
            {/* Modal Header */}
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
                  <FileSpreadsheetIcon size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Confirm Roster Upload Action
                  </h3>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Select how to apply parsed records to the verified staff database
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="sidebar-close-btn"
                style={{ display: 'block' }}
                onClick={() => setPendingUpload(null)}
                disabled={uploading}
              >
                <CloseIcon size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="modal-body">
              {/* File Summary Card */}
              <div
                style={{
                  background: 'var(--surface-hover)',
                  border: '1px solid var(--border-structural)',
                  borderRadius: 'var(--radius-base)',
                  padding: '12px 14px',
                  marginBottom: '1.25rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                    {pendingUpload.fileName}
                  </span>
                  <span className="code-chip">{pendingUpload.fileSize}</span>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', fontSize: '0.75rem' }}>
                  <span className="badge-pill badge-primary">
                    Total: {pendingUpload.total} Records
                  </span>
                  <span className="badge-pill badge-cleared">
                    Teaching Faculty: {pendingUpload.teachingCount}
                  </span>
                  <span className="badge-pill" style={{ background: '#EDE9FE', color: '#5B21B6' }}>
                    Admin & Non-Teaching: {pendingUpload.adminCount}
                  </span>
                </div>
              </div>

              <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
                How would you like to process this data?
              </div>

              {/* Strategy 1: Add to Existing Data */}
              <div
                className={`strategy-card ${selectedMode === 'append' ? 'selected-append' : ''}`}
                onClick={() => setSelectedMode('append')}
              >
                <div className="strategy-radio-indicator">
                  {selectedMode === 'append' && <div className="strategy-radio-inner" />}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                      Add to Existing Data (Append / Update)
                    </span>
                    <span className="badge-pill badge-cleared" style={{ fontSize: '0.625rem' }}>
                      SAFE • MERGE
                    </span>
                  </div>
                  <p className="body-sm" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Keep current verified staff. New staff members from this file will be added, and existing matching records will be updated with fresh details.
                  </p>
                </div>
              </div>

              {/* Strategy 2: Change Whole Data with This One */}
              <div
                className={`strategy-card ${selectedMode === 'replace' ? 'selected-replace' : ''}`}
                onClick={() => setSelectedMode('replace')}
              >
                <div className="strategy-radio-indicator">
                  {selectedMode === 'replace' && <div className="strategy-radio-inner" />}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                      Change Whole Data With This One (Replace Roster)
                    </span>
                    <span className="badge-pill badge-primary" style={{ fontSize: '0.625rem' }}>
                      FRESH ROSTER
                    </span>
                  </div>
                  <p className="body-sm" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Completely clear previous verified staff records and replace the entire database exclusively with this new uploaded file.
                  </p>
                </div>
              </div>

              {/* Strategy 3: Remove Matching Data */}
              <div
                className={`strategy-card ${selectedMode === 'remove' ? 'selected-remove' : ''}`}
                onClick={() => setSelectedMode('remove')}
              >
                <div className="strategy-radio-indicator">
                  {selectedMode === 'remove' && <div className="strategy-radio-inner" />}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--error-text)' }}>
                      Remove This Data from Roster (Purge Matching)
                    </span>
                    <span className="badge-pill badge-error" style={{ fontSize: '0.625rem' }}>
                      DELETE
                    </span>
                  </div>
                  <p className="body-sm" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Find and remove verified staff members in the database whose Staff ID or Email matches any record in this uploaded file.
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={() => setPendingUpload(null)}
                disabled={uploading}
              >
                Cancel
              </button>
              <button
                type="button"
                className={`btn btn-sm ${
                  selectedMode === 'remove'
                    ? 'btn-danger'
                    : selectedMode === 'replace'
                    ? 'btn-primary'
                    : 'btn-primary'
                }`}
                onClick={handleConfirmUpload}
                disabled={uploading}
                style={{ minWidth: '150px' }}
              >
                {uploading ? (
                  'Processing Action...'
                ) : (
                  <span>
                    {selectedMode === 'append' && 'Add & Merge Records'}
                    {selectedMode === 'replace' && 'Replace Entire Roster'}
                    {selectedMode === 'remove' && 'Remove Matching Staff'}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          ADD / EDIT SINGLE VERIFIED STAFF MEMBER MODAL
         ========================================================================= */}
      {showStaffModal && (
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
                  {editingStaffId ? <EditIcon size={16} /> : <UserPlusIcon size={16} />}
                </div>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {editingStaffId ? 'Edit Verified Staff Record' : 'Add Verified Staff Member'}
                  </h3>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {editingStaffId
                      ? 'Update authorized faculty/staff records and institutional details'
                      : 'Pre-authorize institutional faculty or staff for portal registration'}
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="sidebar-close-btn"
                style={{ display: 'block' }}
                onClick={() => setShowStaffModal(false)}
                disabled={savingStaff}
              >
                <CloseIcon size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveSingleStaff}>
              <div className="modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  {/* Staff ID */}
                  <div>
                    <label className="label-ui" style={{ display: 'block', marginBottom: '6px' }}>
                      University Staff ID *
                    </label>
                    <input
                      type="text"
                      className="text-input mono"
                      required
                      placeholder="e.g. 24052"
                      value={staffFormData.staffId}
                      onChange={(e) => setStaffFormData({ ...staffFormData, staffId: e.target.value })}
                    />
                  </div>

                  {/* Category */}
                  <div>
                    <label className="label-ui" style={{ display: 'block', marginBottom: '6px' }}>
                      Institutional Category *
                    </label>
                    <select
                      className="text-input"
                      value={staffFormData.category}
                      onChange={(e) => setStaffFormData({ ...staffFormData, category: e.target.value })}
                    >
                      <option value="Teaching Faculty">Teaching Faculty</option>
                      <option value="Admin & Non-Teaching">Admin & Non-Teaching</option>
                    </select>
                  </div>

                  {/* Full Name */}
                  <div style={{ gridColumn: 'span 2' }}>
                    <label className="label-ui" style={{ display: 'block', marginBottom: '6px' }}>
                      Full Name *
                    </label>
                    <input
                      type="text"
                      className="text-input"
                      required
                      placeholder="e.g. Dr. Harpreet Kaur"
                      value={staffFormData.name}
                      onChange={(e) => setStaffFormData({ ...staffFormData, name: e.target.value })}
                    />
                  </div>

                  {/* Official Email */}
                  <div>
                    <label className="label-ui" style={{ display: 'block', marginBottom: '6px' }}>
                      Official Institutional Email *
                    </label>
                    <input
                      type="email"
                      className="text-input mono"
                      required
                      placeholder="e.g. harpreet.cse@ctuniversity.in"
                      value={staffFormData.email}
                      onChange={(e) => setStaffFormData({ ...staffFormData, email: e.target.value })}
                    />
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="label-ui" style={{ display: 'block', marginBottom: '6px' }}>
                      Contact Mobile / Phone
                    </label>
                    <input
                      type="text"
                      className="text-input mono"
                      placeholder="e.g. 9876543210"
                      value={staffFormData.phone}
                      onChange={(e) => setStaffFormData({ ...staffFormData, phone: e.target.value })}
                    />
                  </div>

                  {/* Department */}
                  <div>
                    <label className="label-ui" style={{ display: 'block', marginBottom: '6px' }}>
                      Department
                    </label>
                    <input
                      type="text"
                      className="text-input"
                      placeholder="e.g. School of Engineering"
                      value={staffFormData.department}
                      onChange={(e) => setStaffFormData({ ...staffFormData, department: e.target.value })}
                    />
                  </div>

                  {/* Designation */}
                  <div>
                    <label className="label-ui" style={{ display: 'block', marginBottom: '6px' }}>
                      Designation
                    </label>
                    <input
                      type="text"
                      className="text-input"
                      placeholder="e.g. Associate Professor & HOD"
                      value={staffFormData.designation}
                      onChange={(e) => setStaffFormData({ ...staffFormData, designation: e.target.value })}
                    />
                  </div>

                  {/* Date of Joining */}
                  <div style={{ gridColumn: 'span 2' }}>
                    <label className="label-ui" style={{ display: 'block', marginBottom: '6px' }}>
                      Date of Joining (DOJ)
                    </label>
                    <input
                      type="text"
                      className="text-input mono"
                      placeholder="e.g. 15-07-2023 or YYYY-MM-DD"
                      value={staffFormData.dateOfJoining}
                      onChange={(e) => setStaffFormData({ ...staffFormData, dateOfJoining: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-sm btn-secondary"
                  onClick={() => setShowStaffModal(false)}
                  disabled={savingStaff}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-sm btn-primary"
                  disabled={savingStaff}
                  style={{ minWidth: '150px' }}
                >
                  {savingStaff ? 'Saving...' : editingStaffId ? 'Update Staff Member' : 'Add to Verified Roster'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          PROVISIONED STAFF CREDENTIALS MODAL
         ========================================================================= */}
      {provisionedCredentialModal && (
        <div className="modal-backdrop">
          <div className="modal-container" style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    background: '#ECFDF5',
                    color: '#065F46',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '18px',
                  }}
                >
                  ✓
                </div>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Staff Login Credentials Issued
                  </h3>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {provisionedCredentialModal.emailSent ? 'Official invitation dispatched to staff email' : 'Account active in system'}
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="sidebar-close-btn"
                style={{ display: 'block' }}
                onClick={() => setProvisionedCredentialModal(null)}
              >
                <CloseIcon size={18} />
              </button>
            </div>

            <div className="modal-body">
              <p className="body-sm" style={{ marginBottom: '16px' }}>
                Login account for <strong>{provisionedCredentialModal.staffName}</strong> has been provisioned. The staff member will be required to change this temporary password upon first login.
              </p>

              <div
                style={{
                  background: 'var(--surface-hover)',
                  border: '1px solid var(--border-structural)',
                  borderRadius: 'var(--radius-base)',
                  padding: '16px',
                  marginBottom: '16px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Staff Login ID:</span>
                  <span className="code-chip" style={{ fontSize: '0.875rem', fontWeight: 700 }}>
                    {provisionedCredentialModal.staffId}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Registered Email:</span>
                  <span className="mono" style={{ fontSize: '0.8125rem', fontWeight: 600 }}>
                    {provisionedCredentialModal.email}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Temporary Password:</span>
                  <span className="code-chip" style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#92400E', background: '#FEF3C7', border: '1px solid #FCD34D' }}>
                    {provisionedCredentialModal.tempPassword}
                  </span>
                </div>
              </div>

              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                💡 <strong>Login Notice:</strong> Staff member can login directly with their Staff ID (<span className="mono">{provisionedCredentialModal.staffId}</span>) or email address.
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-sm btn-primary"
                onClick={() => setProvisionedCredentialModal(null)}
                style={{ width: '100%' }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
