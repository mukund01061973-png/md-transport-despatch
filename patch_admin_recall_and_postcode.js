const fs = require('fs');
let html = fs.readFileSync('public/admin.html', 'utf8');

// 1. IMPROVE DRIVER DROPDOWNS: Online drivers (🟢) at top, Offline (⚪️) at bottom
const oldPopulateDriverRegex = /function\s+populateDriverSelects\(\)\s*\{[\s\S]*?const\s+sel\s*=\s*document\.getElementById\('jobAssignDriver'\);[\s\S]*?driversList\.forEach\([\s\S]*?\}\);[\s\S]*?\}/;

const solidPopulateDriver = `function populateDriverSelects() {
    const sel = document.getElementById('jobAssignDriver');
    const reassignSel = document.getElementById('reassignTargetDriver');
    if (!sel && !reassignSel) return;

    // Sort: Online/Available first, then Busy, then Offline
    const sorted = [...(window.driversList || [])].sort((a, b) => {
        const aOnline = (a.status && a.status.toLowerCase() !== 'offline') ? 1 : 0;
        const bOnline = (b.status && b.status.toLowerCase() !== 'offline') ? 1 : 0;
        if (aOnline !== bOnline) return bOnline - aOnline;
        return (a.name || '').localeCompare(b.name || '');
    });

    let options = '<option value="UNASSIGNED">⚡ Auto-Match FIFO Queue (Cascade ➔ Bid)</option>';
    let optOnline = '<optgroup label="🟢 ONLINE DRIVERS">';
    let optOffline = '<optgroup label="⚪️ OFFLINE DRIVERS">';
    let hasOnline = false, hasOffline = false;

    sorted.forEach(d => {
        const isOff = !d.status || d.status.toLowerCase() === 'offline';
        const icon = isOff ? '⚪️' : (d.status.toLowerCase() === 'available' ? '🟢' : '🟡');
        const label = \`\${icon} \${d.name || d.callsign || d.driverId} (\${d.callsign || d.driverId || 'ID'}) - \${d.vehicleClass || 'Standard'} [\${d.status || 'Offline'}]\`;
        
        if (!isOff) {
            optOnline += \`<option value="\${d.driverId || d.id}">\${label}</option>\`;
            hasOnline = true;
        } else {
            optOffline += \`<option value="\${d.driverId || d.id}">\${label}</option>\`;
            hasOffline = true;
        }
    });

    optOnline += '</optgroup>';
    optOffline += '</optgroup>';

    if (hasOnline) options += optOnline;
    if (hasOffline) options += optOffline;

    if (sel) sel.innerHTML = options;
    if (reassignSel) reassignSel.innerHTML = options;
}`;

html = html.replace(oldPopulateDriverRegex, solidPopulateDriver);

// 2. ENHANCE UK POSTCODE / STREET LEVEL ADDRESS FORMATTER
const oldNominatimParser = "const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&countrycodes=gb&addressdetails=1&limit=5&q=${encodeURIComponent(query)}`);";
const enhancedNominatim = `const res = await fetch(\`https://nominatim.openstreetmap.org/search?format=json&countrycodes=gb&addressdetails=1&limit=8&q=\${encodeURIComponent(query)}\`);`;

if (html.includes(oldNominatimParser)) {
    html = html.replace(oldNominatimParser, enhancedNominatim);
}

// Ensure the suggestion item builder formats: Road, House Number, City, Postcode
const oldSuggestionMap = "data.map(item => item.display_name)";
const solidSuggestionMap = `data.map(item => {
    if (!item.address) return item.display_name;
    const a = item.address;
    const house = a.house_number || a.house_name || '';
    const road = a.road || a.pedestrian || a.street || '';
    const streetPart = (house ? house + ' ' : '') + road;
    const locality = a.suburb || a.neighbourhood || a.village || a.town || a.city || '';
    const pc = a.postcode || '';
    
    let parts = [];
    if (streetPart.trim()) parts.push(streetPart.trim());
    if (locality && locality !== streetPart) parts.push(locality);
    if (pc) parts.push(pc);
    return parts.length > 0 ? parts.join(', ') : item.display_name;
})`;

if (html.includes(oldSuggestionMap)) {
    html = html.replace(oldSuggestionMap, solidSuggestionMap);
}

// 3. CORRECT RECALL BUTTON ON ACTIVE JOBS (TABLE ROW RENDER)
html = html.replace(
    /\$\{isActive\s*\?\s*`[^`]*reassignJobModal[^`]*`\s*:\s*''\}/g,
    `\${isActive ? \`<button type="button" class="btn-yellow" style="width:auto; padding:2px 8px; font-size:0.75rem; margin:1px; background:#d97706; color:#fff;" onclick="openReassignModal('\${job.id}')" title="Recall to Base or Reassign">↩️ Recall / Reassign</button>\` : ''}`
);

fs.writeFileSync('public/admin.html', html);
console.log('✅ public/admin.html upgraded with categorized drivers, address formatter, and recall controls!');
