// Super Admin Dashboard Controller
document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');

  if (!token || !userStr) {
    showToast('Unauthorized', 'Please login with Super Admin credentials.', 'error');
    setTimeout(() => { window.location.href = '/login.html'; }, 1000);
    return;
  }

  let currentUser;
  try {
    currentUser = JSON.parse(userStr);
  } catch (e) {
    window.location.href = '/login.html';
    return;
  }

  // Check if actually Super Admin (Hardcoded ID 10001)
  if (currentUser.role !== 'superadmin' || currentUser.id !== '10001') {
    showToast('Access Denied', 'Super Admin clearance required (ID: 10001).', 'error');
    setTimeout(() => { window.location.href = '/login.html'; }, 1200);
    return;
  }

  // Setup Admin Header Info
  const adminNameEl = document.getElementById('admin-display-name');
  if (adminNameEl) adminNameEl.textContent = currentUser.name || 'Super Administrator';

  // Navigation Tabs within Admin
  const navLinks = document.querySelectorAll('.sidebar-link[data-section]');
  const sections = document.querySelectorAll('.admin-section');

  navLinks.forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetSectionId = link.getAttribute('data-section');

      navLinks.forEach((l) => l.classList.remove('active'));
      link.classList.add('active');

      sections.forEach((sec) => {
        if (sec.id === targetSectionId) {
          sec.style.display = 'block';
        } else {
          sec.style.display = 'none';
        }
      });
    });
  });

  // Logout Handler
  const logoutBtn = document.getElementById('admin-logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      showToast('Logged Out', 'Super Admin session terminated.', 'info');
      setTimeout(() => { window.location.href = '/login.html'; }, 800);
    });
  }

  // Initialize Data
  loadAdminStats();
  loadRegisteredUsers();
  loadAdminBookings();
  loadAdminServices();

  // Search & Filter Listeners for Users Table
  const userSearchInput = document.getElementById('user-search-input');
  const userRoleFilter = document.getElementById('user-role-filter');
  const userStatusFilter = document.getElementById('user-status-filter');

  if (userSearchInput) {
    userSearchInput.addEventListener('input', debounce(() => loadRegisteredUsers(), 300));
  }
  if (userRoleFilter) {
    userRoleFilter.addEventListener('change', () => loadRegisteredUsers());
  }
  if (userStatusFilter) {
    userStatusFilter.addEventListener('change', () => loadRegisteredUsers());
  }

  // Seed sample packages button
  const seedBtn = document.getElementById('btn-seed-services');
  if (seedBtn) {
    seedBtn.addEventListener('click', async () => {
      try {
        seedBtn.disabled = true;
        seedBtn.innerHTML = '⏳ Seeding...';
        const res = await fetch('/api/admin/seed-services?force=true', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success) {
          showToast('Database Seeded', data.message, 'success');
          loadAdminStats();
          loadAdminServices();
        } else {
          showToast('Error', data.message, 'error');
        }
      } catch (err) {
        showToast('Error', err.message, 'error');
      } finally {
        seedBtn.disabled = false;
        seedBtn.innerHTML = '⚡ Seed Sample Packages';
      }
    });
  }

  // Add Service Modal Handling
  const openServiceModalBtn = document.getElementById('btn-open-add-service');
  const serviceModal = document.getElementById('service-modal');
  const closeServiceModalBtn = document.getElementById('btn-close-service-modal');
  const cancelServiceModalBtn = document.getElementById('btn-cancel-service-modal');
  const addServiceForm = document.getElementById('add-service-form');

  if (openServiceModalBtn && serviceModal) {
    openServiceModalBtn.addEventListener('click', () => {
      serviceModal.classList.add('active');
    });
  }

  if (closeServiceModalBtn && serviceModal) {
    closeServiceModalBtn.addEventListener('click', () => {
      serviceModal.classList.remove('active');
    });
  }

  if (cancelServiceModalBtn && serviceModal) {
    cancelServiceModalBtn.addEventListener('click', () => {
      serviceModal.classList.remove('active');
    });
  }

  if (addServiceForm) {
    addServiceForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const title = document.getElementById('service-title').value.trim();
      const category = document.getElementById('service-category').value;
      const price = document.getElementById('service-price').value;
      const duration = document.getElementById('service-duration').value.trim();
      const capacity = document.getElementById('service-capacity').value;
      const description = document.getElementById('service-desc').value.trim();
      const perks = document.getElementById('service-perks').value.trim();
      const image = document.getElementById('service-image').value.trim();

      try {
        const res = await fetch('/api/services', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ title, category, price, duration, capacity, description, perks, image }),
        });

        const data = await res.json();
        if (data.success) {
          showToast('Service Created', data.message, 'success');
          addServiceForm.reset();
          serviceModal.classList.remove('active');
          loadAdminServices();
          loadAdminStats();
        } else {
          showToast('Creation Failed', data.message, 'error');
        }
      } catch (err) {
        showToast('Error', err.message, 'error');
      }
    });
  }
});

