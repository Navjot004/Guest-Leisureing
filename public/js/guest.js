// Guest Portal Controller
document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');

  if (!token) {
    showToast('Sign In Required', 'Please log in to access your Guest Leisureing Hub.', 'warning');
    setTimeout(() => { window.location.href = '/login.html'; }, 1000);
    return;
  }

  let user = null;
  try {
    user = JSON.parse(userStr);
  } catch (e) {}

  // If superadmin happens to open guest portal, offer admin portal link
  if (user && user.role === 'superadmin') {
    const adminLinkBanner = document.getElementById('admin-quick-switch-banner');
    if (adminLinkBanner) adminLinkBanner.style.display = 'block';
  }

  // Set Profile Elements
  const guestNameEl = document.getElementById('guest-name');
  const guestEmailEl = document.getElementById('guest-email');
  const guestRoleEl = document.getElementById('guest-role-badge');
  const guestAvatarLetter = document.getElementById('guest-avatar-letter');

  if (user) {
    if (guestNameEl) guestNameEl.textContent = user.name || 'Valued Guest';
    if (guestEmailEl) guestEmailEl.textContent = user.email || '';
    if (guestAvatarLetter) guestAvatarLetter.textContent = (user.name ? user.name[0] : 'G').toUpperCase();
    if (guestRoleEl) {
      guestRoleEl.textContent = user.role === 'vip' ? 'VIP Resident' : 'Guest Member';
      guestRoleEl.className = user.role === 'vip' ? 'badge badge-gold' : 'badge badge-blue';
    }
  }

  // Logout Handler
  const logoutBtn = document.getElementById('guest-logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      showToast('Logged Out', 'You have successfully signed out.', 'info');
      setTimeout(() => { window.location.href = '/login.html'; }, 800);
    });
  }

  // Load Services & User Bookings
  loadGuestServices();
  loadMyBookings();

  // Category Filter Pill click events
  document.querySelectorAll('.cat-pill').forEach((pill) => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('.cat-pill').forEach((p) => p.classList.remove('active'));
      pill.classList.add('active');
      const cat = pill.getAttribute('data-cat');
      loadGuestServices(cat);
    });
  });

  // Modal Setup
  setupBookingModal();
});

let allServices = [];
let currentSelectedService = null;
let currentGuestCount = 1;

// Load Leisure Experiences
async function loadGuestServices(category = 'All') {
  const container = document.getElementById('experiences-container');
  if (!container) return;

  try {
    container.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--gold-light);">Loading exclusive resort leisure packages...</div>';

    let url = '/api/services';
    if (category && category !== 'All') {
      url += `?category=${encodeURIComponent(category)}`;
    }

    const res = await fetch(url);
    const data = await res.json();

    if (data.success) {
      allServices = data.services;
      if (allServices.length === 0) {
        container.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-muted);">No experiences found in this category.</div>';
        return;
      }

      container.innerHTML = allServices.map((svc) => {
        const perksHtml = (svc.perks || []).map(p => `<span class="perk-tag">${p}</span>`).join('');
        return `
          <div class="experience-card">
            <div class="experience-img-wrap">
              <img src="${svc.image || 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=800&q=80'}" class="experience-img" alt="${svc.title}" />
              <div class="experience-badge">${svc.category}</div>
              <div class="experience-rating">★ ${svc.rating || 4.9}</div>
            </div>
            <div class="experience-body">
              <h3 class="experience-title">${svc.title}</h3>
              <p class="experience-desc">${svc.description}</p>
              <div class="experience-perks">${perksHtml}</div>
              <div class="experience-footer">
                <div class="experience-price">$${svc.price} <span>/ experience</span></div>
                <button class="btn btn-gold btn-sm" onclick="openBookingModal('${svc._id}')">
                  Reserve &rarr;
                </button>
              </div>
            </div>
          </div>
        `;
      }).join('');
    }
  } catch (err) {
    container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: #f43f5e; padding: 40px;">Failed to load services: ${err.message}</div>`;
  }
}

// Setup Booking Modal & Calculation Logic
function setupBookingModal() {
  const modal = document.getElementById('booking-modal');
  const closeBtn = document.getElementById('btn-close-booking-modal');
  const cancelBtn = document.getElementById('btn-cancel-booking-modal');
  const bookingForm = document.getElementById('booking-form');

  const btnMinus = document.getElementById('btn-guest-minus');
  const btnPlus = document.getElementById('btn-guest-plus');
  const guestsDisplay = document.getElementById('guest-count-display');

  // Set default booking date to tomorrow
  const dateInput = document.getElementById('booking-date');
  if (dateInput) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    dateInput.min = tomorrow.toISOString().split('T')[0];
    dateInput.value = tomorrow.toISOString().split('T')[0];
  }

  if (closeBtn && modal) {
    closeBtn.addEventListener('click', () => modal.classList.remove('active'));
  }
  if (cancelBtn && modal) {
    cancelBtn.addEventListener('click', () => modal.classList.remove('active'));
  }

  // Guest count +/- buttons
  if (btnMinus && btnPlus && guestsDisplay) {
    btnMinus.addEventListener('click', () => {
      if (currentGuestCount > 1) {
        currentGuestCount--;
        guestsDisplay.textContent = currentGuestCount;
        updateBookingTotal();
      }
    });

    btnPlus.addEventListener('click', () => {
      const maxCap = currentSelectedService ? currentSelectedService.capacity : 6;
      if (currentGuestCount < maxCap) {
        currentGuestCount++;
        guestsDisplay.textContent = currentGuestCount;
        updateBookingTotal();
      } else {
        showToast('Capacity Limit', `Max allowed for this experience is ${maxCap} guests.`, 'warning');
      }
    });
  }

  // Booking Form Submission
  if (bookingForm) {
    bookingForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const token = localStorage.getItem('token');
      if (!currentSelectedService) return;

      const bookingDate = dateInput.value;
      const timeSlot = document.getElementById('booking-timeslot').value;
      const specialRequests = document.getElementById('booking-requests').value.trim();

      const submitBtn = bookingForm.querySelector('button[type="submit"]');
      const originalText = submitBtn.innerHTML;

      try {
        submitBtn.disabled = true;
        submitBtn.innerHTML = 'Securing Reservation...';

        const res = await fetch('/api/bookings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            serviceId: currentSelectedService._id,
            bookingDate,
            timeSlot,
            guestsCount: currentGuestCount,
            specialRequests,
          }),
        });

        const data = await res.json();
        if (data.success) {
          showToast('Booking Confirmed!', `Ref: ${data.booking.bookingReference}`, 'success');
          modal.classList.remove('active');
          loadMyBookings();
        } else {
          showToast('Booking Failed', data.message, 'error');
        }
      } catch (err) {
        showToast('Error', err.message, 'error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
      }
    });
  }
}

