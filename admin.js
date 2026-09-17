/**
 * Ca Pac SG - Admin Panel Client Logic
 * Bookings Management, Live Website Content Updates, & Auth State
 */

let allBookings = [];
let siteConfig = {};

document.addEventListener('DOMContentLoaded', () => {
  initAuth();
  initNavigation();
  initBookingsHandlers();
  initSettingsHandlers();
  initCredentialsHandler();
});

/* ==========================================================================
   1. Authentication & Session
   ========================================================================== */
function initAuth() {
  const loginView = document.getElementById('login-view');
  const dashboardView = document.getElementById('dashboard-view');
  const loginForm = document.getElementById('admin-login-form');
  const logoutBtn = document.getElementById('admin-logout-btn');

  // Check saved session
  const token = sessionStorage.getItem('capac_admin_token');
  if (token) {
    showDashboard();
  } else {
    showLogin();
  }

  loginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('admin-username').value.trim();
    const password = document.getElementById('admin-password').value.trim();
    const submitBtn = loginForm.querySelector('button[type="submit"]');

    submitBtn.disabled = true;
    submitBtn.innerHTML = 'Authenticating...';

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        sessionStorage.setItem('capac_admin_token', data.token);
        showAdminToast('Welcome back, Administrator!', 'success');
        showDashboard();
      } else {
        showAdminToast(data.message || 'Invalid username or password', 'error');
      }
    } catch (err) {
      // Fallback local verification
      if ((username.toLowerCase() === 'audit@singaporeca.sg' || username.toLowerCase() === 'admin') && 
          (password === '65139986' || password === 'admin123')) {
        sessionStorage.setItem('capac_admin_token', 'local_token');
        showAdminToast('Welcome back, Administrator!', 'success');
        showDashboard();
      } else {
        showAdminToast('Invalid username or password', 'error');
      }
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = 'Sign In to Dashboard';
    }
  });

  logoutBtn?.addEventListener('click', () => {
    sessionStorage.removeItem('capac_admin_token');
    showLogin();
    showAdminToast('You have been logged out securely.', 'info');
  });

  function showDashboard() {
    loginView.classList.add('hidden');
    dashboardView.classList.remove('hidden');
    loadBookings();
    loadSiteConfig();
  }

  function showLogin() {
    dashboardView.classList.add('hidden');
    loginView.classList.remove('hidden');
  }
}

/* ==========================================================================
   2. Dashboard Navigation & Tabs
   ========================================================================== */
function initNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  const tabPanes = document.querySelectorAll('.tab-pane');

  navItems.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');
      
      navItems.forEach(n => n.classList.remove('active'));
      tabPanes.forEach(p => p.classList.add('hidden'));

      btn.classList.add('active');
      const activePane = document.getElementById(`tab-${targetTab}`);
      if (activePane) activePane.classList.remove('hidden');

      // Refresh data if switching tabs
      if (targetTab === 'bookings') renderBookingsTable();
      if (targetTab === 'settings') fillSettingsForm();
    });
  });
}

/* ==========================================================================
   3. Bookings Management
   ========================================================================== */
async function loadBookings() {
  try {
    const res = await fetch('/api/bookings');
    if (res.ok) {
      allBookings = await res.json();
    } else {
      allBookings = getStoredLocalBookings();
    }
  } catch (e) {
    allBookings = getStoredLocalBookings();
  }
  updateOverviewStats();
  renderBookingsTable();
}

function getStoredLocalBookings() {
  return [
    {
      id: "BK-2026-001",
      name: "Marcus Lim",
      email: "marcus.lim@novatech.sg",
      phone: "+65 9123 4567",
      service: "Corporate Tax & GST Compliance",
      message: "Looking for corporate tax filing for Year 2026 and quarterly GST submission guidance for our 15-person tech startup.",
      status: "Pending",
      createdAt: new Date().toISOString()
    }
  ];
}

function updateOverviewStats() {
  const total = allBookings.length;
  const pending = allBookings.filter(b => b.status === 'Pending').length;
  const confirmed = allBookings.filter(b => b.status === 'Confirmed').length;
  const completed = allBookings.filter(b => b.status === 'Completed').length;

  document.getElementById('stat-total-bookings').textContent = total;
  document.getElementById('stat-pending-bookings').textContent = pending;
  document.getElementById('stat-confirmed-bookings').textContent = confirmed;
  document.getElementById('stat-completed-bookings').textContent = completed;

  // Recent 5 list
  const recentList = document.getElementById('recent-bookings-list');
  if (recentList) {
    if (allBookings.length === 0) {
      recentList.innerHTML = `<p class="text-sm text-slate-400 py-4 text-center">No consultation requests yet.</p>`;
    } else {
      recentList.innerHTML = allBookings.slice(0, 5).map(b => `
        <div class="flex items-center justify-between p-3.5 rounded-lg bg-slate-50 border border-slate-200">
          <div>
            <h4 class="font-bold text-sm text-slate-900">${escapeHtml(b.name)}</h4>
            <p class="text-xs text-slate-500">${escapeHtml(b.service)} • ${formatDate(b.createdAt)}</p>
          </div>
          <span class="text-xs font-semibold px-2.5 py-1 rounded-full ${getStatusBadgeClass(b.status)}">
            ${b.status}
          </span>
        </div>
      `).join('');
    }
  }
}

