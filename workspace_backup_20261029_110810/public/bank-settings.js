(function() {
    function injectUI() {
        var btns = document.querySelectorAll("button");
        var invoiceBtn = null;
        for (var i = 0; i < btns.length; i++) {
            if (btns[i].textContent && btns[i].textContent.indexOf("Driver Tax Invoice") !== -1) {
                invoiceBtn = btns[i];
                break;
            }
        }

        if (invoiceBtn && !document.getElementById("btnBankSettings")) {
            var btn = document.createElement("button");
            btn.id = "btnBankSettings";
            btn.type = "button";
            btn.className = "btn";
            btn.style.cssText = "margin:0 0 0 8px; padding:8px 14px; white-space:nowrap; background:#334155; color:#38bdf8; border:1px solid #475569; font-weight:600; cursor:pointer;";
            btn.textContent = "⚙️ Bank Settings";
            btn.onclick = openBankSettingsModal;
            invoiceBtn.parentNode.insertBefore(btn, invoiceBtn.nextSibling);
        }

        if (!document.getElementById("bankSettingsModal")) {
            var modal = document.createElement("div");
            modal.id = "bankSettingsModal";
            modal.style.cssText = "display:none; position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.75); z-index:999999; justify-content:center; align-items:center;";
            modal.innerHTML = 
                '<div style="background:#1e293b; border:1px solid #475569; border-radius:12px; width:440px; max-width:92vw; padding:24px; color:#f8fafc; font-family:sans-serif;">' +
                    '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">' +
                        '<h3 style="margin:0; font-size:1.15rem; color:#38bdf8;">🏦 Company Bank Settlement Settings</h3>' +
                        '<button type="button" onclick="closeBankSettingsModal()" style="background:transparent; border:none; color:#94a3b8; font-size:1.5rem; cursor:pointer;">&times;</button>' +
                    '</div>' +
                    '<div style="margin-bottom:12px;">' +
                        '<label style="display:block; font-size:0.8rem; color:#94a3b8; margin-bottom:4px;">Bank Name:</label>' +
                        '<input id="cfgBankName" type="text" style="width:100%; box-sizing:border-box; padding:8px; background:#0f172a; border:1px solid #334155; border-radius:6px; color:#fff;" />' +
                    '</div>' +
                    '<div style="margin-bottom:12px;">' +
                        '<label style="display:block; font-size:0.8rem; color:#94a3b8; margin-bottom:4px;">Account Name:</label>' +
                        '<input id="cfgAccName" type="text" style="width:100%; box-sizing:border-box; padding:8px; background:#0f172a; border:1px solid #334155; border-radius:6px; color:#fff;" />' +
                    '</div>' +
                    '<div style="display:flex; gap:10px; margin-bottom:16px;">' +
                        '<div style="flex:1;">' +
                            '<label style="display:block; font-size:0.8rem; color:#94a3b8; margin-bottom:4px;">Sort Code:</label>' +
                            '<input id="cfgSortCode" type="text" style="width:100%; box-sizing:border-box; padding:8px; background:#0f172a; border:1px solid #334155; border-radius:6px; color:#fff;" />' +
                        '</div>' +
                        '<div style="flex:1;">' +
                            '<label style="display:block; font-size:0.8rem; color:#94a3b8; margin-bottom:4px;">Account No:</label>' +
                            '<input id="cfgAccNum" type="text" style="width:100%; box-sizing:border-box; padding:8px; background:#0f172a; border:1px solid #334155; border-radius:6px; color:#fff;" />' +
                        '</div>' +
                    '</div>' +
                    '<div style="display:flex; justify-content:flex-end; gap:10px;">' +
                        '<button type="button" onclick="closeBankSettingsModal()" style="padding:8px 14px; background:#334155; border:none; border-radius:6px; color:#fff; cursor:pointer;">Cancel</button>' +
                        '<button type="button" onclick="saveBankSettingsModal()" style="padding:8px 16px; background:#0284c7; border:none; border-radius:6px; color:#fff; font-weight:bold; cursor:pointer;">💾 Save</button>' +
                    '</div>' +
                '</div>';
            document.body.appendChild(modal);
        }
    }

    window.openBankSettingsModal = function() {
        document.getElementById("cfgBankName").value = localStorage.getItem("cfg_bank_name") || "Barclays Bank UK PLC";
        document.getElementById("cfgAccName").value = localStorage.getItem("cfg_acc_name") || "MD Taxi Despatch Services Ltd";
        document.getElementById("cfgSortCode").value = localStorage.getItem("cfg_sort_code") || "20-05-00";
        document.getElementById("cfgAccNum").value = localStorage.getItem("cfg_acc_num") || "83920148";
        document.getElementById("bankSettingsModal").style.display = "flex";
    };

    window.closeBankSettingsModal = function() {
        var m = document.getElementById("bankSettingsModal");
        if (m) m.style.display = "none";
    };

    window.saveBankSettingsModal = function() {
        var b = document.getElementById("cfgBankName").value.trim();
        var a = document.getElementById("cfgAccName").value.trim();
        var s = document.getElementById("cfgSortCode").value.trim();
        var n = document.getElementById("cfgAccNum").value.trim();
        localStorage.setItem("cfg_bank_name", b || "Barclays Bank UK PLC");
        localStorage.setItem("cfg_acc_name", a || "MD Taxi Despatch Services Ltd");
        localStorage.setItem("cfg_sort_code", s || "20-05-00");
        localStorage.setItem("cfg_acc_num", n || "83920148");
        alert("✅ Bank details saved!");
        closeBankSettingsModal();
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", injectUI);
    } else {
        injectUI();
    }
})();
