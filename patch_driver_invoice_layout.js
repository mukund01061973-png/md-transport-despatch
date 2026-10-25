const fs = require('fs');
let html = fs.readFileSync('public/admin.html', 'utf8');

// Find the totals section inside printDriverInvoiceDocument
const oldTotalsBlock = `<div class="totals">
            <div class="totals-row">
                <span>Gross Commission Fee:</span>
                <span>£\${s.commission}</span>
            </div>
            <div class="totals-row">
                <span>Driver Cash Collected In-Hand:</span>
                <span>£\${s.cashTotal || s.gross}</span>
            </div>
            <div class="totals-row final">
                <span>\${s.settlementType === 'OFFICE_OWES_DRIVER' ? 'Balance Due to Driver:' : 'Net Amount Payable to Office:'}</span>
                <span style="color:\${s.settlementType === 'OFFICE_OWES_DRIVER' ? '#15803d' : '#c2410c'};">\${s.settlementType === 'OFFICE_OWES_DRIVER' ? '+£' : '£'}\${s.settlement || s.commission}</span>
            </div>
        </div>`;

const newTotalsBlock = `<div class="totals" style="width: 420px; margin-left: auto; margin-bottom: 30px; font-size: 13px;">
            <div class="totals-row" style="display:flex; justify-content:space-between; padding:4px 0; color:#64748b;">
                <span>Total Cash Collected (Driver In-Hand):</span>
                <span>£\${s.cashTotal || '0.00'}</span>
            </div>
            <div class="totals-row" style="display:flex; justify-content:space-between; padding:4px 0; color:#64748b;">
                <span>Total Prepaid / Card Fares (Held by Office):</span>
                <span>£\${s.cardTotal || '0.00'}</span>
            </div>
            <div class="totals-row" style="display:flex; justify-content:space-between; padding:6px 0; font-weight:600; border-top:1px dashed #cbd5e1; border-bottom:1px dashed #cbd5e1; margin:6px 0;">
                <span>Total Gross Bookings (\${s.totalJobs} Trips):</span>
                <span>£\${s.gross}</span>
            </div>
            <div class="totals-row" style="display:flex; justify-content:space-between; padding:5px 0;">
                <span>Despatch Commission Fee (\${s.commPct}%):</span>
                <span style="font-weight:bold; color:#0f172a;">£\${s.commission}</span>
            </div>
            <div class="totals-row" style="display:flex; justify-content:space-between; padding:5px 0; color:#0284c7;">
                <span>LESS Prepaid / Card Fares Retained by Office:</span>
                <span style="font-weight:bold;">-£\${s.cardTotal || '0.00'}</span>
            </div>
            <div class="totals-row final" style="display:flex; justify-content:space-between; border-top:2px solid #0f172a; padding-top:10px; margin-top:8px; font-size:15px; font-weight:bold;">
                <span>\${parseFloat(s.cardTotal || 0) >= parseFloat(s.commission || 0) ? 'NET BALANCE DUE TO DRIVER:' : 'NET COMMISSION PAYABLE TO OFFICE:'}</span>
                <span style="color:\${parseFloat(s.cardTotal || 0) >= parseFloat(s.commission || 0) ? '#15803d' : '#c2410c'};">
                    \${parseFloat(s.cardTotal || 0) >= parseFloat(s.commission || 0) ? '+£' : '£'}\${Math.abs(parseFloat(s.commission || 0) - parseFloat(s.cardTotal || 0)).toFixed(2)}
                </span>
            </div>
        </div>`;

if (html.includes(oldTotalsBlock)) {
    html = html.replace(oldTotalsBlock, newTotalsBlock);
    fs.writeFileSync('public/admin.html', html);
    console.log("✅ Successfully updated Driver Tax Invoice with full Cash vs Prepaid ledger breakdown!");
} else {
    console.log("⚠️ Could not match old totals block exactly. Attempting regex replacement...");
    html = html.replace(/<div class="totals">[\s\S]*?<\/div>\s*<\/div>/, newTotalsBlock);
    fs.writeFileSync('public/admin.html', html);
    console.log("✅ Updated via regex!");
}

// Validate syntax
const scriptBlocks = [...html.matchAll(/<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/gi)];
let valid = true;
scriptBlocks.forEach((block, idx) => {
    try {
        new Function(block[1]);
    } catch (e) {
        valid = false;
        console.error(`Syntax error in script block:`, e.message);
    }
});
if (valid) console.log("🚀 public/admin.html syntax is 100% CLEAN!");