function renderBookingsTable() {
  const tableBody = document.getElementById('bookings-table-body');
  const searchVal = document.getElementById('search-bookings')?.value.toLowerCase().trim() || '';
  const statusVal = document.getElementById('filter-status')?.value || 'All';
  const serviceVal = document.getElementById('filter-service')?.value || 'All';

  if (!tableBody) return;

  const filtered = allBookings.filter(b => {
    const matchSearch = !searchVal || 
      b.name.toLowerCase().includes(searchVal) || 
      b.email.toLowerCase().includes(searchVal) || 
      b.phone.toLowerCase().includes(searchVal) || 
      b.id.toLowerCase().includes(searchVal);
    
    const matchStatus = statusVal === 'All' || b.status === statusVal;
    const matchService = serviceVal === 'All' || b.service.includes(serviceVal);

    return matchSearch && matchStatus && matchService;
  });

  if (filtered.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center py-10 text-slate-400 text-sm">
          No bookings match your current filter or search criteria.
        </td>
      </tr>
    `;
    return;
  }

  tableBody.innerHTML = filtered.map(b => `
    <tr class="hover:bg-slate-50 transition-colors border-b border-slate-100">
      <td class="px-4 py-3.5 font-mono text-xs font-bold text-slate-600">${b.id}</td>
      <td class="px-4 py-3.5">
        <div class="font-bold text-slate-900 text-sm">${escapeHtml(b.name)}</div>
        <div class="text-xs text-slate-500">${formatDate(b.createdAt)}</div>
      </td>
      <td class="px-4 py-3.5 text-xs text-slate-700">
        <div>✉️ <a href="mailto:${escapeHtml(b.email)}" class="hover:underline text-teal-700">${escapeHtml(b.email)}</a></div>
        <div>📞 <a href="tel:${escapeHtml(b.phone)}" class="hover:underline text-slate-600">${escapeHtml(b.phone)}</a></div>
      </td>
      <td class="px-4 py-3.5 text-xs font-medium text-slate-800">${escapeHtml(b.service)}</td>
      <td class="px-4 py-3.5">
        <select onchange="updateBookingStatus('${b.id}', this.value)" class="text-xs font-semibold px-2.5 py-1 rounded-md border border-slate-300 focus:outline-none focus:ring-1 focus:ring-teal-500 ${getStatusBadgeClass(b.status)}">
          <option value="Pending" ${b.status === 'Pending' ? 'selected' : ''}>Pending</option>
          <option value="Confirmed" ${b.status === 'Confirmed' ? 'selected' : ''}>Confirmed</option>
          <option value="Completed" ${b.status === 'Completed' ? 'selected' : ''}>Completed</option>
          <option value="Cancelled" ${b.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
        </select>
      </td>
      <td class="px-4 py-3.5 text-xs text-slate-600 max-w-[200px] truncate" title="${escapeHtml(b.message || '')}">
        ${escapeHtml(b.message || 'No additional note')}
      </td>
      <td class="px-4 py-3.5 text-right space-x-1 whitespace-nowrap">
        <button onclick="viewBookingDetails('${b.id}')" class="p-1.5 text-slate-500 hover:text-teal-700 hover:bg-teal-50 rounded" title="View Details">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
        </button>
        <button onclick="deleteBooking('${b.id}')" class="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded" title="Delete Booking">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
        </button>
      </td>
    </tr>
  `).join('');
}

function initBookingsHandlers() {
  document.getElementById('search-bookings')?.addEventListener('input', renderBookingsTable);
  document.getElementById('filter-status')?.addEventListener('change', renderBookingsTable);
  document.getElementById('filter-service')?.addEventListener('change', renderBookingsTable);

  // Export CSV
  document.getElementById('btn-export-csv')?.addEventListener('click', exportBookingsCSV);

  // Manual Add Modal
  const addModal = document.getElementById('add-booking-modal');
  const openAddBtn = document.getElementById('btn-add-booking');
  const closeAddBtn = document.getElementById('add-booking-modal-close');
  const addForm = document.getElementById('admin-add-booking-form');

  openAddBtn?.addEventListener('click', () => {
    addModal?.classList.add('active');
  });

  closeAddBtn?.addEventListener('click', () => {
    addModal?.classList.remove('active');
  });

  addForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const newBooking = {
      name: document.getElementById('add-b-name').value.trim(),
      email: document.getElementById('add-b-email').value.trim(),
      phone: document.getElementById('add-b-phone').value.trim(),
      service: document.getElementById('add-b-service').value,
      message: document.getElementById('add-b-message').value.trim()
    };

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBooking)
      });
      if (res.ok) {
        showAdminToast('New consultation booking added successfully!', 'success');
        addModal?.classList.remove('active');
        addForm.reset();
        loadBookings();
      }
    } catch (e) {
      showAdminToast('Could not save to backend server.', 'error');
    }
  });

  // Details Modal close
  document.getElementById('view-booking-modal-close')?.addEventListener('click', () => {
    document.getElementById('view-booking-modal')?.classList.remove('active');
  });
}

window.updateBookingStatus = async function(id, newStatus) {
  try {
    const res = await fetch(`/api/bookings/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });
    if (res.ok) {
      const b = allBookings.find(item => item.id === id);
      if (b) b.status = newStatus;
      updateOverviewStats();
      showAdminToast(`Booking ${id} status updated to ${newStatus}`, 'success');
    }
  } catch (e) {
    showAdminToast('Status update failed', 'error');
  }
};

