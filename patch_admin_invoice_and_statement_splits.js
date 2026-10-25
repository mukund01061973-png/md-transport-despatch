const fs = require('fs');
let html = fs.readFileSync('public/admin.html', 'utf8');

// 1. Replace the invoice totals block with granular Prepaid vs Corporate Account vs Tips/Tolls
const oldInvoiceTotalsRegex = /<div class="totals" style="width: 420px;[\s\S]*?<\/div>\s*<\/div>/;

const newInvoiceTotalsBlock = `<div class="totals" style="width: 440px; margin-left: auto; margin-bottom: 24px; font-size: 12.5px;">
            <div class="totals-row" style="display:flex; justify-content:space-between; padding:3px 0; color:#64748b;">
                <span>Total Cash Collected (Driver In-Hand):</span>
                <span>£\${s.cashTotal || '0.00'}</span>
            </div>
            <div class="totals-row" style="display:flex; justify-content:space-between; padding:3px 0; color:#64748b;">
                <span>Total Prepaid Online (Office Held):</span>
                <span>£\${s.prepaidTotal || '0.00'}</span>
            </div>
            <div class="totals-row" style="display:flex; justify-content:space-between; padding:3px 0; color:#64748b;">
                <span>Total Corporate Account (Office Billed):</span>
                <span>£\${s.accountTotal || '0.00'}</span>
            </div>
            \${parseFloat(s.tipsTotal || 0) > 0 ? \`
            <div class="totals-row" style="display:flex; justify-content:space-between; padding:3px 0; color:#059669; font-weight:600;">
                <span>Driver Card/App Tips (100% to Driver):</span>
                <span>+£\${s.tipsTotal}</span>
            </div>\` : ''}
            \${parseFloat(s.tollsTotal || 0) > 0 ? \`
            <div class="totals-row" style="display:flex; justify-content:space-between; padding:3px 0; color:#0284c7; font-weight:600;">
                <span>Tolls & Parking Reimbursements:</span>
                <span>+£\${s.tollsTotal}</span>
            </div>\` : ''}
            <div class="totals-row" style="display:flex; justify-content:space-between; padding:5px 0; font-weight:600; border-top:1px dashed #cbd5e1; border-bottom:1px dashed #cbd5e1; margin:5px 0;">
                <span>Total Gross Fares (\${s.totalJobs} Trips):</span>
                <span>£\${s.gross}</span>
            </div>
            <div class="totals-row" style="display:flex; justify-content:space-between; padding:4px 0;">
                <span>Despatch Commission Fee (\${s.commPct}% of Fares):</span>
                <span style="font-weight:bold; color:#0f172a;">£\${s.commission}</span>
            </div>
            <div class="totals-row" style="display:flex; justify-content:space-between; padding:4px 0; color:#0284c7;">
                <span>LESS Office-Held Funds (Prepaid + Accounts):</span>
                <span style="font-weight:bold;">-£\${s.cardTotal || '0.00'}</span>
            </div>
            <div class="totals-row final" style="display:flex; justify-content:space-between; border-top:2px solid #0f172a; padding-top:8px; margin-top:6px; font-size:14px; font-weight:bold;">
                <span>\${s.settlementType === 'OFFICE_OWES_DRIVER' ? 'NET BALANCE DUE TO DRIVER:' : 'NET COMMISSION PAYABLE TO OFFICE:'}</span>
                <span style="color:\${s.settlementType === 'OFFICE_OWES_DRIVER' ? '#15803d' : '#c2410c'};">
                    \${s.settlementType === 'OFFICE_OWES_DRIVER' ? '+£' : '£'}\${s.settlement || '0.00'}
                </span>
            </div>
        </div>`;

if (oldInvoiceTotalsRegex.test(html)) {
  html = html.replace(oldInvoiceTotalsRegex, newInvoiceTotalsBlock);
  console.log("✅ Updated Driver Tax Invoice totals with Prepaid vs Corporate Account separation!");
}

// 2. Update Statement Run Sheet header cards to include Prepaid & Account
const oldSummaryCards = `<div class="summary-cards">
            <div class="card"><div class="label">TRIPS</div><div class="value">\${s.totalJobs}</div></div>
            <div class="card"><div class="label">GROSS FARES</div><div class="value">£\${s.gross}</div></div>
            <div class="card"><div class="label">CASH IN HAND</div><div class="value">£\${s.cashTotal}</div></div>
            <div class="card"><div class="label">OFFICE COMM (\${s.commPct}%)</div><div class="value" style="color:#b91c1c;">-£\${s.commission}</div></div>
            <div class="card highlight"><div class="label">\${s.settlementType === 'OFFICE_OWES_DRIVER' ? 'OFFICE OWES DRIVER' : 'DRIVER OWES OFFICE'}</div><div class="value" style="color:\${s.settlementType === 'OFFICE_OWES_DRIVER' ? '#15803d' : '#b91c1c'};">\${s.settlementType === 'OFFICE_OWES_DRIVER' ? '+£' : '-£'}\${s.settlement}</div></div>
        </div>`;

const newSummaryCards = `<div class="summary-cards" style="display:grid; grid-template-columns: repeat(6, 1fr); gap:8px;">
            <div class="card"><div class="label">TRIPS</div><div class="value">\${s.totalJobs}</div></div>
            <div class="card"><div class="label">GROSS FARES</div><div class="value">£\${s.gross}</div></div>
            <div class="card"><div class="label">CASH</div><div class="value">£\${s.cashTotal}</div></div>
            <div class="card"><div class="label">PREPAID</div><div class="value" style="color:#0284c7;">£\${s.prepaidTotal || '0.00'}</div></div>
            <div class="card"><div class="label">ACCOUNT</div><div class="value" style="color:#7c3aed;">£\${s.accountTotal || '0.00'}</div></div>
            <div class="card highlight"><div class="label">\${s.settlementType === 'OFFICE_OWES_DRIVER' ? 'DUE DRIVER' : 'DUE OFFICE'}</div><div class="value" style="color:\${s.settlementType === 'OFFICE_OWES_DRIVER' ? '#15803d' : '#b91c1c'};">\${s.settlementType === 'OFFICE_OWES_DRIVER' ? '+£' : '-£'}\${s.settlement}</div></div>
        </div>`;

if (html.includes(oldSummaryCards)) {
  html = html.replace(oldSummaryCards, newSummaryCards);
  console.log("✅ Updated Statement Run Sheet header cards with 6-way split!");
}

fs.writeFileSync('public/admin.html', html);

// Validate JS syntax in admin.html
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
