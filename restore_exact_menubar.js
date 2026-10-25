const fs = require('fs');
let html = fs.readFileSync('public/admin.html', 'utf8');

const completeMenubarHtml = `    <!-- TOP MENU WITH MULTI-TENANT SWITCHER -->
    <div class="app-menubar" style="display:flex; justify-content:space-between; align-items:center; padding: 4px 12px; background: #0f172a; border-bottom: 1px solid #334155;">
        <div class="menubar-left" style="display:flex; align-items:center; gap:8px; flex-wrap:nowrap;">
            <span class="brand-title" style="white-space:nowrap; font-weight:800; font-size:0.9rem; color:#38bdf8;">🚕 MD TRANSPORT MASTER DISPATCH</span>

            <!-- TENANT SELECTOR -->
            <select id="tenantSelect" onchange="switchTenant()" style="width:130px; margin:0; padding:4px 6px; font-size:0.75rem; background:#0f172a; border:1px solid #0284c7; color:#38bdf8; font-weight:bold; border-radius:4px; cursor:pointer;">
                <option value="ALL" selected>🌐 All Areas / Network</option>
                <option value="BA">📍 Bath Fleet</option>
                <option value="BS">📍 Bristol Fleet</option>
                <option value="SN">📍 Swindon Fleet</option>
                <option value="GL">📍 Gloucester Fleet</option>
                <option value="W">📍 London Fleet</option>
            </select>

            <!-- TARIFFS & AIRPORTS DROPDOWN -->
            <div class="menu-item" style="position:relative;">
                <button type="button" class="menu-btn" onclick="toggleMenu('menuTariffs', event)" style="font-size:0.78rem; padding:4px 8px; height:30px;">⚙️ Tariffs & Meter ▾</button>
                <div id="menuTariffs" class="dropdown-menu">
                    <div class="dropdown-item" onclick="openAppModal('modalTariff')">📊 Progressive Tariffs, Live Meter & Busy Surge</div>
                    <div class="dropdown-item" onclick="openAppModal('modalAirports')">✈️ Airport Matrix (Fixed Routes & Uplifts)</div>
                </div>
            </div>

            <!-- FLEET & STANDS DROPDOWN -->
            <div class="menu-item" style="position:relative;">
                <button type="button" class="menu-btn" onclick="toggleMenu('menuFleet', event)" style="font-size:0.78rem; padding:4px 8px; height:30px;">🚗 Fleet & Stands ▾</button>
                <div id="menuFleet" class="dropdown-menu">
                    <div class="dropdown-item" onclick="openAppModal('modalDrivers')">🚘 Driver Profiles & MOT/Badge Compliance</div>
                    <div class="dropdown-item" onclick="openAppModal('modalPlots')">📍 Taxi Stands & FIFO Queues</div>
                    <div class="dropdown-item" onclick="openDriverStatementModal()">📑 Driver Pay & Commission Statements</div>
                </div>
            </div>

            <!-- CORPORATE DROPDOWN -->
            <div class="menu-item" style="position:relative;">
                <button type="button" class="menu-btn" onclick="toggleMenu('menuAccounts', event)" style="font-size:0.78rem; padding:4px 8px; height:30px;">🏢 Corporate ▾</button>
                <div id="menuAccounts" class="dropdown-menu">
                    <div class="dropdown-item" onclick="openAppModal('modalAccounts')">📑 Corporate Accounts & Billing</div>
                    <div class="dropdown-item" onclick="openAppModal('modalInvoiceGenerator')">🧾 Generate Monthly Invoices</div>
                </div>
            </div>

            <!-- SMS GATEWAY -->
            <div class="menu-item">
                <button type="button" class="menu-btn" onclick="openSmsSettingsModal()" style="font-size:0.78rem; padding:4px 8px; height:30px; background:#1e293b; border:1px solid #334155; color:#f8fafc; border-radius:4px;">📱 SMS</button>
            </div>

            <!-- STRIPE CARD GATEWAY -->
            <div class="menu-item">
                <button type="button" class="menu-btn" onclick="openPaymentSettingsModal()" style="font-size:0.78rem; padding:4px 10px; height:30px; background:#0284c7; border:1px solid #38bdf8; color:#ffffff; font-weight:bold; border-radius:4px;">💳 Stripe Card</button>
            </div>
        </div>

        <div><span id="connStatus" class="badge badge-green">Connected Live</span></div>
    </div>`;

const startMarker = '<!-- TOP MENU WITH MULTI-TENANT SWITCHER -->';
const endMarker = '<!-- MAIN CONSOLE -->';

const sIdx = html.indexOf(startMarker);
const eIdx = html.indexOf(endMarker);

if (sIdx !== -1 && eIdx !== -1) {
    html = html.substring(0, sIdx) + completeMenubarHtml + '\n\n    ' + html.substring(eIdx);
    fs.writeFileSync('public/admin.html', html);
    console.log('✅ Master navbar restored with all original dropdowns and Stripe button!');
} else {
    console.error('Marker not found in public/admin.html');
}
