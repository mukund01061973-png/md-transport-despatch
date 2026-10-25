const fs = require('fs');
let html = fs.readFileSync('public/admin.html', 'utf8');

// 1. Upgrade Airport Table Header with 7-Seater
const newAptHeader = `<table class="data-table">
    <thead>
      <tr>
        <th>Destination Airport</th>
        <th>Saloon (Base)</th>
        <th>Estate (+20%)</th>
        <th>6-Seat (+50%)</th>
        <th>7-Seat (+65%)</th>
        <th>8-Seat (+85%)</th>
        <th>Executive (+100%)</th>
        <th style="text-align:center;">Actions</th>
      </tr>
    </thead>
    <tbody id="airportsTableBody"></tbody>
  </table>`;

const aptTbodyIdx = html.indexOf('<tbody id="airportsTableBody">');
if (aptTbodyIdx !== -1) {
  const tableOpenIdx = html.lastIndexOf('<table', aptTbodyIdx);
  const tableCloseIdx = html.indexOf('</table>', aptTbodyIdx) + 8;
  html = html.slice(0, tableOpenIdx) + newAptHeader + html.slice(tableCloseIdx);
  console.log('✅ Airport Table with 7-Seater injected!');
}

// 2. Ensure all Modal Containers exist before </body>
const allModals = `
<!-- MODAL: MASTER TARIFF -->
<div id="modalTariff" class="modal-overlay" onclick="closeOverlayModal(event, 'modalTariff')">
  <div class="modal-box" style="max-width: 520px;">
    <div class="modal-header">
      <h3>⚙️ Master Progressive Tariff Engine</h3>
      <button class="modal-close" onclick="closeAppModal('modalTariff')">✕</button>
    </div>
    <form onsubmit="return saveMasterTariff(event)">
      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; margin-bottom:12px;">
        <div>
          <label>Base Flag Drop (£)</label>
          <input type="number" step="0.10" id="tfBaseFlagDrop" class="form-input" value="5.00" required>
        </div>
        <div>
          <label>First Mile Rate (£)</label>
          <input type="number" step="0.10" id="tfFirstMileRate" class="form-input" value="2.00" required>
        </div>
      </div>
      <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:10px; margin-bottom:12px;">
        <div>
          <label>Tier 1 (1-5m)</label>
          <input type="number" step="0.10" id="tfTier1PerMile" class="form-input" value="2.00" required>
        </div>
        <div>
          <label>Tier 2 (5-15m)</label>
          <input type="number" step="0.10" id="tfTier2PerMile" class="form-input" value="1.80" required>
        </div>
        <div>
          <label>Tier 3 (15m+)</label>
          <input type="number" step="0.10" id="tfTier3PerMile" class="form-input" value="1.50" required>
        </div>
      </div>
      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; margin-bottom:16px;">
        <div>
          <label>Via Stop Charge (£)</label>
          <input type="number" step="0.50" id="tfViaStopFee" class="form-input" value="5.00" required>
        </div>
        <div>
          <label>Pet Surcharge (£)</label>
          <input type="number" step="0.50" id="tfPetSurcharge" class="form-input" value="6.00" required>
        </div>
      </div>
      <div style="display:flex; justify-content:flex-end; gap:8px;">
        <button type="button" class="btn-sm" onclick="closeAppModal('modalTariff')">Cancel</button>
        <button type="submit" class="btn-sm btn-blue">💾 Save Tariff Settings</button>
      </div>
    </form>
  </div>
</div>

<!-- MODAL: STANDS & PLOTS -->
<div id="modalPlots" class="modal-overlay" onclick="closeOverlayModal(event, 'modalPlots')">
  <div class="modal-box" style="max-width: 650px;">
    <div class="modal-header">
      <h3>📍 Stand & Zone Plots (FIFO Queues)</h3>
      <button class="modal-close" onclick="closeAppModal('modalPlots')">✕</button>
    </div>
    <div style="margin-bottom:14px; background:#1e293b; padding:12px; border-radius:8px;">
      <h4 style="margin:0 0 8px 0; font-size:0.85rem; color:#38bdf8;">+ Create New Stand / Zone</h4>
      <form onsubmit="return createNewPlot(event)" style="display:grid; grid-template-columns: 1fr 2fr 1fr 1fr auto; gap:8px; align-items:end;">
        <div>
          <label style="font-size:0.75rem;">Code</label>
          <input type="text" id="newPlotCode" class="form-input" placeholder="PL1" required style="padding:6px;">
        </div>
        <div>
          <label style="font-size:0.75rem;">Stand Name</label>
          <input type="text" id="newPlotName" class="form-input" placeholder="e.g. Bath Spa Station" required style="padding:6px;">
        </div>
        <div>
          <label style="font-size:0.75rem;">Sector</label>
          <input type="text" id="newPlotSector" class="form-input" placeholder="BA1 1" required style="padding:6px;">
        </div>
        <div>
          <label style="font-size:0.75rem;">Radius(m)</label>
          <input type="number" id="newPlotRadius" class="form-input" value="350" required style="padding:6px;">
        </div>
        <button type="submit" class="btn-sm btn-blue" style="height:34px;">Add</button>
      </form>
    </div>
    <div style="max-height:300px; overflow-y:auto;">
      <table class="data-table">
        <thead>
          <tr>
            <th>Code</th>
            <th>Name</th>
            <th>Sector</th>
            <th>Radius</th>
            <th style="text-align:center;">Action</th>
          </tr>
        </thead>
        <tbody id="plotsTableBody"></tbody>
      </table>
    </div>
  </div>
</div>

<!-- MODAL: AMEND JOB -->
<div id="modalAmendJob" class="modal-overlay" onclick="closeOverlayModal(event, 'modalAmendJob')">
  <div class="modal-box" style="max-width: 480px;">
    <div class="modal-header">
      <h3>✏️ Amend Booking</h3>
      <button class="modal-close" onclick="closeAppModal('modalAmendJob')">✕</button>
    </div>
    <form onsubmit="return saveAmendedBooking(event)">
      <input type="hidden" id="amendJobId">
      <div style="margin-bottom:10px;">
        <label>Passenger Name</label>
        <input type="text" id="amendPassenger" class="form-input" required>
      </div>
      <div style="margin-bottom:10px;">
        <label>Phone</label>
        <input type="text" id="amendPhone" class="form-input">
      </div>
      <div style="margin-bottom:10px;">
        <label>Pickup</label>
        <input type="text" id="amendPickup" class="form-input" required>
      </div>
      <div style="margin-bottom:10px;">
        <label>Destination</label>
        <input type="text" id="amendDropoff" class="form-input" required>
      </div>
      <div style="margin-bottom:16px;">
        <label>Agreed Fare (£)</label>
        <input type="number" step="0.01" id="amendFare" class="form-input" required>
      </div>
      <div style="display:flex; justify-content:flex-end; gap:8px;">
        <button type="button" class="btn-sm" onclick="closeAppModal('modalAmendJob')">Cancel</button>
        <button type="submit" class="btn-sm btn-blue">Save Changes</button>
      </div>
    </form>
  </div>
</div>

<!-- MODAL: REASSIGN JOB -->
<div id="modalReassignJob" class="modal-overlay" onclick="closeOverlayModal(event, 'modalReassignJob')">
  <div class="modal-box" style="max-width: 420px;">
    <div class="modal-header">
      <h3>🔄 Reassign Driver</h3>
      <button class="modal-close" onclick="closeAppModal('modalReassignJob')">✕</button>
    </div>
    <form onsubmit="return executeReassignment(event)">
      <input type="hidden" id="reassignJobId">
      <div style="margin-bottom:16px;">
        <label>Select Target Driver</label>
        <select id="reassignTargetDriver" class="form-input" style="width:100%;"></select>
      </div>
      <div style="display:flex; justify-content:flex-end; gap:8px;">
        <button type="button" class="btn-sm" onclick="closeAppModal('modalReassignJob')">Cancel</button>
        <button type="submit" class="btn-sm btn-orange">Reassign Job</button>
      </div>
    </form>
  </div>
</div>

<!-- MODAL: CANCEL JOB -->
<div id="modalCancelJob" class="modal-overlay" onclick="closeOverlayModal(event, 'modalCancelJob')">
  <div class="modal-box" style="max-width: 420px;">
    <div class="modal-header">
      <h3>✕ Cancel Booking</h3>
      <button class="modal-close" onclick="closeAppModal('modalCancelJob')">✕</button>
    </div>
    <form onsubmit="return executeCancellation(event)">
      <input type="hidden" id="cancelJobId">
      <p style="color:#94a3b8; font-size:0.9rem;">Are you sure you want to cancel this booking? This will notify the assigned driver immediately.</p>
      <div style="margin-bottom:16px;">
        <label>Cancellation Reason</label>
        <input type="text" id="cancelReason" class="form-input" value="Cancelled by Operator" required>
      </div>
      <div style="display:flex; justify-content:flex-end; gap:8px;">
        <button type="button" class="btn-sm" onclick="closeAppModal('modalCancelJob')">Keep Job</button>
        <button type="submit" class="btn-sm btn-red">Confirm Cancel</button>
      </div>
    </form>
  </div>
</div>
`;

