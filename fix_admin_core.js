const fs = require('fs');
let html = fs.readFileSync('public/admin.html', 'utf8');

// Ensure socket.io and leaflet scripts are present in head
if (!html.includes('/socket.io/socket.io.js')) {
  html = html.replace('</head>', '  <script src="/socket.io/socket.io.js"></script>\n</head>');
}

// Remove any existing broken inline script blocks at the end of body
const bodyEndIdx = html.lastIndexOf('</body>');
const lastCleanHtml = html.slice(0, bodyEndIdx);

// Build the complete client script cleanly without shell interpolation
const appScript = `
<script>
const socket = io();
let allAccounts = [], allJobs = [], allDrivers = [], allPlots = [], allAirports = [];
let currentFilter = 'all';
let customPricingActive = false;
let dispatchCalculatedMiles = 0.0;
let map, driverMarkers = {};

// Status & Init
socket.on('connect', () => {
  console.log('⚡ Socket connected to server with ID:', socket.id);
  const badge = document.getElementById('connStatus');
  if (badge) {
    badge.textContent = 'CONNECTED LIVE';
    badge.className = 'badge badge-green';
  }
  socket.emit('request_state');
});

socket.on('disconnect', () => {
  const badge = document.getElementById('connStatus');
  if (badge) {
    badge.textContent = 'DISCONNECTED';
    badge.className = 'badge badge-red';
  }
});

// Dropdown Navigation
function toggleMenu(menuId, event) {
  if (event) event.stopPropagation();
  const target = document.getElementById(menuId);
  const isOpen = target ? target.classList.contains('show') : false;
  document.querySelectorAll('.dropdown-menu').forEach(m => m.classList.remove('show'));
  if (target && !isOpen) target.classList.add('show');
}

window.addEventListener('click', (e) => {
  if (!e.target.closest('.menu-item')) {
    document.querySelectorAll('.dropdown-menu').forEach(m => m.classList.remove('show'));
  }
});

window.openAppModal = function(id) {
  document.querySelectorAll('.dropdown-menu').forEach(m => m.classList.remove('show'));
  const el = document.getElementById(id);
  if (el) el.style.display = 'flex';
};

window.closeAppModal = function(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = 'none';
};

window.closeOverlayModal = function(e, id) {
  if (e && e.target && e.target.id === id) {
    document.getElementById(id).style.display = 'none';
  }
};

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  }[m]));
}

// 1. JOBS / BOOKINGS LEDGER
socket.on('update_jobs_list', (jobs) => {
  console.log('Received jobs list:', (jobs || []).length);
  allJobs = jobs || [];
  renderJobsTable();
});

function filterJobs(filter, btn) {
  currentFilter = filter;
  document.querySelectorAll('.btn-pill').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderJobsTable();
}

function renderJobsTable() {
  const tbody = document.getElementById('jobsTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  const filtered = (allJobs || []).filter(j => {
    const s = String(j.status || '').toLowerCase();
    if (currentFilter === 'active') return ['accepted', 'arrived', 'pob', 'pending', 'dispatched'].includes(s);
    if (currentFilter === 'completed') return s === 'completed';
    if (currentFilter === 'cancelled') return s === 'cancelled';
    return true;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:24px; color:#64748b;">No bookings found for selected filter.</td></tr>';
    return;
  }

  filtered.forEach(job => {
    const tr = document.createElement('tr');
    const isActive = (job.status !== 'Completed' && String(job.status).toUpperCase() !== 'CANCELLED');
    const driverBadge = job.assignedDriverId
      ? '<span style="color:#38bdf8; font-weight:bold;">' + escapeHtml(job.assignedDriverId) + '</span>'
      : '<span style="color:#64748b;">Unassigned</span>';

    const fareNum = Number(job.fare || 0).toFixed(2);
    const createdAtStr = job.createdAt ? escapeHtml(job.createdAt) : '-';

    let actionBtns = '<button class="btn-sm" onclick="openAmendModal(' + job.id + ')">✏️ Amend</button> ';
    if (isActive) {
      actionBtns += '<button class="btn-sm btn-orange" onclick="openReassignModal(' + job.id + ')">🔄 Reassign</button> ';
      actionBtns += '<button class="btn-sm btn-red" onclick="openCancelModal(' + job.id + ')">✕ Cancel</button> ';
    }
    actionBtns += '<button class="btn-sm" onclick="openTripHistoryModal(' + job.id + ')">📜 History</button>';

    tr.innerHTML = '<td><strong>#' + job.id + '</strong><br><span style="font-size:0.75rem; color:#94a3b8;">' + createdAtStr + '</span></td>' +
      '<td><strong>' + escapeHtml(job.passenger || 'Guest') + '</strong><br><span style="font-size:0.75rem; color:#94a3b8;">' + escapeHtml(job.phone || '-') + '</span></td>' +
      '<td><div>📍 ' + escapeHtml(job.pickup || '-') + '</div><div>🏁 ' + escapeHtml(job.dropoff || '-') + '</div></td>' +
      '<td>' + driverBadge + '</td>' +
      '<td><strong>£' + fareNum + '</strong><br><span style="font-size:0.75rem; color:#94a3b8;">' + escapeHtml(job.paymentMethod || 'Cash') + '</span></td>' +
      '<td><span class="badge badge-blue">' + escapeHtml(job.status || 'Pending') + '</span></td>' +
      '<td style="text-align:center;">' + actionBtns + '</td>';

    tbody.appendChild(tr);
  });
}

// 2. DRIVERS LIST & DROPDOWNS
socket.on('update_driver_list', (drivers) => {
  allDrivers = drivers || [];
  renderDriversTable();
});

function renderDriversTable() {
  const tbody = document.getElementById('driversTableBody');
  const sel = document.getElementById('jobAssignDriver');
  const reassignSel = document.getElementById('reassignTargetDriver');
  const chatSel = document.getElementById('adminChatDriverSelect');

  if (tbody) tbody.innerHTML = '';
  if (sel) sel.innerHTML = '<option value="AUTO">⚡ Auto-Match FIFO Queue</option>';
  if (reassignSel) reassignSel.innerHTML = '';
  if (chatSel) chatSel.innerHTML = '';

  allDrivers.forEach(d => {
    const opt = document.createElement('option');
    opt.value = d.driverId;
    opt.textContent = (d.name || d.driverId) + ' (' + d.driverId + ')';

    if (sel) sel.appendChild(opt.cloneNode(true));
    if (reassignSel) reassignSel.appendChild(opt.cloneNode(true));
    if (chatSel) chatSel.appendChild(opt.cloneNode(true));

    if (tbody) {
      const tr = document.createElement('tr');
      tr.innerHTML = '<td><strong>' + escapeHtml(d.driverId) + '</strong></td>' +
        '<td>' + escapeHtml(d.name || '') + '<br><span style="font-size:0.75rem; color:#94a3b8;">' + escapeHtml(d.phone || '') + '</span></td>' +
        '<td>' + escapeHtml(d.vehicle || '-') + ' (' + escapeHtml(d.vehicleClass || 'Saloon') + ')</td>' +
        '<td><span class="badge ' + (d.status === 'Available' ? 'badge-green' : 'badge-yellow') + '">' + escapeHtml(d.status || 'Offline') + '</span></td>' +
        '<td><button class="btn-sm" onclick="openEditDriverModal(\\\'' + d.driverId + '\\\')">✏️ Edit</button></td>';
      tbody.appendChild(tr);
    }
  });
}

// 3. AIRPORT MATRIX
socket.on('update_airports', (airports) => {
  allAirports = airports || [];
  renderAirportsTable();
});

function renderAirportsTable() {
  const tbody = document.getElementById('airportsTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  allAirports.forEach(a => {
    const base = Number(a.baseRate || a.baseFare || 0).toFixed(2);
    const tr = document.createElement('tr');
    tr.innerHTML = '<td><strong>' + escapeHtml(a.name) + '</strong></td>' +
      '<td>' + escapeHtml(a.iataCode || '') + '</td>' +
      '<td>£' + base + '</td>' +
      '<td><button class="btn-sm" onclick="openEditAirportModal(' + a.id + ')">✏️ Edit</button></td>';
    tbody.appendChild(tr);
  });
}

// 4. STANDS & PLOTS
socket.on('update_plots', (plots) => {
  allPlots = plots || [];
  renderPlotsTable();
});

function renderPlotsTable() {
  const tbody = document.getElementById('plotsTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  allPlots.forEach(p => {
    const tr = document.createElement('tr');
    tr.innerHTML = '<td><strong>' + escapeHtml(p.code || 'PLOT') + '</strong></td>' +
      '<td>' + escapeHtml(p.name || '') + '</td>' +
      '<td>' + escapeHtml(p.postcodeSector || '-') + '</td>' +
      '<td>' + (p.radiusMeters || 350) + 'm</td>' +
      '<td><button class="btn-sm btn-red" onclick="deletePlot(' + p.id + ')">🗑️</button></td>';
    tbody.appendChild(tr);
  });
}

function deletePlot(id) {
  if (confirm('Delete stand/plot?')) socket.emit('admin_delete_plot', id);
}

// 5. CORPORATE ACCOUNTS
socket.on('update_accounts', (accounts) => {
  allAccounts = accounts || [];
  renderAccountsTable();
});

function renderAccountsTable() {
  const tbody = document.getElementById('accountsTableBody');
  const sel = document.getElementById('jobAccountSelect');
  if (tbody) tbody.innerHTML = '';
  if (sel) sel.innerHTML = '<option value="">-- None --</option>';

  allAccounts.forEach(a => {
    const num = a.accountNumber || a.id;
    if (sel) {
      const opt = document.createElement('option');
      opt.value = num;
      opt.textContent = (a.companyName || num) + ' (' + num + ')';
      sel.appendChild(opt);
    }
    if (tbody) {
      const tr = document.createElement('tr');
      tr.innerHTML = '<td><strong>' + escapeHtml(num) + '</strong></td>' +
        '<td>' + escapeHtml(a.companyName || '') + '</td>' +
        '<td>' + (Number(a.discountPct) || 0) + '%</td>' +
        '<td>' + escapeHtml(a.billingEmail || '-') + '</td>';
      tbody.appendChild(tr);
    }
  });
}

// 6. MASTER TARIFF FORM POPULATION
socket.on('update_tariff', (t) => {
  if (!t) return;
  const setVal = (id, val) => { const el = document.getElementById(id); if (el && val !== undefined) el.value = val; };
  setVal('tfBaseFlagDrop', t.baseFlagDrop || 5.00);
  setVal('tfFirstMileRate', t.firstMileRate || 2.00);
  setVal('tfTier1PerMile', t.tier1PerMile || 2.00);
  setVal('tfTier2PerMile', t.tier2PerMile || 1.80);
  setVal('tfTier3PerMile', t.tier3PerMile || 1.50);
  setVal('tfViaStopFee', t.viaStopFee || 5.00);
  setVal('tfPetSurcharge', t.petSurcharge || 6.00);
});

// DISPATCH BOOKING SUBMIT
function createJob(e) {
  if (e && e.preventDefault) e.preventDefault();
  const getV = (id) => { const el = document.getElementById(id); return el ? el.value.trim() : ''; };
  const passenger = getV('jobPassenger');
  const phone = getV('jobPhone');
  const pickup = getV('jobPickup');
  const dropoff = getV('jobDropoff');

  if (!passenger || !pickup || !dropoff) {
    alert('Please fill in Passenger Name, Pickup Address, and Destination.');
    return false;
  }

  const assignedDriver = getV('jobAssignDriver');
  const payload = {
    passenger: passenger,
    phone: phone,
    pickup: pickup,
    dropoff: dropoff,
    fare: parseFloat(getV('jobFare')) || 0.00,
    paymentMethod: getV('jobPayMethod') || 'Cash',
    accountNumber: getV('jobAccountSelect') || null,
    vehicleClass: getV('jobVehClass') || 'Standard',
    passengers: parseInt(getV('jobPax')) || 1,
    customerNotes: getV('jobNotes'),
    assignedDriverId: (assignedDriver && assignedDriver !== 'AUTO') ? assignedDriver : null
  };

  socket.emit('create_job', payload);
  document.getElementById('bookingForm').reset();
  return false;
}

socket.on('job_created_ack', (res) => {
  alert('✓ Booking #' + res.jobId + ' Dispatched Successfully!');
});

// MODAL CONTROLLERS (Amend, Reassign, Cancel)
function openAmendModal(jobId) {
  const j = allJobs.find(x => String(x.id) === String(jobId));
  if (!j) return;
  document.getElementById('amendJobId').value = j.id;
  document.getElementById('amendPassenger').value = j.passenger || '';
  document.getElementById('amendPhone').value = j.phone || '';
  document.getElementById('amendPickup').value = j.pickup || '';
  document.getElementById('amendDropoff').value = j.dropoff || '';
  document.getElementById('amendFare').value = j.fare || 0;
  openAppModal('modalAmendJob');
}

function saveAmendedBooking(e) {
  if (e && e.preventDefault) e.preventDefault();
  const id = document.getElementById('amendJobId').value;
  socket.emit('admin_amend_booking', {
    id: id,
    jobId: id,
    passenger: document.getElementById('amendPassenger').value,
    phone: document.getElementById('amendPhone').value,
    pickup: document.getElementById('amendPickup').value,
    dropoff: document.getElementById('amendDropoff').value,
    fare: parseFloat(document.getElementById('amendFare').value) || 0
  });
  closeAppModal('modalAmendJob');
  return false;
}

function openReassignModal(jobId) {
  document.getElementById('reassignJobId').value = jobId;
  openAppModal('modalReassignJob');
}

function executeReassignment(e) {
  if (e && e.preventDefault) e.preventDefault();
  const jobId = document.getElementById('reassignJobId').value;
  const driverId = document.getElementById('reassignTargetDriver').value;
  socket.emit('admin_reassign_booking', { jobId: jobId, newDriverId: driverId });
  closeAppModal('modalReassignJob');
  return false;
}

function openCancelModal(jobId) {
  document.getElementById('cancelJobId').value = jobId;
  openAppModal('modalCancelJob');
}

function executeCancellation(e) {
  if (e && e.preventDefault) e.preventDefault();
  const jobId = document.getElementById('cancelJobId').value;
  socket.emit('admin_cancel_booking', { jobId: jobId, reason: 'Cancelled by Operator' });
  closeAppModal('modalCancelJob');
  return false;
}

function openTripHistoryModal(jobId) {
  alert('Lifecycle history for Job #' + jobId);
}

// 7. DESPATCH ↔ DRIVER RADIO DOCK
let isAdminChatOpen = false;
function toggleAdminChat() {
  const panel = document.getElementById('adminChatPanel');
  if (!panel) return;
  isAdminChatOpen = !isAdminChatOpen;
  panel.style.display = isAdminChatOpen ? 'flex' : 'none';
  if (isAdminChatOpen) {
    const u = document.getElementById('adminChatUnread');
    if (u) u.style.display = 'none';
  }
}

function appendAdminChatBubble(from, text, time, isMe) {
  const box = document.getElementById('adminChatMessages');
  if (!box) return;
  const div = document.createElement('div');
  div.style.alignSelf = isMe ? 'flex-end' : 'flex-start';
  div.style.maxWidth = '82%';
  div.style.background = isMe ? '#2563eb' : '#334155';
  div.style.color = '#fff';
  div.style.padding = '7px 11px';
  div.style.borderRadius = isMe ? '12px 12px 2px 12px' : '12px 12px 12px 2px';
  div.style.fontSize = '0.85rem';
  div.innerHTML = '<div style="font-size:0.7rem; color:#94a3b8; margin-bottom:2px;">' + escapeHtml(from) + ' • ' + escapeHtml(time || '') + '</div><div>' + escapeHtml(text) + '</div>';
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
}

function sendAdminQuickMsg(msg) {
  const dSelect = document.getElementById('adminChatDriverSelect');
  const targetDriver = dSelect ? dSelect.value : 'MUKUND';
  socket.emit('admin_send_driver_message', { driverId: targetDriver, message: msg });
  appendAdminChatBubble('You -> ' + targetDriver, msg, new Date().toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' }), true);
}

function submitAdminChat(e) {
  if (e && e.preventDefault) e.preventDefault();
  const input = document.getElementById('adminChatInput');
  const txt = (input ? input.value : '').trim();
  if (!txt) return false;
  sendAdminQuickMsg(txt);
  input.value = '';
  return false;
}

socket.on('admin_message_received', (data) => {
  appendAdminChatBubble(data.from || 'Driver', data.message, data.time, false);
  if (!isAdminChatOpen) {
    const u = document.getElementById('adminChatUnread');
    if (u) u.style.display = 'inline';
  }
});
</script>
`;

// Replace file content cleanly before </body>
const cleanHtmlWithoutOldScripts = html.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gi, (match) => {
  if (match.includes('socket.io.js') || match.includes('leaflet')) return match;
  return '';
});

const finalBodyIdx = cleanHtmlWithoutOldScripts.lastIndexOf('</body>');
const rebuiltHtml = cleanHtmlWithoutOldScripts.slice(0, finalBodyIdx) + appScript + '\n</body>' + cleanHtmlWithoutOldScripts.slice(finalBodyIdx + 7);

fs.writeFileSync('public/admin.html', rebuiltHtml);
console.log('✅ admin.html completely rebuilt with all socket listeners and handlers!');
