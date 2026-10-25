const fs = require('fs');
let html = fs.readFileSync('public/admin.html', 'utf8');

// 1. Add the "Print Invoice" button right next to the Statement print button
const btnTarget = `onclick="printDriverStatementDocument()">🖨️ Print Invoice`;
const btnReplacement = `onclick="printDriverStatementDocument()">🖨️ Print Statement</button>
                    <button type="button" class="btn btn-primary" style="margin:0 0 0 8px; padding:8px 14px; white-space:nowrap; background:#0284c7; border:1px solid #0369a1; font-weight:600;" onclick="printDriverInvoiceDocument()">🧾 Driver Tax Invoice</button>`;

if (html.includes(btnTarget) && !html.includes('printDriverInvoiceDocument()')) {
    html = html.replace(btnTarget, btnReplacement);
}

// 2. Add the invoice rendering function
const functionTarget = `function printDriverStatementDocument()`;
const invoiceFunction = `function printDriverInvoiceDocument() {
    if (!currentDriverStatementData || !currentDriverStatementData.jobs || currentDriverStatementData.jobs.length === 0) {
        alert("Please select a driver with completed trips before generating an invoice.");
        return;
    }
    const s = currentDriverStatementData;
    const invWin = window.open("", "_blank", "width=850,height=900");
    if (!invWin) {
        alert("Please allow popups to view the driver invoice.");
        return;
    }

    const driverName = s.driverName || (s.driver && s.driver.name) || s.driverId;
    const invNumber = "INV-COMM-" + s.driverId + "-" + Date.now().toString().slice(-6);
    const today = new Date().toLocaleDateString("en-GB");

    const doc = \`<!DOCTYPE html>
    <html>
    <head>
        <title>Commission Invoice - \${invNumber}</title>
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, Arial, sans-serif; color: #0f172a; margin: 40px; background: #fff; }
            .inv-header { display: flex; justify-content: space-between; border-bottom: 2px solid #0f172a; padding-bottom: 20px; margin-bottom: 25px; }
            .inv-title { font-size: 26px; font-weight: bold; color: #0f172a; margin: 0; }
            .inv-meta { text-align: right; font-size: 13px; line-height: 1.6; }
            .parties { display: flex; justify-content: space-between; margin-bottom: 30px; font-size: 13px; line-height: 1.5; }
            .party-box { width: 45%; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 15px; }
            .party-title { font-weight: bold; font-size: 11px; text-transform: uppercase; color: #64748b; margin-bottom: 8px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            th { background: #f1f5f9; text-align: left; padding: 10px 12px; font-size: 12px; text-transform: uppercase; color: #475569; border-bottom: 2px solid #cbd5e1; }
            td { padding: 12px; font-size: 13px; border-bottom: 1px solid #e2e8f0; }
            .totals { margin-left: auto; width: 350px; font-size: 13px; margin-bottom: 30px; }
            .totals-row { display: flex; justify-content: space-between; padding: 6px 0; }
            .totals-row.final { font-size: 16px; font-weight: bold; border-top: 2px solid #0f172a; padding-top: 10px; margin-top: 6px; }
            .notice-box { background: #fff7ed; border: 1px solid #fed7aa; border-radius: 6px; padding: 12px 16px; font-size: 12px; color: #9a3412; margin-bottom: 30px; }
            .ftr { font-size: 11px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 15px; }
        </style>
    </head>
    <body>
        <div class="inv-header">
            <div>
                <h1 class="inv-title">TAX INVOICE</h1>
                <div style="font-size:13px; color:#64748b; margin-top:4px;">MD TAXI DESPATCH MANAGEMENT LTD</div>
            </div>
            <div class="inv-meta">
                <div><strong>Invoice No:</strong> \${invNumber}</div>
                <div><strong>Invoice Date:</strong> \${today}</div>
                <div><strong>Billing Period:</strong> \${s.period}</div>
            </div>
        </div>

        <div class="parties">
            <div class="party-box">
                <div class="party-title">ISSUED BY (DISPATCH OPERATOR):</div>
                <strong>MD Taxi Despatch Services Ltd</strong><br>
                Bath, Somerset, BA1<br>
                United Kingdom<br>
                Email: accounts@mdtaxi.co.uk
            </div>
            <div class="party-box">
                <div class="party-title">BILLED TO (DRIVER / CONTRACTOR):</div>
                <strong>\${driverName}</strong><br>
                Driver Call-sign: <strong>\${s.driverId}</strong><br>
                Status: Self-Employed Driver Contractor<br>
                Account Ref: DRV-ACC-\${s.driverId}
            </div>
        </div>

        <table>
            <thead>
                <tr>
                    <th>Service Description</th>
                    <th style="text-align:center;">Trips</th>
                    <th style="text-align:right;">Gross Bookings</th>
                    <th style="text-align:right;">Rate</th>
                    <th style="text-align:right;">Total Fee Due</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>
                        <strong>Taxi Dispatch & Radio Booking Commission Fee</strong><br>
                        <span style="font-size:11px; color:#64748b;">Despatch system handling, GPS telematics & customer acquisition</span>
                    </td>
                    <td style="text-align:center;">\${s.totalJobs}</td>
                    <td style="text-align:right;">£\${s.gross}</td>
                    <td style="text-align:right;">\${s.commPct}%</td>
                    <td style="text-align:right; font-weight:bold;">£\${s.commission}</td>
                </tr>
            </tbody>
        </table>

        <div class="totals">
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
        </div>

        <div class="notice-box">
            <strong>Payment & Remittance Terms:</strong><br>
            \${s.settlementType === 'OFFICE_OWES_DRIVER' 
                ? 'The net balance above has been credited to your bank account via automated driver BACS remittance.' 
                : 'This invoice represents despatch commission on cash fares collected in-hand. Balance is due on weekly driver settlement day.'}
        </div>

        <div class="ftr">
            MD Taxi Despatch Management System • VAT Registration: Exempt / Included under Flat-Rate Scheme • Official Record for HMRC Self-Assessment
        </div>
    </body>
    </html>\`;

    invWin.document.open();
    invWin.document.write(doc);
    invWin.document.close();
}

` + functionTarget;

if (!html.includes('function printDriverInvoiceDocument()')) {
    html = html.replace(functionTarget, invoiceFunction);
    fs.writeFileSync('public/admin.html', html);
    console.log("✅ Successfully injected printDriverInvoiceDocument into public/admin.html!");
} else {
    console.log("printDriverInvoiceDocument already exists.");
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
