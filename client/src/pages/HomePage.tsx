import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { User, GuestRequestItem } from '../types';
import {
  SearchIcon,
  CheckCircleIcon,
  CopyIcon,
  ClockIcon,
  BedIcon,
  UtensilsIcon,
  CheckIcon,
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

  // Form State - Real Campus Stay
  const [guestName, setGuestName] = useState(currentUser?.name || '');
  const [guestEmail, setGuestEmail] = useState(currentUser?.email || '');
  const [guestPhone, setGuestPhone] = useState(currentUser?.phone || '');
  const [visitorCategory, setVisitorCategory] = useState('External Examiner');
  const [institution, setInstitution] = useState('');
  const [hostDepartment, setHostDepartment] = useState('');
  const [purposeOfVisit, setPurposeOfVisit] = useState('');

  // Accommodation - Campus Realistic
  const [reqAccommodation, setReqAccommodation] = useState(true);
  const [checkInDate, setCheckInDate] = useState('');
  const [checkOutDate, setCheckOutDate] = useState('');
  const [roomType, setRoomType] = useState('Faculty Transit Room');
  const [guestsCount, setGuestsCount] = useState(1);
  const [stayNotes, setStayNotes] = useState('');

  // Food - Hostel Mess & Canteen
  const [reqFood, setReqFood] = useState(true);
  const [dietaryPref, setDietaryPref] = useState('Vegetarian (Mess Thali)');
  const [meals, setMeals] = useState<string[]>(['Breakfast', 'Lunch', 'Dinner']);
  const [foodNotes, setFoodNotes] = useState('');

  // Transport - Campus Shuttle / Gate Pickup (Optional)
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

    if (!guestName.trim() || !guestEmail.trim()) {
      setFormError('Please enter your full name and official email address.');
      return;
    }

    if (!reqAccommodation && !reqFood) {
      setFormError('Please select at least one facility (Campus Lodging or Mess Dining).');
      return;
    }

    if (reqAccommodation && (!checkInDate || !checkOutDate)) {
      setFormError('Please choose your Check-In and Check-Out dates.');
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

      const payload = {
        guestName,
        guestEmail,
        guestPhone,
        designation: visitorCategory,
        institution,
        purposeOfVisit: hostDepartment ? `[Host: ${hostDepartment}] ${purposeOfVisit}` : purposeOfVisit,
        accommodation: {
          selected: reqAccommodation,
          checkInDate,
          checkOutDate,
          roomType,
          guestsCount,
          specialRequests: stayNotes,
        },
        food: {
          selected: reqFood,
          dietaryPreference: dietaryPref,
          mealsRequired: meals,
          specialDietaryNotes: foodNotes,
        },
        transport: {
          selected: reqTransport,
          pickupLocation: pickupLoc,
          dropLocation: 'Hostel / Transit Quarters',
          pickupDateTime: pickupTime,
          vehiclePreference: 'Campus Shuttle',
          specialRequests: transportNotes,
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
        throw new Error(data.message || 'Failed to submit stay request.');
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
    <div style={{ padding: '1.5rem 1rem' }}>
      <main style={{ maxWidth: '1080px', margin: '0 auto' }}>
        {/* Official Campus Notice Disclaimer */}
        <div className="uni-notice-banner">
          <div className="uni-notice-icon">ℹ️</div>
          <div>
            <strong>Campus Lodging & Mess Notice:</strong> This intake portal provides standard on-campus accommodation (Faculty Transit Quarters & Hostel Guest Rooms) and daily Mess meals for visiting professors, external examiners, seminar speakers, and students' parents. <em>University facilities are academic & standard; for commercial luxury or hotel amenities, please arrange an external hotel stay.</em>
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
                  CT University Staff Directive ({currentUser?.name})
                </div>
                <div style={{ color: '#78350F', fontSize: '0.85rem', marginTop: '3px', lineHeight: 1.45 }}>
                  <strong>Ye form sirf external guests, visiting professors, viva examiners aur parents ke liye hai.</strong> University admin ya staff ko stay apply karne ki zaroorat nahi hoti. Aapka role pending guest applications ko approve karke hostel rooms aur mess allotment approve karna hai.
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

        {/* Top Navigation Tabs */}
        <div className="uni-tabs-container">
          <button
            type="button"
            className={`uni-tab-btn ${activeTab === 'apply' ? 'active' : ''}`}
            onClick={() => setActiveTab('apply')}
          >
            <BedIcon size={16} />
            <span>1. Guest Application (Visitors Only)</span>
          </button>

          <button
            type="button"
            className={`uni-tab-btn ${activeTab === 'track' ? 'active' : ''}`}
            onClick={() => setActiveTab('track')}
          >
            <SearchIcon size={16} />
            <span>2. Track Application / Check-In Pass</span>
          </button>

          <button
            type="button"
            className={`uni-tab-btn ${activeTab === 'guidelines' ? 'active' : ''}`}
            onClick={() => setActiveTab('guidelines')}
          >
            <ClockIcon size={16} />
            <span>3. Hostel & Mess Guidelines</span>
          </button>

          <div style={{ marginLeft: 'auto', fontSize: '0.75rem', color: '#64748B', paddingRight: '8px' }}>
            No advance login needed • Instant Reference Code
          </div>
        </div>

        {/* TAB 1: APPLY FOR STAY & MESS */}
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

                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0F172A', marginBottom: '8px' }}>
                  Campus Stay Application Registered!
                </h2>
                <p style={{ color: '#475569', maxWidth: '580px', margin: '0 auto 1.5rem', lineHeight: '1.5' }}>
                  Your request has been forwarded to the <strong>Hostel Warden / Facility Caretaker</strong> for room verification and mess meal slip generation.
                </p>

                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '16px',
                    background: '#F1F5F9',
                    border: '1px solid #CBD5E1',
                    padding: '12px 20px',
                    borderRadius: '8px',
                    marginBottom: '2rem',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.6875rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 600 }}>
                      Your Tracking Reference Code
                    </div>
                    <div style={{ fontSize: '1.35rem', color: '#1E3A8A', fontWeight: 800, letterSpacing: '0.04em' }}>
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
                    <span>Check Application Status</span>
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setSubmitSuccess(null);
                      setPurposeOfVisit('');
                    }}
                  >
                    Submit Another Application
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleApplyStay}>
                <div className="uni-card-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                    <span style={{ background: '#EEF2FF', color: '#1E3A8A', padding: '3px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.04em' }}>
                      FOR OUTSIDE GUESTS & VISITORS ONLY
                    </span>
                    <span style={{ fontSize: '0.78rem', color: '#64748B' }}>
                      Visiting Faculty • Viva Examiners • Parents • Conference Delegates
                    </span>
                  </div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0F172A', marginBottom: '4px' }}>
                    Application for Transit Lodging & Hostel Mess Facility
                  </h2>
                  <p style={{ fontSize: '0.8125rem', color: '#64748B', margin: 0 }}>
                    Please provide your visit schedule and host department endorsement details. Rooms are allotted based on academic duty and availability. <em>(University staff should manage allocations from the Caretaker Desk).</em>
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
                      {formError}
                    </div>
                  )}

                  {/* STEP 1: VISITOR IDENTIFICATION & ENDORSEMENT */}
                  <div style={{ marginBottom: '1.75rem' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1E3A8A', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.75rem' }}>
                      Step 1: Visitor Profile & University Reference
                    </div>

                    <div className="responsive-form-grid">
                      <div>
                        <label className="label-ui" style={{ display: 'block', marginBottom: '6px' }}>
                          Full Name *
                        </label>
                        <input
                          type="text"
                          className="input-text"
                          placeholder="e.g. Prof. R. K. Sharma"
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
                          placeholder="e.g. guest@university.ac.in"
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
                          <option value="External Examiner (PhD/Viva)">External Examiner (PhD/Viva)</option>
                          <option value="Visiting Professor / Guest Speaker">Visiting Professor / Guest Speaker</option>
                          <option value="Parent / Guardian of Student">Parent / Guardian of Student</option>
                          <option value="Research Scholar / Visiting Student">Research Scholar / Visiting Student</option>
                          <option value="Conference / Seminar Delegate">Conference / Seminar Delegate</option>
                          <option value="Sports / University Team Member">Sports / University Team Member</option>
                          <option value="Official Academic Guest">Official Academic Guest</option>
                        </select>
                      </div>

                      <div>
                        <label className="label-ui" style={{ display: 'block', marginBottom: '6px' }}>
                          Home University / Institution
                        </label>
                        <input
                          type="text"
                          className="input-text"
                          placeholder="e.g. IIT Delhi / Delhi University"
                          value={institution}
                          onChange={(e) => setInstitution(e.target.value)}
                        />
                      </div>

                      <div>
                        <label className="label-ui" style={{ display: 'block', marginBottom: '6px' }}>
                          Host Department / Faculty Reference *
                        </label>
                        <input
                          type="text"
                          className="input-text"
                          placeholder="e.g. Dept of Physics / HOD Office / Student Roll No"
                          value={hostDepartment}
                          onChange={(e) => setHostDepartment(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div style={{ marginTop: '0.75rem' }}>
                      <label className="label-ui" style={{ display: 'block', marginBottom: '6px' }}>
                        Purpose of Visit
                      </label>
                      <input
                        type="text"
                        className="input-text"
                        placeholder="e.g. Conduct PhD Viva Voce Examination, Guest Lecture on Quantum Computing"
                        value={purposeOfVisit}
                        onChange={(e) => setPurposeOfVisit(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* STEP 2: CAMPUS ACCOMMODATION SELECTION */}
                  <div style={{ marginBottom: '1.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1E3A8A', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Step 2: Campus Accommodation (Hostel / Faculty Transit)
                      </div>
                      <label style={{ fontSize: '0.8125rem', color: '#475569', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={reqAccommodation}
                          onChange={(e) => setReqAccommodation(e.target.checked)}
                        />
                        <span>Need On-Campus Lodging</span>
                      </label>
                    </div>

                    {reqAccommodation && (
                      <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '1.25rem' }}>
                        <div className="uni-room-grid">
                          {/* Room Type 1 */}
                          <div
                            className={`uni-room-card ${roomType === 'Faculty Transit Room' ? 'selected' : ''}`}
                            onClick={() => setRoomType('Faculty Transit Room')}
                          >
                            <div>
                              <span className="uni-room-tag">FACULTY TRANSIT</span>
                              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0F172A', marginBottom: '4px' }}>
                                Faculty Transit Room
                              </div>
                              <p style={{ fontSize: '0.75rem', color: '#64748B', lineHeight: '1.4', margin: 0 }}>
                                Single/Twin bed with study desk, fan/cooler or AC, and attached bathroom. Recommended for guest lecturers & examiners.
                              </p>
                            </div>
                            <div style={{ marginTop: '10px', fontSize: '0.75rem', color: '#1E3A8A', fontWeight: 600 }}>
                              {roomType === 'Faculty Transit Room' ? '✓ Selected' : 'Click to Select'}
                            </div>
                          </div>

                          {/* Room Type 2 */}
                          <div
                            className={`uni-room-card ${roomType === 'Hostel Guest Room' ? 'selected' : ''}`}
                            onClick={() => setRoomType('Hostel Guest Room')}
                          >
                            <div>
                              <span className="uni-room-tag" style={{ background: '#FEF3C7', color: '#92400E' }}>HOSTEL WING</span>
                              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0F172A', marginBottom: '4px' }}>
                                Hostel Guest Room
                              </div>
                              <p style={{ fontSize: '0.75rem', color: '#64748B', lineHeight: '1.4', margin: 0 }}>
                                Located in student hostel guest blocks. Suitable for visiting research scholars and students' parents.
                              </p>
                            </div>
                            <div style={{ marginTop: '10px', fontSize: '0.75rem', color: '#1E3A8A', fontWeight: 600 }}>
                              {roomType === 'Hostel Guest Room' ? '✓ Selected' : 'Click to Select'}
                            </div>
                          </div>

                          {/* Room Type 3 */}
                          <div
                            className={`uni-room-card ${roomType === 'Common Dormitory Bed' ? 'selected' : ''}`}
                            onClick={() => setRoomType('Common Dormitory Bed')}
                          >
                            <div>
                              <span className="uni-room-tag" style={{ background: '#ECFDF5', color: '#065F46' }}>DORMITORY</span>
                              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0F172A', marginBottom: '4px' }}>
                                Common Dormitory Bed
                              </div>
                              <p style={{ fontSize: '0.75rem', color: '#64748B', lineHeight: '1.4', margin: 0 }}>
                                Shared hall bed with individual locker. Best for student delegations, workshops & university sports events.
                              </p>
                            </div>
                            <div style={{ marginTop: '10px', fontSize: '0.75rem', color: '#1E3A8A', fontWeight: 600 }}>
                              {roomType === 'Common Dormitory Bed' ? '✓ Selected' : 'Click to Select'}
                            </div>
                          </div>
                        </div>

                        {/* Stay Dates & Count */}
                        <div className="responsive-form-grid">
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
                              <option value={4}>4+ (Group/Team)</option>
                            </select>
                          </div>
                        </div>

                        <div style={{ marginTop: '0.75rem' }}>
                          <label className="label-ui" style={{ display: 'block', marginBottom: '4px' }}>
                            Special Room Remarks (Optional)
                          </label>
                          <input
                            type="text"
                            className="input-text"
                            placeholder="e.g. Ground floor preference for senior professor, late arrival"
                            value={stayNotes}
                            onChange={(e) => setStayNotes(e.target.value)}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* STEP 3: CAMPUS MESS MEALS */}
                  <div style={{ marginBottom: '1.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1E3A8A', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Step 3: Hostel Mess & Canteen Dining
                      </div>
                      <label style={{ fontSize: '0.8125rem', color: '#475569', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={reqFood}
                          onChange={(e) => setReqFood(e.target.checked)}
                        />
                        <span>Need Mess Food Coupons</span>
                      </label>
                    </div>

                    {reqFood && (
                      <div className="uni-mess-box">
                        <div style={{ fontSize: '0.8125rem', color: '#475569', marginBottom: '8px' }}>
                          Daily standard campus mess food (Dal, Sabzi, Roti, Rice, Curd). Choose required meals:
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
                            <label className="label-ui" style={{ display: 'block', marginBottom: '4px' }}>Mess Dietary Preference</label>
                            <select
                              className="input-text"
                              value={dietaryPref}
                              onChange={(e) => setDietaryPref(e.target.value)}
                            >
                              <option value="Vegetarian (Mess Thali)">Vegetarian (Hostel Mess Thali)</option>
                              <option value="Non-Vegetarian (Mess Thali)">Non-Vegetarian (Egg/Chicken Day)</option>
                              <option value="Jain Meal (No Onion/Garlic)">Jain Meal (No Onion/Garlic)</option>
                              <option value="Simple Canteen Snacks">Simple Canteen / Tea-Coffee Only</option>
                            </select>
                          </div>

                          <div>
                            <label className="label-ui" style={{ display: 'block', marginBottom: '4px' }}>Dietary Notes (Optional)</label>
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
                    )}
                  </div>

                  {/* STEP 4: CAMPUS GATE PICKUP (OPTIONAL) */}
                  <div style={{ marginBottom: '2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1E3A8A', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Step 4: Campus Gate / Station Pickup (Optional)
                      </div>
                      <label style={{ fontSize: '0.8125rem', color: '#475569', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={reqTransport}
                          onChange={(e) => setReqTransport(e.target.checked)}
                        />
                        <span>Need Campus Shuttle / Pickup</span>
                      </label>
                    </div>

                    {reqTransport && (
                      <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '12px 16px' }}>
                        <div className="responsive-form-grid">
                          <div>
                            <label className="label-ui" style={{ display: 'block', marginBottom: '4px' }}>Pickup Location</label>
                            <select
                              className="input-text"
                              value={pickupLoc}
                              onChange={(e) => setPickupLoc(e.target.value)}
                            >
                              <option value="University Main Gate">University Main Gate</option>
                              <option value="Railway Station (City)">City Railway Station</option>
                              <option value="Inter-State Bus Terminal (ISBT)">Inter-State Bus Terminal (ISBT)</option>
                              <option value="Airport (External Examiner Duty)">Airport (External Examiner Duty)</option>
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
                            <label className="label-ui" style={{ display: 'block', marginBottom: '4px' }}>Train / Flight Details (Optional)</label>
                            <input
                              type="text"
                              className="input-text"
                              placeholder="e.g. Train #12004 or Flight 6E-204"
                              value={transportNotes}
                              onChange={(e) => setTransportNotes(e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Submit Button */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', borderTop: '1px solid #E2E8F0', paddingTop: '1.25rem' }}>
                    <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                      Submitted requests are verified by the Department Office and allotted by the Hostel Warden.
                    </div>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={submitting}
                      style={{ padding: '10px 24px', fontSize: '0.95rem' }}
                    >
                      {submitting ? 'Registering Application...' : 'Submit Application for Campus Stay'}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        )}

        {/* TAB 2: TRACK APPLICATION / CHECK-IN PASS */}
        {activeTab === 'track' && (
          <div className="uni-card">
            <div className="uni-card-header">
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0F172A', marginBottom: '4px' }}>
                Track Campus Stay & Room Allocation
              </h2>
              <p style={{ fontSize: '0.8125rem', color: '#64748B', margin: 0 }}>
                Enter your Reference Code (e.g. <code>REQ-849201</code>) or your registered Email to check room allotment and mess pass status.
              </p>
            </div>

            <div className="uni-card-body">
              <form onSubmit={handleTrackSubmit} style={{ marginBottom: '1.75rem' }}>
                <div style={{ display: 'flex', gap: '10px', maxWidth: '580px' }}>
                  <input
                    type="text"
                    className="input-text"
                    placeholder="Enter Reference Code or Official Email..."
                    value={trackQuery}
                    onChange={(e) => setTrackQuery(e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={trackingLoading}
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    {trackingLoading ? 'Searching...' : 'Check Status'}
                  </button>
                </div>
              </form>

              {trackError && (
                <div
                  style={{
                    padding: '12px 16px',
                    background: '#FEF2F2',
                    border: '1px solid #FECACA',
                    color: '#991B1B',
                    borderRadius: '6px',
                    marginBottom: '1rem',
                    fontSize: '0.875rem',
                  }}
                >
                  {trackError}
                </div>
              )}

              {trackedRequest && (
                <div style={{ background: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: '8px', padding: '1.5rem' }}>
                  {/* Status Banner */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid #E2E8F0', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
                    <div>
                      <div style={{ fontSize: '0.6875rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 600 }}>
                        Reference Code
                      </div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1E3A8A' }}>
                        {trackedRequest.referenceCode}
                      </div>
                    </div>

                    <div>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '6px 14px',
                          borderRadius: '20px',
                          fontSize: '0.8125rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          background:
                            trackedRequest.accommodation?.status === 'allocated'
                              ? '#ECFDF5'
                              : trackedRequest.accommodation?.status === 'completed'
                              ? '#EFF6FF'
                              : '#FEF3C7',
                          color:
                            trackedRequest.accommodation?.status === 'allocated'
                              ? '#065F46'
                              : trackedRequest.accommodation?.status === 'completed'
                              ? '#1E3A8A'
                              : '#92400E',
                        }}
                      >
                        {trackedRequest.accommodation?.status === 'allocated'
                          ? '✓ Room Allotted'
                          : trackedRequest.accommodation?.status === 'completed'
                          ? '✓ Stay Completed'
                          : '🟡 Pending Warden Allocation'}
                      </span>
                    </div>
                  </div>

                  {/* Summary Grid */}
                  <div className="dept-request-meta-grid" style={{ marginBottom: '1.25rem' }}>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: '#64748B' }}>Guest Name:</span>
                      <div style={{ fontWeight: 600, color: '#0F172A' }}>{trackedRequest.guestName}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748B' }}>{trackedRequest.designation || 'Visitor'}</div>
                    </div>

                    <div>
                      <span style={{ fontSize: '0.75rem', color: '#64748B' }}>Host Dept / Purpose:</span>
                      <div style={{ fontWeight: 600, color: '#0F172A' }}>{trackedRequest.purposeOfVisit || 'Academic Stay'}</div>
                    </div>

                    <div>
                      <span style={{ fontSize: '0.75rem', color: '#64748B' }}>Dates:</span>
                      <div style={{ fontWeight: 600, color: '#0F172A' }}>
                        {trackedRequest.accommodation?.checkInDate || 'TBD'} to {trackedRequest.accommodation?.checkOutDate || 'TBD'}
                      </div>
                    </div>
                  </div>

                  {/* Allocation Details */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
                    {/* Room Box */}
                    <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '0.875rem', color: '#1E3A8A', marginBottom: '6px' }}>
                        <BedIcon size={16} />
                        <span>Room Allocation</span>
                      </div>
                      <div style={{ fontSize: '0.8125rem', color: '#475569' }}>
                        Type: <strong>{trackedRequest.accommodation?.roomType || 'Standard'}</strong>
                      </div>
                      <div style={{ fontSize: '1rem', fontWeight: 800, color: trackedRequest.accommodation?.allocatedRoom ? '#059669' : '#D97706', marginTop: '6px' }}>
                        {trackedRequest.accommodation?.allocatedRoom
                          ? `Allotted: ${trackedRequest.accommodation.allocatedRoom}`
                          : 'Under Review by Hostel Caretaker'}
                      </div>
                      {trackedRequest.accommodation?.adminNotes && (
                        <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '4px' }}>
                          Note: {trackedRequest.accommodation.adminNotes}
                        </div>
                      )}
                    </div>

                    {/* Mess Box */}
                    <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '0.875rem', color: '#059669', marginBottom: '6px' }}>
                        <UtensilsIcon size={16} />
                        <span>Hostel Mess Pass</span>
                      </div>
                      <div style={{ fontSize: '0.8125rem', color: '#475569' }}>
                        Pref: <strong>{trackedRequest.food?.dietaryPreference || 'Mess Food'}</strong>
                      </div>
                      <div style={{ fontSize: '0.8125rem', color: '#475569', marginTop: '4px' }}>
                        Meals: {(trackedRequest.food?.mealsRequired || ['Breakfast', 'Lunch', 'Dinner']).join(', ')}
                      </div>
                      <div style={{ fontSize: '0.875rem', fontWeight: 700, color: trackedRequest.food?.cateringStatus === 'arranged' ? '#059669' : '#D97706', marginTop: '6px' }}>
                        {trackedRequest.food?.cateringStatus === 'arranged' ? '✓ Mess Pass Active' : '🟡 Mess Slip Pending'}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: HOSTEL & MESS GUIDELINES */}
        {activeTab === 'guidelines' && (
          <div className="uni-card">
            <div className="uni-card-header">
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0F172A', marginBottom: '4px' }}>
                University Hostel & Transit Facility Guidelines
              </h2>
              <p style={{ fontSize: '0.8125rem', color: '#64748B', margin: 0 }}>
                Essential rules, mess timings, and contact numbers for campus visitors and guests.
              </p>
            </div>

            <div className="uni-card-body" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#1E3A8A', marginBottom: '8px' }}>
                  🕒 Check-In & Check-Out Timings
                </h3>
                <ul style={{ paddingLeft: '1.25rem', fontSize: '0.875rem', color: '#475569', lineHeight: '1.7' }}>
                  <li><strong>Standard Check-In:</strong> 12:00 PM onwards</li>
                  <li><strong>Standard Check-Out:</strong> 11:00 AM</li>
                  <li>Early check-in is subject to room availability and prior warden approval.</li>
                  <li>Please carry a valid Institutional / Government Photo ID for campus gate entry.</li>
                </ul>
              </div>

              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#059669', marginBottom: '8px' }}>
                  🍽️ Central Mess Timings
                </h3>
                <ul style={{ paddingLeft: '1.25rem', fontSize: '0.875rem', color: '#475569', lineHeight: '1.7' }}>
                  <li><strong>Breakfast:</strong> 07:30 AM – 09:30 AM</li>
                  <li><strong>Lunch:</strong> 12:30 PM – 02:30 PM</li>
                  <li><strong>Evening Tea:</strong> 05:00 PM – 06:00 PM</li>
                  <li><strong>Dinner:</strong> 07:30 PM – 09:30 PM</li>
                </ul>
              </div>

              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0F172A', marginBottom: '8px' }}>
                  📞 Caretaker & Helpdesk Contacts
                </h3>
                <ul style={{ listStyle: 'none', padding: 0, fontSize: '0.875rem', color: '#475569', lineHeight: '1.7' }}>
                  <li>🏢 <strong>Faculty Transit Quarters Desk:</strong> Ext. 1042 / +91 (0) 123-456780</li>
                  <li>🏢 <strong>Hostel Guest Wing Warden Office:</strong> Ext. 2011 / +91 (0) 123-456781</li>
                  <li>🚗 <strong>Campus Transport Pool:</strong> Ext. 3004</li>
                  <li>✉️ <strong>Official Email:</strong> campuslodging@university.edu</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
