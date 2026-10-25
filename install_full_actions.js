const fs = require('fs');
let html = fs.readFileSync('public/admin.html', 'utf8');

// Ensure all required modal containers exist in the HTML body
const requiredModals = `
<!-- MODAL: EDIT AIRPORT -->
<div id="modalEditAirport" class="modal-overlay" onclick="closeOverlayModal(event, 'modalEditAirport')">
  <div class="modal-box" style="max-width: 480px;">
    <div class="modal-header">
      <h3>✈️ Edit Airport Destination</h3>
      <button class="modal-close" onclick="closeAppModal('modalEditAirport')">✕</button>
    </div>
    <form onsubmit="return saveEditAirport(event)">
      <input type="hidden" id="editAirportId">
      <div style="margin-bottom:12px;">
        <label>Airport Name</label>
        <input type="text" id="editAirportName" class="form-input" required>
      </div>
      <div style="margin-bottom:12px;">
        <label>IATA Code</label>
        <input type="text" id="editAirportIata" class="form-input" maxlength="4">
      </div>
      <div style="margin-bottom:12px;">
        <label>Postcode / Area</label>
        <input type="text" id="editAirportPostcode" class="form-input">
      </div>
      <div style="margin-bottom:16px;">
        <label>Saloon Base Rate (£)</label>
        <input type="number" step="0.01" id="editAirportBaseRate" class="form-input" required>
      </div>
      <div style="display:flex; justify-content:flex-end; gap:8px;">
        <button type="button" class="btn-sm" onclick="closeAppModal('modalEditAirport')">Cancel</button>
        <button type="submit" class="btn-sm btn-blue">Save Airport</button>
      </div>
    </form>
  </div>
</div>

<!-- MODAL: EDIT DRIVER -->
<div id="modalEditDriver" class="modal-overlay" onclick="closeOverlayModal(event, 'modalEditDriver')">
  <div class="modal-box" style="max-width: 500px;">
    <div class="modal-header">
      <h3>🚕 Edit Driver Fleet Record</h3>
      <button class="modal-close" onclick="closeAppModal('modalEditDriver')">✕</button>
    </div>
    <form onsubmit="return saveEditDriver(event)">
      <input type="hidden" id="editDriverOriginalId">
      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-bottom:12px;">
        <div>
          <label>Callsign / Driver ID</label>
          <input type="text" id="editDriverId" class="form-input" required>
        </div>
        <div>
          <label>PIN (Login)</label>
          <input type="text" id="editDriverPin" class="form-input" required>
        </div>
      </div>
      <div style="margin-bottom:12px;">
        <label>Driver Full Name</label>
        <input type="text" id="editDriverName" class="form-input" required>
      </div>
      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-bottom:12px;">
        <div>
          <label>Phone Number</label>
          <input type="text" id="editDriverPhone" class="form-input">
        </div>
        <div>
          <label>Commission Rate (%)</label>
          <input type="number" id="editDriverCommission" class="form-input" min="0" max="100">
        </div>
      </div>
      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-bottom:16px;">
        <div>
          <label>Vehicle Make / Model</label>
          <input type="text" id="editDriverVehicle" class="form-input">
        </div>
        <div>
          <label>Vehicle Category</label>
          <select id="editDriverClass" class="form-input">
            <option value="Saloon">Saloon</option>
            <option value="Estate">Estate</option>
            <option value="MPV">MPV (6-Seat)</option>
            <option value="Minibus">Minibus (8-Seat)</option>
            <option value="Executive">Executive</option>
          </select>
        </div>
      </div>
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <button type="button" class="btn-sm btn-red" onclick="deleteCurrentDriver()">🗑️ Delete Driver</button>
        <div style="display:flex; gap:8px;">
          <button type="button" class="btn-sm" onclick="closeAppModal('modalEditDriver')">Cancel</button>
          <button type="submit" class="btn-sm btn-blue">Save Changes</button>
        </div>
      </div>
    </form>
  </div>
</div>

<!-- MODAL: EDIT CORPORATE ACCOUNT -->
<div id="modalEditAccount" class="modal-overlay" onclick="closeOverlayModal(event, 'modalEditAccount')">
  <div class="modal-box" style="max-width: 480px;">
    <div class="modal-header">
      <h3>🏢 Edit Corporate Account</h3>
      <button class="modal-close" onclick="closeAppModal('modalEditAccount')">✕</button>
    </div>
    <form onsubmit="return saveEditAccount(event)">
      <input type="hidden" id="editAccountId">
      <div style="margin-bottom:12px;">
        <label>Account Number / Ref</label>
        <input type="text" id="editAccountNum" class="form-input" required>
      </div>
      <div style="margin-bottom:12px;">
        <label>Company Name</label>
        <input type="text" id="editAccountName" class="form-input" required>
      </div>
      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-bottom:16px;">
        <div>
          <label>Discount (%)</label>
          <input type="number" id="editAccountDiscount" class="form-input" min="0" max="100">
        </div>
        <div>
          <label>Billing Email</label>
          <input type="email" id="editAccountEmail" class="form-input">
        </div>
      </div>
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <button type="button" class="btn-sm btn-red" onclick="deleteCurrentAccount()">🗑️ Delete</button>
        <div style="display:flex; gap:8px;">
          <button type="button" class="btn-sm" onclick="closeAppModal('modalEditAccount')">Cancel</button>
          <button type="submit" class="btn-sm btn-blue">Save Account</button>
        </div>
      </div>
    </form>
  </div>
</div>
`;

