import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { User, GuestRequestItem } from '../types';
import {
  SearchIcon,
  CheckCircleIcon,
  CopyIcon,
  ClockIcon,
  CheckIcon,
  ShieldIcon,
} from '../components/Icons';

interface HomePageProps {
  currentUser: User | null;
  onLogout: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({ currentUser, onLogout: _onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const isStaffOrAdmin = Boolean(
    currentUser && (
      currentUser.role === 'staff' ||
      currentUser.role === 'dept_admin' ||
      currentUser.role === 'superadmin' ||
      currentUser.isDeptAdmin ||
      currentUser.isSuperAdmin
    )
  );

  // Active main tab: 'apply' | 'track' | 'guidelines'
  const [activeTab, setActiveTab] = useState<'apply' | 'track' | 'guidelines'>('apply');

  // Sync active tab with URL query parameter (e.g. ?tab=track or ?tab=guidelines)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get('tab');
    if (tabParam === 'track' || tabParam === 'guidelines' || tabParam === 'apply') {
      setActiveTab(tabParam as any);
    }
  }, [location.search]);

  // Step 1: Visitor Profile & Campus Visit Clearance (Mandatory)
  const [guestName, setGuestName] = useState(currentUser?.name || '');
  const [guestEmail, setGuestEmail] = useState(currentUser?.email || '');
  const [guestPhone, setGuestPhone] = useState(currentUser?.phone || '');
  const [visitorCategory, setVisitorCategory] = useState('External Examiner (PhD/Viva)');
  const [institution, setInstitution] = useState('');
  const [hostDepartment, setHostDepartment] = useState('Department of Computer Science & Engineering');
  const [hostFacultyRef, setHostFacultyRef] = useState('');
  const [visitDate, setVisitDate] = useState('');
  const [purposeOfVisit, setPurposeOfVisit] = useState('');

  // Step 2: Optional Facilities (Opt-in)
  // Facility A: Accommodation
  const [reqAccommodation, setReqAccommodation] = useState(false);
  const [checkInDate, setCheckInDate] = useState('');
  const [checkOutDate, setCheckOutDate] = useState('');
  const [roomType, setRoomType] = useState('Faculty Transit Room');
  const [guestsCount, setGuestsCount] = useState(1);
  const [stayNotes, setStayNotes] = useState('');

  // Facility B: Food & Hostel Mess
  const [reqFood, setReqFood] = useState(false);
  const [dietaryPref, setDietaryPref] = useState('Vegetarian (Mess Thali)');
  const [meals, setMeals] = useState<string[]>(['Lunch']);
  const [foodNotes, setFoodNotes] = useState('');

  // Facility C: Transport / Campus Shuttle
  const [reqTransport, setReqTransport] = useState(false);
  const [pickupLoc, setPickupLoc] = useState('University Main Gate');
  const [pickupTime, setPickupTime] = useState('');
  const [transportNotes, setTransportNotes] = useState('');