// Open Booking Modal for a specific experience
window.openBookingModal = function(serviceId) {
  currentSelectedService = allServices.find(s => s._id === serviceId);
  if (!currentSelectedService) return;

  currentGuestCount = 1;
  const guestsDisplay = document.getElementById('guest-count-display');
  if (guestsDisplay) guestsDisplay.textContent = '1';

  const modal = document.getElementById('booking-modal');
  const titleEl = document.getElementById('modal-service-title');
  const priceEl = document.getElementById('modal-service-price');
  const durationEl = document.getElementById('modal-service-duration');

  if (titleEl) titleEl.textContent = currentSelectedService.title;
  if (priceEl) priceEl.textContent = `$${currentSelectedService.price} / guest`;
  if (durationEl) durationEl.textContent = `⏱️ ${currentSelectedService.duration} • 👥 Up to ${currentSelectedService.capacity} Guests`;

  updateBookingTotal();

  if (modal) modal.classList.add('active');
};

function updateBookingTotal() {
  if (!currentSelectedService) return;
  const total = currentSelectedService.price * currentGuestCount;
  const totalEl = document.getElementById('modal-total-price');
  if (totalEl) totalEl.textContent = `$${total.toLocaleString()}`;
}

// Load Guest's Personal Bookings
async function loadMyBookings() {
  const token = localStorage.getItem('token');
  const container = document.getElementById('my-bookings-list');
  const statUpcoming = document.getElementById('stat-upcoming-bookings');
  if (!container) return;

  try {
    const res = await fetch('/api/bookings/my', {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    const data = await res.json();

    if (data.success) {
      const bookings = data.bookings;
      if (statUpcoming) statUpcoming.textContent = bookings.filter(b => b.status === 'confirmed').length;

      if (bookings.length === 0) {
        container.innerHTML = `
          <div style="background: rgba(15, 23, 42, 0.6); border: 1px dashed var(--glass-border); border-radius: 14px; padding: 36px; text-align: center;">
            <p style="color: var(--text-muted); margin-bottom: 12px;">You do not have any active leisure reservations yet.</p>
            <a href="#experiences-section" class="btn btn-outline-gold btn-sm">Explore Leisure Experiences</a>
          </div>
        `;
        return;
      }

      const statusMap = {
        confirmed: '<span class="badge badge-green">Confirmed</span>',
        pending: '<span class="badge badge-gold">Pending</span>',
        completed: '<span class="badge badge-blue">Completed</span>',
        cancelled: '<span class="badge badge-red">Cancelled</span>',
      };

      container.innerHTML = bookings.map((b) => {
        const canCancel = b.status === 'confirmed' || b.status === 'pending';
        return `
          <div class="booking-item-card">
            <div class="booking-details-block">
              <div style="display:flex; align-items:center; gap: 12px; margin-bottom: 6px;">
                <span style="font-family: monospace; color: var(--gold-light); font-size: 0.85rem;">${b.bookingReference}</span>
                ${statusMap[b.status] || b.status}
              </div>
              <h4>${b.serviceTitle}</h4>
              <div class="booking-meta-row">
                <span>📅 Date: <strong>${b.bookingDate}</strong></span>
                <span>⏰ Time: <strong>${b.timeSlot}</strong></span>
                <span>👥 Guests: <strong>${b.guestsCount}</strong></span>
                <span>💰 Total: <strong style="color: #34d399;">$${b.totalAmount}</strong></span>
              </div>
              ${b.specialRequests ? `<div style="font-size: 0.82rem; color: #cbd5e1; margin-top: 6px;">Note: "${b.specialRequests}"</div>` : ''}
            </div>
            <div>
              ${canCancel ? `
                <button class="btn btn-sm btn-danger" onclick="cancelGuestBooking('${b._id}')">
                  Cancel Reservation
                </button>
              ` : ''}
            </div>
          </div>
        `;
      }).join('');
    }
  } catch (err) {
    container.innerHTML = `<div style="color: #f43f5e; padding: 20px;">Failed to load your itinerary: ${err.message}</div>`;
  }
}

// Cancel booking
window.cancelGuestBooking = async function(bookingId) {
  if (!confirm('Are you sure you want to cancel this leisure reservation?')) return;
  const token = localStorage.getItem('token');
  try {
    const res = await fetch(`/api/bookings/${bookingId}/cancel`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}` },
    });
    const data = await res.json();
    if (data.success) {
      showToast('Cancelled', data.message, 'info');
      loadMyBookings();
    } else {
      showToast('Error', data.message, 'error');
    }
  } catch (err) {
    showToast('Error', err.message, 'error');
  }
};
