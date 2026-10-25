const fs = require('fs');
let html = fs.readFileSync('public/admin.html', 'utf8');

// Build the clean, complete top menubar matching your original UI
const cleanMenubar = `    <!-- TOP MENU WITH MULTI-TENANT SWITCHER -->
    <div class="app-menubar" style="display:flex; justify-content:space-between; align-items:center; padding: 6px 14px; background: #0f172a; border-bottom: 1px solid #334155; gap: 10px;">
        <div class="menubar-left" style="display:flex; align-items:center; gap:8px; flex-wrap:nowrap;">
            <span class="brand-title" style="white-space:nowrap; font-weight:bold; font-size:0.9rem; color:#f8fafc;">🚕 MD TRANSPORT MASTER DISPATCH</span>

            <!-- TENANT SELECTOR -->
            <select id="tenantSelect" onchange="switchTenant()" style="width:160px; max-width:160px; margin:0; padding:4px 6px; font-size:0.75rem; background:#0f172a; border:1px solid #0284c7; color:#38bdf8; font-weight:bold; border-radius:6px; cursor:pointer;">
                <option value="ALL" selected>🌐 All Areas / Network</option>
                <option value="BA">📍 BA (Bath / North Somerset)</option>
                <option value="BS">📍 BS (Bristol Metro)</option>
                <option value="SN">📍 SN (Swindon / Wilts)</option>
                <option value="GL">📍 GL (Gloucestershire)</option>
                <option value="W">📍 W / SW (London Sectors)</option>
                <option value="__CUSTOM__">➕ Enter Custom Postcode Sector...</option>
            </select>

            <!-- TARIFFS & METER -->
            <div class="menu-item">
                <button type="button" class="menu-btn" onclick="openAppModal('modalTariff')" style="background:#1e293b; border:1px solid #334155; color:#fde047; padding:4px 8px; font-size:0.78rem; border-radius:4px; cursor:pointer; white-space:nowrap;">📊 Tariffs & Meter</button>
            </div>

            <!-- FLEET & STANDS -->
            <div class="menu-item">
                <button type="button" class="menu-btn" onclick="openAppModal('modalStandManager')" style="background:#1e293b; border:1px solid #334155; color:#38bdf8; padding:4px 8px; font-size:0.78rem; border-radius:4px; cursor:pointer; white-space:nowrap;">🚗 Fleet & Stands</button>
            </div>

            <!-- CORPORATE -->
            <div class="menu-item">
                <button type="button" class="menu-btn" onclick="openAppModal('modalCorporateAccounts')" style="background:#1e293b; border:1px solid #334155; color:#a78bfa; padding:4px 8px; font-size:0.78rem; border-radius:4px; cursor:pointer; white-space:nowrap;">🏢 Corporate</button>
            </div>

            <!-- SMS -->
            <div class="menu-item">
                <button type="button" class="menu-btn" onclick="openSmsSettingsModal()" style="background:#1e293b; border:1px solid #334155; color:#f8fafc; padding:4px 8px; font-size:0.78rem; border-radius:4px; cursor:pointer; white-space:nowrap;">📱 SMS</button>
            </div>

            <!-- STRIPE CARD -->
            <div class="menu-item">
                <button type="button" class="menu-btn" onclick="openPaymentSettingsModal()" style="background:#0284c7; border:1px solid #38bdf8; color:#ffffff; padding:4px 10px; font-size:0.78rem; font-weight:bold; border-radius:4px; cursor:pointer; white-space:nowrap;">💳 Stripe Card</button>
            </div>
        </div>

        <div><span id="connStatus" class="badge badge-green">Connected Live</span></div>
    </div>`;

// Replace from <!-- TOP MENU WITH MULTI-TENANT SWITCHER --> down to <!-- MAIN CONSOLE -->
const startMarker = '<!-- TOP MENU WITH MULTI-TENANT SWITCHER -->';
const endMarker = '<!-- MAIN CONSOLE -->';

const sIdx = html.indexOf(startMarker);
const eIdx = html.indexOf(endMarker);

if (sIdx !== -1 && eIdx !== -1) {
    html = html.substring(0, sIdx) + cleanMenubar + '\n\n    ' + html.substring(eIdx);
    fs.writeFileSync('public/admin.html', html);
    console.log('✅ Top menubar cleanly restored with all menus + compact area dropdown!');
} else {
    console.error('Markers not matched.');
}