  // Form Submission State
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<{
    referenceCode: string;
    request: GuestRequestItem;
  } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Tracking state
  const [trackQuery, setTrackQuery] = useState('');
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackedRequest, setTrackedRequest] = useState<GuestRequestItem | null>(null);
  const [trackError, setTrackError] = useState<string | null>(null);

  // Sync current user info
  useEffect(() => {
    if (currentUser) {
      if (!guestName && currentUser.name) setGuestName(currentUser.name);
      if (!guestEmail && currentUser.email) setGuestEmail(currentUser.email);
      if (!guestPhone && currentUser.phone) setGuestPhone(currentUser.phone);
    }
  }, [currentUser]);

  const toggleMeal = (meal: string) => {
    if (meals.includes(meal)) {
      setMeals(meals.filter((m) => m !== meal));
    } else {
      setMeals([...meals, meal]);
    }
  };

  const handleApplyStay = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validation 1: Mandatory Visitor Information
    if (!guestName.trim() || !guestEmail.trim()) {
      setFormError('Please enter your full name and official email address.');
      return;
    }

    if (!hostDepartment.trim()) {
      setFormError('Please specify the CT University Host Department you are visiting.');
      return;
    }

    if (!purposeOfVisit.trim()) {
      setFormError('Please provide the official purpose of your campus visit.');
      return;
    }

    // Validation 2: If Accommodation is requested, dates are required
    if (reqAccommodation && (!checkInDate || !checkOutDate)) {
      setFormError('Since you requested On-Campus Lodging, please choose your Check-In and Check-Out dates.');
      return;
    }

    // Validation 3: If Mess is requested, at least one meal must be selected
    if (reqFood && meals.length === 0) {
      setFormError('Since you requested Hostel Mess Dining, please select at least one meal (Breakfast, Lunch, or Dinner).');
      return;
    }

    try {
      setSubmitting(true);
      const token = localStorage.getItem('token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const effectiveCheckIn = reqAccommodation ? checkInDate : (visitDate || new Date().toISOString().split('T')[0]);
      const effectiveCheckOut = reqAccommodation ? checkOutDate : (visitDate || new Date().toISOString().split('T')[0]);

      const payload = {
        guestName: guestName.trim(),
        guestEmail: guestEmail.trim(),
        guestPhone: guestPhone.trim(),
        designation: visitorCategory,
        institution: institution.trim(),
        purposeOfVisit: `[Host: ${hostDepartment.trim()}${hostFacultyRef ? ' | Ref: ' + hostFacultyRef.trim() : ''}] [Visit Date: ${visitDate || effectiveCheckIn}] ${purposeOfVisit.trim()}`,
        accommodation: {
          selected: reqAccommodation,
          checkInDate: effectiveCheckIn,
          checkOutDate: effectiveCheckOut,
          roomType: reqAccommodation ? roomType : 'Day Visit (No Room)',
          guestsCount: reqAccommodation ? guestsCount : 1,
          specialRequests: stayNotes.trim(),
        },
        food: {
          selected: reqFood,
          dietaryPreference: reqFood ? dietaryPref : 'Vegetarian',
          mealsRequired: reqFood ? meals : [],
          specialDietaryNotes: foodNotes.trim(),
        },
        transport: {
          selected: reqTransport,
          pickupLocation: reqTransport ? pickupLoc : '',
          dropLocation: 'Hostel / Transit Quarters',
          pickupDateTime: reqTransport ? pickupTime : '',
          vehiclePreference: 'Campus Shuttle',
          specialRequests: transportNotes.trim(),
        },
        leisure: {
          selected: false,
          activities: [],
          specialRequests: '',
        },
      };

      const res = await fetch('/api/guest-requests', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to submit campus visit request.');
      }

      setSubmitSuccess({
        referenceCode: data.referenceCode,
        request: data.request,
      });
    } catch (err: any) {
      setFormError(err.message || 'Server connection error.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTrackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackQuery.trim()) {
      setTrackError('Please enter a Reference Code or registered Email.');
      return;
    }

    try {
      setTrackingLoading(true);
      setTrackError(null);
      setTrackedRequest(null);

      const res = await fetch(`/api/guest-requests/track/${encodeURIComponent(trackQuery.trim())}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'No record found with this reference code or email.');
      }

      setTrackedRequest(data.request);
    } catch (err: any) {
      setTrackError(err.message || 'Application not found. Please verify details.');
    } finally {
      setTrackingLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  return (
    <div style={{ padding: '1.5rem 1rem 3rem' }}>
      <main style={{ maxWidth: '1080px', margin: '0 auto' }}>
        
        {/* Official Institutional Banner Header */}
        <div
          style={{
            background: 'linear-gradient(135deg, #1E3A8A 0%, #172554 100%)',
            color: '#FFFFFF',
            borderRadius: '10px',
            padding: '2rem 1.75rem',
            marginBottom: '1.5rem',
            boxShadow: '0 4px 15px rgba(30, 58, 138, 0.15)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ maxWidth: '720px' }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'rgba(255, 255, 255, 0.15)',
                  padding: '4px 10px',
                  borderRadius: '4px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  letterSpacing: '0.04em',
                  marginBottom: '10px',
                }}
              >
                <span>🏛️</span>
                <span>CT UNIVERSITY • CAMPUS VISITOR CLEARANCE PORTAL</span>
              </div>
              <h1 style={{ fontSize: '1.65rem', fontWeight: 800, margin: '0 0 8px 0', lineHeight: 1.25 }}>
                Official Campus Visit Clearance & Guest Facilities
              </h1>
              <p style={{ fontSize: '0.875rem', color: '#CBD5E1', margin: 0, lineHeight: 1.5 }}>
                All outside academic visitors (External PhD/Viva Examiners, Visiting Faculty, Keynote Speakers, and Student Guardians) must obtain university visit clearance. You may optionally request transit accommodation in Faculty Quarters, hostel mess dining, and campus gate shuttle below.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '180px' }}>
              <div style={{ fontSize: '0.75rem', color: '#93C5FD', fontWeight: 600, textTransform: 'uppercase' }}>
                Quick Actions
              </div>
              <button
                type="button"
                className="btn btn-sm"
                style={{ background: '#FFFFFF', color: '#1E3A8A', fontWeight: 600, justifyContent: 'flex-start' }}
                onClick={() => setActiveTab('track')}
              >
                <SearchIcon size={14} />
                <span>Track Existing Entry Pass</span>
              </button>
              <button
                type="button"
                className="btn btn-sm"
                style={{ background: 'rgba(255, 255, 255, 0.12)', color: '#FFFFFF', justifyContent: 'flex-start' }}
                onClick={() => setActiveTab('guidelines')}
              >
                <ClockIcon size={14} />
                <span>Hostel & Mess Rules</span>
              </button>
            </div>
          </div>
        </div>

        {/* Staff/Admin Directive Banner */}
        {isStaffOrAdmin && (
          <div
            style={{
              background: '#FEF3C7',
              border: '1.5px solid #F59E0B',
              borderRadius: '8px',
              padding: '1.125rem 1.25rem',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', flex: 1, minWidth: '280px' }}>
              <span style={{ fontSize: '1.6rem', lineHeight: 1 }}>🛡️</span>
              <div>
                <div style={{ fontWeight: 700, color: '#92400E', fontSize: '0.95rem' }}>
                  CT University Staff Notice ({currentUser?.name})
                </div>
                <div style={{ color: '#78350F', fontSize: '0.85rem', marginTop: '3px', lineHeight: 1.45 }}>
                  You are logged in as <strong>{currentUser?.name}</strong> ({currentUser?.email}). 
                  <strong> Ye form sirf external guests, examiners aur parents ke liye hai.</strong> University staff yahan visit permission apply nahi karte — aapka kaam caretaker desk par room aur mess allot karna hai.
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-primary"
                style={{ background: '#1E3A8A', color: '#FFF', fontSize: '0.85rem', padding: '0.55rem 1.1rem', fontWeight: 600 }}
                onClick={() => navigate('/dept-admin/accommodation')}
              >
                🏢 Open Caretaker Allotment Desk ➔
              </button>
              {(currentUser?.role === 'superadmin' || currentUser?.isSuperAdmin || currentUser?.id === '10001') && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ background: '#0F172A', color: '#FFF', fontSize: '0.85rem', padding: '0.55rem 1.1rem', fontWeight: 600 }}
                  onClick={() => navigate('/super-admin')}
                >
                  🏛️ Super Admin Console ➔
                </button>
              )}
            </div>
          </div>
        )}

        {/* Clean Sub-Navigation Tabs */}
        <div className="uni-tabs-container">
          <button
            type="button"
            className={`uni-tab-btn ${activeTab === 'apply' ? 'active' : ''}`}
            onClick={() => setActiveTab('apply')}
          >
            <ShieldIcon size={16} />
            <span>1. Campus Visit Clearance & Facilities Request</span>
          </button>

          <button
            type="button"
            className={`uni-tab-btn ${activeTab === 'track' ? 'active' : ''}`}
            onClick={() => setActiveTab('track')}
          >
            <SearchIcon size={16} />
            <span>2. Track Entry Pass & Allotment Status</span>
          </button>

          <button
            type="button"
            className={`uni-tab-btn ${activeTab === 'guidelines' ? 'active' : ''}`}
            onClick={() => setActiveTab('guidelines')}
          >
            <ClockIcon size={16} />
            <span>3. Visitor & Hostel Guidelines</span>
          </button>
        </div>

        {/* =========================================================================
            TAB 1: OFFICIAL CAMPUS VISIT CLEARANCE & OPTIONAL FACILITIES
           ========================================================================= */}
        {activeTab === 'apply' && (
          <div className="uni-card">
            {submitSuccess ? (
              <div style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
                <div
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    background: '#ECFDF5',
                    color: '#059669',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 1.25rem',
                  }}
                >
                  <CheckCircleIcon size={36} />
                </div>

                <div style={{ display: 'inline-block', background: '#DCFCE7', color: '#166534', padding: '4px 12px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700, marginBottom: '8px' }}>
                  CAMPUS VISIT CLEARANCE REGISTERED
                </div>

                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0F172A', marginBottom: '8px' }}>
                  Official Visit Permit Generated!
                </h2>
                <p style={{ color: '#475569', maxWidth: '600px', margin: '0 auto 1.5rem', lineHeight: '1.5', fontSize: '0.9rem' }}>
                  Your campus visit clearance request has been forwarded to the <strong>Host Department & Hostel Caretaker Desk</strong>. Please present this reference code at the University Security Gate upon arrival.
                </p>

                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '16px',
                    background: '#F1F5F9',
                    border: '1px solid #CBD5E1',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    marginBottom: '1.75rem',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.6875rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 600 }}>
                      Gate Entry Reference Code
                    </div>
                    <div style={{ fontSize: '1.5rem', color: '#1E3A8A', fontWeight: 800, letterSpacing: '0.04em' }}>
                      {submitSuccess.referenceCode}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-sm btn-secondary"
                    onClick={() => copyToClipboard(submitSuccess.referenceCode)}
                  >
                    {copiedCode ? <CheckIcon size={14} color="#059669" /> : <CopyIcon size={14} />}
                    <span>{copiedCode ? 'Copied' : 'Copy Code'}</span>
                  </button>
                </div>

                {/* Facility Summary Badges */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '2rem' }}>
                  <span style={{ background: '#EEF2FF', color: '#1E3A8A', padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600 }}>
                    🏛️ Visit Clearance: Registered
                  </span>
                  <span style={{ background: submitSuccess.request.accommodation?.selected ? '#FEF3C7' : '#F1F5F9', color: submitSuccess.request.accommodation?.selected ? '#92400E' : '#64748B', padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600 }}>
                    🛏️ Lodging: {submitSuccess.request.accommodation?.selected ? (submitSuccess.request.accommodation.roomType || 'Requested') : 'Not Requested'}
                  </span>
                  <span style={{ background: submitSuccess.request.food?.selected ? '#ECFDF5' : '#F1F5F9', color: submitSuccess.request.food?.selected ? '#065F46' : '#64748B', padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600 }}>
                    🍽️ Mess Dining: {submitSuccess.request.food?.selected ? 'Meal Slip Requested' : 'Not Requested'}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                      setTrackQuery(submitSuccess.referenceCode);
                      setActiveTab('track');
                      setTrackedRequest(submitSuccess.request);
                    }}
                  >
                    <SearchIcon size={14} />
                    <span>View Digital Entry Pass</span>
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setSubmitSuccess(null);
                      setPurposeOfVisit('');
                      setReqAccommodation(false);
                      setReqFood(false);
                      setReqTransport(false);
                    }}
                  >
                    Submit Another Visitor Clearance
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleApplyStay}>
                <div className="uni-card-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                    <span style={{ background: '#EEF2FF', color: '#1E3A8A', padding: '3px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.04em' }}>
                      VISITOR CLEARANCE & GATE PASS
                    </span>
                    <span style={{ fontSize: '0.78rem', color: '#64748B' }}>
                      Examiners • Guest Faculty • Parents • Conference Attendees
                    </span>
                  </div>
                  <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#0F172A', marginBottom: '4px' }}>
                    Application for Campus Visit Clearance & Guest Facilities
                  </h2>
                  <p style={{ fontSize: '0.8125rem', color: '#64748B', margin: 0 }}>
                    Please provide your official visitor profile and institutional endorsement details. Once submitted, your visit clearance will be issued, and any optional on-campus lodging or mess dining will be coordinated by the Caretaker Desk.
                  </p>
                </div>

                <div className="uni-card-body">
                  {formError && (
                    <div
                      style={{
                        padding: '12px 16px',
                        background: '#FEF2F2',
                        border: '1px solid #FECACA',
                        color: '#991B1B',
                        borderRadius: '6px',
                        marginBottom: '1.5rem',
                        fontSize: '0.875rem',
                      }}
                    >
                      ⚠️ {formError}
                    </div>
                  )}

                  {/* =======================================================
                      PART 1: VISITOR IDENTIFICATION & ENDORSEMENT (MANDATORY)
                     ======================================================= */}
                  <div style={{ marginBottom: '2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1.5px solid #E2E8F0', paddingBottom: '8px', marginBottom: '1.25rem' }}>
                      <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#1E3A8A', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700 }}>
                        1
                      </span>
                      <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                        Official Visitor Profile & Campus Visit Purpose (Mandatory)
                      </h3>
                    </div>

                    <div className="responsive-form-grid">
                      <div>
                        <label className="label-ui" style={{ display: 'block', marginBottom: '6px' }}>
                          Visitor Full Name *
                        </label>
                        <input
                          type="text"
                          className="input-text"
                          placeholder="e.g. Prof. R. K. Sharma / Dr. Ananya Sen"
                          value={guestName}
                          onChange={(e) => setGuestName(e.target.value)}
                          required
                        />
                      </div>

                      <div>
                        <label className="label-ui" style={{ display: 'block', marginBottom: '6px' }}>
                          Official Email *
                        </label>
                        <input
                          type="email"
                          className="input-text"
                          placeholder="e.g. examiner@university.ac.in"
                          value={guestEmail}
                          onChange={(e) => setGuestEmail(e.target.value)}
                          required
                        />
                      </div>

                      <div>
                        <label className="label-ui" style={{ display: 'block', marginBottom: '6px' }}>
                          Mobile Number *
                        </label>
                        <input
                          type="tel"
                          className="input-text"
                          placeholder="+91 98765 43210"
                          value={guestPhone}
                          onChange={(e) => setGuestPhone(e.target.value)}
                          required
                        />
                      </div>

                      <div>
                        <label className="label-ui" style={{ display: 'block', marginBottom: '6px' }}>
                          Visitor Category
                        </label>
                        <select
                          className="input-text"
                          value={visitorCategory}
                          onChange={(e) => setVisitorCategory(e.target.value)}
                        >
                          <option value="External Examiner (PhD/Viva)">External Examiner (PhD/Viva Voce)</option>
                          <option value="Visiting Professor / Guest Speaker">Visiting Professor / Keynote Speaker</option>
                          <option value="Parent / Guardian of Student">Parent / Guardian of Student</option>
                          <option value="Research Scholar / Visiting Student">Research Scholar / Visiting Student</option>
                          <option value="Conference / Seminar Delegate">Conference / Seminar Delegate</option>
                          <option value="Sports / University Team Member">Sports / University Team Member</option>
                          <option value="Official Academic / Regulatory Guest">Official Academic / Regulatory Guest</option>
                        </select>
                      </div>

                      <div>
                        <label className="label-ui" style={{ display: 'block', marginBottom: '6px' }}>
                          Home University / Organization
                        </label>
                        <input
                          type="text"
                          className="input-text"
                          placeholder="e.g. IIT Delhi / Panjab University / Govt. Dept"
                          value={institution}
                          onChange={(e) => setInstitution(e.target.value)}
                        />
                      </div>

                      <div>
                        <label className="label-ui" style={{ display: 'block', marginBottom: '6px' }}>
                          Host Department at CT University *
                        </label>
                        <input
                          type="text"
                          className="input-text"
                          placeholder="e.g. Department of Computer Science & Engineering"
                          value={hostDepartment}
                          onChange={(e) => setHostDepartment(e.target.value)}
                          required
                        />
                      </div>

                      <div>
                        <label className="label-ui" style={{ display: 'block', marginBottom: '6px' }}>
                          Inviting Faculty / Host Reference
                        </label>
                        <input
                          type="text"
                          className="input-text"
                          placeholder="e.g. Dr. H. S. Bawa / Dean Office / Student Roll No"
                          value={hostFacultyRef}
                          onChange={(e) => setHostFacultyRef(e.target.value)}
                        />
                      </div>

                      <div>
                        <label className="label-ui" style={{ display: 'block', marginBottom: '6px' }}>
                          Planned Date of Campus Visit *
                        </label>
                        <input
                          type="date"
                          className="input-text"
                          value={visitDate}
                          onChange={(e) => setVisitDate(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div style={{ marginTop: '0.875rem' }}>
                      <label className="label-ui" style={{ display: 'block', marginBottom: '6px' }}>
                        Purpose of Campus Visit *
                      </label>
                      <input
                        type="text"
                        className="input-text"
                        placeholder="e.g. Conduct M.Tech Thesis Viva Voce Examination in CSE Department"
                        value={purposeOfVisit}
                        onChange={(e) => setPurposeOfVisit(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  {/* =======================================================
                      PART 2: OPTIONAL CAMPUS FACILITIES (CHOOSE WHAT YOU NEED)
                     ======================================================= */}
                  <div style={{ marginBottom: '2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1.5px solid #E2E8F0', paddingBottom: '8px', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#059669', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700 }}>
                          2
                        </span>
                        <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                          Campus Hospitality & Facilities (Optional Add-ons)
                        </h3>
                      </div>
                      <span style={{ fontSize: '0.75rem', color: '#64748B' }}>
                        Tick checkboxes below only if you require lodging, mess meals, or gate shuttle.
                      </span>
                    </div>

                    {/* FACILITY A: ON-CAMPUS LODGING */}
                    <div style={{ border: reqAccommodation ? '1.5px solid #1E3A8A' : '1px solid #E2E8F0', borderRadius: '8px', padding: '1.25rem', marginBottom: '1.25rem', background: reqAccommodation ? '#F8FAFC' : '#FFFFFF', transition: 'all 0.15s ease' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '1.4rem' }}>🛏️</span>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0F172A' }}>
                              On-Campus Transit Accommodation
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                              Faculty Transit Quarters & Hostel Guest Rooms for overnight academic duty.
                            </div>
                          </div>
                        </div>

                        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', background: reqAccommodation ? '#1E3A8A' : '#F1F5F9', color: reqAccommodation ? '#FFFFFF' : '#334155', padding: '6px 14px', borderRadius: '6px', fontSize: '0.8125rem', fontWeight: 600 }}>
                          <input
                            type="checkbox"
                            checked={reqAccommodation}
                            onChange={(e) => setReqAccommodation(e.target.checked)}
                          />
                          <span>{reqAccommodation ? '✓ Lodging Requested' : '+ Require Room Stay'}</span>
                        </label>
                      </div>

                      {reqAccommodation ? (
                        <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid #E2E8F0' }}>
                          <div className="uni-room-grid">
                            <div
                              className={`uni-room-card ${roomType === 'Faculty Transit Room' ? 'selected' : ''}`}
                              onClick={() => setRoomType('Faculty Transit Room')}
                            >
                              <span className="uni-room-tag">FACULTY TRANSIT</span>
                              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0F172A', marginBottom: '4px' }}>
                                Faculty Transit Room
                              </div>
                              <p style={{ fontSize: '0.75rem', color: '#64748B', lineHeight: '1.4', margin: 0 }}>
                                Single/Twin study room with study desk and attached washroom for visiting examiners & guest professors.
                              </p>
                              <div style={{ marginTop: '8px', fontSize: '0.75rem', color: '#1E3A8A', fontWeight: 600 }}>
                                {roomType === 'Faculty Transit Room' ? '✓ Selected' : 'Select Room'}
                              </div>
                            </div>

                            <div
                              className={`uni-room-card ${roomType === 'Hostel Guest Room' ? 'selected' : ''}`}
                              onClick={() => setRoomType('Hostel Guest Room')}
                            >
                              <span className="uni-room-tag" style={{ background: '#FEF3C7', color: '#92400E' }}>HOSTEL WING</span>
                              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0F172A', marginBottom: '4px' }}>
                                Hostel Guest Room
                              </div>
                              <p style={{ fontSize: '0.75rem', color: '#64748B', lineHeight: '1.4', margin: 0 }}>
                                Dedicated visitor rooms located in Boys/Girls Hostel guest wings for student parents & research scholars.
                              </p>
                              <div style={{ marginTop: '8px', fontSize: '0.75rem', color: '#1E3A8A', fontWeight: 600 }}>
                                {roomType === 'Hostel Guest Room' ? '✓ Selected' : 'Select Room'}
                              </div>
                            </div>

                            <div
                              className={`uni-room-card ${roomType === 'Common Dormitory Bed' ? 'selected' : ''}`}
                              onClick={() => setRoomType('Common Dormitory Bed')}
                            >
                              <span className="uni-room-tag" style={{ background: '#ECFDF5', color: '#065F46' }}>DORMITORY</span>
                              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0F172A', marginBottom: '4px' }}>
                                Common Dormitory Bed
                              </div>
                              <p style={{ fontSize: '0.75rem', color: '#64748B', lineHeight: '1.4', margin: 0 }}>
                                Shared hall bed with individual locker. Best for student delegations, workshops & university sports events.
                              </p>
                              <div style={{ marginTop: '8px', fontSize: '0.75rem', color: '#1E3A8A', fontWeight: 600 }}>
                                {roomType === 'Common Dormitory Bed' ? '✓ Selected' : 'Select Room'}
                              </div>
                            </div>
                          </div>

                          <div className="responsive-form-grid" style={{ marginTop: '1rem' }}>
                            <div>
                              <label className="label-ui" style={{ display: 'block', marginBottom: '4px' }}>Check-In Date *</label>
                              <input
                                type="date"
                                className="input-text"
                                value={checkInDate}
                                onChange={(e) => setCheckInDate(e.target.value)}
                                required={reqAccommodation}
                              />
                            </div>

                            <div>
                              <label className="label-ui" style={{ display: 'block', marginBottom: '4px' }}>Check-Out Date *</label>
                              <input
                                type="date"
                                className="input-text"
                                value={checkOutDate}
                                onChange={(e) => setCheckOutDate(e.target.value)}
                                required={reqAccommodation}
                              />
                            </div>

                            <div>
                              <label className="label-ui" style={{ display: 'block', marginBottom: '4px' }}>Number of Guests</label>
                              <select
                                className="input-text"
                                value={guestsCount}
                                onChange={(e) => setGuestsCount(parseInt(e.target.value, 10))}
                              >
                                <option value={1}>1 Person</option>
                                <option value={2}>2 Persons</option>
                                <option value={3}>3 Persons</option>
                                <option value={4}>4+ (Group / Contingent)</option>
                              </select>
                            </div>
                          </div>

                          <div style={{ marginTop: '0.75rem' }}>
                            <label className="label-ui" style={{ display: 'block', marginBottom: '4px' }}>Special Lodging Remarks (Optional)</label>
                            <input
                              type="text"
                              className="input-text"
                              placeholder="e.g. Ground floor preference for senior professor, late check-in"
                              value={stayNotes}
                              onChange={(e) => setStayNotes(e.target.value)}
                            />
                          </div>
                        </div>
                      ) : (
                        <div style={{ marginTop: '8px', fontSize: '0.8125rem', color: '#64748B' }}>
                          ✓ Day visit clearance only — No on-campus lodging required.
                        </div>
                      )}
                    </div>

                    {/* FACILITY B: HOSTEL MESS DINING */}
                    <div style={{ border: reqFood ? '1.5px solid #059669' : '1px solid #E2E8F0', borderRadius: '8px', padding: '1.25rem', marginBottom: '1.25rem', background: reqFood ? '#F8FAFC' : '#FFFFFF', transition: 'all 0.15s ease' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '1.4rem' }}>🍽️</span>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0F172A' }}>
                              Hostel Mess Dining Meal Passes
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                              Freshly prepared vegetarian hostel mess thali in Campus Dining Hall.
                            </div>
                          </div>
                        </div>

                        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', background: reqFood ? '#059669' : '#F1F5F9', color: reqFood ? '#FFFFFF' : '#334155', padding: '6px 14px', borderRadius: '6px', fontSize: '0.8125rem', fontWeight: 600 }}>
                          <input
                            type="checkbox"
                            checked={reqFood}
                            onChange={(e) => setReqFood(e.target.checked)}
                          />
                          <span>{reqFood ? '✓ Mess Dining Requested' : '+ Require Mess Meals'}</span>
                        </label>
                      </div>

                      {reqFood ? (
                        <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid #E2E8F0' }}>
                          <div style={{ fontSize: '0.8125rem', color: '#475569', marginBottom: '8px' }}>
                            Choose required daily mess meals:
                          </div>

                          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '12px' }}>
                            {['Breakfast', 'Lunch', 'Dinner'].map((meal) => (
                              <label key={meal} className="uni-check-label">
                                <input
                                  type="checkbox"
                                  checked={meals.includes(meal)}
                                  onChange={() => toggleMeal(meal)}
                                />
                                <span>{meal}</span>
                              </label>
                            ))}
                          </div>

                          <div className="responsive-form-grid">
                            <div>
                              <label className="label-ui" style={{ display: 'block', marginBottom: '4px' }}>Dietary Preference</label>
                              <select
                                className="input-text"
                                value={dietaryPref}
                                onChange={(e) => setDietaryPref(e.target.value)}
                              >
                                <option value="Vegetarian (Mess Thali)">Vegetarian (Hostel Mess Thali)</option>
                                <option value="Jain Meal (No Onion/Garlic)">Jain Meal (No Onion/Garlic)</option>
                                <option value="Faculty Special Thali">Faculty Special Guest Thali</option>
                                <option value="Simple Canteen Snacks">Simple Canteen / Tea-Coffee Only</option>
                              </select>
                            </div>

                            <div>
                              <label className="label-ui" style={{ display: 'block', marginBottom: '4px' }}>Dietary Remarks (Optional)</label>
                              <input
                                type="text"
                                className="input-text"
                                placeholder="e.g. Diabetic, less spice"
                                value={foodNotes}
                                onChange={(e) => setFoodNotes(e.target.value)}
                              />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div style={{ marginTop: '8px', fontSize: '0.8125rem', color: '#64748B' }}>
                          ✓ No mess meals requested — Self-arranged / Tea-coffee only.
                        </div>
                      )}
                    </div>

                    {/* FACILITY C: CAMPUS GATE TRANSIT / SHUTTLE */}
                    <div style={{ border: reqTransport ? '1.5px solid #0284C7' : '1px solid #E2E8F0', borderRadius: '8px', padding: '1.25rem', background: reqTransport ? '#F8FAFC' : '#FFFFFF', transition: 'all 0.15s ease' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '1.4rem' }}>🚗</span>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0F172A' }}>
                              Campus Gate Shuttle / Local Transit Assistance
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                              University shuttle from Main Security Gate or City Station to academic departments.
                            </div>
                          </div>
                        </div>

                        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', background: reqTransport ? '#0284C7' : '#F1F5F9', color: reqTransport ? '#FFFFFF' : '#334155', padding: '6px 14px', borderRadius: '6px', fontSize: '0.8125rem', fontWeight: 600 }}>
                          <input
                            type="checkbox"
                            checked={reqTransport}
                            onChange={(e) => setReqTransport(e.target.checked)}
                          />
                          <span>{reqTransport ? '✓ Transit Requested' : '+ Require Gate Shuttle'}</span>
                        </label>
                      </div>

                      {reqTransport ? (
                        <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid #E2E8F0' }}>
                          <div className="responsive-form-grid">
                            <div>
                              <label className="label-ui" style={{ display: 'block', marginBottom: '4px' }}>Pickup Point</label>
                              <select
                                className="input-text"
                                value={pickupLoc}
                                onChange={(e) => setPickupLoc(e.target.value)}
                              >
                                <option value="University Main Gate">University Main Security Gate</option>
                                <option value="Campus Bus Terminal">Campus Bus Terminal</option>
                                <option value="Railway Station (City)">Ludhiana Railway Station (Examiner Duty)</option>
                                <option value="Inter-State Bus Terminal (ISBT)">Inter-State Bus Terminal (ISBT)</option>
                              </select>
                            </div>

                            <div>
                              <label className="label-ui" style={{ display: 'block', marginBottom: '4px' }}>Arrival Date & Time</label>
                              <input
                                type="datetime-local"
                                className="input-text"
                                value={pickupTime}
                                onChange={(e) => setPickupTime(e.target.value)}
                              />
                            </div>

                            <div>
                              <label className="label-ui" style={{ display: 'block', marginBottom: '4px' }}>Train / Flight / Bus Details</label>
                              <input
                                type="text"
                                className="input-text"
                                placeholder="e.g. Vande Bharat Exp / Personal Car"
                                value={transportNotes}
                                onChange={(e) => setTransportNotes(e.target.value)}
                              />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div style={{ marginTop: '8px', fontSize: '0.8125rem', color: '#64748B' }}>
                          ✓ Own conveyance — Direct arrival at Department.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* =======================================================
                      PART 3: SUMMARY OVERVIEW & SUBMIT
                     ======================================================= */}
                  <div style={{ background: '#F1F5F9', border: '1px solid #CBD5E1', borderRadius: '8px', padding: '1.25rem', marginBottom: '1.5rem' }}>
                    <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', marginBottom: '8px' }}>
                      Application Summary:
                    </div>
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', fontSize: '0.85rem' }}>
                      <span style={{ background: '#FFFFFF', border: '1px solid #CBD5E1', padding: '4px 10px', borderRadius: '4px', color: '#1E3A8A', fontWeight: 600 }}>
                        🏛️ Campus Visit Clearance: Mandatory
                      </span>
                      <span style={{ background: '#FFFFFF', border: '1px solid #CBD5E1', padding: '4px 10px', borderRadius: '4px', color: reqAccommodation ? '#92400E' : '#64748B' }}>
                        🛏️ Lodging: {reqAccommodation ? `${roomType} (${guestsCount} Person)` : 'Not Requested'}
                      </span>
                      <span style={{ background: '#FFFFFF', border: '1px solid #CBD5E1', padding: '4px 10px', borderRadius: '4px', color: reqFood ? '#065F46' : '#64748B' }}>
                        🍽️ Mess Meals: {reqFood ? meals.join(', ') : 'Not Requested'}
                      </span>
                      <span style={{ background: '#FFFFFF', border: '1px solid #CBD5E1', padding: '4px 10px', borderRadius: '4px', color: reqTransport ? '#0369A1' : '#64748B' }}>
                        🚗 Shuttle: {reqTransport ? pickupLoc : 'Own Conveyance'}
                      </span>
                    </div>
                  </div>

                  {/* Submission Buttons */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => {
                        setPurposeOfVisit('');
                        setReqAccommodation(false);
                        setReqFood(false);
                        setReqTransport(false);
                      }}
                    >
                      Reset Form
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={submitting}
                      style={{ padding: '0.75rem 1.75rem', fontSize: '0.95rem', fontWeight: 700 }}
                    >
                      {submitting ? 'Generating Entry Pass...' : '✓ Generate Campus Visit Pass & Submit Request ➔'}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        )}

        {/* =========================================================================
            TAB 2: TRACK APPLICATION / CHECK-IN PASS
           ========================================================================= */}
        {activeTab === 'track' && (
          <div className="uni-card">
            <div className="uni-card-header">
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0F172A', marginBottom: '4px' }}>
                Track Campus Entry Pass & Allotment Status
              </h2>
              <p style={{ fontSize: '0.8125rem', color: '#64748B', margin: 0 }}>
                Enter your alphanumeric reference code (e.g. <code>CTU-VIS-XXXXX</code>) or your registered official email address.
              </p>
            </div>

            <div className="uni-card-body">
              <form onSubmit={handleTrackSubmit} style={{ maxWidth: '640px', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    className="input-text"
                    placeholder="Enter Reference Code or Email"
                    value={trackQuery}
                    onChange={(e) => setTrackQuery(e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <button type="submit" className="btn btn-primary" disabled={trackingLoading}>
                    <SearchIcon size={14} />
                    <span>{trackingLoading ? 'Searching...' : 'Track Pass'}</span>
                  </button>
                </div>
                {trackError && (
                  <div style={{ color: '#DC2626', fontSize: '0.8125rem', marginTop: '8px' }}>
                    {trackError}
                  </div>
                )}
              </form>

              {trackedRequest && (
                <div
                  style={{
                    border: '1.5px solid #CBD5E1',
                    borderRadius: '8px',
                    padding: '1.5rem',
                    background: '#FFFFFF',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid #E2E8F0', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 600 }}>
                        Official Campus Visit Permit
                      </div>
                      <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#1E3A8A' }}>
                        {trackedRequest.referenceCode}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <span
                        style={{
                          padding: '6px 14px',
                          borderRadius: '4px',
                          fontSize: '0.8125rem',
                          fontWeight: 700,
                          background: trackedRequest.accommodation?.status === 'allocated' ? '#ECFDF5' : '#FEF3C7',
                          color: trackedRequest.accommodation?.status === 'allocated' ? '#065F46' : '#92400E',
                        }}
                      >
                        {trackedRequest.accommodation?.selected
                          ? `Lodging: ${(trackedRequest.accommodation?.status || 'Pending').toUpperCase()}`
                          : 'Visit Clearance: Active'}
                      </span>
                    </div>
                  </div>

                  <div className="responsive-form-grid" style={{ marginBottom: '1.25rem' }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#64748B' }}>Visitor Name</div>
                      <div style={{ fontWeight: 600, color: '#0F172A' }}>{trackedRequest.guestName}</div>
                      <div style={{ fontSize: '0.8125rem', color: '#64748B' }}>{trackedRequest.designation || 'Visitor'}</div>
                    </div>

                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#64748B' }}>Institution / Home Org</div>
                      <div style={{ fontWeight: 600, color: '#0F172A' }}>{trackedRequest.institution || 'External'}</div>
                      <div style={{ fontSize: '0.8125rem', color: '#64748B' }}>{trackedRequest.guestEmail}</div>
                    </div>

                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#64748B' }}>Allocated Room Number</div>
                      <div style={{ fontWeight: 700, color: trackedRequest.accommodation?.allocatedRoom ? '#059669' : '#92400E', fontSize: '1.05rem' }}>
                        {trackedRequest.accommodation?.allocatedRoom || (trackedRequest.accommodation?.selected ? 'Under Allotment' : 'Day Visit (No Room)')}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                        {trackedRequest.accommodation?.roomType || 'Standard'}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#64748B' }}>Mess Meal Slip</div>
                      <div style={{ fontWeight: 600, color: '#0F172A' }}>
                        {trackedRequest.food?.selected ? `${trackedRequest.food.mealsRequired?.join(', ')} (${trackedRequest.food.dietaryPreference})` : 'Not Requested'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#059669' }}>
                        {trackedRequest.food?.selected ? 'Eligible for Mess Dining' : ''}
                      </div>
                    </div>
                  </div>

                  <div style={{ background: '#F8FAFC', padding: '10px 14px', borderRadius: '6px', fontSize: '0.8125rem', color: '#475569' }}>
                    <strong>Official Purpose:</strong> {trackedRequest.purposeOfVisit || 'Campus Visit & Academic Duty'}
                  </div>

                  <div style={{ marginTop: '1.25rem', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => window.print()}>
                      Print Gate Pass
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 3: HOSTEL & MESS GUIDELINES
           ========================================================================= */}
        {activeTab === 'guidelines' && (
          <div className="uni-card">
            <div className="uni-card-header">
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0F172A', marginBottom: '4px' }}>
                CT University • Campus Visitor & Hostel Guidelines
              </h2>
              <p style={{ fontSize: '0.8125rem', color: '#64748B', margin: 0 }}>
                Please review the institutional transit lodging, mess schedule, and security check-in protocols.
              </p>
            </div>

            <div className="uni-card-body">
              <div className="responsive-form-grid" style={{ marginBottom: '1.5rem' }}>
                {/* Guideline 1 */}
                <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '1.25rem' }}>🪪</span>
                    <strong style={{ color: '#0F172A', fontSize: '0.95rem' }}>Gate Check-In & Photo ID</strong>
                  </div>
                  <p style={{ fontSize: '0.8125rem', color: '#475569', lineHeight: '1.5', margin: 0 }}>
                    All external visitors must carry a valid Government-issued Photo ID (Aadhaar / Voter ID / Passport / Institutional Faculty ID) and present their Reference Code at the Main Security Gate.
                  </p>
                </div>

                {/* Guideline 2 */}
                <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '1.25rem' }}>🚪</span>
                    <strong style={{ color: '#0F172A', fontSize: '0.95rem' }}>Gate Curfew & Check-In Timings</strong>
                  </div>
                  <p style={{ fontSize: '0.8125rem', color: '#475569', lineHeight: '1.5', margin: 0 }}>
                    Standard Check-in is from 12:00 PM onwards, and Check-out is by 11:00 AM. In accordance with university campus security, main hostel gates close at 10:00 PM strictly. Late arrivals must inform the Caretaker Desk in advance.
                  </p>
                </div>

                {/* Guideline 3 */}
                <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '1.25rem' }}>🍽️</span>
                    <strong style={{ color: '#0F172A', fontSize: '0.95rem' }}>Hostel Mess Meal Timings</strong>
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: '#475569', lineHeight: '1.6' }}>
                    <div>• <strong>Breakfast:</strong> 07:30 AM – 09:15 AM</div>
                    <div>• <strong>Lunch:</strong> 12:15 PM – 02:00 PM</div>
                    <div>• <strong>Dinner:</strong> 07:30 PM – 09:15 PM</div>
                    <div style={{ marginTop: '4px', fontSize: '0.75rem', color: '#64748B' }}>
                      Standard pure vegetarian thali served. For special dietary needs, kindly inform the mess supervisor.
                    </div>
                  </div>
                </div>

                {/* Guideline 4 */}
                <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '1.25rem' }}>🚭</span>
                    <strong style={{ color: '#0F172A', fontSize: '0.95rem' }}>Campus Decorum & Prohibitions</strong>
                  </div>
                  <p style={{ fontSize: '0.8125rem', color: '#475569', lineHeight: '1.5', margin: 0 }}>
                    CT University maintains a strict zero-tolerance policy against smoking, alcohol, and narcotic substances on campus premises. Please maintain academic decorum and respect hostel quiet hours after 10:00 PM.
                  </p>
                </div>
              </div>

              {/* Contact Helpdesk Box */}
              <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '8px', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <div style={{ fontWeight: 700, color: '#1E3A8A', fontSize: '0.9rem' }}>
                    Hostel Warden & Caretaker Allotment Helpdesk
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: '#1E40AF', marginTop: '2px' }}>
                    For urgent room verification or night transit inquiries, contact the Facility Control Room.
                  </div>
                </div>
                <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#1E3A8A' }}>
                  📞 +91 161 520 2222 / 520 2200
                </div>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
};