window.deleteBooking = async function(id) {
  if (!confirm(`Are you sure you want to delete booking ${id}?`)) return;

  try {
    const res = await fetch(`/api/bookings/${id}`, { method: 'DELETE' });
    if (res.ok) {
      allBookings = allBookings.filter(b => b.id !== id);
      updateOverviewStats();
      renderBookingsTable();
      showAdminToast(`Booking ${id} deleted successfully.`, 'info');
    }
  } catch (e) {
    showAdminToast('Delete failed', 'error');
  }
};

window.viewBookingDetails = function(id) {
  const b = allBookings.find(item => item.id === id);
  if (!b) return;

  const modal = document.getElementById('view-booking-modal');
  document.getElementById('view-b-id').textContent = b.id;
  document.getElementById('view-b-name').textContent = b.name;
  document.getElementById('view-b-email').textContent = b.email;
  document.getElementById('view-b-phone').textContent = b.phone;
  document.getElementById('view-b-service').textContent = b.service;
  document.getElementById('view-b-date').textContent = formatDate(b.createdAt);
  document.getElementById('view-b-status').textContent = b.status;
  document.getElementById('view-b-message').textContent = b.message || 'No additional requirements provided.';

  modal?.classList.add('active');
};

function exportBookingsCSV() {
  if (!allBookings.length) {
    showAdminToast('No bookings available to export.', 'info');
    return;
  }

  const headers = ['Booking ID', 'Full Name', 'Email', 'Phone', 'Service Area', 'Status', 'Notes', 'Created At'];
  const rows = allBookings.map(b => [
    `"${b.id}"`,
    `"${b.name}"`,
    `"${b.email}"`,
    `"${b.phone}"`,
    `"${b.service}"`,
    `"${b.status}"`,
    `"${(b.message || '').replace(/"/g, '""')}"`,
    `"${b.createdAt}"`
  ]);

  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `capac_bookings_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showAdminToast('Bookings exported to CSV successfully!', 'success');
}

/* ==========================================================================
   4. Website Content & Settings Management
   ========================================================================== */
async function loadSiteConfig() {
  try {
    const res = await fetch('/api/config');
    if (res.ok) {
      siteConfig = await res.json();
      fillSettingsForm();
    }
  } catch (e) {
    console.warn('Could not load config from server');
  }
}

function fillSettingsForm() {
  if (!siteConfig) return;

  setInputValue('cfg-company-name', siteConfig.companyName || 'Ca Pac SG');
  setInputValue('cfg-tagline', siteConfig.tagline || 'Smart Accounting & Financial Advisory');
  setInputValue('cfg-phone', siteConfig.phone || '+65 6513 9986');
  setInputValue('cfg-email', siteConfig.email || 'audit@singaporeca.sg');
  setInputValue('cfg-address', siteConfig.address || '50 Chin Swee Rd, #06-04, Singapore 169874');
  setInputValue('cfg-maps-url', siteConfig.mapsUrl || 'https://maps.app.goo.gl/aSkt8xyTKhD2RKF9A');
  setInputValue('cfg-hours', siteConfig.operatingHours || 'Mon – Fri: 9:00 AM – 6:00 PM (SGT)');

  setInputValue('cfg-hero-eyebrow', siteConfig.heroEyebrow || 'Accounting & Financial Experts');
  setInputValue('cfg-hero-headline', siteConfig.heroHeadline || 'Smart Accounting.\nStronger Business.');
  setInputValue('cfg-hero-subtitle', siteConfig.heroSubtitle || 'Reliable accounting, tax, bookkeeping, and financial advisory services designed to help your business scale with complete financial clarity and confidence.');
  setInputValue('cfg-cta-text', siteConfig.primaryCtaText || 'Book a Consultation');

  if (siteConfig.metrics) {
    setInputValue('cfg-metric-fp', siteConfig.metrics.financialPlanning || 85);
    setInputValue('cfg-metric-tax', siteConfig.metrics.taxCompliance || 92);
    setInputValue('cfg-metric-ba', siteConfig.metrics.businessAdvisory || 88);
    setInputValue('cfg-metric-cs', siteConfig.metrics.clientSatisfaction || 96);
  }
}

function initSettingsHandlers() {
  const form = document.getElementById('site-settings-form');
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;

    submitBtn.disabled = true;
    submitBtn.innerHTML = 'Saving Changes...';

    const updatedConfig = {
      companyName: getInputValue('cfg-company-name'),
      tagline: getInputValue('cfg-tagline'),
      phone: getInputValue('cfg-phone'),
      email: getInputValue('cfg-email'),
      address: getInputValue('cfg-address'),
      mapsUrl: getInputValue('cfg-maps-url'),
      operatingHours: getInputValue('cfg-hours'),
      heroEyebrow: getInputValue('cfg-hero-eyebrow'),
      heroHeadline: getInputValue('cfg-hero-headline'),
      heroSubtitle: getInputValue('cfg-hero-subtitle'),
      primaryCtaText: getInputValue('cfg-cta-text'),
      metrics: {
        financialPlanning: parseInt(getInputValue('cfg-metric-fp'), 10) || 85,
        taxCompliance: parseInt(getInputValue('cfg-metric-tax'), 10) || 92,
        businessAdvisory: parseInt(getInputValue('cfg-metric-ba'), 10) || 88,
        clientSatisfaction: parseInt(getInputValue('cfg-metric-cs'), 10) || 96
      }
    };

    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedConfig)
      });
      if (res.ok) {
        siteConfig = updatedConfig;
        showAdminToast('Website content and settings saved successfully! Live website updated.', 'success');
      } else {
        showAdminToast('Failed to save settings.', 'error');
      }
    } catch (err) {
      showAdminToast('Connection error while saving settings.', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;
    }
  });
}

function initCredentialsHandler() {
  const form = document.getElementById('admin-credentials-form');
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const currentPassword = document.getElementById('cred-current-password').value.trim();
    const newUsername = document.getElementById('cred-new-username').value.trim();
    const newPassword = document.getElementById('cred-new-password').value.trim();
    const confirmPassword = document.getElementById('cred-confirm-password').value.trim();
    const submitBtn = form.querySelector('button[type="submit"]');

    if (!currentPassword) {
      showAdminToast('Please enter your current password.', 'error');
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      showAdminToast('New password must be at least 6 characters.', 'error');
      return;
    }

    if (newPassword !== confirmPassword) {
      showAdminToast('New passwords do not match. Please check again.', 'error');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = 'Updating Credentials...';

    try {
      const res = await fetch('/api/auth/update-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newUsername, newPassword })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        showAdminToast('Admin login credentials updated successfully!', 'success');
        form.reset();
      } else {
        showAdminToast(data.message || 'Failed to update credentials.', 'error');
      }
    } catch (err) {
      showAdminToast('Error communicating with server.', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = 'Update Admin Credentials';
    }
  });
}

/* ==========================================================================
   Utilities
   ========================================================================== */
function setInputValue(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val;
}

function getInputValue(id) {
  return document.getElementById(id)?.value.trim() || '';
}

function formatDate(isoStr) {
  if (!isoStr) return '—';
  try {
    const d = new Date(isoStr);
    return d.toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch (e) {
    return isoStr;
  }
}

function getStatusBadgeClass(status) {
  switch (status) {
    case 'Pending': return 'badge-pending';
    case 'Confirmed': return 'badge-confirmed';
    case 'Completed': return 'badge-completed';
    case 'Cancelled': return 'badge-cancelled';
    default: return 'bg-slate-100 text-slate-700';
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function showAdminToast(message, type = 'info') {
  let container = document.getElementById('admin-toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'admin-toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = 'admin-toast';
  
  let icon = `ℹ️`;
  if (type === 'success') icon = `✅`;
  if (type === 'error') icon = `⚠️`;

  toast.innerHTML = `
    <span class="text-base">${icon}</span>
    <span class="text-xs font-medium text-slate-100 flex-1 leading-snug">${message}</span>
    <button class="text-slate-400 hover:text-white font-bold ml-2 text-sm" onclick="this.parentElement.remove()">&times;</button>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('toast-exit');
    setTimeout(() => toast.remove(), 250);
  }, 4000);
}
