const fs = require('fs');
let html = fs.readFileSync('public/admin.html', 'utf8');

const targetNoticeBox = `<div class="notice-box">
            <strong>Payment & Remittance Terms:</strong><br>
            \${s.settlementType === 'OFFICE_OWES_DRIVER' 
                ? 'The net balance above has been credited to your bank account via automated driver BACS remittance.' 
                : 'This invoice represents despatch commission on cash fares collected in-hand. Balance is due on weekly driver settlement day.'}
        </div>`;

const updatedNoticeBox = `<div style="display:grid; grid-template-columns: 1fr 1fr; gap:16px; margin-bottom: 25px;">
            <div class="notice-box" style="margin:0;">
                <strong>Payment & Remittance Terms:</strong><br>
                \${parseFloat(s.cardTotal || 0) >= parseFloat(s.commission || 0) 
                    ? 'The net surplus of online fares after deducting office commission has been scheduled for automated driver BACS transfer.' 
                    : 'Commission owed exceeds prepaid fares held. Outstanding commission balance is due on or before weekly settlement day.'}
            </div>
            <div style="background:#f1f5f9; border:1px solid #cbd5e1; border-radius:6px; padding:12px 16px; font-size:12px; line-height:1.5; color:#1e293b;">
                <strong style="text-transform:uppercase; font-size:11px; color:#475569;">Company Bank Settlement Details:</strong><br>
                <div><strong>Bank:</strong> Barclays Bank UK PLC</div>
                <div><strong>Account Name:</strong> MD Taxi Despatch Services Ltd</div>
                <div><strong>Sort Code:</strong> 20-05-00</div>
                <div><strong>Account No:</strong> 83920148</div>
                <div><strong>Payment Ref:</strong> <span style="font-family:monospace; font-weight:bold; color:#0284c7;">\${s.driverId}-SETTLE</span></div>
            </div>
        </div>`;

if (html.includes(targetNoticeBox)) {
    html = html.replace(targetNoticeBox, updatedNoticeBox);
    fs.writeFileSync('public/admin.html', html);
    console.log("✅ Successfully injected Bank Settlement details into public/admin.html!");
} else {
    // Fallback regex replacement
    html = html.replace(/<div class="notice-box">[\s\S]*?<\/div>/, updatedNoticeBox);
    fs.writeFileSync('public/admin.html', html);
    console.log("✅ Successfully injected Bank Settlement details via fallback regex!");
}

// Validate syntax
const scriptBlocks = [...html.matchAll(/<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/gi)];
let valid = true;
scriptBlocks.forEach((block, idx) => {
    try {
        new Function(block[1]);
    } catch (e) {
        valid = false;
        console.error(`Syntax error in script block ${idx + 1}:`, e.message);
    }
});
if (valid) console.log("🚀 public/admin.html syntax is 100% CLEAN!");
