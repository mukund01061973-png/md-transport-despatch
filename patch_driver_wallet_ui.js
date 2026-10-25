const fs = require('fs');
let html = fs.readFileSync('public/driver.html', 'utf8');

// Target the socket listener for driver_wallet_data
const target = `document.getElementById('earnNetSettlement').textContent = '£' + (w.netPay || '0.00');`;

const replacement = `document.getElementById('earnNetSettlement').textContent = '£' + (w.netPay || '0.00');
            
            const balEl = document.getElementById('earnSettlementBalance');
            const balLabel = document.getElementById('earnSettlementLabel');
            if (balEl && balLabel) {
                if (w.settlementType === 'OFFICE_OWES_DRIVER') {
                    balLabel.textContent = 'Office Owes Driver';
                    balLabel.style.color = '#34d399';
                    balEl.textContent = '+£' + (w.settlement || '0.00');
                    balEl.style.color = '#34d399';
                } else {
                    balLabel.textContent = 'Driver Owes Office';
                    balLabel.style.color = '#f87171';
                    balEl.textContent = '-£' + (w.settlement || '0.00');
                    balEl.style.color = '#f87171';
                }
            }`;

if (html.includes(target) && !html.includes('earnSettlementBalance')) {
    html = html.replace(target, replacement);
    
    // Also inject the settlement row right below earnNetSettlement in the HTML markup
    const markupTarget = `id="earnNetSettlement">£0.00</div>`;
    const markupReplacement = `id="earnNetSettlement">£0.00</div>
                    </div>
                    <div style="background:#0f172a; padding:8px; border-radius:6px; text-align:center; border:1px solid #334155;">
                        <div style="font-size:0.7rem; color:#94a3b8;" id="earnSettlementLabel">Office Settlement</div>
                        <div style="font-size:1.25rem; font-weight:bold; color:#34d399;" id="earnSettlementBalance">£0.00</div>`;

    html = html.replace(markupTarget, markupReplacement);
    fs.writeFileSync('public/driver.html', html);
    console.log("✅ Successfully updated driver.html wallet UI with cashflow settlement balance!");
} else {
    console.log("driver.html already updated or target pattern differs slightly.");
}

// Validate syntax
const scriptBlocks = [...html.matchAll(/<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/gi)];
let valid = true;
scriptBlocks.forEach((block, idx) => {
    try {
        new Function(block[1]);
    } catch (e) {
        valid = false;
        console.error(`Syntax error in block ${idx + 1}:`, e.message);
    }
});
if (valid) console.log("🚀 driver.html syntax is 100% CLEAN!");
