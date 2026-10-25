const fs = require('fs');
let html = fs.readFileSync('public/admin.html', 'utf8');

// 1. Rename '⚙️ SMS Gateway ▾' to '⚙️ Gateways & Pay ▾'
html = html.replace('⚙️ SMS Gateway ▾', '⚙️ Gateways & Payments ▾');

// 2. Add the Stripe dropdown item right below the SMS item
const smsItemMarker = `<div class="dropdown-item" onclick="openSmsSettingsModal()">📱 Provider & Test SMS</div>`;
const stripeMenuItem = `\n                    <div class="dropdown-item" onclick="openPaymentSettingsModal()">💳 Stripe Card Gateway</div>`;

if (html.includes(smsItemMarker) && !html.includes('openPaymentSettingsModal()')) {
    html = html.replace(smsItemMarker, smsItemMarker + stripeMenuItem);
    fs.writeFileSync('public/admin.html', html);
    console.log('✅ Added "💳 Stripe Card Gateway" to the dropdown menu in public/admin.html!');
} else {
    // If it was already partially touched, ensure it exists cleanly
    if (!html.includes('openPaymentSettingsModal()')) {
        const menuIdx = html.indexOf('id="menuSettings"');
        if (menuIdx !== -1) {
            const endIdx = html.indexOf('</div>', menuIdx);
            html = html.substring(0, endIdx) + stripeMenuItem + '\n                ' + html.substring(endIdx);
            fs.writeFileSync('public/admin.html', html);
            console.log('✅ Injected Stripe item into #menuSettings!');
        }
    } else {
        console.log('ℹ️ Stripe menu item already present in admin.html');
    }
}
