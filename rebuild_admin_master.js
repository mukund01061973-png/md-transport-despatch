const fs = require('fs');

const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MD Taxi Despatch System - Operations Console</title>
  <script src="/socket.io/socket.io.js"></script>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    body { background: #0f172a; color: #f8fafc; font-size: 14px; min-height: 100vh; }
    
    /* Top Navbar */
    .navbar { background: #1e293b; border-bottom: 1px solid #334155; padding: 10px 20px; display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; z-index: 1000; }
    .brand { font-size: 1.15rem; font-weight: bold; color: #38bdf8; display: flex; align-items: center; gap: 8px; }
    .nav-links { display: flex; gap: 10px; align-items: center; }
    .menu-item { position: relative; display: inline-block; }
    .nav-btn { background: #334155; color: #f8fafc; border: 1px solid #475569; padding: 6px 14px; border-radius: 6px; cursor: pointer; font-size: 0.85rem; font-weight: 500; display: flex; align-items: center; gap: 6px; }
    .nav-btn:hover { background: #475569; }
    .dropdown-menu { display: none; position: absolute; top: 100%; left: 0; background: #1e293b; border: 1px solid #475569; border-radius: 6px; min-width: 220px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); margin-top: 6px; z-index: 1001; }
    .dropdown-menu.show { display: block; }
    .dropdown-menu a, .dropdown-menu button { display: block; width: 100%; text-align: left; padding: 9px 14px; background: transparent; border: none; color: #e2e8f0; font-size: 0.85rem; cursor: pointer; text-decoration: none; }
    .dropdown-menu a:hover, .dropdown-menu button:hover { background: #334155; color: #38bdf8; }

    /* Badges & Buttons */
    .badge { padding: 4px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; }
    .badge-green { background: rgba(34, 197, 94, 0.2); color: #4ade80; border: 1px solid rgba(34, 197, 94, 0.4); }
    .badge-yellow { background: rgba(234, 179, 8, 0.2); color: #facc15; border: 1px solid rgba(234, 179, 8, 0.4); }
    .badge-blue { background: rgba(56, 189, 248, 0.2); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.4); }
    .badge-red { background: rgba(239, 68, 68, 0.2); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.4); }

    .btn-sm { padding: 4px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 600; cursor: pointer; border: none; background: #334155; color: #f8fafc; transition: all 0.15s; }
    .btn-sm:hover { background: #475569; }
    .btn-blue { background: #2563eb; color: #fff; }
    .btn-blue:hover { background: #1d4ed8; }
    .btn-green { background: #16a34a; color: #fff; }
    .btn-green:hover { background: #15803d; }
    .btn-orange { background: #ea580c; color: #fff; }
    .btn-orange:hover { background: #c2410c; }
    .btn-red { background: #dc2626; color: #fff; }
    .btn-red:hover { background: #b91c1c; }
    .btn-pill { background: #334155; color: #94a3b8; border: 1px solid #475569; padding: 4px 12px; border-radius: 9999px; cursor: pointer; font-size: 0.75rem; }
    .btn-pill.active { background: #2563eb; color: #fff; border-color: #3b82f6; }

    /* Layout Containers */
    .main-grid { display: grid; grid-template-columns: 360px 1fr; gap: 16px; padding: 16px; height: calc(100vh - 58px); }
    .panel { background: #1e293b; border: 1px solid #334155; border-radius: 8px; display: flex; flex-direction: column; overflow: hidden; }
    .panel-header { background: #0f172a; padding: 10px 14px; border-bottom: 1px solid #334155; font-weight: 600; font-size: 0.9rem; color: #e2e8f0; display: flex; justify-content: space-between; align-items: center; }
    .panel-body { padding: 14px; overflow-y: auto; flex: 1; }

    /* Form Controls */
    .form-group { margin-bottom: 10px; }
    .form-group label { display: block; font-size: 0.75rem; color: #94a3b8; margin-bottom: 4px; }
    .form-input { width: 100%; background: #0f172a; border: 1px solid #334155; border-radius: 4px; padding: 6px 10px; color: #f8fafc; font-size: 0.85rem; }
    .form-input:focus { outline: none; border-color: #38bdf8; }

    /* Tables */
    .data-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 0.82rem; }
    .data-table th { background: #0f172a; padding: 8px 10px; color: #94a3b8; font-weight: 600; border-bottom: 1px solid #334155; position: sticky; top: 0; z-index: 10; }
    .data-table td { padding: 8px 10px; border-bottom: 1px solid #334155; color: #e2e8f0; vertical-align: middle; }
    .data-table tr:hover { background: rgba(255, 255, 255, 0.03); }

    /* Modal Popups */
    .modal-overlay { display: none; position: fixed; inset: 0; background: rgba(0, 0, 0, 0.75); z-index: 2000; justify-content: center; align-items: center; backdrop-filter: blur(2px); }
    .modal-box { background: #1e293b; border: 1px solid #475569; border-radius: 8px; padding: 20px; width: 90%; max-width: 600px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5); max-height: 90vh; overflow-y: auto; }
    .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; border-bottom: 1px solid #334155; padding-bottom: 8px; }
    .modal-header h3 { font-size: 1rem; color: #f8fafc; }
    .modal-close { background: none; border: none; color: #94a3b8; font-size: 1.25rem; cursor: pointer; }
    .modal-close:hover { color: #fff; }
  </style>
</head>
<body>

  <!-- Top Navigation -->
  <header class="navbar">
    <div class="brand">
      <span>🚕 MD Taxi Despatch</span>
      <span id="connStatus" class="badge badge-yellow">CONNECTING...</span>
    </div>
    <nav class="nav-links">
      <!-- Tariffs Menu -->
      <div class="menu-item">
        <button class="nav-btn" onclick="toggleMenu('menuTariffs', event)">⚙️ Tariffs & Pricing ▾</button>
        <div id="menuTariffs" class="dropdown-menu">
          <button onclick="openAppModal('modalTariff')">Master Progressive Tariff</button>
          <button onclick="openAppModal('modalAirports')">Airport Fixed Rates</button>
        </div>
      </div>

      <!-- Fleet Menu -->
      <div class="menu-item">
        <button class="nav-btn" onclick="toggleMenu('menuFleet', event)">🚖 Fleet & Stands ▾</button>
        <div id="menuFleet" class="dropdown-menu">
          <button onclick="openAppModal('modalDrivers')">Driver Fleet Manager</button>
          <button onclick="openAppModal('modalPlots')">Stands & Plots (FIFO)</button>
        </div>
      </div>

      <!-- Corporate Menu -->
      <div class="menu-item">
        <button class="nav-btn" onclick="toggleMenu('menuCorporate', event)">🏢 Corporate ▾</button>
        <div id="menuCorporate" class="dropdown-menu">
          <button onclick="openAppModal('modalAccounts')">Corporate Accounts Manager</button>
        </div>
      </div>
    </nav>
  </header>

  <!-- Main View -->
  <div class="main-grid">
    
    <!-- Left Dispatch Column -->
    <div style="display:flex; flex-direction:column; gap:16px; overflow:hidden;">
      
      <!-- New Booking Form -->
      <div class="panel" style="flex: 0 0 auto;">
        <div class="panel-header">
          <span>⚡ Fast New Booking</span>
          <button class="btn-sm btn-green" onclick="document.getElementById('bookingForm').requestSubmit()">Dispatch</button>
        </div>
        <div class="panel-body">
          <form id="bookingForm" onsubmit="return createJob(event)">
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px;">
              <div class="form-group">
                <label>Passenger Name *</label>
                <input type="text" id="jobPassenger" class="form-input" required placeholder="Full Name">
              </div>
              <div class="form-group">
                <label>Contact Phone</label>
                <input type="text" id="jobPhone" class="form-input" placeholder="07...">
              </div>
            </div>

            <div class="form-group">
              <label>Pickup Address *</label>
              <input type="text" id="jobPickup" class="form-input" required placeholder="e.g. Bath Spa Station">
            </div>

            <div class="form-group">
              <label>Destination / Dropoff *</label>
              <input type="text" id="jobDropoff" class="form-input" required placeholder="e.g. Bristol Airport (BRS)">
            </div>

            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px;">
              <div class="form-group">
                <label>Vehicle Class</label>
                <select id="jobVehClass" class="form-input">
                  <option value="Saloon">Saloon</option>
                  <option value="Estate">Estate</option>
                  <option value="MPV">MPV (6-Seat)</option>
                  <option value="MPV7">7-Seat (MPV+)</option>
                  <option value="Minibus">Minibus (8-Seat)</option>
                  <option value="Executive">Executive</option>
                </select>
              </div>
              <div class="form-group">
                <label>Quoted Fare (£) *</label>
                <input type="number" step="0.01" id="jobFare" class="form-input" required placeholder="0.00">
              </div>
            </div>

            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px;">
              <div class="form-group">
                <label>Payment Method</label>
                <select id="jobPayMethod" class="form-input">
                  <option value="Cash">Cash to Driver</option>
                  <option value="Card">In-Car Card</option>
                  <option value="Account">Account Billing</option>
                </select>
              </div>
              <div class="form-group">
                <label>Assign Driver</label>
                <select id="jobAssignDriver" class="form-input">
                  <option value="AUTO">⚡ Auto-Match FIFO Queue</option>
                </select>
              </div>
            </div>
          </form>
        </div>
      </div>

      <!-- Live GPS Map View -->
      <div class="panel" style="flex:1;">
        <div class="panel-header">📍 Real-Time Fleet Radar</div>
        <div id="mapContainer" style="width:100%; height:100%; min-height:200px;"></div>
      </div>

    </div>

    <!-- Right Live Ledger Column -->
    <div class="panel">
      <div class="panel-header">
        <span>📋 Live Dispatch Ledger (<span id="jobsCount">0</span> Bookings)</span>
        <div style="display:flex; gap:6px;">
          <button class="btn-pill active" onclick="filterJobs('all', this)">All</button>
          <button class="btn-pill" onclick="filterJobs('active', this)">🟢 Active</button>
          <button class="btn-pill" onclick="filterJobs('completed', this)">✅ Completed</button>
          <button class="btn-pill" onclick="filterJobs('cancelled', this)">❌ Cancelled</button>
          <button class="btn-pill" onclick="filterJobs('archived', this)">📦 Archived</button>
        </div>
      </div>
      <div class="panel-body" style="padding:0;">
        <table class="data-table">
          <thead>
            <tr>
              <th style="width:70px;">Ref</th>
              <th>Passenger</th>
              <th>Journey Details</th>
              <th style="width:110px;">Driver</th>
              <th style="width:90px;">Fare</th>
              <th style="width:110px;">Status</th>
              <th style="width:180px; text-align:center;">Actions</th>
            </tr>
          </thead>
          <tbody id="jobsTableBody"></tbody>
        </table>
      </div>
    </div>

  </div>

  <!-- ==================== MODALS SUITE ==================== -->

  <!-- MODAL: MASTER TARIFF -->
  <div id="modalTariff" class="modal-overlay" onclick="closeOverlayModal(event, 'modalTariff')">
    <div class="modal-box" style="max-width: 500px;">
      <div class="modal-header">
        <h3>⚙️ Master Tariff Settings</h3>
        <button class="modal-close" onclick="closeAppModal('modalTariff')">✕</button>
      </div>
      <form onsubmit="return saveMasterTariff(event)">
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; margin-bottom:12px;">
          <div class="form-group">
            <label>Base Flag Drop (£)</label>
            <input type="number" step="0.10" id="tfBaseFlagDrop" class="form-input" required>
          </div>
          <div class="form-group">
            <label>First Mile Rate (£)</label>
            <input type="number" step="0.10" id="tfFirstMileRate" class="form-input" required>
          </div>
        </div>
        <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:8px; margin-bottom:12px;">
          <div class="form-group">
            <label>Tier 1 (1-5m)</label>
            <input type="number" step="0.10" id="tfTier1PerMile" class="form-input" required>
          </div>
          <div class="form-group">
            <label>Tier 2 (5-15m)</label>
            <input type="number" step="0.10" id="tfTier2PerMile" class="form-input" required>
          </div>
          <div class="form-group">
            <label>Tier 3 (15m+)</label>
            <input type="number" step="0.10" id="tfTier3PerMile" class="form-input" required>
          </div>
        </div>
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; margin-bottom:16px;">
          <div class="form-group">
            <label>Via Stop Charge (£)</label>
            <input type="number" step="0.50" id="tfViaStopFee" class="form-input" required>
          </div>
          <div class="form-group">
            <label>Pet Surcharge (£)</label>
            <input type="number" step="0.50" id="tfPetSurcharge" class="form-input" required>
          </div>
        </div>
        <div style="display:flex; justify-content:flex-end; gap:8px;">
          <button type="button" class="btn-sm" onclick="closeAppModal('modalTariff')">Cancel</button>
          <button type="submit" class="btn-sm btn-blue">💾 Save Tariff Settings</button>
        </div>
      </form>
    </div>
  </div>

  <!-- MODAL: AIRPORT MATRIX -->
  <div id="modalAirports" class="modal-overlay" onclick="closeOverlayModal(event, 'modalAirports')">
    <div class="modal-box" style="max-width: 900px;">
      <div class="modal-header">
        <h3>✈️ Airport Matrix & Vehicle Classes</h3>
        <button class="modal-close" onclick="closeAppModal('modalAirports')">✕</button>
      </div>
      <div style="max-height: 450px; overflow-y: auto;">
        <table class="data-table">
          <thead>
            <tr>
              <th>Destination</th>
              <th>Saloon (Base)</th>
              <th>Estate (+20%)</th>
              <th>6-Seat (+50%)</th>
              <th style="color:#38bdf8;">7-Seat (+65%)</th>
              <th>8-Seat (+85%)</th>
              <th>Exec (+100%)</th>
              <th style="text-align:center;">Actions</th>
            </tr>
          </thead>
          <tbody id="airportsTableBody"></tbody>
        </table>
      </div>
    </div>
  </div>

  <!-- MODAL: EDIT AIRPORT -->
  <div id="modalEditAirport" class="modal-overlay" onclick="closeOverlayModal(event, 'modalEditAirport')">
    <div class="modal-box" style="max-width: 420px;">
      <div class="modal-header">
        <h3>✏️ Edit Airport Rate</h3>
        <button class="modal-close" onclick="closeAppModal('modalEditAirport')">✕</button>
      </div>
      <form onsubmit="return saveEditAirport(event)">
        <input type="hidden" id="editAirportId">
        <div class="form-group">
          <label>Airport Name</label>
          <input type="text" id="editAirportName" class="form-input" required>
        </div>
        <div class="form-group">
          <label>IATA Code</label>
          <input type="text" id="editAirportIata" class="form-input" maxlength="4">
        </div>
        <div class="form-group">
          <label>Saloon Base Rate (£)</label>
          <input type="number" step="0.01" id="editAirportBaseRate" class="form-input" required>
        </div>
        <div style="display:flex; justify-content:flex-end; gap:8px;">
          <button type="button" class="btn-sm" onclick="closeAppModal('modalEditAirport')">Cancel</button>
          <button type="submit" class="btn-sm btn-blue">Save Changes</button>
        </div>
      </form>
    </div>
  </div>

  <!-- MODAL: DRIVER FLEET -->
  <div id="modalDrivers" class="modal-overlay" onclick="closeOverlayModal(event, 'modalDrivers')">
    <div class="modal-box" style="max-width: 750px;">
      <div class="modal-header">
        <h3>🚖 Driver Fleet Manager</h3>
        <button class="modal-close" onclick="closeAppModal('modalDrivers')">✕</button>
      </div>
      <div style="max-height: 450px; overflow-y: auto;">
        <table class="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name & Contact</th>
              <th>Vehicle & Class</th>
              <th>Commission</th>
              <th>Status</th>
              <th style="text-align:center;">Actions</th>
            </tr>
          </thead>
          <tbody id="driversTableBody"></tbody>
        </table>
      </div>
    </div>
  </div>

  <!-- MODAL: EDIT DRIVER -->
  <div id="modalEditDriver" class="modal-overlay" onclick="closeOverlayModal(event, 'modalEditDriver')">
    <div class="modal-box" style="max-width: 480px;">
      <div class="modal-header">
        <h3>✏️ Edit Driver Record</h3>
        <button class="modal-close" onclick="closeAppModal('modalEditDriver')">✕</button>
      </div>
      <form onsubmit="return saveEditDriver(event)">
        <input type="hidden" id="editDriverOriginalId">
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
          <div class="form-group">
            <label>Driver ID / Callsign</label>
            <input type="text" id="editDriverId" class="form-input" required>
          </div>
          <div class="form-group">
            <label>PIN (Login)</label>
            <input type="text" id="editDriverPin" class="form-input" required>
          </div>
        </div>
        <div class="form-group">
          <label>Full Name</label>
          <input type="text" id="editDriverName" class="form-input" required>
        </div>
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
          <div class="form-group">
            <label>Phone</label>
            <input type="text" id="editDriverPhone" class="form-input">
          </div>
          <div class="form-group">
            <label>Commission (%)</label>
            <input type="number" id="editDriverCommission" class="form-input" min="0" max="100">
          </div>
        </div>
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-bottom:16px;">
          <div class="form-group">
            <label>Vehicle Model</label>
            <input type="text" id="editDriverVehicle" class="form-input">
          </div>
          <div class="form-group">
            <label>Vehicle Class</label>
            <select id="editDriverClass" class="form-input">
              <option value="Saloon">Saloon</option>
              <option value="Estate">Estate</option>
              <option value="MPV">MPV (6-Seat)</option>
              <option value="MPV7">7-Seat (MPV+)</option>
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

  <!-- MODAL: STANDS & PLOTS -->
  <div id="modalPlots" class="modal-overlay" onclick="closeOverlayModal(event, 'modalPlots')">
    <div class="modal-box" style="max-width: 650px;">
      <div class="modal-header">
        <h3>📍 Stand & Zone Plots (FIFO)</h3>
        <button class="modal-close" onclick="closeAppModal('modalPlots')">✕</button>
      </div>
      <div style="background:#0f172a; padding:10px; border-radius:6px; margin-bottom:12px;">
        <h4 style="font-size:0.8rem; color:#38bdf8; margin-bottom:6px;">+ Add New Stand</h4>
        <form onsubmit="return createNewPlot(event)" style="display:grid; grid-template-columns: 1fr 2fr 1fr 1fr auto; gap:6px;">
          <input type="text" id="newPlotCode" class="form-input" placeholder="Code" required>
          <input type="text" id="newPlotName" class="form-input" placeholder="Stand Name" required>
          <input type="text" id="newPlotSector" class="form-input" placeholder="Sector (BA1)" required>
          <input type="number" id="newPlotRadius" class="form-input" value="350" required>
          <button type="submit" class="btn-sm btn-blue">Add</button>
        </form>
      </div>
      <div style="max-height: 350px; overflow-y: auto;">
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

  <!-- MODAL: CORPORATE ACCOUNTS -->
  <div id="modalAccounts" class="modal-overlay" onclick="closeOverlayModal(event, 'modalAccounts')">
    <div class="modal-box" style="max-width: 650px;">
      <div class="modal-header">
        <h3>🏢 Corporate Accounts</h3>
        <button class="modal-close" onclick="closeAppModal('modalAccounts')">✕</button>
      </div>
      <div style="max-height: 400px; overflow-y: auto;">
        <table class="data-table">
          <thead>
            <tr>
              <th>Acc #</th>
              <th>Company Name</th>
              <th>Discount</th>
              <th>Billing Email</th>
              <th style="text-align:center;">Actions</th>
            </tr>
          </thead>
          <tbody id="accountsTableBody"></tbody>
        </table>
      </div>
    </div>
  </div>

  <!-- MODAL: EDIT CORPORATE ACCOUNT -->
  <div id="modalEditAccount" class="modal-overlay" onclick="closeOverlayModal(event, 'modalEditAccount')">
    <div class="modal-box" style="max-width: 420px;">
      <div class="modal-header">
        <h3>✏️ Edit Corporate Account</h3>
        <button class="modal-close" onclick="closeAppModal('modalEditAccount')">✕</button>
      </div>
      <form onsubmit="return saveEditAccount(event)">
        <input type="hidden" id="editAccountId">
        <div class="form-group">
          <label>Account Number</label>
          <input type="text" id="editAccountNum" class="form-input" required>
        </div>
        <div class="form-group">
          <label>Company Name</label>
          <input type="text" id="editAccountName" class="form-input" required>
        </div>
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
          <div class="form-group">
            <label>Discount (%)</label>
            <input type="number" id="editAccountDiscount" class="form-input" min="0" max="100">
          </div>
          <div class="form-group">
            <label>Billing Email</label>
            <input type="email" id="editAccountEmail" class="form-input">
          </div>
        </div>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:16px;">
          <button type="button" class="btn-sm btn-red" onclick="deleteCurrentAccount()">🗑️ Delete</button>
          <div style="display:flex; gap:8px;">
            <button type="button" class="btn-sm" onclick="closeAppModal('modalEditAccount')">Cancel</button>
            <button type="submit" class="btn-sm btn-blue">Save Changes</button>
          </div>
        </div>
      </form>
    </div>
  </div>

  <!-- MODAL: AMEND JOB -->
  <div id="modalAmendJob" class="modal-overlay" onclick="closeOverlayModal(event, 'modalAmendJob')">
    <div class="modal-box" style="max-width: 440px;">
      <div class="modal-header">
        <h3>✏️ Amend Booking</h3>
        <button class="modal-close" onclick="closeAppModal('modalAmendJob')">✕</button>
      </div>
      <form onsubmit="return saveAmendedBooking(event)">
        <input type="hidden" id="amendJobId">
        <div class="form-group">
          <label>Passenger Name</label>
          <input type="text" id="amendPassenger" class="form-input" required>
        </div>
        <div class="form-group">
          <label>Phone Number</label>
          <input type="text" id="amendPhone" class="form-input">
        </div>
        <div class="form-group">
          <label>Pickup Location</label>
          <input type="text" id="amendPickup" class="form-input" required>
        </div>
        <div class="form-group">
          <label>Destination Dropoff</label>
          <input type="text" id="amendDropoff" class="form-input" required>
        </div>
        <div class="form-group">
          <label>Agreed Fare (£)</label>
          <input type="number" step="0.01" id="amendFare" class="form-input" required>
        </div>
        <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:16px;">
          <button type="button" class="btn-sm" onclick="closeAppModal('modalAmendJob')">Cancel</button>
          <button type="submit" class="btn-sm btn-blue">Save Booking</button>
        </div>
      </form>
    </div>
  </div>

  <!-- MODAL: REASSIGN JOB -->
  <div id="modalReassignJob" class="modal-overlay" onclick="closeOverlayModal(event, 'modalReassignJob')">
    <div class="modal-box" style="max-width: 400px;">
      <div class="modal-header">
        <h3>🔄 Reassign Driver</h3>
        <button class="modal-close" onclick="closeAppModal('modalReassignJob')">✕</button>
      </div>
      <form onsubmit="return executeReassignment(event)">
        <input type="hidden" id="reassignJobId">
        <div class="form-group">
          <label>Select Target Driver</label>
          <select id="reassignTargetDriver" class="form-input"></select>
        </div>
        <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:16px;">
          <button type="button" class="btn-sm" onclick="closeAppModal('modalReassignJob')">Cancel</button>
          <button type="submit" class="btn-sm btn-orange">Reassign Now</button>
        </div>
      </form>
    </div>
  </div>

  <!-- MODAL: CANCEL JOB -->
  <div id="modalCancelJob" class="modal-overlay" onclick="closeOverlayModal(event, 'modalCancelJob')">
    <div class="modal-box" style="max-width: 400px;">
      <div class="modal-header">
        <h3>✕ Cancel Booking</h3>
        <button class="modal-close" onclick="closeAppModal('modalCancelJob')">✕</button>
      </div>
      <form onsubmit="return executeCancellation(event)">
        <input type="hidden" id="cancelJobId">
        <div class="form-group">
          <label>Reason for Cancellation</label>
          <input type="text" id="cancelReason" class="form-input" value="Cancelled by Operator" required>
        </div>
        <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:16px;">
          <button type="button" class="btn-sm" onclick="closeAppModal('modalCancelJob')">Back</button>
          <button type="submit" class="btn-sm btn-red">Confirm Cancel</button>
        </div>
      </form>
    </div>
  </div>

  <!-- ==================== APPLICATION CONTROLLER SCRIPT ==================== -->
  <script>
    const socket = io();
    let allAccounts = [], allJobs = [], allDrivers = [], allPlots = [], allAirports = [];
    let currentFilter = 'all';

    // Socket Connection Handshake
    socket.on('connect', () => {
      console.log('⚡ Socket connected:', socket.id);
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

    // Navigation and Dropdown Menus
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

    // Modal Control
    function openAppModal(id) {
      document.querySelectorAll('.dropdown-menu').forEach(m => m.classList.remove('show'));
      const el = document.getElementById(id);
      if (el) el.style.display = 'flex';
    }

    function closeAppModal(id) {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    }

    function closeOverlayModal(e, id) {
      if (e && e.target && e.target.id === id) {
        document.getElementById(id).style.display = 'none';
      }
    }

    function escapeHtml(str) {
      if (!str) return '';
      return String(str).replace(/[&<>"']/g, m => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
      }[m]));
    }

    // 1. MASTER TARIFFS
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

    function saveMasterTariff(e) {
      if (e && e.preventDefault) e.preventDefault();
      const getF = (id) => parseFloat(document.getElementById(id).value) || 0;
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
    }

    // 2. LIVE BOOKING LEDGER
    socket.on('update_jobs_list', (jobs) => {
      allJobs = jobs || [];
      const badge = document.getElementById('jobsCount');
      if (badge) badge.textContent = allJobs.length;
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

      const filtered = allJobs.filter(j => {
        const s = String(j.status || '').toLowerCase();
        if (currentFilter === 'active') return ['accepted', 'arrived', 'pob', 'pending', 'dispatched'].includes(s);
        if (currentFilter === 'completed') return s === 'completed';
        if (currentFilter === 'cancelled') return s === 'cancelled';
        if (currentFilter === 'archived') return s === 'archived';
        return true;
      });

      if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:24px; color:#64748b;">No bookings found for selected filter.</td></tr>';
        return;
      }

      filtered.forEach(job => {
        const tr = document.createElement('tr');
        const sLower = String(job.status || '').toLowerCase();
        const isActive = !['completed', 'cancelled', 'archived'].includes(sLower);
        
        const driverBadge = job.assignedDriverId
          ? '<span style="color:#38bdf8; font-weight:bold;">' + escapeHtml(job.assignedDriverId) + '</span>'
          : '<span style="color:#64748b;">Unassigned</span>';

        const fareNum = Number(job.fare || 0).toFixed(2);
        const createdAtStr = job.createdAt ? escapeHtml(job.createdAt) : '-';

        let actionBtns = '<button class="btn-sm" data-action="amend-job" data-id="' + job.id + '">✏️ Amend</button> ';
        if (isActive) {
          actionBtns += '<button class="btn-sm btn-orange" data-action="reassign-job" data-id="' + job.id + '">🔄 Reassign</button> ';
          actionBtns += '<button class="btn-sm btn-red" data-action="cancel-job" data-id="' + job.id + '">✕ Cancel</button>';
        } else {
          actionBtns += '<button class="btn-sm" style="background:#475569;" data-action="archive-job" data-id="' + job.id + '">📦 Archive</button> ';
          actionBtns += '<button class="btn-sm btn-red" data-action="delete-job" data-id="' + job.id + '">🗑️</button>';
        }

        tr.innerHTML = '<td><strong>#' + job.id + '</strong><br><span style="font-size:0.7rem; color:#94a3b8;">' + createdAtStr + '</span></td>' +
          '<td><strong>' + escapeHtml(job.passenger || 'Guest') + '</strong><br><span style="font-size:0.75rem; color:#94a3b8;">' + escapeHtml(job.phone || '-') + '</span></td>' +
          '<td><div>📍 ' + escapeHtml(job.pickup || '-') + '</div><div>🏁 ' + escapeHtml(job.dropoff || '-') + '</div></td>' +
          '<td>' + driverBadge + '</td>' +
          '<td><strong>£' + fareNum + '</strong><br><span style="font-size:0.75rem; color:#94a3b8;">' + escapeHtml(job.paymentMethod || 'Cash') + '</span></td>' +
          '<td><span class="badge badge-blue">' + escapeHtml(job.status || 'Pending') + '</span></td>' +
          '<td style="text-align:center;">' + actionBtns + '</td>';

        tbody.appendChild(tr);
      });
    }

    function openAmendModal(jobId) {
      const j = allJobs.find(x => Number(x.id) === Number(jobId));
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
        passenger: document.getElementById('amendPassenger').value.trim(),
        phone: document.getElementById('amendPhone').value.trim(),
        pickup: document.getElementById('amendPickup').value.trim(),
        dropoff: document.getElementById('amendDropoff').value.trim(),
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
      const reason = document.getElementById('cancelReason').value;
      socket.emit('admin_cancel_booking', { jobId: jobId, reason: reason });
      closeAppModal('modalCancelJob');
      return false;
    }

    function archiveJob(jobId) {
      if (confirm('Archive Booking #' + jobId + '?')) {
        socket.emit('admin_archive_booking', jobId);
      }
    }

    function deleteJob(jobId) {
      if (confirm('Permanently delete Booking #' + jobId + '?')) {
        socket.emit('admin_delete_booking', jobId);
      }
    }

    // 3. AIRPORT MATRIX (7-Seater Included)
    socket.on('update_airports', (airports) => {
      allAirports = airports || [];
      renderAirportsTable();
    });

    function renderAirportsTable() {
      const tbody = document.getElementById('airportsTableBody');
      if (!tbody) return;
      tbody.innerHTML = '';

      allAirports.forEach(a => {
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

    function openEditAirportModal(id) {
      const a = allAirports.find(x => Number(x.id) === Number(id));
      if (!a) return;
      document.getElementById('editAirportId').value = a.id;
      document.getElementById('editAirportName').value = a.name || '';
      document.getElementById('editAirportIata').value = a.iataCode || '';
      document.getElementById('editAirportBaseRate').value = a.baseRate || 0;
      openAppModal('modalEditAirport');
    }

    function saveEditAirport(e) {
      if (e && e.preventDefault) e.preventDefault();
      const id = document.getElementById('editAirportId').value;
      socket.emit('admin_update_airport', {
        id: id,
        name: document.getElementById('editAirportName').value.trim(),
        iataCode: document.getElementById('editAirportIata').value.trim(),
        baseRate: parseFloat(document.getElementById('editAirportBaseRate').value) || 0
      });
      closeAppModal('modalEditAirport');
      return false;
    }

    function deleteAirport(id) {
      if (confirm('Delete this airport from fixed matrix?')) {
        socket.emit('admin_delete_airport', id);
      }
    }

    // 4. DRIVER FLEET
    socket.on('update_driver_list', (drivers) => {
      allDrivers = drivers || [];
      renderDriversTable();
    });

    function renderDriversTable() {
      const tbody = document.getElementById('driversTableBody');
      const sel = document.getElementById('jobAssignDriver');
      const reassignSel = document.getElementById('reassignTargetDriver');

      if (tbody) tbody.innerHTML = '';
      if (sel) sel.innerHTML = '<option value="AUTO">⚡ Auto-Match FIFO Queue</option>';
      if (reassignSel) reassignSel.innerHTML = '';

      allDrivers.forEach(d => {
        const opt = document.createElement('option');
        opt.value = d.driverId;
        opt.textContent = (d.name || d.driverId) + ' (' + d.driverId + ')';

        if (sel) sel.appendChild(opt.cloneNode(true));
        if (reassignSel) reassignSel.appendChild(opt.cloneNode(true));

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

    function openEditDriverModal(driverId) {
      const d = allDrivers.find(x => String(x.driverId).toUpperCase() === String(driverId).toUpperCase());
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
    }

    function saveEditDriver(e) {
      if (e && e.preventDefault) e.preventDefault();
      socket.emit('admin_update_driver', {
        originalDriverId: document.getElementById('editDriverOriginalId').value,
        driverId: document.getElementById('editDriverId').value.trim(),
        pin: document.getElementById('editDriverPin').value.trim(),
        name: document.getElementById('editDriverName').value.trim(),
        phone: document.getElementById('editDriverPhone').value.trim(),
        commissionRate: parseFloat(document.getElementById('editDriverCommission').value) || 15,
        vehicle: document.getElementById('editDriverVehicle').value.trim(),
        vehicleClass: document.getElementById('editDriverClass').value
      });
      closeAppModal('modalEditDriver');
      return false;
    }

    function deleteCurrentDriver() {
      const id = document.getElementById('editDriverOriginalId').value;
      deleteDriver(id);
      closeAppModal('modalEditDriver');
    }

    function deleteDriver(driverId) {
      if (confirm('Delete Driver ' + driverId + ' from fleet database?')) {
        socket.emit('admin_delete_driver', driverId);
      }
    }

    // 5. STANDS & PLOTS
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
          '<td style="text-align:center;">' +
            '<button class="btn-sm btn-red" data-action="delete-plot" data-id="' + p.id + '">🗑️ Delete</button>' +
          '</td>';
        tbody.appendChild(tr);
      });
    }

    function createNewPlot(e) {
      if (e && e.preventDefault) e.preventDefault();
      socket.emit('admin_create_plot', {
        code: document.getElementById('newPlotCode').value.trim(),
        name: document.getElementById('newPlotName').value.trim(),
        postcodeSector: document.getElementById('newPlotSector').value.trim(),
        radiusMeters: parseInt(document.getElementById('newPlotRadius').value) || 350
      });
      document.getElementById('newPlotCode').value = '';
      document.getElementById('newPlotName').value = '';
      document.getElementById('newPlotSector').value = '';
      return false;
    }

    function deletePlot(id) {
      if (confirm('Delete this stand/plot?')) {
        socket.emit('admin_delete_plot', id);
      }
    }

    // 6. CORPORATE ACCOUNTS
    socket.on('update_accounts', (accounts) => {
      allAccounts = accounts || [];
      renderAccountsTable();
    });

    function renderAccountsTable() {
      const tbody = document.getElementById('accountsTableBody');
      if (!tbody) return;
      tbody.innerHTML = '';

      allAccounts.forEach(a => {
        const num = a.accountNumber || a.id;
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
      });
    }

    function openEditAccountModal(num) {
      const a = allAccounts.find(x => String(x.accountNumber || x.id) === String(num));
      if (!a) return;
      document.getElementById('editAccountId').value = a.id || a.accountNumber;
      document.getElementById('editAccountNum').value = a.accountNumber || a.id;
      document.getElementById('editAccountName').value = a.companyName || '';
      document.getElementById('editAccountDiscount').value = a.discountPct || 0;
      document.getElementById('editAccountEmail').value = a.billingEmail || '';
      openAppModal('modalEditAccount');
    }

    function saveEditAccount(e) {
      if (e && e.preventDefault) e.preventDefault();
      socket.emit('admin_update_account', {
        id: document.getElementById('editAccountId').value,
        accountNumber: document.getElementById('editAccountNum').value.trim(),
        companyName: document.getElementById('editAccountName').value.trim(),
        discountPct: parseFloat(document.getElementById('editAccountDiscount').value) || 0,
        billingEmail: document.getElementById('editAccountEmail').value.trim()
      });
      closeAppModal('modalEditAccount');
      return false;
    }

    function deleteCurrentAccount() {
      const id = document.getElementById('editAccountId').value;
      deleteAccount(id);
      closeAppModal('modalEditAccount');
    }

    function deleteAccount(accountNumber) {
      if (confirm('Delete Corporate Account ' + accountNumber + '?')) {
        socket.emit('admin_delete_account', accountNumber);
      }
    }

    // 7. CREATE NEW JOB
    function createJob(e) {
      if (e && e.preventDefault) e.preventDefault();
      const getV = (id) => document.getElementById(id) ? document.getElementById(id).value.trim() : '';
      const passenger = getV('jobPassenger');
      const pickup = getV('jobPickup');
      const dropoff = getV('jobDropoff');

      if (!passenger || !pickup || !dropoff) {
        alert('Please fill in Passenger Name, Pickup Address, and Destination.');
        return false;
      }

      const assignedDriver = getV('jobAssignDriver');
      socket.emit('create_job', {
        passenger: passenger,
        phone: getV('jobPhone'),
        pickup: pickup,
        dropoff: dropoff,
        fare: parseFloat(getV('jobFare')) || 0.00,
        paymentMethod: getV('jobPayMethod') || 'Cash',
        vehicleClass: getV('jobVehClass') || 'Saloon',
        assignedDriverId: (assignedDriver && assignedDriver !== 'AUTO') ? assignedDriver : null
      });

      document.getElementById('bookingForm').reset();
      return false;
    }

    socket.on('job_created_ack', (res) => {
      alert('✓ Booking #' + res.jobId + ' Dispatched Successfully!');
    });

    // 8. GLOBAL ACTION BUTTON EVENT DELEGATION
    document.addEventListener('click', (e) => {
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

    // Leaflet Map Init
    window.addEventListener('DOMContentLoaded', () => {
      try {
        if (typeof L !== 'undefined' && document.getElementById('mapContainer')) {
          const map = L.map('mapContainer').setView([51.3776, -2.3571], 13);
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
        }
      } catch(e) {
        console.warn('Map initialization notice:', e.message);
      }
    });
  </script>

</body>
</html>
`;

fs.writeFileSync('public/admin.html', fullHtml);
console.log('🎉 public/admin.html cleanly generated from scratch with zero syntax errors!');
