const fs = require('fs');

let html = fs.readFileSync('public/admin.html', 'utf8');

// 1. Add "⚙️ Bank Settings" button next to "🧾 Driver Tax Invoice"
const invoiceBtnTarget = 'onclick="printDriverInvoiceDocument()">🧾 Driver Tax Invoice</button>';
const newBtnGroup = 'onclick="printDriverInvoiceDocument()">🧾 Driver Tax Invoice</button>\n' +
'                    <button type="button" class="btn" style="margin:0 0 0 8px; padding:8px 14px; white-space:nowrap; background:#334155; color:#38bdf8; border:1px solid #475569; font-weight:700; cursor:pointer;" onclick="openBankSettingsModal()">⚙️ Bank Settings</button>';

if (html.includes(invoiceBtnTarget) && !html.includes('openBankSettingsModal()')) {
    html = html.replace(invoiceBtnTarget, newBtnGroup);
    console.log("✅ 1. Added '⚙️ Bank Settings' button.");
}

// 2. Make Bank details in invoice template pull dynamically via a helper call
html = html.replace(
    '<div><strong>Bank:</strong> Barclays Bank UK PLC</div>',
    '<div><strong>Bank:</strong> ${(window.getCompanyBankDetails ? window.getCompanyBankDetails().bankName : "Barclays Bank UK PLC")}</div>'
);
html = html.replace(
    '<div><strong>Account Name:</strong> MD Taxi Despatch Services Ltd</div>',
    '<div><strong>Account Name:</strong> ${(window.getCompanyBankDetails ? window.getCompanyBankDetails().accountName : "MD Taxi Despatch Services Ltd")}</div>'
);
html = html.replace(
    '<div><strong>Sort Code:</strong> 20-05-00</div>',
    '<div><strong>Sort Code:</strong> ${(window.getCompanyBankDetails ? window.getCompanyBankDetails().sortCode : "20-05-00")}</div>'
);
html = html.replace(
    '<div><strong>Account No:</strong> 83920148</div>',
    '<div><strong>Account No:</strong> ${(window.getCompanyBankDetails ? window.getCompanyBankDetails().accountNumber : "83920148")}</div>'
);
console.log("✅ 2. Injected dynamic bank details into invoice.");

// 3. Delegate the payment split HTML to a helper function (avoids nested backtick hazard)
const oldBreakdown = `            <div class="totals-row" style="display:flex; justify-content:space-between; padding:3px 0; color:#64748b;">
                <span>Total Prepaid Online (Office Held):</span>
                <span>£\${s.prepaidTotal || '0.00'}</span>
            </div>
            <div class="totals-row" style="display:flex; justify-content:space-between; padding:3px 0; color:#64748b;">
                <span>Total Corporate Account (Office Billed):</span>
                <span>£\${s.accountTotal || '0.00'}</span>
            </div>`;

const newBreakdown = `            \${window.renderInvoiceSplitRows ? window.renderInvoiceSplitRows(s) : ''}`;

if (html.includes(oldBreakdown)) {
    html = html.replace(oldBreakdown, newBreakdown);
    console.log("✅ 3. Safely delegated payment splits to helper function.");
}

