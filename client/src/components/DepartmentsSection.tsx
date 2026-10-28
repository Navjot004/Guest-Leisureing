import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  CarIcon,
  BedIcon,
  UtensilsIcon,
  SearchIcon,
  RefreshIcon,
  CloseIcon,
  TrashIcon,
} from './Icons';

export interface DepartmentGuestRequest {
  _id: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  designation?: string;
  institution?: string;
  purposeOfVisit?: string;
  referenceCode: string;
  accommodation?: {
    selected: boolean;
    checkInDate?: string;
    checkOutDate?: string;
    roomType?: string;
    guestsCount?: number;
    specialRequests?: string;
    allocatedRoom?: string;
    assignedBy?: string;
    status?: 'pending' | 'allocated' | 'completed' | 'cancelled';
    adminNotes?: string;
  };
  food?: {
    selected: boolean;
    dietaryPreference?: 'Vegetarian' | 'Non-Vegetarian' | 'Jain' | 'Vegan' | 'Other';
    mealsRequired?: string[];
    specialDietaryNotes?: string;
    cateringStatus?: 'pending' | 'arranged' | 'completed' | 'cancelled';
    assignedBy?: string;
    adminNotes?: string;
  };
  transport?: {
    selected: boolean;
    pickupLocation?: string;
    dropLocation?: string;
    pickupDateTime?: string;
    passengers?: number;
    vehiclePreference?: string;
    allocatedVehicle?: string;
    allocatedDriver?: string;
    driverPhone?: string;
    status?: 'pending' | 'assigned' | 'in_transit' | 'completed' | 'cancelled';
    assignedBy?: string;
    adminNotes?: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface DepartmentsSectionProps {
  token: string | null;
}

export const DepartmentsSection: React.FC<DepartmentsSectionProps> = ({ token }) => {
  const location = useLocation();
  const navigate = useNavigate();

  // Determine active department from URL
  const getActiveTab = (): 'transport' | 'accommodation' | 'food' => {
    if (location.pathname.includes('/departments/accommodation')) return 'accommodation';
    if (location.pathname.includes('/departments/food')) return 'food';
    return 'transport'; // Default
  };

  const activeDept = getActiveTab();

  const handleTabChange = (tab: 'transport' | 'accommodation' | 'food') => {
    if (tab === 'transport') {
      navigate('/super-admin/departments/transport');
    } else if (tab === 'accommodation') {
      navigate('/super-admin/departments/accommodation');
    } else {
      navigate('/super-admin/departments/food');
    }
  };

  // Real Database Records (ZERO MOCK DATA)
  const [requests, setRequests] = useState<DepartmentGuestRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Search and filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modal: Guest Hospitality Request Form (Fill out form selecting services)
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [formData, setFormData] = useState({
    guestName: '',
    guestEmail: '',
    guestPhone: '',
    designation: '',
    institution: '',
    purposeOfVisit: '',
    // Accommodation Selection
    accommodationNeeded: true,
    checkInDate: '',
    checkOutDate: '',
    roomType: 'Deluxe Room',
    guestsCount: 1,
    specialAccommodationRequests: '',
    // Food Selection
    foodNeeded: true,
    dietaryPreference: 'Vegetarian' as 'Vegetarian' | 'Non-Vegetarian' | 'Jain' | 'Vegan' | 'Other',
    mealsBreakfast: true,
    mealsLunch: true,
    mealsDinner: true,
    specialDietaryNotes: '',
    // Transport Selection
    transportNeeded: true,
    pickupLocation: 'IGI Airport Terminal 3',
    dropLocation: 'University Guest House',
    pickupDateTime: '',
    passengers: 1,
    vehiclePreference: 'Sedan',
  });

  // Modal: Department Admin Resource Allocation
  const [assigningRequest, setAssigningRequest] = useState<DepartmentGuestRequest | null>(null);
  const [assignmentData, setAssignmentData] = useState({
    allocatedVehicle: '',
    allocatedDriver: '',
    driverPhone: '',
    allocatedRoom: '',
    status: 'assigned',
    cateringStatus: 'arranged',
    adminNotes: '',
  });
  const [savingAssignment, setSavingAssignment] = useState(false);

  // Modal: Delete Request Confirmation
  const [requestToDelete, setRequestToDelete] = useState<{ id: string; name: string } | null>(null);
  const [deletingRequest, setDeletingRequest] = useState(false);

  // Fetch real data on tab change or token update
  useEffect(() => {
    if (token) {
      loadRequests();
    }
  }, [activeDept, token]);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/departments/requests?department=${activeDept}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setRequests(data.requests);
      } else {
        setFeedback({ text: data.message || 'Failed to load department requests', type: 'error' });
      }
    } catch (err: any) {
      setFeedback({ text: 'Error connecting to database: ' + err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Submit real guest request form to MongoDB
  const handleSaveGuestRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.guestName || !formData.guestEmail) {
      setFeedback({ text: 'Guest Name and Email are required.', type: 'error' });
      return;
    }

    try {
      setSubmittingRequest(true);
      const mealsRequired: string[] = [];
      if (formData.mealsBreakfast) mealsRequired.push('Breakfast');
      if (formData.mealsLunch) mealsRequired.push('Lunch');
      if (formData.mealsDinner) mealsRequired.push('Dinner');

      const payload = {
        guestName: formData.guestName,
        guestEmail: formData.guestEmail,
        guestPhone: formData.guestPhone,
        designation: formData.designation,
        institution: formData.institution,
        purposeOfVisit: formData.purposeOfVisit,
        accommodation: {
          selected: formData.accommodationNeeded,
          checkInDate: formData.checkInDate,
          checkOutDate: formData.checkOutDate,
          roomType: formData.roomType,
          guestsCount: Number(formData.guestsCount) || 1,
          specialRequests: formData.specialAccommodationRequests,
        },
        food: {
          selected: formData.foodNeeded,
          dietaryPreference: formData.dietaryPreference,
          mealsRequired,
          specialDietaryNotes: formData.specialDietaryNotes,
        },
        transport: {
          selected: formData.transportNeeded,
          pickupLocation: formData.pickupLocation,
          dropLocation: formData.dropLocation,
          pickupDateTime: formData.pickupDateTime,
          passengers: Number(formData.passengers) || 1,
          vehiclePreference: formData.vehiclePreference,
        },
      };

      const res = await fetch('/api/admin/departments/requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        setFeedback({
          text: `Guest request registered successfully! Reference ID: ${data.request?.referenceCode}`,
          type: 'success',
        });
        setShowRequestModal(false);
        // Reset form
        setFormData({
          guestName: '',
          guestEmail: '',
          guestPhone: '',
          designation: '',
          institution: '',
          purposeOfVisit: '',
          accommodationNeeded: true,
          checkInDate: '',
          checkOutDate: '',
          roomType: 'Deluxe Room',
          guestsCount: 1,
          specialAccommodationRequests: '',
          foodNeeded: true,
          dietaryPreference: 'Vegetarian',
          mealsBreakfast: true,
          mealsLunch: true,
          mealsDinner: true,
          specialDietaryNotes: '',
          transportNeeded: true,
          pickupLocation: 'IGI Airport Terminal 3',
          dropLocation: 'University Guest House',
          pickupDateTime: '',
          passengers: 1,
          vehiclePreference: 'Sedan',
        });
        // Reload real data
        loadRequests();
      } else {
        setFeedback({ text: data.message || 'Failed to submit guest request', type: 'error' });
      }
    } catch (err: any) {
      setFeedback({ text: 'Error saving request: ' + err.message, type: 'error' });
    } finally {
      setSubmittingRequest(false);
    }
  };

  // Open resource assignment modal
  const handleOpenAssignModal = (reqItem: DepartmentGuestRequest) => {
    setAssigningRequest(reqItem);
    if (activeDept === 'transport') {
      setAssignmentData({
        allocatedVehicle: reqItem.transport?.allocatedVehicle || '',
        allocatedDriver: reqItem.transport?.allocatedDriver || '',
        driverPhone: reqItem.transport?.driverPhone || '',
        allocatedRoom: '',
        status: reqItem.transport?.status || 'assigned',
        cateringStatus: 'arranged',
        adminNotes: reqItem.transport?.adminNotes || '',
      });
    } else if (activeDept === 'accommodation') {
      setAssignmentData({
        allocatedVehicle: '',
        allocatedDriver: '',
        driverPhone: '',
        allocatedRoom: reqItem.accommodation?.allocatedRoom || '',
        status: reqItem.accommodation?.status || 'allocated',
        cateringStatus: 'arranged',
        adminNotes: reqItem.accommodation?.adminNotes || '',
      });
    } else {
      setAssignmentData({
        allocatedVehicle: '',
        allocatedDriver: '',
        driverPhone: '',
        allocatedRoom: '',
        status: 'pending',
        cateringStatus: reqItem.food?.cateringStatus || 'arranged',
        adminNotes: reqItem.food?.adminNotes || '',
      });
    }
  };

  // Save resource assignment (Dept Admin / Super Admin)
  const handleSaveAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningRequest) return;

    try {
      setSavingAssignment(true);
      const res = await fetch(`/api/admin/departments/requests/${assigningRequest._id}/assign`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          department: activeDept,
          assignmentData,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setFeedback({
          text: `Resource allocated successfully for ${assigningRequest.guestName}.`,
          type: 'success',
        });
        setAssigningRequest(null);
        loadRequests();
      } else {
        setFeedback({ text: data.message || 'Failed to assign resource', type: 'error' });
      }
    } catch (err: any) {
      setFeedback({ text: 'Error allocating resource: ' + err.message, type: 'error' });
    } finally {
      setSavingAssignment(false);
    }
  };

  // Confirm and permanently delete request from MongoDB
  const confirmDeleteRequest = async () => {
    if (!requestToDelete) return;
    try {
      setDeletingRequest(true);
      const res = await fetch(`/api/admin/departments/requests/${requestToDelete.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({ text: data.message, type: 'success' });
        setRequestToDelete(null);
        loadRequests();
      } else {
        setFeedback({ text: data.message, type: 'error' });
      }
    } catch (err: any) {
      setFeedback({ text: 'Error deleting request: ' + err.message, type: 'error' });
    } finally {
      setDeletingRequest(false);
    }
  };

  // Filter real records based on search and status
  const filteredRequests = requests.filter((r) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      r.guestName.toLowerCase().includes(q) ||
      r.guestEmail.toLowerCase().includes(q) ||
      r.referenceCode.toLowerCase().includes(q) ||
      (r.institution && r.institution.toLowerCase().includes(q));

    let matchesStatus = true;
    if (statusFilter !== 'all') {
      if (activeDept === 'transport') {
        matchesStatus = r.transport?.status === statusFilter;
      } else if (activeDept === 'accommodation') {
        matchesStatus = r.accommodation?.status === statusFilter;
      } else if (activeDept === 'food') {
        matchesStatus = r.food?.cateringStatus === statusFilter;
      }
    }

    return matchesSearch && matchesStatus;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Feedback banner */}
      {feedback && (
        <div className={`callout callout-${feedback.type}`}>
          {feedback.text}
        </div>
      )}

      {/* 3-Way Segmented Department Switcher */}
      <div
        className="segmented-track"
        style={{
          width: 'fit-content',
          minWidth: '380px',
          maxWidth: '100%',
        }}
      >
        <button
          type="button"
          className={`segmented-segment ${activeDept === 'transport' ? 'active' : ''}`}
          onClick={() => {
            handleTabChange('transport');
            setSearchQuery('');
            setStatusFilter('all');
          }}
        >
          <CarIcon size={15} />
          <span>Transport Requests</span>
        </button>

        <button
          type="button"
          className={`segmented-segment ${activeDept === 'accommodation' ? 'active' : ''}`}
          onClick={() => {
            handleTabChange('accommodation');
            setSearchQuery('');
            setStatusFilter('all');
          }}
        >
          <BedIcon size={15} />
          <span>Accommodation Requests</span>
        </button>

        <button
          type="button"
          className={`segmented-segment ${activeDept === 'food' ? 'active' : ''}`}
          onClick={() => {
            handleTabChange('food');
            setSearchQuery('');
            setStatusFilter('all');
          }}
        >
          <UtensilsIcon size={15} />
          <span>Food & Dining Requests</span>
        </button>
      </div>

      {/* Main Table Card for Department Section */}
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
              {activeDept === 'transport'
                ? 'Guests Requesting Transport'
                : activeDept === 'accommodation'
                ? 'Guests Requesting Accommodation'
                : 'Guests Requesting Food & Dining'}{' '}
              ({filteredRequests.length} Records)
            </span>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                type="text"
                className="text-input mono"
                placeholder="Search guest, email, ref..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
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
              <option value="all">All Statuses</option>
              {activeDept === 'transport' && (
                <>
                  <option value="pending">Pending</option>
                  <option value="assigned">Assigned</option>
                  <option value="in_transit">In Transit</option>
                  <option value="completed">Completed</option>
                </>
              )}
              {activeDept === 'accommodation' && (
                <>
                  <option value="pending">Pending</option>
                  <option value="allocated">Allocated</option>
                  <option value="completed">Completed</option>
                </>
              )}
              {activeDept === 'food' && (
                <>
                  <option value="pending">Pending</option>
                  <option value="arranged">Arranged</option>
                  <option value="completed">Completed</option>
                </>
              )}
            </select>

            <button type="button" className="btn btn-xs btn-secondary" onClick={loadRequests} title="Refresh Database">
              <RefreshIcon size={12} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* 1. TRANSPORT REQUESTS TABLE */}
        {activeDept === 'transport' && (
          <div className="data-table-container" style={{ border: 'none', borderRadius: 0 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Guest Information</th>
                  <th>Pickup & Drop Location</th>
                  <th>Date & Time</th>
                  <th>Vehicle Req & Pax</th>
                  <th>Assigned Vehicle & Driver</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                      Loading real transport requests from MongoDB...
                    </td>
                  </tr>
                ) : filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)' }}>
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '44px',
                          height: '44px',
                          borderRadius: '50%',
                          background: 'var(--surface-muted)',
                          color: 'var(--text-muted)',
                          marginBottom: '12px',
                        }}
                      >
                        <CarIcon size={22} />
                      </div>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px', fontSize: '0.875rem' }}>
                        No Transport Requests Found
                      </div>
                      <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', maxWidth: '420px', margin: '0 auto' }}>
                        Guest transit and airport transfer requests submitted by guests will automatically appear here for departmental vehicle and driver assignment.
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredRequests.map((r) => (
                    <tr key={r._id}>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{r.guestName}</div>
                        <div className="label-code-sm" style={{ color: 'var(--text-muted)', fontSize: '0.6875rem' }}>
                          {r.institution || r.designation || r.guestEmail}
                        </div>
                        <span className="code-chip" style={{ fontSize: '0.625rem', marginTop: '2px' }}>
                          {r.referenceCode}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                          From: {r.transport?.pickupLocation || 'TBD'}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          To: {r.transport?.dropLocation || 'TBD'}
                        </div>
                      </td>
                      <td>
                        <span className="code-chip" style={{ fontSize: '0.6875rem' }}>
                          {r.transport?.pickupDateTime || 'As per itinerary'}
                        </span>
                      </td>
                      <td>
                        <div className="label-ui" style={{ fontSize: '0.75rem' }}>
                          {r.transport?.vehiclePreference || 'Sedan'}
                        </div>
                        <div className="label-code-sm" style={{ color: 'var(--text-dim)', fontSize: '0.6875rem' }}>
                          {r.transport?.passengers || 1} Passenger(s)
                        </div>
                      </td>
                      <td>
                        {r.transport?.allocatedVehicle || r.transport?.allocatedDriver ? (
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.75rem' }}>
                              {r.transport?.allocatedVehicle}
                            </div>
                            <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                              {r.transport?.allocatedDriver} ({r.transport?.driverPhone})
                            </div>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                            Pending Dept Admin Assignment
                          </span>
                        )}
                      </td>
                      <td>
                        <span
                          className={`badge-pill ${
                            r.transport?.status === 'assigned'
                              ? 'badge-cleared'
                              : r.transport?.status === 'in_transit'
                              ? 'badge-primary'
                              : r.transport?.status === 'completed'
                              ? 'badge-cleared'
                              : 'badge-suspended'
                          }`}
                        >
                          {r.transport?.status ? r.transport.status.toUpperCase() : 'PENDING'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <button
                            type="button"
                            className="btn btn-xs btn-secondary"
                            onClick={() => handleOpenAssignModal(r)}
                            title="Assign Driver or Vehicle"
                          >
                            Assign Resource
                          </button>
                          <button
                            type="button"
                            className="btn btn-xs btn-danger"
                            onClick={() => setRequestToDelete({ id: r._id, name: r.guestName })}
                            title="Delete guest request"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          >
                            <TrashIcon size={12} />
                            <span>Delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* 2. ACCOMMODATION REQUESTS TABLE */}
        {activeDept === 'accommodation' && (
          <div className="data-table-container" style={{ border: 'none', borderRadius: 0 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Guest Information</th>
                  <th>Dates (Check-in & Check-out)</th>
                  <th>Room Category & Guests</th>
                  <th>Special Lodging Requests</th>
                  <th>Allocated Room / Suite</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                      Loading real accommodation requests from MongoDB...
                    </td>
                  </tr>
                ) : filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)' }}>
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '44px',
                          height: '44px',
                          borderRadius: '50%',
                          background: 'var(--surface-muted)',
                          color: 'var(--text-muted)',
                          marginBottom: '12px',
                        }}
                      >
                        <BedIcon size={22} />
                      </div>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px', fontSize: '0.875rem' }}>
                        No Accommodation Requests Found
                      </div>
                      <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', maxWidth: '420px', margin: '0 auto' }}>
                        Guest room booking and suite reservation requests submitted by guests will automatically appear here for lodging administration and room key allocation.
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredRequests.map((r) => (
                    <tr key={r._id}>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{r.guestName}</div>
                        <div className="label-code-sm" style={{ color: 'var(--text-muted)', fontSize: '0.6875rem' }}>
                          {r.institution || r.designation || r.guestEmail}
                        </div>
                        <span className="code-chip" style={{ fontSize: '0.625rem', marginTop: '2px' }}>
                          {r.referenceCode}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                          In: {r.accommodation?.checkInDate || 'TBD'}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Out: {r.accommodation?.checkOutDate || 'TBD'}
                        </div>
                      </td>
                      <td>
                        <span className="label-ui" style={{ fontSize: '0.75rem' }}>
                          {r.accommodation?.roomType || 'Standard Room'}
                        </span>
                        <div className="label-code-sm" style={{ color: 'var(--text-dim)', fontSize: '0.6875rem' }}>
                          {r.accommodation?.guestsCount || 1} Guest(s)
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', maxWidth: '240px' }}>
                          {r.accommodation?.specialRequests || 'None specified'}
                        </div>
                      </td>
                      <td>
                        {r.accommodation?.allocatedRoom ? (
                          <span className="code-chip" style={{ fontWeight: 600 }}>
                            {r.accommodation.allocatedRoom}
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                            Pending Dept Admin Assignment
                          </span>
                        )}
                      </td>
                      <td>
                        <span
                          className={`badge-pill ${
                            r.accommodation?.status === 'allocated'
                              ? 'badge-cleared'
                              : r.accommodation?.status === 'completed'
                              ? 'badge-primary'
                              : 'badge-suspended'
                          }`}
                        >
                          {r.accommodation?.status ? r.accommodation.status.toUpperCase() : 'PENDING'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <button
                            type="button"
                            className="btn btn-xs btn-secondary"
                            onClick={() => handleOpenAssignModal(r)}
                            title="Assign Room"
                          >
                            Assign Room
                          </button>
                          <button
                            type="button"
                            className="btn btn-xs btn-danger"
                            onClick={() => setRequestToDelete({ id: r._id, name: r.guestName })}
                            title="Delete guest request"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          >
                            <TrashIcon size={12} />
                            <span>Delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* 3. FOOD & DINING REQUESTS TABLE */}
        {activeDept === 'food' && (
          <div className="data-table-container" style={{ border: 'none', borderRadius: 0 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Guest Information</th>
                  <th>Dietary Preference</th>
                  <th>Meals Requested</th>
                  <th>Special Dietary & Allergens</th>
                  <th>Catering Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                      Loading real food & dining requests from MongoDB...
                    </td>
                  </tr>
                ) : filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)' }}>
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '44px',
                          height: '44px',
                          borderRadius: '50%',
                          background: 'var(--surface-muted)',
                          color: 'var(--text-muted)',
                          marginBottom: '12px',
                        }}
                      >
                        <UtensilsIcon size={22} />
                      </div>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px', fontSize: '0.875rem' }}>
                        No Food & Dining Requests Found
                      </div>
                      <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', maxWidth: '420px', margin: '0 auto' }}>
                        Special dietary preferences, banquet catering, and VIP dining meal requests submitted by guests will automatically appear here for kitchen administration.
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredRequests.map((r) => (
                    <tr key={r._id}>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{r.guestName}</div>
                        <div className="label-code-sm" style={{ color: 'var(--text-muted)', fontSize: '0.6875rem' }}>
                          {r.institution || r.designation || r.guestEmail}
                        </div>
                        <span className="code-chip" style={{ fontSize: '0.625rem', marginTop: '2px' }}>
                          {r.referenceCode}
                        </span>
                      </td>
                      <td>
                        <span className="label-ui" style={{ fontSize: '0.75rem' }}>
                          {r.food?.dietaryPreference || 'Vegetarian'}
                        </span>
                      </td>
                      <td>
                        {r.food?.mealsRequired && r.food.mealsRequired.length > 0 ? (
                          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                            {r.food.mealsRequired.map((m) => (
                              <span key={m} className="code-chip" style={{ fontSize: '0.6875rem' }}>
                                {m}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>All Sessions</span>
                        )}
                      </td>
                      <td>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', maxWidth: '280px' }}>
                          {r.food?.specialDietaryNotes || 'Standard university catering'}
                        </div>
                      </td>
                      <td>
                        <span
                          className={`badge-pill ${
                            r.food?.cateringStatus === 'arranged'
                              ? 'badge-cleared'
                              : r.food?.cateringStatus === 'completed'
                              ? 'badge-primary'
                              : 'badge-suspended'
                          }`}
                        >
                          {r.food?.cateringStatus ? r.food.cateringStatus.toUpperCase() : 'PENDING'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <button
                            type="button"
                            className="btn btn-xs btn-secondary"
                            onClick={() => handleOpenAssignModal(r)}
                            title="Update Catering Arrangement"
                          >
                            Update Catering
                          </button>
                          <button
                            type="button"
                            className="btn btn-xs btn-danger"
                            onClick={() => setRequestToDelete({ id: r._id, name: r.guestName })}
                            title="Delete guest request"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          >
                            <TrashIcon size={12} />
                            <span>Delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: SUBMIT GUEST HOSPITALITY REQUEST FORM */}
      {showRequestModal && (
        <div className="modal-backdrop">
          <div className="modal-container" style={{ maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <div>
                <h3 className="headline-sm">Guest Hospitality Request Form</h3>
                <p className="body-sm" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                  Guest selects accommodation, food, and transport requirements.
                </p>
              </div>
              <button type="button" className="icon-button" onClick={() => setShowRequestModal(false)}>
                <CloseIcon size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveGuestRequest}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* 1. Guest Information */}
                <div style={{ background: 'var(--surface-hover)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
                  <span className="label-ui" style={{ color: 'var(--text-primary)', marginBottom: '8px', display: 'block' }}>
                    1. Guest Credentials & Profile
                  </span>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label className="label-ui">Full Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Prof. Arvind Subramanian"
                        className="text-input"
                        value={formData.guestName}
                        onChange={(e) => setFormData({ ...formData, guestName: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="label-ui">Email Address *</label>
                      <input
                        type="email"
                        required
                        placeholder="e.g. arvind.sub@iitd.ac.in"
                        className="text-input mono"
                        value={formData.guestEmail}
                        onChange={(e) => setFormData({ ...formData, guestEmail: e.target.value })}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginTop: '10px' }}>
                    <div>
                      <label className="label-ui">Phone Number</label>
                      <input
                        type="text"
                        placeholder="e.g. +91 98765-43210"
                        className="text-input mono"
                        value={formData.guestPhone}
                        onChange={(e) => setFormData({ ...formData, guestPhone: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="label-ui">Designation</label>
                      <input
                        type="text"
                        placeholder="e.g. Visiting Professor"
                        className="text-input"
                        value={formData.designation}
                        onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="label-ui">Institution / Org</label>
                      <input
                        type="text"
                        placeholder="e.g. IIT Delhi"
                        className="text-input"
                        value={formData.institution}
                        onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Service Selections: Accommodation */}
                <div style={{ border: '1px solid var(--border-structural)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600 }}>
                    <input
                      type="checkbox"
                      checked={formData.accommodationNeeded}
                      onChange={(e) => setFormData({ ...formData, accommodationNeeded: e.target.checked })}
                    />
                    <span>Requires Guest House Accommodation</span>
                  </label>

                  {formData.accommodationNeeded && (
                    <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <div>
                          <label className="label-ui">Check-in Date & Time</label>
                          <input
                            type="text"
                            placeholder="e.g. 28 Oct 2026, 12:00 PM"
                            className="text-input mono"
                            value={formData.checkInDate}
                            onChange={(e) => setFormData({ ...formData, checkInDate: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="label-ui">Check-out Date & Time</label>
                          <input
                            type="text"
                            placeholder="e.g. 30 Oct 2026, 11:00 AM"
                            className="text-input mono"
                            value={formData.checkOutDate}
                            onChange={(e) => setFormData({ ...formData, checkOutDate: e.target.value })}
                          />
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <div>
                          <label className="label-ui">Room Category Preference</label>
                          <select
                            className="text-input"
                            value={formData.roomType}
                            onChange={(e) => setFormData({ ...formData, roomType: e.target.value })}
                          >
                            <option value="Executive Suite">Executive Suite</option>
                            <option value="Deluxe Room">Deluxe Room</option>
                            <option value="Standard Room">Standard Room</option>
                          </select>
                        </div>
                        <div>
                          <label className="label-ui">Total Guests Staying</label>
                          <input
                            type="number"
                            min={1}
                            max={6}
                            className="text-input mono"
                            value={formData.guestsCount}
                            onChange={(e) => setFormData({ ...formData, guestsCount: Number(e.target.value) })}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="label-ui">Special Lodging Requests</label>
                        <input
                          type="text"
                          placeholder="e.g. Quiet corner room, ground floor preference"
                          className="text-input"
                          value={formData.specialAccommodationRequests}
                          onChange={(e) => setFormData({ ...formData, specialAccommodationRequests: e.target.value })}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. Service Selections: Food & Dining */}
                <div style={{ border: '1px solid var(--border-structural)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600 }}>
                    <input
                      type="checkbox"
                      checked={formData.foodNeeded}
                      onChange={(e) => setFormData({ ...formData, foodNeeded: e.target.checked })}
                    />
                    <span>Requires Food & Dining Arrangements</span>
                  </label>

                  {formData.foodNeeded && (
                    <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <div>
                          <label className="label-ui">Dietary Preference</label>
                          <select
                            className="text-input"
                            value={formData.dietaryPreference}
                            onChange={(e) => setFormData({ ...formData, dietaryPreference: e.target.value as any })}
                          >
                            <option value="Vegetarian">Vegetarian</option>
                            <option value="Non-Vegetarian">Non-Vegetarian</option>
                            <option value="Jain">Jain (No Root Veg)</option>
                            <option value="Vegan">Vegan</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                        <div>
                          <label className="label-ui">Required Daily Meals</label>
                          <div style={{ display: 'flex', gap: '12px', marginTop: '6px' }}>
                            <label style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <input
                                type="checkbox"
                                checked={formData.mealsBreakfast}
                                onChange={(e) => setFormData({ ...formData, mealsBreakfast: e.target.checked })}
                              />
                              Breakfast
                            </label>
                            <label style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <input
                                type="checkbox"
                                checked={formData.mealsLunch}
                                onChange={(e) => setFormData({ ...formData, mealsLunch: e.target.checked })}
                              />
                              Lunch
                            </label>
                            <label style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <input
                                type="checkbox"
                                checked={formData.mealsDinner}
                                onChange={(e) => setFormData({ ...formData, mealsDinner: e.target.checked })}
                              />
                              Dinner
                            </label>
                          </div>
                        </div>
                      </div>
                      <div>
                        <label className="label-ui">Allergies / Special Dining Notes</label>
                        <input
                          type="text"
                          placeholder="e.g. Gluten-free, no peanuts, mild spices"
                          className="text-input"
                          value={formData.specialDietaryNotes}
                          onChange={(e) => setFormData({ ...formData, specialDietaryNotes: e.target.value })}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* 4. Service Selections: Transport */}
                <div style={{ border: '1px solid var(--border-structural)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600 }}>
                    <input
                      type="checkbox"
                      checked={formData.transportNeeded}
                      onChange={(e) => setFormData({ ...formData, transportNeeded: e.target.checked })}
                    />
                    <span>Requires Transport / Transit</span>
                  </label>

                  {formData.transportNeeded && (
                    <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <div>
                          <label className="label-ui">Pickup Location</label>
                          <input
                            type="text"
                            placeholder="e.g. IGI Airport Terminal 3"
                            className="text-input"
                            value={formData.pickupLocation}
                            onChange={(e) => setFormData({ ...formData, pickupLocation: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="label-ui">Drop-off Destination</label>
                          <input
                            type="text"
                            placeholder="e.g. University Main Guest House"
                            className="text-input"
                            value={formData.dropLocation}
                            onChange={(e) => setFormData({ ...formData, dropLocation: e.target.value })}
                          />
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                        <div>
                          <label className="label-ui">Pickup Date & Time</label>
                          <input
                            type="text"
                            placeholder="e.g. 28 Oct, 09:30 AM"
                            className="text-input mono"
                            value={formData.pickupDateTime}
                            onChange={(e) => setFormData({ ...formData, pickupDateTime: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="label-ui">Vehicle Preference</label>
                          <select
                            className="text-input"
                            value={formData.vehiclePreference}
                            onChange={(e) => setFormData({ ...formData, vehiclePreference: e.target.value })}
                          >
                            <option value="Sedan">Sedan</option>
                            <option value="SUV">SUV (Innova)</option>
                            <option value="EV Van">EV Van</option>
                            <option value="Minibus">Minibus</option>
                          </select>
                        </div>
                        <div>
                          <label className="label-ui">Passengers</label>
                          <input
                            type="number"
                            min={1}
                            max={15}
                            className="text-input mono"
                            value={formData.passengers}
                            onChange={(e) => setFormData({ ...formData, passengers: Number(e.target.value) })}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  className="btn btn-sm btn-secondary"
                  onClick={() => setShowRequestModal(false)}
                  disabled={submittingRequest}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-sm btn-primary" disabled={submittingRequest}>
                  {submittingRequest ? 'Submitting to MongoDB...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ASSIGN RESOURCE (Dept Admin / Super Admin) */}
      {assigningRequest && (
        <div
          className="modal-backdrop"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            zIndex: 1100,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !savingAssignment) setAssigningRequest(null);
          }}
        >
          <div
            className="modal-container"
            style={{
              maxWidth: '520px',
              width: '100%',
              backgroundColor: '#FFFFFF',
              borderRadius: '14px',
              border: '1px solid #E2E8F0',
              boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.35)',
              overflow: 'hidden',
              position: 'relative',
              zIndex: 1101,
            }}
          >
            <div
              className="modal-header"
              style={{
                backgroundColor: '#FFFFFF',
                padding: '18px 22px',
                borderBottom: '1px solid #E2E8F0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <h3 className="headline-sm" style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Assign {activeDept === 'transport' ? 'Vehicle & Driver' : activeDept === 'accommodation' ? 'Room / Suite' : 'Catering Details'}
                </h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                  Guest: <strong style={{ color: 'var(--text-primary)' }}>{assigningRequest.guestName}</strong>{' '}
                  <span className="code-chip" style={{ marginLeft: '4px', fontSize: '0.6875rem' }}>
                    {assigningRequest.referenceCode}
                  </span>
                </p>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => setAssigningRequest(null)}
                title="Close"
                style={{
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '6px',
                  border: '1px solid #E2E8F0',
                  background: '#F8FAFC',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                }}
              >
                <CloseIcon size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveAssignment}>
              <div
                className="modal-body"
                style={{
                  backgroundColor: '#FFFFFF',
                  padding: '22px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                }}
              >
                {activeDept === 'transport' && (
                  <>
                    <div>
                      <label className="label-ui" style={{ marginBottom: '6px', display: 'block' }}>
                        Allocated Vehicle
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Toyota Innova Crysta (DL-01-AB-1204)"
                        className="text-input"
                        value={assignmentData.allocatedVehicle}
                        onChange={(e) => setAssignmentData({ ...assignmentData, allocatedVehicle: e.target.value })}
                      />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div>
                        <label className="label-ui" style={{ marginBottom: '6px', display: 'block' }}>
                          Driver Name
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Rajesh Kumar"
                          className="text-input"
                          value={assignmentData.allocatedDriver}
                          onChange={(e) => setAssignmentData({ ...assignmentData, allocatedDriver: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="label-ui" style={{ marginBottom: '6px', display: 'block' }}>
                          Driver Phone Number
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. +91 98765-43210"
                          className="text-input mono"
                          value={assignmentData.driverPhone}
                          onChange={(e) => setAssignmentData({ ...assignmentData, driverPhone: e.target.value })}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="label-ui" style={{ marginBottom: '6px', display: 'block' }}>
                        Transit Status
                      </label>
                      <select
                        className="text-input"
                        value={assignmentData.status}
                        onChange={(e) => setAssignmentData({ ...assignmentData, status: e.target.value })}
                      >
                        <option value="pending">Pending</option>
                        <option value="assigned">Assigned</option>
                        <option value="in_transit">In Transit</option>
                        <option value="completed">Completed</option>
                      </select>
                    </div>
                  </>
                )}

                {activeDept === 'accommodation' && (
                  <>
                    <div>
                      <label className="label-ui" style={{ marginBottom: '6px', display: 'block' }}>
                        Allocated Room / Suite Number
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. GH-101 (Executive Suite, Block A)"
                        className="text-input mono"
                        value={assignmentData.allocatedRoom}
                        onChange={(e) => setAssignmentData({ ...assignmentData, allocatedRoom: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="label-ui" style={{ marginBottom: '6px', display: 'block' }}>
                        Accommodation Status
                      </label>
                      <select
                        className="text-input"
                        value={assignmentData.status}
                        onChange={(e) => setAssignmentData({ ...assignmentData, status: e.target.value })}
                      >
                        <option value="pending">Pending</option>
                        <option value="allocated">Allocated</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                  </>
                )}

                {activeDept === 'food' && (
                  <>
                    <div>
                      <label className="label-ui" style={{ marginBottom: '6px', display: 'block' }}>
                        Catering Status
                      </label>
                      <select
                        className="text-input"
                        value={assignmentData.cateringStatus}
                        onChange={(e) => setAssignmentData({ ...assignmentData, cateringStatus: e.target.value })}
                      >
                        <option value="pending">Pending Kitchen Action</option>
                        <option value="arranged">Arranged & Confirmed</option>
                        <option value="completed">Served / Completed</option>
                      </select>
                    </div>
                    <div>
                      <label className="label-ui" style={{ marginBottom: '6px', display: 'block' }}>
                        Kitchen / Dining Hall Notes
                      </label>
                      <textarea
                        rows={2}
                        placeholder="e.g. Notified Executive Chef for Jain Meal at Syndicate Table"
                        className="text-input"
                        value={assignmentData.adminNotes}
                        onChange={(e) => setAssignmentData({ ...assignmentData, adminNotes: e.target.value })}
                      />
                    </div>
                  </>
                )}
              </div>

              <div
                className="modal-footer"
                style={{
                  backgroundColor: '#F8FAFC',
                  padding: '14px 22px',
                  borderTop: '1px solid #E2E8F0',
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '10px',
                }}
              >
                <button
                  type="button"
                  className="btn btn-sm btn-secondary"
                  onClick={() => setAssigningRequest(null)}
                  disabled={savingAssignment}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-sm btn-primary" disabled={savingAssignment}>
                  {savingAssignment ? 'Saving to Database...' : 'Save Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRM DELETE GUEST REQUEST */}
      {requestToDelete && (
        <div
          className="modal-backdrop"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            zIndex: 1100,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !deletingRequest) setRequestToDelete(null);
          }}
        >
          <div
            className="modal-container"
            style={{
              maxWidth: '440px',
              width: '100%',
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              border: '1px solid #E2E8F0',
              boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.35)',
              textAlign: 'center',
              padding: '28px 24px',
              position: 'relative',
              zIndex: 1101,
            }}
          >
            <div
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '50%',
                background: '#FEE2E2',
                color: '#DC2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                border: '1px solid #FCA5A5',
              }}
            >
              <TrashIcon size={24} />
            </div>
            <h3 className="headline-sm" style={{ marginBottom: '8px', fontSize: '1.125rem', fontWeight: 600, color: '#0F172A' }}>
              Delete Request?
            </h3>
            <p style={{ color: '#64748B', fontSize: '0.875rem', lineHeight: '1.45', marginBottom: '24px' }}>
              Are you sure you want to permanently remove the guest request for <strong style={{ color: '#0F172A' }}>{requestToDelete.name}</strong>? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={() => setRequestToDelete(null)}
                disabled={deletingRequest}
                style={{ minWidth: '90px' }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-sm btn-danger"
                onClick={confirmDeleteRequest}
                disabled={deletingRequest}
                style={{
                  background: '#DC2626',
                  color: '#FFFFFF',
                  borderColor: '#DC2626',
                  minWidth: '120px',
                  fontWeight: 600,
                  boxShadow: '0 2px 4px rgba(220, 38, 38, 0.25)',
                }}
              >
                {deletingRequest ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


