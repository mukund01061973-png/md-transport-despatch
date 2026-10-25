const fs = require('fs');
let html = fs.readFileSync('public/admin.html', 'utf8');

const globalModalHandlers = `
<script>
// === GLOBAL WINDOW CONTROLLER FOR MODALS & LEDGER BUTTONS ===
window.openAppModal = function(id) {
    const el = document.getElementById(id);
    if (el) {
        el.style.display = 'flex';
    } else {
        console.warn('Modal not found:', id);
    }
};

window.closeAppModal = function(id) {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
};

window.closeOverlayModal = function(event, id) {
    if (event.target && event.target.id === id) {
        window.closeAppModal(id);
    }
};

window.openAmendModal = function(jobId) {
    const job = (typeof allJobs !== 'undefined' && Array.isArray(allJobs) ? allJobs : []).find(j => String(j.id) === String(jobId));
    if (!job) {
        alert('Booking #' + jobId + ' not found.');
        return;
    }
    const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
    setVal('amendJobId', job.id);
    setVal('amendPassenger', job.passenger || '');
    setVal('amendPhone', job.phone || '');
    setVal('amendPickup', job.pickup || '');
    setVal('amendDropoff', job.dropoff || '');
    setVal('amendFare', job.fare || 0);
    setVal('amendVehClass', job.vehicleClass || 'ANY');
    setVal('amendNotes', job.notes || '');

    const viasCont = document.getElementById('amendViasContainer');
    if (viasCont) {
        viasCont.innerHTML = '';
        if (job.vias) {
            try {
                const parsed = typeof job.vias === 'string' && job.vias.startsWith('[') ? JSON.parse(job.vias) : [job.vias];
                parsed.forEach(v => { if (v && typeof addAmendViaField === 'function') addAmendViaField(v); });
            } catch(e) {}
        }
    }
    window.openAppModal('modalAmendJob');
};

window.openReassignModal = function(jobId) {
    const el = document.getElementById('reassignJobId');
    if (el) el.value = jobId;
    window.openAppModal('modalReassignJob');
};

window.openCancelModal = function(jobId) {
    const el = document.getElementById('cancelJobId');
    if (el) el.value = jobId;
    window.openAppModal('modalCancelJob');
};

window.openTripHistoryModal = function(jobId) {
    if (typeof socket !== 'undefined') {
        socket.emit('admin_get_booking_audit', { jobId: jobId });
    }
    window.openAppModal('modalTripHistory');
};

window.recallJob = function(jobId) {
    if (confirm('Reactivate / Recall booking #' + jobId + '?')) {
        if (typeof socket !== 'undefined') {
            socket.emit('admin_recall_job', { id: jobId });
        }
    }
};
</script>
`;

// Remove duplicate previous injections if any
html = html.replace(/\/\/ === GLOBAL WINDOW CONTROLLER FOR MODALS & LEDGER BUTTONS ===[\s\S]*?<\/script>/, '');

// Place it right before </head> so it is universally available before the DOM runs
const headCloseIdx = html.indexOf('</head>');
if (headCloseIdx !== -1) {
  html = html.slice(0, headCloseIdx) + globalModalHandlers + '\n' + html.slice(headCloseIdx);
  fs.writeFileSync('public/admin.html', html);
  console.log('✅ Global action handlers injected into <head> of public/admin.html');
} else {
  console.log('❌ </head> tag not found');
}