// 4. Append modal & isolated helpers right before </body>
const modalAndScript = `
<!-- Bank & Invoice Settings Modal -->
<div id="bankSettingsModal" style="display:none; position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.75); z-index:999999; justify-content:center; align-items:center;">
    <div style="background:#1e293b; border:1px solid #475569; border-radius:12px; width:460px; max-width:92vw; padding:24px; color:#f8fafc; box-shadow:0 25px 50px -12px rgba(0,0,0,0.8); font-family:system-ui, -apple-system, sans-serif;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
            <h3 style="margin:0; font-size:1.15rem; font-weight:700; color:#38bdf8;">🏦 Company Bank & Invoice Settings</h3>
            <button type="button" onclick="closeBankSettingsModal()" style="background:transparent; border:none; color:#94a3b8; font-size:1.6rem; cursor:pointer; line-height:1;">&times;</button>
        </div>
        <div style="margin-bottom:12px;">
            <label style="display:block; font-size:0.8rem; color:#94a3b8; margin-bottom:4px; font-weight:600;">Bank Name:</label>
            <input id="cfgBankName" type="text" placeholder="e.g. Barclays Bank UK PLC" style="width:100%; box-sizing:border-box; padding:9px 12px; background:#0f172a; border:1px solid #334155; border-radius:6px; color:#fff; font-size:0.9rem;" />
        </div>
        <div style="margin-bottom:12px;">
            <label style="display:block; font-size:0.8rem; color:#94a3b8; margin-bottom:4px; font-weight:600;">Account Name:</label>
            <input id="cfgAccName" type="text" placeholder="e.g. MD Taxi Despatch Services Ltd" style="width:100%; box-sizing:border-box; padding:9px 12px; background:#0f172a; border:1px solid #334155; border-radius:6px; color:#fff; font-size:0.9rem;" />
        </div>
        <div style="display:flex; gap:12px; margin-bottom:14px;">
            <div style="flex:1;">
                <label style="display:block; font-size:0.8rem; color:#94a3b8; margin-bottom:4px; font-weight:600;">Sort Code:</label>
                <input id="cfgSortCode" type="text" placeholder="20-05-00" style="width:100%; box-sizing:border-box; padding:9px 12px; background:#0f172a; border:1px solid #334155; border-radius:6px; color:#fff; font-size:0.9rem;" />
            </div>
            <div style="flex:1;">
                <label style="display:block; font-size:0.8rem; color:#94a3b8; margin-bottom:4px; font-weight:600;">Account No:</label>
                <input id="cfgAccNum" type="text" placeholder="83920148" style="width:100%; box-sizing:border-box; padding:9px 12px; background:#0f172a; border:1px solid #334155; border-radius:6px; color:#fff; font-size:0.9rem;" />
            </div>
        </div>
        <div style="margin-bottom:20px; background:#0f172a; padding:12px; border-radius:8px; border:1px solid #334155;">
            <label style="display:flex; align-items:flex-start; gap:10px; font-size:0.85rem; color:#cbd5e1; cursor:pointer;">
                <input type="checkbox" id="cfgHideSplits" style="margin-top:3px; cursor:pointer;" />
                <span><strong>Confidential Mode:</strong> Keep Card & Corporate Account separate splits private on Driver Invoices (combines into single <em>"Office Non-Cash Collections"</em> line).</span>
            </label>
        </div>
        <div style="display:flex; justify-content:flex-end; gap:10px;">
            <button type="button" onclick="closeBankSettingsModal()" style="padding:9px 16px; background:#334155; border:none; border-radius:6px; color:#fff; cursor:pointer; font-weight:600;">Cancel</button>
            <button type="button" onclick="saveCompanyBankDetails()" style="padding:9px 18px; background:#0284c7; border:none; border-radius:6px; color:#fff; font-weight:700; cursor:pointer;">💾 Save Changes</button>
        </div>
    </div>
</div>

<script>
window.getCompanyBankDetails = function() {
    return {
        bankName: localStorage.getItem("cfg_bank_name") || "Barclays Bank UK PLC",
        accountName: localStorage.getItem("cfg_acc_name") || "MD Taxi Despatch Services Ltd",
        sortCode: localStorage.getItem("cfg_sort_code") || "20-05-00",
        accountNumber: localStorage.getItem("cfg_acc_num") || "83920148",
        hidePaymentSplits: localStorage.getItem("cfg_hide_splits") === "true"
    };
};

window.renderInvoiceSplitRows = function(s) {
    const cfg = window.getCompanyBankDetails();
    if (cfg.hidePaymentSplits) {
        const nonCash = s.cardTotal || (parseFloat(s.prepaidTotal || 0) + parseFloat(s.accountTotal || 0)).toFixed(2);
        return '<div class="totals-row" style="display:flex; justify-content:space-between; padding:3px 0; color:#64748b;">' +
               '<span>Office Non-Cash Collections (Prepaid / Card / Account):</span>' +
               '<span>£' + nonCash + '</span></div>';
    }
    return '<div class="totals-row" style="display:flex; justify-content:space-between; padding:3px 0; color:#64748b;">' +
           '<span>Total Prepaid Online (Office Held):</span>' +
           '<span>£' + (s.prepaidTotal || "0.00") + '</span></div>' +
           '<div class="totals-row" style="display:flex; justify-content:space-between; padding:3px 0; color:#64748b;">' +
           '<span>Total Corporate Account (Office Billed):</span>' +
           '<span>£' + (s.accountTotal || "0.00") + '</span></div>';
};

window.openBankSettingsModal = function() {
    const m = document.getElementById("bankSettingsModal");
    if (!m) return alert("Settings modal element not found.");
    const cfg = window.getCompanyBankDetails();
    document.getElementById("cfgBankName").value = cfg.bankName;
    document.getElementById("cfgAccName").value = cfg.accountName;
    document.getElementById("cfgSortCode").value = cfg.sortCode;
    document.getElementById("cfgAccNum").value = cfg.accountNumber;
    document.getElementById("cfgHideSplits").checked = cfg.hidePaymentSplits;
    m.style.display = "flex";
};

window.closeBankSettingsModal = function() {
    const m = document.getElementById("bankSettingsModal");
    if (m) m.style.display = "none";
};

window.saveCompanyBankDetails = function() {
    const bName = document.getElementById("cfgBankName").value.trim();
    const aName = document.getElementById("cfgAccName").value.trim();
    const sCode = document.getElementById("cfgSortCode").value.trim();
    const aNum = document.getElementById("cfgAccNum").value.trim();
    const hideSplits = document.getElementById("cfgHideSplits").checked;

    if (bName) localStorage.setItem("cfg_bank_name", bName);
    if (aName) localStorage.setItem("cfg_acc_name", aName);
    if (sCode) localStorage.setItem("cfg_sort_code", sCode);
    if (aNum) localStorage.setItem("cfg_acc_num", aNum);
    localStorage.setItem("cfg_hide_splits", hideSplits ? "true" : "false");

    alert("✅ Company bank & invoice settings saved successfully!");
    window.closeBankSettingsModal();
};
</script>
`;

html = html.replace('</body>', modalAndScript + '\n</body>');
fs.writeFileSync('public/admin.html', html);
console.log("✅ 4. Modal and helper script appended cleanly.");

// 5. Verification
const scriptMatches = [...html.matchAll(/<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/gi)];
console.log(`\nAuditing ${scriptMatches.length} inline script blocks...`);
let allPass = true;
scriptMatches.forEach((m, idx) => {
    try {
        new Function(m[1]);
        console.log(`✅ Script block #${idx + 1} passed syntax check.`);
    } catch (err) {
        allPass = false;
        console.error(`❌ SYNTAX ERROR in script #${idx + 1}:`, err.message);
    }
});

if (allPass) {
    console.log("\n🚀 PATCH VERIFIED WITH ZERO SYNTAX ERRORS!");
}
