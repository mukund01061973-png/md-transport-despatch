const fs = require('fs');
let html = fs.readFileSync('public/admin.html', 'utf8');

// 1. Constrain the wide area filter dropdown
html = html.replace(/id="areaFilter"[^>]*style="[^"]*"/g, 'id="areaFilter" style="max-width:175px; width:auto; font-size:0.8rem; padding:4px 8px;"');
html = html.replace(/id="areaFilter"(?![^>]*style=)/g, 'id="areaFilter" style="max-width:175px; width:auto; font-size:0.8rem; padding:4px 8px;"');

// 2. Define the complete navbar with all buttons restored
const masterNavItems = `
        <div style="display:flex; align-items:center; gap:8px; flex-wrap:nowrap; margin-left:auto;">
            <div class="menu-item">
                <button type="button" class="menu-btn" onclick="openAppModal('modalTariff')" style="font-size:0.8rem; padding:5px 9px;">📊 Tariffs & Meter</button>
            </div>
            <div class="menu-item">
                <button type="button" class="menu-btn" onclick="openAppModal('modalStandManager')" style="font-size:0.8rem; padding:5px 9px;">🚗 Fleet & Stands</button>
            </div>
            <div class="menu-item">
                <button type="button" class="menu-btn" onclick="openAppModal('modalCorporateAccounts')" style="font-size:0.8rem; padding:5px 9px;">🏢 Corporate</button>
            </div>
            <div class="menu-item">
                <button type="button" class="menu-btn" onclick="openSmsSettingsModal()" style="font-size:0.8rem; padding:5px 9px;">📱 SMS</button>
            </div>
            <div class="menu-item">
                <button type="button" class="menu-btn" onclick="openPaymentSettingsModal()" style="background:#0284c7; border:1px solid #38bdf8; color:#ffffff; font-weight:bold; font-size:0.8rem; padding:5px 10px; border-radius:4px;">💳 Stripe Card</button>
            </div>
        </div>
`;

// Locate the area filter select closing tag and the status badge
const selectEnd = '</select>';
const selIdx = html.indexOf('id="areaFilter"');

if (selIdx !== -1) {
    const afterSelect = html.indexOf(selectEnd, selIdx) + selectEnd.length;
    const badgeIdx = html.indexOf('<span id="connStatus"');
    
    if (badgeIdx !== -1) {
        // Find the start of the div wrapping the badge or preceding whitespace
        const lastDivBeforeBadge = html.lastIndexOf('<div', badgeIdx);
        html = html.substring(0, afterSelect) + '\n' + masterNavItems + '\n        ' + html.substring(lastDivBeforeBadge);
        fs.writeFileSync('public/admin.html', html);
        console.log('✅ Constrained area filter width and restored all navigation buttons!');
    }
}
