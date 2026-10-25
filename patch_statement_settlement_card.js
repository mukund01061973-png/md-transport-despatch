const fs = require('fs');
let html = fs.readFileSync('public/admin.html', 'utf8');

const targetCards = `<div class="cards">
            <div class="card"><div class="lbl">Trips</div><div class="num">\${s.totalJobs}</div></div>
            <div class="card"><div class="lbl">Gross Bookings</div><div class="num">£\${s.gross}</div></div>
            <div class="card"><div class="lbl">Company Comm</div><div class="num" style="color:#d97706;">£\${s.commission}</div></div>
            <div class="card"><div class="lbl">Net Due Driver</div><div class="num" style="color:#15803d;">£\${s.netPay}</div></div>
        </div>`;

const updatedCards = `<!-- SETTLEMENT SUMMARY CARDS -->
        <div style="display:grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin-bottom: 20px;">
            <div class="card"><div class="lbl">Trips</div><div class="num">\${s.totalJobs}</div></div>
            <div class="card"><div class="lbl">Gross Fares</div><div class="num">£\${s.gross}</div></div>
            <div class="card"><div class="lbl">Cash in Hand</div><div class="num" style="color:#0284c7;">£\${s.cashTotal || "0.00"}</div></div>
            <div class="card"><div class="lbl">Office Comm (\${s.commPct}%)</div><div class="num" style="color:#d97706;">-£\${s.commission}</div></div>
            <div class="card" style="border: 2px solid \${s.settlementType === 'OFFICE_OWES_DRIVER' ? '#16a34a' : '#ea580c'}; background:\${s.settlementType === 'OFFICE_OWES_DRIVER' ? '#f0fdf4' : '#fff7ed'};">
                <div class="lbl" style="color:\${s.settlementType === 'OFFICE_OWES_DRIVER' ? '#15803d' : '#c2410c'}; font-weight:bold;">
                    \${s.settlementType === 'OFFICE_OWES_DRIVER' ? 'Office Owes Driver' : 'Driver Owes Office'}
                </div>
                <div class="num" style="color:\${s.settlementType === 'OFFICE_OWES_DRIVER' ? '#15803d' : '#c2410c'};">
                    \${s.settlementType === 'OFFICE_OWES_DRIVER' ? '+£' : '-£'}\${s.settlement || '0.00'}
                </div>
            </div>
        </div>`;

if (html.includes(targetCards)) {
    html = html.replace(targetCards, updatedCards);
    fs.writeFileSync('public/admin.html', html);
    console.log("✅ Successfully updated admin.html with 5-card Settlement Action header!");
} else {
    console.log("⚠️ Target cards pattern differed slightly, attempting regex match...");
    html = html.replace(
        /<div class="cards">[\s\S]*?<div class="card"><div class="lbl">Net Due Driver<\/div>[\s\S]*?<\/div>\s*<\/div>/,
        updatedCards
    );
    fs.writeFileSync('public/admin.html', html);
    console.log("✅ Updated via regex fallback!");
}

// Check syntax
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
if (valid) console.log("🚀 admin.html syntax is 100% CLEAN!");
