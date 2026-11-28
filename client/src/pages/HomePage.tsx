import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { User, GuestRequestItem } from '../types';
import {
  SearchIcon,
  CheckCircleIcon,
  CopyIcon,
  CheckIcon,
  RefreshIcon,
} from '../components/Icons';

interface HomePageProps {
  currentUser: User | null;
  onLogout: () => void;
  view?: 'application' | 'tracking';
}

export const HomePage: React.FC<HomePageProps> = ({
  currentUser,
  onLogout: _onLogout,
  view = 'application',
}) => {
  const navigate = useNavigate();
  const location = useLocation();

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
  const [pickupLoc, setPickupLoc] = useState('');
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
  const isTrackingPage = view === 'tracking';

  // Keep the previous query-string entry points working as route URLs.
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get('tab');
    const refParam = params.get('ref');

    if (location.pathname === '/' && tabParam === 'guidelines') {
      navigate('/about#visitor-guidelines', { replace: true });
      return;
    }

    if (location.pathname === '/' && (tabParam === 'track' || refParam)) {
      const search = refParam ? `?ref=${encodeURIComponent(refParam.trim())}` : '';
      navigate(`/track${search}`, { replace: true });
      return;
    }

    if (location.pathname === '/track' && refParam) {
      const cleanRef = refParam.trim();
      setTrackQuery(cleanRef);
      setTrackingLoading(true);
      fetch(`/api/guest-requests/track/${encodeURIComponent(cleanRef)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.request) {
            setTrackedRequest(data.request);
            setTrackError(null);
          } else {
            setTrackError(data.message || 'No record found with this reference code.');
          }
        })
        .catch((err) => {
          setTrackError(err.message || 'Network error looking up pass.');
        })
        .finally(() => {
          setTrackingLoading(false);
        });
    }
  }, [location.pathname, location.search, navigate]);

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

    // Validation 4: If Transport is requested, pickup point is required
    if (reqTransport && !pickupLoc.trim()) {
      setFormError('Since you requested Campus Shuttle / Transit, please enter your desired Pickup Point or Address.');
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
    <div className={`ctu-public-page ${isTrackingPage ? 'ctu-tracking-page' : 'ctu-home-page'}`}>
      <main className="ctu-public-main">
        {!isTrackingPage && (
          <>
            <section className="ctu-hero ctu-compact-hero" aria-labelledby="ctu-hero-heading">
              <div className="ctu-hero-copy">
                <div className="ctu-hero-eyebrow">CT University • Ferozepur Road, Ludhiana</div>
                <h1 id="ctu-hero-heading">Your Campus Visit Starts Here</h1>
                <p>Request visit clearance and the campus facilities you need in one place.</p>
              </div>
            </section>

            <div id="visitor-application" className="uni-card ctu-reservation-experience">
            <ol className="ctu-reservation-progress" aria-label="Application progress">
              <li className="active"><span>01</span>Visitor details</li>
              <li><span>02</span>Accommodation</li>
              <li><span>03</span>Dining & transport</li>
              <li><span>04</span>Review & submit</li>
            </ol>
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
                      navigate(`/track?ref=${encodeURIComponent(submitSuccess.referenceCode)}`);
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
                <div className="uni-card-header ctu-form-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                    <span className="ctu-form-kicker">
                      VISITOR CLEARANCE & GATE PASS
                    </span>
                    <span className="ctu-form-audience">
                      Examiners • Guest Faculty • Parents • Conference Attendees
                    </span>
                  </div>
                  <h2 className="ctu-form-title">
                    Application for Campus Visit Clearance & Guest Facilities
                  </h2>
                  <p className="ctu-form-description">
                    Please provide your official visitor profile and institutional endorsement details. Once submitted, your visit clearance will be issued, and any optional on-campus lodging or mess dining will be coordinated by the Caretaker Desk.
                  </p>
                </div>

                <div className="uni-card-body ctu-application-body">
                  {formError && (
                    <div
                      className="ctu-form-error"
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
                  <div className="ctu-form-step ctu-form-step-visitor" style={{ marginBottom: '2rem' }}>
                    <div className="ctu-form-step-heading">
                      <span className="ctu-form-step-number">
                        1
                      </span>
                      <h3>
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
                          <option value="Other">Other</option>
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
                          Host Department*
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
                  <div className="ctu-form-step ctu-form-step-facilities" style={{ marginBottom: '2rem' }}>
                    <div className="ctu-form-step-heading ctu-form-step-heading-facilities">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="ctu-form-step-number">
                          2
                        </span>
                        <h3>
                          Campus Hospitality & Facilities (Optional Add-ons)
                        </h3>
                      </div>
                      <span className="ctu-form-step-helper">
                        Tick checkboxes below only if you require lodging, mess meals, or gate shuttle.
                      </span>
                    </div>

                    {/* FACILITY A: ON-CAMPUS LODGING */}
                    <div className={`ctu-facility-card ${reqAccommodation ? 'selected' : ''}`}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span className="ctu-facility-icon">🛏️</span>
                          <div>
                            <div className="ctu-facility-title">
                              On-Campus Transit Accommodation
                            </div>
                            <div className="ctu-facility-description">
                              Faculty Transit Quarters & Hostel Guest Rooms for overnight academic duty.
                            </div>
                          </div>
                        </div>

                        <label className={`ctu-facility-toggle ${reqAccommodation ? 'selected' : ''}`}>
                          <input
                            type="checkbox"
                            checked={reqAccommodation}
                            onChange={(e) => setReqAccommodation(e.target.checked)}
                          />
                          <span>{reqAccommodation ? '✓ Lodging Requested' : '+ Require Room Stay'}</span>
                        </label>
                      </div>

                      {reqAccommodation ? (
                        <div className="ctu-facility-details">
                          <div className="uni-room-grid">
                            <div
                              className={`uni-room-card ${roomType === 'Faculty Transit Room' ? 'selected' : ''}`}
                              onClick={() => setRoomType('Faculty Transit Room')}
                            >
                              <span className="uni-room-tag">FACULTY TRANSIT</span>
                              <div className="ctu-room-title">
                                Faculty Transit Room
                              </div>
                              <p className="ctu-room-description">
                                Single/Twin study room with study desk and attached washroom for visiting examiners & guest professors.
                              </p>
                              <div className="ctu-room-choice">
                                {roomType === 'Faculty Transit Room' ? '✓ Selected' : 'Select Room'}
                              </div>
                            </div>

                            <div
                              className={`uni-room-card ${roomType === 'Hostel Guest Room' ? 'selected' : ''}`}
                              onClick={() => setRoomType('Hostel Guest Room')}
                            >
                              <span className="uni-room-tag">HOSTEL WING</span>
                              <div className="ctu-room-title">
                                Hostel Guest Room
                              </div>
                              <p className="ctu-room-description">
                                Dedicated visitor rooms located in Boys/Girls Hostel guest wings for student parents & research scholars.
                              </p>
                              <div className="ctu-room-choice">
                                {roomType === 'Hostel Guest Room' ? '✓ Selected' : 'Select Room'}
                              </div>
                            </div>

                            <div
                              className={`uni-room-card ${roomType === 'Common Dormitory Bed' ? 'selected' : ''}`}
                              onClick={() => setRoomType('Common Dormitory Bed')}
                            >
                              <span className="uni-room-tag">DORMITORY</span>
                              <div className="ctu-room-title">
                                Common Dormitory Bed
                              </div>
                              <p className="ctu-room-description">
                                Shared hall bed with individual locker. Best for student delegations, workshops & university sports events.
                              </p>
                              <div className="ctu-room-choice">
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
                    <div className={`ctu-facility-card ${reqFood ? 'selected' : ''}`}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span className="ctu-facility-icon">🍽️</span>
                          <div>
                            <div className="ctu-facility-title">
                              Hostel Mess Dining Meal Passes
                            </div>
                            <div className="ctu-facility-description">
                              Freshly prepared vegetarian hostel mess thali in Campus Dining Hall.
                            </div>
                          </div>
                        </div>

                        <label className={`ctu-facility-toggle ${reqFood ? 'selected' : ''}`}>
                          <input
                            type="checkbox"
                            checked={reqFood}
                            onChange={(e) => setReqFood(e.target.checked)}
                          />
                          <span>{reqFood ? '✓ Mess Dining Requested' : '+ Require Mess Meals'}</span>
                        </label>
                      </div>

                      {reqFood ? (
                        <div className="ctu-facility-details">
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
                    <div className={`ctu-facility-card ${reqTransport ? 'selected' : ''}`}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span className="ctu-facility-icon">🚗</span>
                          <div>
                            <div className="ctu-facility-title">
                              Campus Gate Shuttle / Local Transit Assistance
                            </div>
                            <div className="ctu-facility-description">
                              University shuttle from Main Security Gate or City Station to academic departments.
                            </div>
                          </div>
                        </div>

                        <label className={`ctu-facility-toggle ${reqTransport ? 'selected' : ''}`}>
                          <input
                            type="checkbox"
                            checked={reqTransport}
                            onChange={(e) => setReqTransport(e.target.checked)}
                          />
                          <span>{reqTransport ? '✓ Transit Requested' : '+ Require Gate Shuttle'}</span>
                        </label>
                      </div>

                      {reqTransport ? (
                        <div className="ctu-facility-details">
                          <div className="responsive-form-grid">
                            <div>
                              <label className="label-ui" style={{ display: 'block', marginBottom: '4px' }}>
                                Pickup Point / Address *
                              </label>
                              <input
                                type="text"
                                className="input-text"
                                list="pickup-location-suggestions"
                                placeholder="Enter custom pickup point or select..."
                                value={pickupLoc}
                                onChange={(e) => setPickupLoc(e.target.value)}
                                required={reqTransport}
                              />
                              <datalist id="pickup-location-suggestions">
                                <option value="University Main Security Gate" />
                                <option value="Campus Bus Terminal" />
                                <option value="Ludhiana City Railway Station" />
                                <option value="Inter-State Bus Terminal (ISBT)" />
                                <option value="Chandigarh Airport (IXC)" />
                                <option value="Department Front Porch" />
                              </datalist>
                              <span style={{ fontSize: '0.72rem', color: '#64748B', display: 'block', marginTop: '2px' }}>
                                Type any custom pickup location, hotel, or gate.
                              </span>
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
                  <div className="ctu-form-summary">
                    <div className="ctu-form-summary-title">
                      Application Summary:
                    </div>
                    <div className="ctu-form-summary-items">
                      <span className="ctu-summary-chip ctu-summary-clearance">
                        🏛️ Campus Visit Clearance: Mandatory
                      </span>
                      <span className={`ctu-summary-chip ${reqAccommodation ? 'selected' : ''}`}>
                        🛏️ Lodging: {reqAccommodation ? `${roomType} (${guestsCount} Person)` : 'Not Requested'}
                      </span>
                      <span className={`ctu-summary-chip ${reqFood ? 'selected' : ''}`}>
                        🍽️ Mess Meals: {reqFood ? meals.join(', ') : 'Not Requested'}
                      </span>
                      <span className={`ctu-summary-chip ${reqTransport ? 'selected' : ''}`}>
                        🚗 Shuttle: {reqTransport ? pickupLoc : 'Own Conveyance'}
                      </span>
                    </div>
                  </div>

                  {/* Submission Buttons */}
                  <div className="ctu-form-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', flexWrap: 'wrap' }}>
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
          </>
        )}

        {/* =========================================================================
            TRACK APPLICATION / CHECK-IN PASS
           ========================================================================= */}
        {isTrackingPage && (
          <div className="uni-card ctu-tracking-experience">
            <header className="ctu-tracking-header">
              <span>Visitor Services / Track</span>
              <h2>Follow your campus visit.</h2>
              <button type="button" className="ctu-tracking-back" onClick={() => navigate('/#visitor-application')}>
                Back to application form
              </button>
            </header>
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  
                  {/* LIVE MULTI-STAGE PROGRESS TRACKER */}
                  <div
                    style={{
                      border: '1.5px solid #CBD5E1',
                      borderRadius: '8px',
                      padding: '1.5rem',
                      background: '#FFFFFF',
                      boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '1.25rem', borderBottom: '1px solid #E2E8F0', paddingBottom: '0.875rem' }}>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>
                          Multi-Stage Clearance & Allotment Status
                        </div>
                        <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0F172A', margin: '2px 0 0 0' }}>
                          Visitor Application Tracker: #{trackedRequest.referenceCode}
                        </h3>
                      </div>

                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span
                          style={{
                            padding: '4px 12px',
                            borderRadius: '4px',
                            fontSize: '0.8125rem',
                            fontWeight: 700,
                            background: trackedRequest.clearanceStatus === 'approved'
                              ? '#DCFCE7'
                              : trackedRequest.clearanceStatus === 'rejected'
                              ? '#FEE2E2'
                              : '#FEF3C7',
                            color: trackedRequest.clearanceStatus === 'approved'
                              ? '#166534'
                              : trackedRequest.clearanceStatus === 'rejected'
                              ? '#991B1B'
                              : '#92400E',
                          }}
                        >
                          {trackedRequest.clearanceStatus === 'approved'
                            ? '✓ DEAN CLEARED'
                            : trackedRequest.clearanceStatus === 'rejected'
                            ? '✕ REJECTED'
                            : '⏳ UNDER DEAN REVIEW'}
                        </span>

                        <button
                          type="button"
                          className="btn btn-sm btn-secondary"
                          onClick={() => {
                            setTrackingLoading(true);
                            fetch(`/api/guest-requests/track/${encodeURIComponent(trackedRequest.referenceCode)}`)
                              .then((r) => r.json())
                              .then((d) => {
                                if (d.success && d.request) setTrackedRequest(d.request);
                              })
                              .finally(() => setTrackingLoading(false));
                          }}
                          title="Refresh live allotment status"
                        >
                          <RefreshIcon size={12} />
                          <span>Live Refresh</span>
                        </button>
                      </div>
                    </div>

                    {/* Step Timeline Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                      
                      {/* Step 1: Dean Office Clearance */}
                      <div
                        style={{
                          background: trackedRequest.clearanceStatus === 'approved'
                            ? '#F0FDF4'
                            : trackedRequest.clearanceStatus === 'rejected'
                            ? '#FEF2F2'
                            : '#FFFBEB',
                          border: trackedRequest.clearanceStatus === 'approved'
                            ? '1.5px solid #10B981'
                            : trackedRequest.clearanceStatus === 'rejected'
                            ? '1.5px solid #EF4444'
                            : '1.5px solid #F59E0B',
                          borderRadius: '8px',
                          padding: '1rem',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                          <span style={{ fontSize: '1.25rem' }}>
                            {trackedRequest.clearanceStatus === 'approved' ? '✅' : trackedRequest.clearanceStatus === 'rejected' ? '❌' : '⏳'}
                          </span>
                          <strong style={{ fontSize: '0.875rem', color: '#0F172A' }}>
                            1. Dean Office Clearance
                          </strong>
                        </div>
                        <div style={{ fontSize: '0.8125rem', color: '#334155', lineHeight: 1.45 }}>
                          {trackedRequest.clearanceStatus === 'approved' ? (
                            <>
                              <div style={{ color: '#047857', fontWeight: 700 }}>✓ Campus Entry Approved</div>
                              <div style={{ fontSize: '0.72rem', color: '#065F46', marginTop: '2px' }}>
                                Cleared by {trackedRequest.clearedBy || 'Dean Office'}
                              </div>
                            </>
                          ) : trackedRequest.clearanceStatus === 'rejected' ? (
                            <>
                              <div style={{ color: '#B91C1C', fontWeight: 700 }}>✕ Clearance Denied</div>
                              <div style={{ fontSize: '0.72rem', color: '#7F1D1D', marginTop: '2px' }}>
                                Reason: {trackedRequest.clearanceNotes || 'Schedule conflict'}
                              </div>
                            </>
                          ) : (
                            <>
                              <div style={{ color: '#B45309', fontWeight: 700 }}>⏳ Under Dean Review</div>
                              <div style={{ fontSize: '0.72rem', color: '#92400E', marginTop: '2px' }}>
                                Super Admin queue position: In review
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Step 2: Hostel Room Allotment */}
                      <div
                        style={{
                          background: !trackedRequest.accommodation?.selected
                            ? '#F8FAFC'
                            : trackedRequest.accommodation?.status === 'allocated'
                            ? '#F0FDF4'
                            : '#FFFBEB',
                          border: !trackedRequest.accommodation?.selected
                            ? '1px dashed #CBD5E1'
                            : trackedRequest.accommodation?.status === 'allocated'
                            ? '1.5px solid #10B981'
                            : '1.5px solid #F59E0B',
                          borderRadius: '8px',
                          padding: '1rem',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                          <span style={{ fontSize: '1.25rem' }}>🏠</span>
                          <strong style={{ fontSize: '0.875rem', color: '#0F172A' }}>
                            2. Hostel Room Allotment
                          </strong>
                        </div>
                        <div style={{ fontSize: '0.8125rem', color: '#334155', lineHeight: 1.45 }}>
                          {!trackedRequest.accommodation?.selected ? (
                            <div style={{ color: '#64748B', fontSize: '0.75rem' }}>Day Visit (No Lodging Requested)</div>
                          ) : trackedRequest.clearanceStatus !== 'approved' ? (
                            <div style={{ color: '#92400E', fontSize: '0.75rem' }}>Awaiting Super Admin clearance first</div>
                          ) : trackedRequest.accommodation?.allocatedRoom ? (
                            <>
                              <div style={{ color: '#047857', fontWeight: 700 }}>
                                Room: {trackedRequest.accommodation.allocatedRoom}
                              </div>
                              <div style={{ fontSize: '0.72rem', color: '#065F46', marginTop: '2px' }}>
                                {trackedRequest.accommodation.roomType || 'Faculty Room'} • Allotted by Warden
                              </div>
                            </>
                          ) : (
                            <>
                              <div style={{ color: '#B45309', fontWeight: 700 }}>⏳ Dispatched to Hostel Warden</div>
                              <div style={{ fontSize: '0.72rem', color: '#92400E', marginTop: '2px' }}>
                                Room assignment in progress
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Step 3: Mess Dining Passes */}
                      <div
                        style={{
                          background: !trackedRequest.food?.selected
                            ? '#F8FAFC'
                            : trackedRequest.food?.cateringStatus === 'arranged'
                            ? '#F0FDF4'
                            : '#FFFBEB',
                          border: !trackedRequest.food?.selected
                            ? '1px dashed #CBD5E1'
                            : trackedRequest.food?.cateringStatus === 'arranged'
                            ? '1.5px solid #10B981'
                            : '1.5px solid #F59E0B',
                          borderRadius: '8px',
                          padding: '1rem',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                          <span style={{ fontSize: '1.25rem' }}>🍽️</span>
                          <strong style={{ fontSize: '0.875rem', color: '#0F172A' }}>
                            3. Mess Dining Slip
                          </strong>
                        </div>
                        <div style={{ fontSize: '0.8125rem', color: '#334155', lineHeight: 1.45 }}>
                          {!trackedRequest.food?.selected ? (
                            <div style={{ color: '#64748B', fontSize: '0.75rem' }}>Mess Dining Not Requested</div>
                          ) : trackedRequest.clearanceStatus !== 'approved' ? (
                            <div style={{ color: '#92400E', fontSize: '0.75rem' }}>Awaiting Super Admin clearance</div>
                          ) : trackedRequest.food?.cateringStatus === 'arranged' ? (
                            <>
                              <div style={{ color: '#047857', fontWeight: 700 }}>✓ Dining Pass Issued</div>
                              <div style={{ fontSize: '0.72rem', color: '#065F46', marginTop: '2px' }}>
                                {trackedRequest.food.mealsRequired?.join(', ') || 'Meals'} ({trackedRequest.food.dietaryPreference || 'Veg'})
                              </div>
                            </>
                          ) : (
                            <>
                              <div style={{ color: '#B45309', fontWeight: 700 }}>⏳ Dispatched to Mess Desk</div>
                              <div style={{ fontSize: '0.72rem', color: '#92400E', marginTop: '2px' }}>
                                Meal coupon preparation in progress
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Step 4: Gate Shuttle & Transit */}
                      <div
                        style={{
                          background: !trackedRequest.transport?.selected
                            ? '#F8FAFC'
                            : trackedRequest.transport?.allocatedDriver
                            ? '#F0FDF4'
                            : '#FFFBEB',
                          border: !trackedRequest.transport?.selected
                            ? '1px dashed #CBD5E1'
                            : trackedRequest.transport?.allocatedDriver
                            ? '1.5px solid #10B981'
                            : '1.5px solid #F59E0B',
                          borderRadius: '8px',
                          padding: '1rem',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                          <span style={{ fontSize: '1.25rem' }}>🚗</span>
                          <strong style={{ fontSize: '0.875rem', color: '#0F172A' }}>
                            4. Campus Gate Transit
                          </strong>
                        </div>
                        <div style={{ fontSize: '0.8125rem', color: '#334155', lineHeight: 1.45 }}>
                          {!trackedRequest.transport?.selected ? (
                            <div style={{ color: '#64748B', fontSize: '0.75rem' }}>Own Conveyance (No Shuttle)</div>
                          ) : trackedRequest.clearanceStatus !== 'approved' ? (
                            <div style={{ color: '#92400E', fontSize: '0.75rem' }}>Awaiting Super Admin clearance</div>
                          ) : trackedRequest.transport?.allocatedDriver ? (
                            <>
                              <div style={{ color: '#047857', fontWeight: 700 }}>✓ Shuttle Confirmed</div>
                              <div style={{ fontSize: '0.72rem', color: '#065F46', marginTop: '2px' }}>
                                Driver: {trackedRequest.transport.allocatedDriver} {trackedRequest.transport.driverPhone ? `(📞 ${trackedRequest.transport.driverPhone})` : ''}
                              </div>
                            </>
                          ) : (
                            <>
                              <div style={{ color: '#B45309', fontWeight: 700 }}>⏳ Dispatched to Fleet Desk</div>
                              <div style={{ fontSize: '0.72rem', color: '#92400E', marginTop: '2px' }}>
                                Pickup: {trackedRequest.transport.pickupLocation || 'Main Gate'}
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* OFFICIAL DIGITAL GATE PASS (PRINTABLE) */}
                  <div
                    id="printable-gate-pass"
                    style={{
                      border: '2px solid #1E3A8A',
                      borderRadius: '10px',
                      background: '#FFFFFF',
                      overflow: 'hidden',
                      boxShadow: '0 4px 18px rgba(30, 58, 138, 0.08)',
                    }}
                  >
                    {/* Header Ribbon */}
                    <div
                      style={{
                        background: 'linear-gradient(135deg, #1E3A8A 0%, #0F172A 100%)',
                        color: '#FFFFFF',
                        padding: '1.25rem 1.5rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '12px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ fontSize: '2rem' }}>🏛️</div>
                        <div>
                          <div style={{ fontSize: '1.2rem', fontWeight: 800, letterSpacing: '0.04em' }}>
                            CT UNIVERSITY • OFFICIAL DIGITAL ENTRY PASS
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#93C5FD' }}>
                            Campus Visitor Clearance & Hospitality Facility Permit • Dept of CSE
                          </div>
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.6875rem', color: '#CBD5E1', textTransform: 'uppercase' }}>
                          Official Reference Code
                        </div>
                        <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#FCD34D', letterSpacing: '0.05em' }}>
                          {trackedRequest.referenceCode}
                        </div>
                      </div>
                    </div>

                    {/* Pass Body */}
                    <div style={{ padding: '1.5rem' }}>
                      <div className="responsive-form-grid" style={{ marginBottom: '1.25rem' }}>
                        <div>
                          <div style={{ fontSize: '0.75rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 600 }}>Visitor Full Name</div>
                          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F172A' }}>{trackedRequest.guestName}</div>
                          <div style={{ fontSize: '0.8125rem', color: '#475569' }}>{trackedRequest.designation || 'Visitor'}</div>
                        </div>

                        <div>
                          <div style={{ fontSize: '0.75rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 600 }}>Home Institution / Organization</div>
                          <div style={{ fontSize: '1rem', fontWeight: 700, color: '#0F172A' }}>{trackedRequest.institution || 'External'}</div>
                          <div style={{ fontSize: '0.8125rem', color: '#475569' }}>✉️ {trackedRequest.guestEmail}</div>
                        </div>

                        <div>
                          <div style={{ fontSize: '0.75rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 600 }}>Campus Clearance Decision</div>
                          <div style={{ fontSize: '1rem', fontWeight: 800, color: trackedRequest.clearanceStatus === 'approved' ? '#059669' : '#D97706' }}>
                            {trackedRequest.clearanceStatus === 'approved' ? '✓ CLEARED FOR GATE ENTRY' : '⏳ PENDING DEAN CLEARANCE'}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                            {trackedRequest.clearedBy ? `Approved by ${trackedRequest.clearedBy}` : 'Dean Office queue'}
                          </div>
                        </div>

                        <div>
                          <div style={{ fontSize: '0.75rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 600 }}>Allocated Hostel Room</div>
                          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: trackedRequest.accommodation?.allocatedRoom ? '#059669' : '#D97706' }}>
                            {trackedRequest.accommodation?.allocatedRoom || (trackedRequest.accommodation?.selected ? 'Under Allotment' : 'Day Visit (No Room)')}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                            {trackedRequest.accommodation?.selected ? `Check-In: ${trackedRequest.accommodation.checkInDate || 'Arrival'}` : 'N/A'}
                          </div>
                        </div>
                      </div>

                      {/* Official Host and Purpose Details */}
                      <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '10px 14px', borderRadius: '6px', fontSize: '0.8125rem', color: '#334155', marginBottom: '1.25rem' }}>
                        <strong>Host Department & Official Purpose:</strong> {trackedRequest.purposeOfVisit || 'Campus Academic Duty'}
                      </div>

                      {/* Facility Summary Table */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px', padding: '12px', background: '#EFF6FF', borderRadius: '6px', border: '1px solid #BFDBFE', fontSize: '0.8125rem' }}>
                        <div>
                          <span style={{ color: '#1E40AF', fontWeight: 600 }}>Mess Dining Pass:</span><br/>
                          <strong>{trackedRequest.food?.selected ? `${trackedRequest.food.mealsRequired?.join(', ') || 'Meals'} (${trackedRequest.food.cateringStatus === 'arranged' ? 'Pass Issued' : 'Pending'})` : 'Not Requested'}</strong>
                        </div>
                        <div>
                          <span style={{ color: '#1E40AF', fontWeight: 600 }}>Gate Shuttle / Pickup:</span><br/>
                          <strong>{trackedRequest.transport?.selected ? `${trackedRequest.transport.pickupLocation || 'Main Gate'} (${trackedRequest.transport.allocatedDriver ? 'Driver: ' + trackedRequest.transport.allocatedDriver : 'Pending Fleet'})` : 'Own Conveyance'}</strong>
                        </div>
                        <div>
                          <span style={{ color: '#1E40AF', fontWeight: 600 }}>Security Verification:</span><br/>
                          <strong>Photo ID Required at Gate</strong>
                        </div>
                      </div>

                      {/* Footer Actions */}
                      <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', borderTop: '1px solid #E2E8F0', paddingTop: '1rem' }}>
                        <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                          Show this reference code or digital pass at the University Main Security Gate.
                        </div>

                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => copyToClipboard(trackedRequest.referenceCode)}
                          >
                            {copiedCode ? <CheckIcon size={12} color="#059669" /> : <CopyIcon size={12} />}
                            <span>{copiedCode ? 'Copied' : 'Copy Reference Code'}</span>
                          </button>
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            style={{ background: '#1E3A8A' }}
                            onClick={() => window.print()}
                          >
                            <span>🖨️ Print Digital Entry Pass</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              )}
            </div>
          </div>
        )}

      </main>
    </div>
  );
};
