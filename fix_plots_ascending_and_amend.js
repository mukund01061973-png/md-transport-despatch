const fs = require('fs');
let html = fs.readFileSync('public/admin.html', 'utf8');

// 1. Natural ascending numerical sort function for codes like PLOT-1, PLOT-2, PLOT-10
const oldRender = `function renderPlotsTable() {
            const tbody = document.getElementById('plotsTableBody');`;

const newRender = `function renderPlotsTable() {
            if (Array.isArray(allPlots)) {
                allPlots.sort((a, b) => {
                    const numA = parseInt(String(a.code || '').replace(/\\D/g, ''), 10);
                    const numB = parseInt(String(b.code || '').replace(/\\D/g, ''), 10);
                    if (!isNaN(numA) && !isNaN(numB) && numA !== numB) {
                        return numA - numB;
                    }
                    return String(a.code || '').localeCompare(String(b.code || ''), undefined, { numeric: true, sensitivity: 'base' });
                });
            }
            const tbody = document.getElementById('plotsTableBody');`;

if (html.includes(oldRender)) {
  html = html.replace(oldRender, newRender);
  console.log('✅ Added ascending natural numerical sort to renderPlotsTable');
}

// 2. Add ✏️ Amend button next to 🗑️ Delete in renderPlotsTable
const oldButtons = `<button type="button" class="btn-red" style="padding:2px 8px; font-size:0.75rem;" onclick="deletePlot(\${p.id})">🗑️ Delete</button>`;
const newButtons = `<button type="button" class="btn-blue" style="padding:2px 8px; font-size:0.75rem; margin-right:4px;" onclick="openEditPlotModal(\${p.id})">✏️ Amend</button>
                    <button type="button" class="btn-red" style="padding:2px 8px; font-size:0.75rem;" onclick="deletePlot(\${p.id})">🗑️ Delete</button>`;

if (html.includes(oldButtons)) {
  html = html.replace(oldButtons, newButtons);
  console.log('✅ Added ✏️ Amend button to Plots/Stands row');
}

// 3. Add openEditPlotModal and savePlotAmend functions
const plotModalFuncs = `
        window.openEditPlotModal = function(plotId) {
            const p = (allPlots || []).find(x => x.id == plotId);
            if (!p) return alert('Plot #' + plotId + ' not found');
            document.getElementById('editPlotId').value = p.id;
            document.getElementById('editPlotName').value = p.name || '';
            document.getElementById('editPlotCode').value = p.code || '';
            document.getElementById('editPlotPostcodeSector').value = p.postcodeSector || '';
            document.getElementById('editPlotType').value = p.plotType || 'stand';
            document.getElementById('editPlotRadius').value = p.radiusMeters || 350;
            document.getElementById('editPlotCapacity').value = p.maxCapacity || 10;
            window.openAppModal('modalEditPlot');
        };

        window.savePlotAmend = function(e) {
            e.preventDefault();
            const id = document.getElementById('editPlotId').value;
            const payload = {
                id: id,
                name: document.getElementById('editPlotName').value.trim(),
                code: document.getElementById('editPlotCode').value.trim().toUpperCase(),
                postcodeSector: document.getElementById('editPlotPostcodeSector').value.trim().toUpperCase(),
                plotType: document.getElementById('editPlotType').value,
                radiusMeters: parseInt(document.getElementById('editPlotRadius').value, 10) || 350,
                maxCapacity: parseInt(document.getElementById('editPlotCapacity').value, 10) || 10
            };
            socket.emit('admin_update_plot', payload);
            window.closeAppModal('modalEditPlot');
        };
`;

if (!html.includes('window.openEditPlotModal =')) {
  const insertMarker = 'function deletePlot(plotId) {';
  html = html.replace(insertMarker, plotModalFuncs + '\n        ' + insertMarker);
  console.log('✅ Added openEditPlotModal & savePlotAmend scripts');
}

// 4. Inject modalEditPlot HTML dialog before </body>
const editPlotModalHtml = `
    <!-- MODAL: EDIT / AMEND PLOT & STAND -->
    <div id="modalEditPlot" class="modal-overlay" onclick="closeOverlayModal(event, 'modalEditPlot')">
        <div class="modal-card" style="max-width: 500px; width: 100%;">
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #334155; padding-bottom:12px; margin-bottom:16px;">
                <h3 style="margin:0; font-size:1.1rem; color:#38bdf8;">✏️ Amend Taxi Stand / Area Plot</h3>
                <button type="button" class="btn-gray" style="padding:4px 10px;" onclick="closeAppModal('modalEditPlot')">✕</button>
            </div>
            <form onsubmit="savePlotAmend(event)">
                <input type="hidden" id="editPlotId">
                <div style="margin-bottom:12px;">
                    <label style="display:block; font-size:0.8rem; color:#94a3b8; margin-bottom:4px;">Plot / Stand Code</label>
                    <input type="text" id="editPlotCode" required class="input-dark" style="width:100%;" placeholder="e.g. PLOT-1">
                </div>
                <div style="margin-bottom:12px;">
                    <label style="display:block; font-size:0.8rem; color:#94a3b8; margin-bottom:4px;">Name / Location</label>
                    <input type="text" id="editPlotName" required class="input-dark" style="width:100%;" placeholder="e.g. Lansdown Stand">
                </div>
                <div style="display:flex; gap:10px; margin-bottom:12px;">
                    <div style="flex:1;">
                        <label style="display:block; font-size:0.8rem; color:#94a3b8; margin-bottom:4px;">Postcode / Sector</label>
                        <input type="text" id="editPlotPostcodeSector" class="input-dark" style="width:100%;" placeholder="e.g. BA1">
                    </div>
                    <div style="flex:1;">
                        <label style="display:block; font-size:0.8rem; color:#94a3b8; margin-bottom:4px;">Type</label>
                        <select id="editPlotType" class="input-dark" style="width:100%;">
                            <option value="stand">🚕 FIFO Stand</option>
                            <option value="polygon">🏘️ Area Sector</option>
                        </select>
                    </div>
                </div>
                <div style="display:flex; gap:10px; margin-bottom:16px;">
                    <div style="flex:1;">
                        <label style="display:block; font-size:0.8rem; color:#94a3b8; margin-bottom:4px;">Radius (Meters)</label>
                        <input type="number" id="editPlotRadius" class="input-dark" style="width:100%;" min="50" step="10">
                    </div>
                    <div style="flex:1;">
                        <label style="display:block; font-size:0.8rem; color:#94a3b8; margin-bottom:4px;">Max Capacity</label>
                        <input type="number" id="editPlotCapacity" class="input-dark" style="width:100%;" min="1" step="1">
                    </div>
                </div>
                <div style="display:flex; justify-content:flex-end; gap:8px;">
                    <button type="button" class="btn-gray" onclick="closeAppModal('modalEditPlot')">Cancel</button>
                    <button type="submit" class="btn-blue">Save Changes</button>
                </div>
            </form>
        </div>
    </div>
`;

if (!html.includes('id="modalEditPlot"')) {
  const bodyClose = html.lastIndexOf('</body>');
  html = html.slice(0, bodyClose) + editPlotModalHtml + '\n' + html.slice(bodyClose);
  console.log('✅ Injected modalEditPlot dialog');
}

fs.writeFileSync('public/admin.html', html);
console.log('✅ public/admin.html updated successfully with ascending plot sort and Amend modal.');