// Remove existing duplicate modal tags if any to keep clean
['modalTariff', 'modalPlots', 'modalAmendJob', 'modalReassignJob', 'modalCancelJob'].forEach(mId => {
  const reg = new RegExp('<div id="' + mId + '"[\\s\\S]*?</div>\\s*</div>', 'gi');
  html = html.replace(reg, '');
});

// Inject all modals right before the scripts
const scriptInsertIdx = html.indexOf('<script');
if (scriptInsertIdx !== -1) {
  html = html.slice(0, scriptInsertIdx) + allModals + '\n' + html.slice(scriptInsertIdx);
}

// 3. Write Complete Application Controller
const finalController = `
<script>
window.onerror = function(msg, url, line) {
  console.error("ADMIN RUNTIME ERROR:", msg, "at line:", line);
};

const socket = io();
let allAccounts = [], allJobs = [], allDrivers = [], allPlots = [], allAirports = [];
let currentFilter = 'all';

// Connection Events
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

// Dropdowns & Modals
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
// 1. MASTER TARIFF CONTROLLER
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

window.saveMasterTariff = function(e) {
  if (e && e.preventDefault) e.preventDefault();
  const getF = function(id) { return parseFloat(document.getElementById(id).value) || 0; };
  const payload = {
    baseFlagDrop: getF('tfBaseFlagDrop'),
    firstMileRate: getF('tfFirstMileRate'),
    tier1PerMile: getF('tfTier1PerMile'),
    tier2PerMile: getF('tfTier2PerMile'),
    tier3PerMile: getF('tfTier3PerMile'),
    viaStopFee: getF('tfViaStopFee'),
    petSurcharge: getF('tfPetSurcharge')
  };
  socket.emit('admin_save_tariff', payload);
  alert('✓ Master Tariff Settings Saved Successfully!');
  closeAppModal('modalTariff');
  return false;
};

socket.on('tariff_saved_ack', function() {
  console.log("Tariff settings acknowledged by server.");
});

// ==========================================
// 2. LIVE BOOKING LEDGER
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
    const sLower = String(job.status || '').toLowerCase();
    const isActive = (sLower !== 'completed' && sLower !== 'cancelled' && sLower !== 'archived');
    
    const driverBadge = job.assignedDriverId
      ? '<span style="color:#38bdf8; font-weight:bold;">' + escapeHtml(job.assignedDriverId) + '</span>'
      : '<span style="color:#64748b;">Unassigned</span>';

    const fareNum = Number(job.fare || 0).toFixed(2);
    const createdAtStr = job.createdAt ? escapeHtml(job.createdAt) : '-';

    let actionBtns = '<button class="btn-sm" data-action="amend-job" data-id="' + job.id + '">✏️ Amend</button> ';
    if (isActive) {
      actionBtns += '<button class="btn-sm btn-orange" data-action="reassign-job" data-id="' + job.id + '">🔄 Reassign</button> ';
      actionBtns += '<button class="btn-sm btn-red" data-action="cancel-job" data-id="' + job.id + '">✕ Cancel</button> ';
    } else {
      actionBtns += '<button class="btn-sm" style="background:#475569;" data-action="archive-job" data-id="' + job.id + '">📦 Archive</button> ';
      actionBtns += '<button class="btn-sm btn-red" data-action="delete-job" data-id="' + job.id + '">🗑️️</button> ';
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

window.openAmendModal = function(jobId) {
  const j = allJobs.find(function(x) { return Number(x.id) === Number(jobId); });
  if (!j) return;
  document.getElementById('amendJobId').value = j.id;
  document.getElementById('amendPassenger').value = j.passenger || '';
  document.getElementById('amendPhone').value = j.phone || '';
  document.getElementById('amendPickup').value = j.pickup || '';
  document.getElementById('amendDropoff').value = j.dropoff || '';
  document.getElementById('amendFare').value = j.fare || 0;
  openAppModal('modalAmendJob');
};

window.saveAmendedBooking = function(e) {
  if (e && e.preventDefault) e.preventDefault();
  const id = document.getElementById('amendJobId').value;
  socket.emit('admin_amend_booking', {
    id: id,
    jobId: id,
    passenger: document.getElementById('amendPassenger').value.trim(),
    phone: document.getElementById('amendPhone').value.trim(),
    pickup: document.getElementById('amendPickup').value.trim(),
    dropoff: document.getElementById('amendDropoff').value.trim(),
    fare: parseFloat(document.getElementById('amendFare').value) || 0
  });
  closeAppModal('modalAmendJob');
  return false;
};

window.openReassignModal = function(jobId) {
  document.getElementById('reassignJobId').value = jobId;
  openAppModal('modalReassignJob');
};

window.executeReassignment = function(e) {
  if (e && e.preventDefault) e.preventDefault();
  const jobId = document.getElementById('reassignJobId').value;
  const driverId = document.getElementById('reassignTargetDriver').value;
  socket.emit('admin_reassign_booking', { jobId: jobId, newDriverId: driverId });
  closeAppModal('modalReassignJob');
  return false;
};

window.openCancelModal = function(jobId) {
  document.getElementById('cancelJobId').value = jobId;
  openAppModal('modalCancelJob');
};

window.executeCancellation = function(e) {
  if (e && e.preventDefault) e.preventDefault();
  const jobId = document.getElementById('cancelJobId').value;
  const reason = document.getElementById('cancelReason').value;
  socket.emit('admin_cancel_booking', { jobId: jobId, reason: reason });
  closeAppModal('modalCancelJob');
  return false;
};

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
// 3. AIRPORT MATRIX (Including 7-Seater)
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
    const mpv6 = (base * 1.50).toFixed(2);
    const mpv7 = (base * 1.65).toFixed(2);
    const minibus8 = (base * 1.85).toFixed(2);
    const exec = (base * 2.00).toFixed(2);

    const tr = document.createElement('tr');
    tr.innerHTML = '<td><strong>' + escapeHtml(a.name) + '</strong> (' + escapeHtml(a.iataCode || '') + ')<br><span style="font-size:0.75rem; color:#94a3b8;">' + escapeHtml(a.postcode || '') + '</span></td>' +
      '<td><strong>£' + base.toFixed(2) + '</strong></td>' +
      '<td>£' + estate + '</td>' +
      '<td>£' + mpv6 + '</td>' +
      '<td><span style="color:#38bdf8; font-weight:bold;">£' + mpv7 + '</span></td>' +
      '<td>£' + minibus8 + '</td>' +
      '<td>£' + exec + '</td>' +
      '<td style="text-align:center;">' +
        '<button class="btn-sm" data-action="edit-airport" data-id="' + a.id + '">✏️ Edit</button> ' +
        '<button class="btn-sm btn-red" data-action="delete-airport" data-id="' + a.id + '">🗑️</button>' +
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
// 4. DRIVERS FLEET
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
          '<button class="btn-sm" data-action="edit-driver" data-id="' + escapeHtml(d.driverId) + '">✏️ Edit</button> ' +
          '<button class="btn-sm btn-red" data-action="delete-driver" data-id="' + escapeHtml(d.driverId) + '">🗑️</button>' +
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
// 5. STANDS & PLOTS
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
        '<button class="btn-sm btn-red" data-action="delete-plot" data-id="' + p.id + '">🗑️ Delete</button>' +
      '</td>';
    tbody.appendChild(tr);
  });
}

window.createNewPlot = function(e) {
  if (e && e.preventDefault) e.preventDefault();
  const payload = {
    code: document.getElementById('newPlotCode').value.trim(),
    name: document.getElementById('newPlotName').value.trim(),
    postcodeSector: document.getElementById('newPlotSector').value.trim(),
    radiusMeters: parseInt(document.getElementById('newPlotRadius').value) || 350
  };
  socket.emit('admin_create_plot', payload);
  document.getElementById('newPlotCode').value = '';
  document.getElementById('newPlotName').value = '';
  document.getElementById('newPlotSector').value = '';
  return false;
};

window.deletePlot = function(id) {
  if (confirm('Delete this stand/plot?')) {
    socket.emit('admin_delete_plot', id);
  }
};

// ==========================================
// 6. CORPORATE ACCOUNTS
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
          '<button class="btn-sm" data-action="edit-account" data-id="' + escapeHtml(num) + '">✏️ Edit</button> ' +
          '<button class="btn-sm btn-red" data-action="delete-account" data-id="' + escapeHtml(num) + '">🗑️</button>' +
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
// 7. UNIVERSAL BUTTON EVENT DELEGATION
// ==========================================
document.addEventListener('click', function(e) {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const action = btn.getAttribute('data-action');
  const id = btn.getAttribute('data-id');

  // Bookings
  if (action === 'amend-job') openAmendModal(id);
  if (action === 'reassign-job') openReassignModal(id);
  if (action === 'cancel-job') openCancelModal(id);
  if (action === 'archive-job') archiveJob(id);
  if (action === 'delete-job') deleteJob(id);

  // Airports
  if (action === 'edit-airport') openEditAirportModal(id);
  if (action === 'delete-airport') deleteAirport(id);

  // Drivers
  if (action === 'edit-driver') openEditDriverModal(id);
  if (action === 'delete-driver') deleteDriver(id);

  // Plots
  if (action === 'delete-plot') deletePlot(id);

  // Accounts
  if (action === 'edit-account') openEditAccountModal(id);
  if (action === 'delete-account') deleteAccount(id);
});

// SAFE LEAFLET MAP INIT
window.addEventListener('DOMContentLoaded', function() {
  try {
    if (typeof L !== 'undefined' && document.getElementById('mapContainer')) {
      const map = L.map('mapContainer').setView([51.3776, -2.3571], 13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
    }
  } catch(e) {
    console.warn("Map init notice:", e.message);
  }
});
</script>
`;

// Cleanly replace all script blocks with final controller
html = html.replace(/<script(?![^>]*src=)[^>]*>[\s\S]*?<\/script>/gi, '');
const bodyCloseIdx = html.lastIndexOf('</body>');
html = html.slice(0, bodyCloseIdx) + finalController + '\n</body></html>';

fs.writeFileSync('public/admin.html', html);
console.log('✅ admin.html fully injected with 7-seater, missing modals, and universal click delegation!');