// Load Overview Statistics
async function loadAdminStats() {
  const token = localStorage.getItem('token');
  try {
    const res = await fetch('/api/admin/stats', {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    const data = await res.json();

    if (data.success) {
      const stats = data.stats;
      const mongo = data.mongoInfo;

      // Update KPI Elements
      const totalUsersEl = document.getElementById('stat-total-users');
      if (totalUsersEl) totalUsersEl.textContent = stats.totalUsers || 0;

      const activeBookingsEl = document.getElementById('stat-active-bookings');
      if (activeBookingsEl) activeBookingsEl.textContent = stats.totalBookings || 0;

      const totalRevenueEl = document.getElementById('stat-total-revenue');
      if (totalRevenueEl) totalRevenueEl.textContent = '$' + (stats.totalRevenue || 0).toLocaleString();

      const totalServicesEl = document.getElementById('stat-total-services');
      if (totalServicesEl) totalServicesEl.textContent = stats.totalServices || 0;

      // Badges in sidebar
      const badgeUsers = document.getElementById('sidebar-user-count');
      if (badgeUsers) badgeUsers.textContent = stats.totalUsers || 0;

      const badgeBookings = document.getElementById('sidebar-booking-count');
      if (badgeBookings) badgeBookings.textContent = stats.totalBookings || 0;

      // Mongo Atlas Pill
      const atlasPill = document.getElementById('atlas-connection-pill');
      if (atlasPill) {
        atlasPill.innerHTML = `
          <span class="status-dot active pulse"></span>
          <span>Atlas Live: ${mongo.database} (${mongo.status})</span>
        `;
      }

      // Diagnostic info block
      const diagHost = document.getElementById('diag-host');
      if (diagHost) diagHost.textContent = mongo.host;

      const diagDb = document.getElementById('diag-db');
      if (diagDb) diagDb.textContent = mongo.database;

      const diagUptime = document.getElementById('diag-uptime');
      if (diagUptime) diagUptime.textContent = Math.floor(mongo.uptime) + 's';
    }
  } catch (err) {
    console.error('Failed to fetch admin stats:', err);
  }
}

// Load Registered Users from MongoDB
async function loadRegisteredUsers() {
  const token = localStorage.getItem('token');
  const tbody = document.getElementById('users-table-body');
  if (!tbody) return;

  const search = document.getElementById('user-search-input')?.value || '';
  const role = document.getElementById('user-role-filter')?.value || 'all';
  const status = document.getElementById('user-status-filter')?.value || 'all';

  try {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 24px;">Loading registered guests from MongoDB Atlas...</td></tr>';

    const query = new URLSearchParams({ search, role, status });
    const res = await fetch(`/api/admin/users?${query.toString()}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    const data = await res.json();

    if (data.success) {
      if (data.users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 30px; color: var(--text-muted);">No users match your criteria.</td></tr>';
        return;
      }

      tbody.innerHTML = data.users.map((user) => {
        const initials = user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
        const roleBadges = {
          vip: '<span class="badge badge-gold">VIP Guest</span>',
          guest: '<span class="badge badge-blue">Guest</span>',
          staff: '<span class="badge badge-purple">Staff</span>',
        };
        const statusBadge = user.status === 'active' 
          ? '<span class="badge badge-green">Active</span>' 
          : '<span class="badge badge-red">Suspended</span>';

        const dateStr = new Date(user.createdAt).toLocaleDateString('en-US', {
          month: 'short', day: 'numeric', year: 'numeric'
        });

        return `
          <tr>
            <td>
              <div class="user-cell">
                <div class="user-mini-avatar">${initials}</div>
                <div>
                  <div class="user-info-name">${user.name}</div>
                  <div class="user-info-email">${user.email}</div>
                </div>
              </div>
            </td>
            <td>${user.phone || '<span style="color:#64748b">—</span>'}</td>
            <td>
              <select class="form-control" style="padding: 4px 8px; font-size: 0.8rem; width: auto;" onchange="updateUserRole('${user._id}', this.value)">
                <option value="guest" ${user.role === 'guest' ? 'selected' : ''}>Guest</option>
                <option value="vip" ${user.role === 'vip' ? 'selected' : ''}>VIP Guest</option>
                <option value="staff" ${user.role === 'staff' ? 'selected' : ''}>Staff</option>
              </select>
            </td>
            <td>${statusBadge}</td>
            <td>
              <div style="font-size: 0.78rem; color: #cbd5e1; max-width: 180px;">
                ${(user.preferences || []).join(', ') || 'General Leisure'}
              </div>
            </td>
            <td style="font-size: 0.82rem; color: var(--text-muted);">${dateStr}</td>
            <td>
              <div style="display:flex; gap: 6px;">
                <button class="btn btn-sm ${user.status === 'active' ? 'btn-ghost' : 'btn-gold'}" 
                  onclick="toggleUserStatus('${user._id}', '${user.status === 'active' ? 'suspended' : 'active'}')">
                  ${user.status === 'active' ? 'Suspend' : 'Activate'}
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteUser('${user._id}', '${user.name}')">
                  Delete
                </button>
              </div>
            </td>
          </tr>
        `;
      }).join('');
    }
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" style="color: #f43f5e; text-align:center;">Failed to load users: ${err.message}</td></tr>`;
  }
}

// User Actions
async function toggleUserStatus(userId, newStatus) {
  const token = localStorage.getItem('token');
  try {
    const res = await fetch(`/api/admin/users/${userId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ status: newStatus }),
    });
    const data = await res.json();
    if (data.success) {
      showToast('Status Updated', data.message, 'success');
      loadRegisteredUsers();
      loadAdminStats();
    } else {
      showToast('Error', data.message, 'error');
    }
  } catch (err) {
    showToast('Error', err.message, 'error');
  }
}

async function updateUserRole(userId, newRole) {
  const token = localStorage.getItem('token');
  try {
    const res = await fetch(`/api/admin/users/${userId}/role`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ role: newRole }),
    });
    const data = await res.json();
    if (data.success) {
      showToast('Role Changed', data.message, 'success');
      loadRegisteredUsers();
    } else {
      showToast('Error', data.message, 'error');
    }
  } catch (err) {
    showToast('Error', err.message, 'error');
  }
}

async function deleteUser(userId, userName) {
  if (!confirm(`Are you sure you want to permanently delete user "${userName}" from MongoDB?`)) {
    return;
  }
  const token = localStorage.getItem('token');
  try {
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` },
    });
    const data = await res.json();
    if (data.success) {
      showToast('User Deleted', data.message, 'success');
      loadRegisteredUsers();
      loadAdminStats();
    } else {
      showToast('Error', data.message, 'error');
    }
  } catch (err) {
    showToast('Error', err.message, 'error');
  }
}

// Load Bookings across Platform
async function loadAdminBookings() {
  const token = localStorage.getItem('token');
  const tbody = document.getElementById('bookings-table-body');
  if (!tbody) return;

  try {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 24px;">Loading reservations...</td></tr>';
    const res = await fetch('/api/admin/bookings', {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    const data = await res.json();

    if (data.success) {
      if (data.bookings.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 30px; color: var(--text-muted);">No guest leisure reservations recorded yet.</td></tr>';
        return;
      }

      tbody.innerHTML = data.bookings.map((booking) => {
        const statusColors = {
          confirmed: '<span class="badge badge-green">Confirmed</span>',
          pending: '<span class="badge badge-gold">Pending</span>',
          completed: '<span class="badge badge-blue">Completed</span>',
          cancelled: '<span class="badge badge-red">Cancelled</span>',
        };

        return `
          <tr>
            <td><strong style="color: var(--gold-light); font-family: monospace;">${booking.bookingReference}</strong></td>
            <td>
              <div style="font-weight: 600;">${booking.userName}</div>
              <div style="font-size: 0.8rem; color: var(--text-muted);">${booking.userEmail}</div>
            </td>
            <td><strong>${booking.serviceTitle}</strong></td>
            <td>
              <div>📅 ${booking.bookingDate}</div>
              <div style="font-size: 0.8rem; color: var(--text-muted);">⏰ ${booking.timeSlot} (${booking.guestsCount} guests)</div>
            </td>
            <td><strong style="color: #34d399; font-size: 1rem;">$${booking.totalAmount}</strong></td>
            <td>${statusColors[booking.status] || booking.status}</td>
            <td>
              <select class="form-control" style="padding: 4px 8px; font-size: 0.8rem; width: auto;" onchange="updateBookingStatus('${booking._id}', this.value)">
                <option value="confirmed" ${booking.status === 'confirmed' ? 'selected' : ''}>Confirm</option>
                <option value="pending" ${booking.status === 'pending' ? 'selected' : ''}>Pending</option>
                <option value="completed" ${booking.status === 'completed' ? 'selected' : ''}>Complete</option>
                <option value="cancelled" ${booking.status === 'cancelled' ? 'selected' : ''}>Cancel</option>
              </select>
            </td>
          </tr>
        `;
      }).join('');
    }
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" style="color: #f43f5e; text-align:center;">Failed to load bookings: ${err.message}</td></tr>`;
  }
}

async function updateBookingStatus(bookingId, status) {
  const token = localStorage.getItem('token');
  try {
    const res = await fetch(`/api/admin/bookings/${bookingId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ status }),
    });
    const data = await res.json();
    if (data.success) {
      showToast('Booking Updated', data.message, 'success');
      loadAdminBookings();
      loadAdminStats();
    } else {
      showToast('Error', data.message, 'error');
    }
  } catch (err) {
    showToast('Error', err.message, 'error');
  }
}

// Load Leisure Packages
async function loadAdminServices() {
  const token = localStorage.getItem('token');
  const container = document.getElementById('admin-services-grid');
  if (!container) return;

  try {
    const res = await fetch('/api/services');
    const data = await res.json();

    if (data.success) {
      container.innerHTML = data.services.map((svc) => {
        return `
          <div class="service-admin-card">
            <img src="${svc.image || 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=800&q=80'}" class="service-admin-img" alt="${svc.title}" />
            <div class="service-admin-body">
              <div style="display:flex; justify-content: space-between; align-items: flex-start;">
                <span class="badge badge-gold">${svc.category}</span>
                <span style="font-size: 0.85rem; color: #fbbf24;">★ ${svc.rating}</span>
              </div>
              <h4>${svc.title}</h4>
              <p style="font-size: 0.82rem; color: var(--text-muted); line-height: 1.5;">${svc.description.substring(0, 110)}...</p>
              <div style="font-size: 0.8rem; color: #cbd5e1;">⏱️ ${svc.duration} • 👥 Max ${svc.capacity} Guests</div>
              <div class="service-admin-meta">
                <div class="service-admin-price">$${svc.price}</div>
                <button class="btn btn-sm btn-danger" onclick="deleteService('${svc._id}', '${svc.title}')">
                  Remove
                </button>
              </div>
            </div>
          </div>
        `;
      }).join('');
    }
  } catch (err) {
    container.innerHTML = `<div style="color: #f43f5e; padding: 20px;">Failed to load services: ${err.message}</div>`;
  }
}

async function deleteService(serviceId, title) {
  if (!confirm(`Delete leisure experience "${title}"?`)) return;
  const token = localStorage.getItem('token');
  try {
    const res = await fetch(`/api/services/${serviceId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` },
    });
    const data = await res.json();
    if (data.success) {
      showToast('Deleted', data.message, 'success');
      loadAdminServices();
      loadAdminStats();
    } else {
      showToast('Error', data.message, 'error');
    }
  } catch (err) {
    showToast('Error', err.message, 'error');
  }
}

// Utility: Debounce
function debounce(fn, delay) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}
