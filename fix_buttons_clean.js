const fs = require('fs');
let html = fs.readFileSync('public/admin.html', 'utf8');

// Replace lines 253-256 with clean data-action buttons (no nested inline quotes)
const brokenBlockRegex = /<td style="text-align:center;">\s*<button class="btn-sm" onclick="openEditDriverModal[\s\S]*?<\/td>/;
const cleanDriverActions = `<td style="text-align:center;">
          <button class="btn-sm" data-action="edit-driver" data-id="' + escapeHtml(d.driverId) + '">✏️ Edit</button>
          <button class="btn-sm btn-red" data-action="delete-driver" data-id="' + escapeHtml(d.driverId) + '">🗑️</button>
        </td>`;

html = html.replace(brokenBlockRegex, cleanDriverActions);

// Also update corporate accounts to use data-action buttons
const brokenAccountRegex = /<td style="text-align:center;">\s*<button class="btn-sm" onclick="openEditAccountModal[\s\S]*?<\/td>/;
const cleanAccountActions = `<td style="text-align:center;">
          <button class="btn-sm" data-action="edit-account" data-id="' + escapeHtml(num) + '">✏️ Edit</button>
          <button class="btn-sm btn-red" data-action="delete-account" data-id="' + escapeHtml(num) + '">🗑️</button>
        </td>`;

html = html.replace(brokenAccountRegex, cleanAccountActions);

// Add global click delegation for all data-action buttons right before </script>
const delegationCode = `
// Universal Click Delegation for Data Buttons
document.addEventListener('click', function(e) {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const action = btn.getAttribute('data-action');
  const id = btn.getAttribute('data-id');

  if (action === 'edit-driver') openEditDriverModal(id);
  if (action === 'delete-driver') deleteDriver(id);
  if (action === 'edit-account') openEditAccountModal(id);
  if (action === 'delete-account') deleteAccount(id);
});
`;

if (!html.includes("data-action='edit-driver'") && !html.includes('data-action="edit-driver"')) {
  // If the regex didn't catch due to string variance, perform direct replacement on renderDriversTable
  const oldRenderDrivers = html.indexOf('function renderDriversTable()');
  if (oldRenderDrivers !== -1) {
    const endFn = html.indexOf('window.openEditDriverModal', oldRenderDrivers);
    const cleanDriversFn = `function renderDriversTable() {
  const tbody = document.getElementById('driversTableBody');
  const sel = document.getElementById('jobAssignDriver');
  const reassignSel = document.getElementById('reassignTargetDriver');
  const chatSel = document.getElementById('adminChatDriverSelect');

  if (tbody) tbody.innerHTML = '';
  if (sel) sel.innerHTML = '<option value="AUTO">⚡ Auto-Match FIFO Queue</option>';
  if (reassignSel) reassignSel.innerHTML = '';
  if (chatSel) chatSel.innerHTML = '';

  allDrivers.forEach(function(d) {
    const opt = document.createElement('option');
    opt.value = d.driverId;
    opt.textContent = (d.name || d.driverId) + ' (' + d.driverId + ')';

    if (sel) sel.appendChild(opt.cloneNode(true));
    if (reassignSel) reassignSel.appendChild(opt.cloneNode(true));
    if (chatSel) chatSel.appendChild(opt.cloneNode(true));

    if (tbody) {
      const tr = document.createElement('tr');
      const dClass = d.vehicleClass || 'Saloon';
      const comm = (d.commissionRate !== undefined && d.commissionRate !== null) ? d.commissionRate + '%' : '15%';

      tr.innerHTML = '<td><strong>' + escapeHtml(d.driverId) + '</strong></td>' +
        '<td><strong>' + escapeHtml(d.name || '') + '</strong><br><span style="font-size:0.75rem; color:#94a3b8;">' + escapeHtml(d.phone || '-') + '</span></td>' +
        '<td>' + escapeHtml(d.vehicle || '-') + ' <span class="badge" style="background:#334155; font-size:0.7rem;">' + escapeHtml(dClass) + '</span></td>' +
        '<td>' + comm + '</td>' +
        '<td><span class="badge ' + (d.status === 'Available' ? 'badge-green' : 'badge-yellow') + '">' + escapeHtml(d.status || 'Offline') + '</span></td>' +
        '<td style="text-align:center;">' +
          '<button class="btn-sm" data-action="edit-driver" data-id="' + escapeHtml(d.driverId) + '">✏️ Edit</button> ' +
          '<button class="btn-sm btn-red" data-action="delete-driver" data-id="' + escapeHtml(d.driverId) + '">🗑️</button>' +
        '</td>';
      tbody.appendChild(tr);
    }
  });
}\n\n`;
    html = html.slice(0, oldRenderDrivers) + cleanDriversFn + html.slice(endFn);
  }
}

// Ensure the delegation listener is placed before the script ends
if (!html.includes("Universal Click Delegation")) {
  const lastScriptClose = html.lastIndexOf('</script>');
  html = html.slice(0, lastScriptClose) + delegationCode + '\n</script>' + html.slice(lastScriptClose + 9);
}

fs.writeFileSync('public/admin.html', html);
console.log('✅ Applied clean data-action event delegation!');
