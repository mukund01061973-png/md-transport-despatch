const fs = require('fs');
let html = fs.readFileSync('public/admin.html', 'utf8');

const oldSelect = `<select id="tenantSelect" onchange="switchTenant()" style="width:130px; margin:0; padding:4px 6px; font-size:0.75rem; background:#0f172a; border-color:#0284c7; color:#38bdf8; font-weight:bold;">
                <option value="MD-BATH" selected>📍 Bath Fleet</option>
                <option value="MD-BRISTOL">📍 Bristol Fleet</option>
                <option value="MD-LONDON">📍 London Fleet</option>
            </select>`;

const newSelect = `<select id="tenantSelect" onchange="switchTenant()" style="min-width:140px; margin:0; padding:4px 8px; font-size:0.75rem; background:#0f172a; border:1px solid #0284c7; color:#38bdf8; font-weight:bold; border-radius:6px; cursor:pointer;">
                <option value="ALL" selected>🌐 All Areas / Network</option>
                <option value="BA">📍 BA (Bath / North Somerset)</option>
                <option value="BS">📍 BS (Bristol Metro)</option>
                <option value="SN">📍 SN (Swindon / Wilts)</option>
                <option value="GL">📍 GL (Gloucestershire)</option>
                <option value="W">📍 W / SW (London Sectors)</option>
                <option value="__CUSTOM__">➕ Enter Custom Postcode Sector...</option>
            </select>`;

if (html.includes(oldSelect)) {
  html = html.replace(oldSelect, newSelect);
}

// Update switchTenant() to handle custom sectors
const oldSwitchFn = `function switchTenant() {
            const tenant = document.getElementById('tenantSelect').value;
            socket.emit('set_tenant', tenant);
        }`;

const newSwitchFn = `function switchTenant() {
            const sel = document.getElementById('tenantSelect');
            let val = sel.value;
            if (val === '__CUSTOM__') {
                const customSector = prompt('Enter UK Postcode Sector Prefix (e.g. SP, TA, DT, OX, NW):', '');
                if (customSector && customSector.trim()) {
                    const clean = customSector.trim().toUpperCase();
                    const opt = document.createElement('option');
                    opt.value = clean;
                    opt.textContent = '📍 ' + clean + ' Sector';
                    sel.insertBefore(opt, sel.lastElementChild);
                    sel.value = clean;
                    val = clean;
                } else {
                    sel.value = 'ALL';
                    val = 'ALL';
                }
            }
            if (typeof socket !== 'undefined') {
                socket.emit('set_tenant', val);
            }
        }`;

if (html.includes("function switchTenant()")) {
  html = html.replace(oldSwitchFn, newSwitchFn);
}

fs.writeFileSync('public/admin.html', html);
console.log("✅ public/admin.html successfully upgraded to flexible Postcode Sectors!");
