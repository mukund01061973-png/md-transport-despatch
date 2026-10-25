const fs = require('fs');
let html = fs.readFileSync('public/admin.html', 'utf8');

const oldFuncIdx = html.indexOf('window.savePlotAmend');
if (oldFuncIdx !== -1) {
  const endFuncIdx = html.indexOf('};', oldFuncIdx);
  const correctSaveFunc = `window.savePlotAmend = function(e) {
            e.preventDefault();
            const idVal = parseInt(document.getElementById('editPlotId').value, 10);
            if (!idVal) return alert('Invalid Plot ID');

            const payload = {
                id: idVal,
                name: document.getElementById('editPlotName').value.trim(),
                code: document.getElementById('editPlotCode').value.trim().toUpperCase(),
                postcodeSector: document.getElementById('editPlotPostcodeSector').value.trim().toUpperCase(),
                plotType: document.getElementById('editPlotType').value,
                radiusMeters: parseInt(document.getElementById('editPlotRadius').value, 10) || 350,
                maxCapacity: parseInt(document.getElementById('editPlotCapacity').value, 10) || 10
            };

            if (typeof socket !== 'undefined') {
                socket.emit('admin_update_plot', payload);
            }
            window.closeAppModal('modalEditPlot');
        };`;

  html = html.slice(0, oldFuncIdx) + correctSaveFunc + html.slice(endFuncIdx + 2);
  fs.writeFileSync('public/admin.html', html);
  console.log('✅ public/admin.html savePlotAmend updated successfully!');
} else {
  console.log('❌ window.savePlotAmend not found');
}