// Inject modals if missing
if (!html.includes('id="modalEditAirport"') && !html.includes("id='modalEditAirport'")) {
  const bodyClose = html.lastIndexOf('</body>');
  html = html.slice(0, bodyClose) + requiredModals + '\n' + html.slice(bodyClose);
}

// Full application controller script with all functions attached to window
const fullControllerScript = `
<script>
window.onerror = function(msg, url, line) {
  console.error("ADMIN RUNTIME ERROR:", msg, "line:", line);
};

const socket = io();
let allAccounts = [], allJobs = [], allDrivers = [], allPlots = [], allAirports = [];
let currentFilter = 'all';

// Connection handshakes
socket.on('connect', function() {
  console.log("✅ Socket connected live:", socket.id);
  const badge = document.getElementById('connStatus');
  if (badge) {
    badge.textContent = 'CONNECTED LIVE';
    badge.className = 'badge badge-green';
  }
  socket.emit('request_state');
  socket.emit('get_all_data');
});

socket.on('disconnect', function() {
  const badge = document.getElementById('connStatus');
  if (badge) {
    badge.textContent = 'DISCONNECTED';
    badge.className = 'badge badge-red';
  }
});

// Dropdowns and Modals
window.toggleMenu = function(menuId, event) {
  if (event) event.stopPropagation();
  const target = document.getElementById(menuId);
  const isOpen = target ? target.classList.contains('show') : false;
  document.querySelectorAll('.dropdown-menu').forEach(function(m) { m.classList.remove('show'); });
  if (target && !isOpen) target.classList.add('show');
};

window.addEventListener('click', function(e) {
  if (!e.target.closest('.menu-item')) {
    document.querySelectorAll('.dropdown-menu').forEach(function(m) { m.classList.remove('show'); });
  }
});

window.openAppModal = function(id) {
  document.querySelectorAll('.dropdown-menu').forEach(function(m) { m.classList.remove('show'); });
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
  return String(str).replace(/[&<>"']/g, function(m) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
  });
}

// ==========================================
// 1. LIVE BOOKING LEDGER (With Edit, Archive, Delete)
// ==========================================
socket.on('update_jobs_list', function(jobs) {
  allJobs = jobs || [];
  renderJobsTable();
});

window.filterJobs = function(filter, btn) {
  currentFilter = filter;
  document.querySelectorAll('.btn-pill').forEach(function(b) { b.classList.remove('active'); });
  if (btn) btn.classList.add('active');
  renderJobsTable();
};

function renderJobsTable() {
  const tbody = document.getElementById('jobsTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  const filtered = (allJobs || []).filter(function(j) {
    const s = String(j.status || '').toLowerCase();
    if (currentFilter === 'active') return ['accepted', 'arrived', 'pob', 'pending', 'dispatched'].indexOf(s) !== -1;
    if (currentFilter === 'completed') return s === 'completed';
    if (currentFilter === 'cancelled') return s === 'cancelled';
    if (currentFilter === 'archived') return s === 'archived';
    return true;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:24px; color:#64748b;">No bookings found for selected filter.</td></tr>';
    return;
  }

  filtered.forEach(function(job) {
    const tr = document.createElement('tr');
    const statusLower = String(job.status || '').toLowerCase();
    const isActive = (statusLower !== 'completed' && statusLower !== 'cancelled' && statusLower !== 'archived');
    
    const driverBadge = job.assignedDriverId
      ? '<span style="color:#38bdf8; font-weight:bold;">' + escapeHtml(job.assignedDriverId) + '</span>'
      : '<span style="color:#64748b;">Unassigned</span>';

    const fareNum = Number(job.fare || 0).toFixed(2);
    const createdAtStr = job.createdAt ? escapeHtml(job.createdAt) : '-';

    let actionBtns = '<button class="btn-sm" onclick="openAmendModal(' + job.id + ')">✏️ Amend</button> ';
    if (isActive) {
      actionBtns += '<button class="btn-sm btn-orange" onclick="openReassignModal(' + job.id + ')">🔄 Reassign</button> ';
      actionBtns += '<button class="btn-sm btn-red" onclick="openCancelModal(' + job.id + ')">✕ Cancel</button> ';
    } else {
      actionBtns += '<button class="btn-sm" style="background:#475569;" onclick="archiveJob(' + job.id + ')">📦 Archive</button> ';
      actionBtns += '<button class="btn-sm btn-red" onclick="deleteJob(' + job.id + ')">🗑️</button> ';
    }

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

window.archiveJob = function(jobId) {
  if (confirm('Archive Booking #' + jobId + '?')) {
    socket.emit('admin_archive_booking', jobId);
  }
};

window.deleteJob = function(jobId) {
  if (confirm('Permanently delete Booking #' + jobId + '?')) {
    socket.emit('admin_delete_booking', jobId);
  }
};

// ==========================================
// 2. AIRPORT MATRIX (With Vehicle Category Uplifts)
// ==========================================
socket.on('update_airports', function(airports) {
  allAirports = airports || [];
  renderAirportsTable();
});

function renderAirportsTable() {
  const tbody = document.getElementById('airportsTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  allAirports.forEach(function(a) {
    const base = Number(a.baseRate || 0);
    const estate = (base * 1.20).toFixed(2);
    const mpv = (base * 1.50).toFixed(2);
    const minibus = (base * 1.85).toFixed(2);
    const exec = (base * 2.00).toFixed(2);

    const tr = document.createElement('tr');
    tr.innerHTML = '<td><strong>' + escapeHtml(a.name) + '</strong> (' + escapeHtml(a.iataCode || '') + ')<br><span style="font-size:0.75rem; color:#94a3b8;">' + escapeHtml(a.postcode || '') + '</span></td>' +
      '<td><strong>£' + base.toFixed(2) + '</strong></td>' +
      '<td>£' + estate + '</td>' +
      '<td>£' + mpv + '</td>' +
      '<td>£' + minibus + '</td>' +
      '<td>£' + exec + '</td>' +
      '<td style="text-align:center;">' +
        '<button class="btn-sm" onclick="openEditAirportModal(' + a.id + ')">✏️ Edit</button> ' +
        '<button class="btn-sm btn-red" onclick="deleteAirport(' + a.id + ')">🗑️</button>' +
      '</td>';
    tbody.appendChild(tr);
  });
}

window.openEditAirportModal = function(id) {
  const a = allAirports.find(function(x) { return Number(x.id) === Number(id); });
  if (!a) return;
  document.getElementById('editAirportId').value = a.id;
  document.getElementById('editAirportName').value = a.name || '';
  document.getElementById('editAirportIata').value = a.iataCode || '';
  document.getElementById('editAirportPostcode').value = a.postcode || '';
  document.getElementById('editAirportBaseRate').value = a.baseRate || 0;
  openAppModal('modalEditAirport');
};

window.saveEditAirport = function(e) {
  if (e && e.preventDefault) e.preventDefault();
  const id = document.getElementById('editAirportId').value;
  const payload = {
    id: id,
    name: document.getElementById('editAirportName').value.trim(),
    iataCode: document.getElementById('editAirportIata').value.trim(),
    postcode: document.getElementById('editAirportPostcode').value.trim(),
    baseRate: parseFloat(document.getElementById('editAirportBaseRate').value) || 0
  };
  socket.emit('admin_update_airport', payload);
  closeAppModal('modalEditAirport');
  return false;
};

window.deleteAirport = function(id) {
  if (confirm('Delete this airport rate destination?')) {
    socket.emit('admin_delete_airport', id);
  }
};

// ==========================================
// 3. DRIVERS FLEET (Edit, Delete, Category)
// ==========================================
socket.on('update_driver_list', function(drivers) {
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

  allDrivers.forEach(function(d) {
    const opt = document.createElement('option');
    opt.value = d.driverId;
    opt.textContent = (d.name || d.driverId) + ' (' + d.driverId + ')';

    if (sel) sel.appendChild(opt.cloneNode(true));
    if (reassignSel) reassignSel.appendChild(opt.cloneNode(true));
    if (chatSel) chatSel.appendChild(opt.cloneNode(true));

    if (tbody) {
      const tr = document.createElement('tr');
      const dClass = d.vehicleClass || 'Saloon';
      const comm = (d.commissionRate !== undefined && d.commissionRate !== null) ? d.commissionRate + '%' : '15%';

      tr.innerHTML = '<td><strong>' + escapeHtml(d.driverId) + '</strong></td>' +
        '<td><strong>' + escapeHtml(d.name || '') + '</strong><br><span style="font-size:0.75rem; color:#94a3b8;">' + escapeHtml(d.phone || '-') + '</span></td>' +
        '<td>' + escapeHtml(d.vehicle || '-') + ' <span class="badge" style="background:#334155; font-size:0.7rem;">' + escapeHtml(dClass) + '</span></td>' +
        '<td>' + comm + '</td>' +
        '<td><span class="badge ' + (d.status === 'Available' ? 'badge-green' : 'badge-yellow') + '">' + escapeHtml(d.status || 'Offline') + '</span></td>' +
        '<td style="text-align:center;">' +
          '<button class="btn-sm" onclick="openEditDriverModal(\'' + escapeHtml(d.driverId) + '\')">✏️ Edit</button> ' +
          '<button class="btn-sm btn-red" onclick="deleteDriver(\'' + escapeHtml(d.driverId) + '\')">🗑️</button>' +
        '</td>';
      tbody.appendChild(tr);
    }
  });
}

window.openEditDriverModal = function(driverId) {
  const d = allDrivers.find(function(x) { return String(x.driverId).toUpperCase() === String(driverId).toUpperCase(); });
  if (!d) return;
  document.getElementById('editDriverOriginalId').value = d.driverId;
  document.getElementById('editDriverId').value = d.driverId;
  document.getElementById('editDriverPin').value = d.pin || '';
  document.getElementById('editDriverName').value = d.name || '';
  document.getElementById('editDriverPhone').value = d.phone || '';
  document.getElementById('editDriverCommission').value = d.commissionRate || 15;
  document.getElementById('editDriverVehicle').value = d.vehicle || '';
  document.getElementById('editDriverClass').value = d.vehicleClass || 'Saloon';
  openAppModal('modalEditDriver');
};

window.saveEditDriver = function(e) {
  if (e && e.preventDefault) e.preventDefault();
  const origId = document.getElementById('editDriverOriginalId').value;
  const payload = {
    originalDriverId: origId,
    driverId: document.getElementById('editDriverId').value.trim(),
    pin: document.getElementById('editDriverPin').value.trim(),
    name: document.getElementById('editDriverName').value.trim(),
    phone: document.getElementById('editDriverPhone').value.trim(),
    commissionRate: parseFloat(document.getElementById('editDriverCommission').value) || 15,
    vehicle: document.getElementById('editDriverVehicle').value.trim(),
    vehicleClass: document.getElementById('editDriverClass').value
  };
  socket.emit('admin_update_driver', payload);
  closeAppModal('modalEditDriver');
  return false;
};

window.deleteCurrentDriver = function() {
  const id = document.getElementById('editDriverOriginalId').value;
  deleteDriver(id);
  closeAppModal('modalEditDriver');
};

window.deleteDriver = function(driverId) {
  if (confirm('Delete Driver ' + driverId + ' from fleet database?')) {
    socket.emit('admin_delete_driver', driverId);
  }
};

// ==========================================
// 4. STANDS & PLOTS (With Delete Button)
// ==========================================
socket.on('update_plots', function(plots) {
  allPlots = plots || [];
  renderPlotsTable();
});

function renderPlotsTable() {
  const tbody = document.getElementById('plotsTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  allPlots.forEach(function(p) {
    const tr = document.createElement('tr');
    tr.innerHTML = '<td><strong>' + escapeHtml(p.code || 'PLOT') + '</strong></td>' +
      '<td>' + escapeHtml(p.name || '') + '</td>' +
      '<td>' + escapeHtml(p.postcodeSector || '-') + '</td>' +
      '<td>' + (p.radiusMeters || 350) + 'm</td>' +
      '<td style="text-align:center;">' +
        '<button class="btn-sm btn-red" onclick="deletePlot(' + p.id + ')">🗑️ Delete</button>' +
      '</td>';
    tbody.appendChild(tr);
  });
}

window.deletePlot = function(id) {
  if (confirm('Delete this stand/plot?')) {
    socket.emit('admin_delete_plot', id);
  }
};

// ==========================================
// 5. CORPORATE ACCOUNTS (Edit & Delete)
// ==========================================
socket.on('update_accounts', function(accounts) {
  allAccounts = accounts || [];
  renderAccountsTable();
});

function renderAccountsTable() {
  const tbody = document.getElementById('accountsTableBody');
  const sel = document.getElementById('jobAccountSelect');
  if (tbody) tbody.innerHTML = '';
  if (sel) sel.innerHTML = '<option value="">-- None --</option>';

  allAccounts.forEach(function(a) {
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
        '<td>' + escapeHtml(a.billingEmail || '-') + '</td>' +
        '<td style="text-align:center;">' +
          '<button class="btn-sm" onclick="openEditAccountModal(\'' + escapeHtml(num) + '\')">✏️ Edit</button> ' +
          '<button class="btn-sm btn-red" onclick="deleteAccount(\'' + escapeHtml(num) + '\')">🗑️</button>' +
        '</td>';
      tbody.appendChild(tr);
    }
  });
}

window.openEditAccountModal = function(num) {
  const a = allAccounts.find(function(x) { return String(x.accountNumber || x.id) === String(num); });
  if (!a) return;
  document.getElementById('editAccountId').value = a.id || a.accountNumber;
  document.getElementById('editAccountNum').value = a.accountNumber || a.id;
  document.getElementById('editAccountName').value = a.companyName || '';
  document.getElementById('editAccountDiscount').value = a.discountPct || 0;
  document.getElementById('editAccountEmail').value = a.billingEmail || '';
  openAppModal('modalEditAccount');
};

window.saveEditAccount = function(e) {
  if (e && e.preventDefault) e.preventDefault();
  const id = document.getElementById('editAccountId').value;
  const payload = {
    id: id,
    accountNumber: document.getElementById('editAccountNum').value.trim(),
    companyName: document.getElementById('editAccountName').value.trim(),
    discountPct: parseFloat(document.getElementById('editAccountDiscount').value) || 0,
    billingEmail: document.getElementById('editAccountEmail').value.trim()
  };
  socket.emit('admin_update_account', payload);
  closeAppModal('modalEditAccount');
  return false;
};

window.deleteCurrentAccount = function() {
  const id = document.getElementById('editAccountId').value;
  deleteAccount(id);
  closeAppModal('modalEditAccount');
};

window.deleteAccount = function(accountNumber) {
  if (confirm('Delete Corporate Account ' + accountNumber + '?')) {
    socket.emit('admin_delete_account', accountNumber);
  }
};

// ==========================================
// 6. MASTER TARIFFS
// ==========================================
socket.on('update_tariff', function(t) {
  if (!t) return;
  const setVal = function(id, val) { const el = document.getElementById(id); if (el && val !== undefined) el.value = val; };
  setVal('tfBaseFlagDrop', t.baseFlagDrop || 5.00);
  setVal('tfFirstMileRate', t.firstMileRate || 2.00);
  setVal('tfTier1PerMile', t.tier1PerMile || 2.00);
  setVal('tfTier2PerMile', t.tier2PerMile || 1.80);
  setVal('tfTier3PerMile', t.tier3PerMile || 1.50);
  setVal('tfViaStopFee', t.viaStopFee || 5.00);
  setVal('tfPetSurcharge', t.petSurcharge || 6.00);
});

// DISPATCH BOOKING
window.createJob = function(e) {
  if (e && e.preventDefault) e.preventDefault();
  const getV = function(id) { const el = document.getElementById(id); return el ? el.value.trim() : ''; };
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
};

socket.on('job_created_ack', function(res) {
  alert('✓ Booking #' + res.jobId + ' Dispatched Successfully!');
});

// SAFE LEAFLET MAP INIT
window.addEventListener('DOMContentLoaded', function() {
  try {
    if (typeof L !== 'undefined' && document.getElementById('mapContainer')) {
      const map = L.map('mapContainer').setView([51.3776, -2.3571], 13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
    }
  } catch(e) {
    console.warn("Leaflet notice:", e.message);
  }
});
</script>
`;

// Cleanly replace old inline script blocks with the complete controller
html = html.replace(/<script(?![^>]*src=)[^>]*>[\s\S]*?<\/script>/gi, '');
const bodyEnd = html.lastIndexOf('</body>');
html = html.slice(0, bodyEnd) + fullControllerScript + '\n</body></html>';

fs.writeFileSync('public/admin.html', html);
console.log('✅ public/admin.html updated with complete tables, category matrices, and edit modals!');
