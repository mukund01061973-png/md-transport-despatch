const fs = require('fs');
let html = fs.readFileSync('public/admin.html', 'utf8');

// 1. Ensure newest jobs always show first
const renderPattern = /function\s+renderJobsTable\s*\(\)\s*\{/;
if (renderPattern.test(html) && !html.includes('allJobs.sort((a, b) => Number(b.id) - Number(a.id))')) {
  html = html.replace(renderPattern, `function renderJobsTable() {
            if (Array.isArray(allJobs)) {
                allJobs.sort((a, b) => Number(b.id || 0) - Number(a.id || 0));
            }`);
  console.log('✅ Wired newest-first sort to renderJobsTable');
}

// 2. Update action buttons: Amend, Reassign, Cancel, History, and Recall for cancelled/inactive jobs
const oldButtonsPattern = /<button type="button" class="btn-blue"[^>]*onclick="openAmendModal\(\$\{job\.id\}\)"[\s\S]*?<button type="button" class="btn-gray"[^>]*onclick="openTripHistoryModal\(\$\{job\.id\}\)"[^>]*>📜 History<\/button>/;

const newButtons = `<button type="button" class="btn-blue" style="width:auto; padding:2px 6px; font-size:0.75rem; margin:1px;" onclick="openAmendModal(\${job.id})" title="Amend details">✏️ Amend</button>
                        \${isActive ? \`<button type="button" class="btn-purple" style="width:auto; padding:2px 6px; font-size:0.75rem; margin:1px;" onclick="openReassignModal(\${job.id})" title="Reassign Driver">🔄 Reassign</button>\` : ''}
                        \${isActive ? \`<button type="button" class="btn-red" style="width:auto; padding:2px 6px; font-size:0.75rem; margin:1px;" onclick="openCancelModal(\${job.id})" title="Cancel Booking">✕ Cancel</button>\` : ''}
                        \${!isActive ? \`<button type="button" class="btn-green" style="width:auto; padding:2px 6px; font-size:0.75rem; margin:1px; background:#10b981;" onclick="recallJob(\${job.id})" title="Recall / Reactivate Booking">↩️ Recall</button>\` : ''}
                        <button type="button" class="btn-gray" style="width:auto; padding:2px 6px; font-size:0.75rem; margin:1px; background:#475569;" onclick="openTripHistoryModal(\${job.id})" title="Audit Trail">📜 History</button>`;

if (oldButtonsPattern.test(html)) {
  html = html.replace(oldButtonsPattern, newButtons);
  console.log('✅ Updated ledger action buttons with Recall, History, Reassign, Amend, Cancel');
}

// 3. Mount functions to window so inline onclick handlers execute cleanly
const mountCode = `
// Expose modal and ledger actions to window scope
window.openAmendModal = typeof openAmendModal === 'function' ? openAmendModal : function(id){ openAppModal('modalAmendJob'); };
window.openReassignModal = typeof openReassignModal === 'function' ? openReassignModal : function(id){
    const jId = document.getElementById('reassignJobId');
    if (jId) jId.value = id;
    openAppModal('modalReassignJob');
};
window.openCancelModal = typeof openCancelModal === 'function' ? openCancelModal : function(id){
    const jId = document.getElementById('cancelJobId');
    if (jId) jId.value = id;
    openAppModal('modalCancelJob');
};
window.openTripHistoryModal = typeof openTripHistoryModal === 'function' ? openTripHistoryModal : function(id){
    openAppModal('modalTripHistory');
};
window.recallJob = typeof recallJob === 'function' ? recallJob : function(id){
    if (confirm('Reactivate / Recall booking #' + id + '?')) {
        if (typeof socket !== 'undefined') socket.emit('admin_recall_job', { id: id });
    }
};
`;

if (!html.includes('window.openTripHistoryModal =')) {
  const lastScriptIdx = html.lastIndexOf('</script>');
  html = html.slice(0, lastScriptIdx) + '\n' + mountCode + '\n</script>' + html.slice(lastScriptIdx + 9);
  console.log('✅ Mounted modal & button functions to window');
}

fs.writeFileSync('public/admin.html', html);
console.log('✅ public/admin.html updated successfully.');
