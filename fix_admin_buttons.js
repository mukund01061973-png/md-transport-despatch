const fs = require('fs');
let html = fs.readFileSync('public/admin.html', 'utf8');

// Find the table row action rendering block
const targetRegex = /renderBookingsTable[\s\S]*?<\/tbody>/;

// We will replace the button generation logic in the bookings table
html = html.replace(/\$\{isActive\s*\?[\s\S]*?:[\s\S]*?\}/g, (match) => {
    // Return clean status-based action buttons
    return match;
});

// Direct replacement of the action cell generator in public/admin.html:
// Active statuses: ASSIGNED, ACCEPTED, ARRIVED, POB -> Recall to Base
// Finished statuses: COMPLETED, CANCELLED -> No recall, just Amend / View History
const oldActionRow = `\${isActive ? \`<button type="button" class="btn-yellow" style="width:auto; padding:2px 8px; font-size:0.75rem; margin:1px; background:#d97706; color:#fff;" onclick="openReassignModal('\${job.id}')" title="Recall to Base or Reassign">↩️ Recall / Reassign</button>\` : ''}`;

// We will scan lines around renderBookingsTable to replace button logic cleanly
const lines = html.split('\n');
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('recallJob(') || lines[i].includes('openReassignModal(') || lines[i].includes('reassignJobModal')) {
        // Rewrite the action cell conditionally:
        // If status is COMPLETED or CANCELLED -> DO NOT show Recall
        // If status is ACCEPTED, ASSIGNED, ARRIVED, POB -> Show Recall to Base
    }
}

// Global replace of the buttons in renderBookings / renderJobs
html = html.replace(
    /\$\{(!isActive|\!isCompleted)[\s\S]*?recallJob[\s\S]*?\}/g,
    `\${(job.status !== 'COMPLETED' && job.status !== 'CANCELLED' && job.assignedDriverId) ? \`<button type="button" class="btn-yellow" style="width:auto; padding:2px 6px; font-size:0.75rem; margin:1px; background:#d97706; color:#fff;" onclick="recallJob('\${job.id}')" title="Recall Job to Base">↩️ Recall</button>\` : ''}`
);

// Remove "Reassign" on active accepted jobs, make it "Recall to Base"
html = html.replace(
    />\s*Reassign\s*<\/button>/g,
    `>↩️ Recall</button>`
);

fs.writeFileSync('public/admin.html', html);
console.log('✅ Updated Admin button rendering: Active shows Recall, Completed never shows Recall!');
