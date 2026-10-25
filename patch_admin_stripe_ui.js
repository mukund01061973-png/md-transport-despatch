const fs = require('fs');
let html = fs.readFileSync('public/admin.html', 'utf8');

// 1. Stripe Modal Markup
const stripeModalHtml = `
<!-- ================= STRIPE PAYMENT GATEWAY MODAL ================= -->
<div id="modalStripeGateway" class="modal-overlay" onclick="closeOverlayModal(event, 'modalStripeGateway')">
    <div class="modal-card" onclick="event.stopPropagation()" style="max-width: 580px;">
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #334155; padding-bottom:8px; margin-bottom:12px;">
            <h3 style="margin:0; color:#38bdf8;">💳 Stripe Online Payment Settings</h3>
            <button type="button" class="btn-red" style="width:auto; padding:3px 8px;" onclick="closeAppModal('modalStripeGateway')">✕</button>
        </div>
        
        <form onsubmit="savePaymentSettingsAction(event)">
            <div style="margin-bottom:12px;">
                <label style="color:#fde047; font-weight:bold; display:block; margin-bottom:4px;">Active Payment Mode:</label>
                <select id="payActiveMode" onchange="onPaymentModeChange()" style="width:100%; padding:8px; border-radius:6px; background:#1e293b; color:#fff; border:1px solid #475569;">
                    <option value="simulation">⚡ Simulation / Sandbox (Instant Pre-auth, No real card charge)</option>
                    <option value="test">🧪 Stripe Test Mode (Requires pk_test / sk_test)</option>
                    <option value="live">🔒 Stripe Live Production (Real Customer Card Payments)</option>
                </select>
            </div>

            <div id="panelStripeKeys" style="display:none; background:#0f172a; padding:12px; border-radius:6px; border:1px solid #334155; margin-bottom:12px;">
                <div style="margin-bottom:10px;">
                    <label style="color:#94a3b8; font-size:0.85rem; display:block;">Publishable Key (pk_test / pk_live):</label>
                    <input type="text" id="payPublishableKey" placeholder="pk_test_..." style="width:100%; padding:8px; border-radius:4px; background:#1e293b; color:#fff; border:1px solid #475569;">
                </div>
                <div style="margin-bottom:10px;">
                    <label style="color:#94a3b8; font-size:0.85rem; display:block;">Secret Key (sk_test / sk_live):</label>
                    <input type="password" id="paySecretKey" placeholder="sk_test_..." style="width:100%; padding:8px; border-radius:4px; background:#1e293b; color:#fff; border:1px solid #475569;">
                </div>
                <div>
                    <label style="color:#94a3b8; font-size:0.85rem; display:block;">Currency Code:</label>
                    <input type="text" id="payCurrency" value="GBP" style="width:100px; padding:6px; border-radius:4px; background:#1e293b; color:#fff; border:1px solid #475569; text-transform:uppercase;">
                </div>
            </div>

            <div style="font-size:0.8rem; color:#94a3b8; margin-bottom:14px; background:#1e293b; padding:8px; border-radius:4px;">
                ℹ️ When <b>Simulation</b> is chosen, booking web customers can pre-authorize test rides without live Stripe API keys. Drivers and ledgers will immediately register the job as <b>Prepaid Online</b>.
            </div>

            <div style="display:flex; justify-content:flex-end; gap:8px;">
                <button type="button" class="btn-slate" onclick="closeAppModal('modalStripeGateway')" style="width:auto; padding:6px 14px;">Cancel</button>
                <button type="submit" class="btn-green" style="width:auto; padding:6px 18px; font-weight:bold;">💾 Save Stripe Settings</button>
            </div>
        </form>
    </div>
</div>
`;

// Insert the modal before modalTariff
if (!html.includes('id="modalStripeGateway"')) {
    html = html.replace('<div id="modalTariff"', stripeModalHtml + '\n<div id="modalTariff"');
}

// 2. Add Button next to the SMS Settings button in the header/nav
const smsBtnMarker = `onclick="openSmsSettingsModal()"`;
const stripeBtn = ` <button type="button" class="btn-slate" onclick="openPaymentSettingsModal()" style="width:auto; padding:4px 10px; font-size:0.85rem; margin-left:4px;">💳 Stripe</button>`;
if (html.includes(smsBtnMarker) && !html.includes('openPaymentSettingsModal()')) {
    const idx = html.indexOf(smsBtnMarker);
    const endTag = html.indexOf('</button>', idx) + 9;
    html = html.substring(0, endTag) + stripeBtn + html.substring(endTag);
}

// 3. Add JavaScript functions for open, change, and save
const stripeJsScript = `
// ================= STRIPE SETTINGS HANDLERS =================
async function openPaymentSettingsModal() {
    openAppModal('modalStripeGateway');
    try {
        const res = await fetch('/api/payment-settings');
        const data = await res.json();
        if (data && data.success && data.settings) {
            const s = data.settings;
            document.getElementById('payActiveMode').value = s.activeMode || 'simulation';
            document.getElementById('payPublishableKey').value = s.publishableKey || '';
            document.getElementById('paySecretKey').value = s.secretKey || '';
            document.getElementById('payCurrency').value = (s.currency || 'GBP').toUpperCase();
            onPaymentModeChange();
        }
    } catch(err) {
        console.error('Failed to load payment settings:', err);
    }
}

function onPaymentModeChange() {
    const m = document.getElementById('payActiveMode').value;
    document.getElementById('panelStripeKeys').style.display = (m === 'simulation') ? 'none' : 'block';
}

async function savePaymentSettingsAction(e) {
    if (e) e.preventDefault();
    const payload = {
        activeMode: document.getElementById('payActiveMode').value,
        publishableKey: document.getElementById('payPublishableKey').value.trim(),
        secretKey: document.getElementById('paySecretKey').value.trim(),
        currency: (document.getElementById('payCurrency').value.trim() || 'GBP').toLowerCase()
    };
    try {
        const res = await fetch('/api/payment-settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const result = await res.json();
        if (result.success) {
            alert('✅ Stripe settings saved directly into SQLite! Active: ' + payload.activeMode.toUpperCase());
            closeAppModal('modalStripeGateway');
        } else {
            alert('Error saving payment settings: ' + (result.error || 'Unknown error'));
        }
    } catch(err) {
        alert('Failed to save settings: ' + err.message);
    }
}
`;

if (!html.includes('openPaymentSettingsModal()')) {
    html = html.replace('async function openSmsSettingsModal()', stripeJsScript + '\nasync function openSmsSettingsModal()');
}

fs.writeFileSync('public/admin.html', html);
console.log('✅ Stripe Payment settings modal, button, and save handlers integrated into public/admin.html!');
