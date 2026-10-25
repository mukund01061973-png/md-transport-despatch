const fs = require('fs');
let html = fs.readFileSync('public/admin.html', 'utf8');

// 1. Ensure CSS flex doesn't crush or hide buttons
html = html.replace('.top-nav {', '.top-nav { flex-wrap: wrap; gap: 8px; min-height: 48px; ');
html = html.replace('.menu-btn {', '.menu-btn { white-space: nowrap; font-size: 0.82rem; padding: 4px 8px; ');

// 2. Cleanly place all settings buttons in the navbar
const oldMenuSection = /<div class="menu-item">\s*<button type="button" class="menu-btn"[^>]*>.*?SMS Gateway.*?<\/div>\s*<\/div>/s;

const newNavButtons = `
            <div class="menu-item">
                <button type="button" class="menu-btn" onclick="openSmsSettingsModal()" style="background:#1e293b; border:1px solid #475569; color:#f8fafc;">📱 SMS</button>
            </div>
            <div class="menu-item">
                <button type="button" class="menu-btn" onclick="openPaymentSettingsModal()" style="background:#0284c7; border:1px solid #38bdf8; color:#ffffff; font-weight:bold;">💳 Stripe Card</button>
            </div>
`;

if (oldMenuSection.test(html)) {
    html = html.replace(oldMenuSection, newNavButtons);
    console.log("✅ Replaced cramped SMS menu with separate clean '📱 SMS' and '💳 Stripe Card' buttons!");
} else {
    // Fallback: inject right before the Connected Live badge
    const badgeMarker = '<span id="connStatus"';
    if (html.includes(badgeMarker)) {
        html = html.replace(badgeMarker, newNavButtons + '\n' + badgeMarker);
        console.log("✅ Injected settings buttons directly before live badge!");
    }
}

fs.writeFileSync('public/admin.html', html);
console.log("🎯 public/admin.html updated successfully!");
