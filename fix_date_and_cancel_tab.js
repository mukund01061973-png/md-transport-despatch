const fs = require('fs');
let html = fs.readFileSync('public/admin.html', 'utf8');

// 1. Add the "Cancelled" filter pill tab right after the "Completed" tab
const completedTabMarker = `onclick="filterJobs('completed', this)">Completed</button>`;
const cancelledTabBtn = `onclick="filterJobs('completed', this)">Completed</button>
                    <button class="btn-pill" onclick="filterJobs('cancelled', this)">Cancelled</button>`;

if (html.includes(completedTabMarker) && !html.includes("filterJobs('cancelled'")) {
  html = html.replace(completedTabMarker, cancelledTabBtn);
  console.log('✅ Added Cancelled tab button to Live Ledger');
}

// 2. Ensure date & time formatting in renderJobsTable
// Target the date cell inside renderJobsTable
const oldDateCell = `<td><strong>#\${job.id}</strong><br><span style="font-size:0.75rem; color:#94a3b8;">\${escapeHtml(job.createdAt || '-')}</span></td>`;

const newDateCell = `<td>
                        <strong>#\${job.id}</strong><br>
                        <span style="font-size:0.75rem; color:#94a3b8; white-space:nowrap;" title="\${escapeHtml(job.createdAt || '')}">
                            📅 \${formatDateTime(job.createdAt || job.pickupDateTime)}
                        </span>
                    </td>`;

if (html.includes(oldDateCell)) {
  html = html.replace(oldDateCell, newDateCell);
  console.log('✅ Updated date cell to display formatted Date & Time');
}

// 3. Add formatDateTime helper before renderJobsTable if not present
if (!html.includes('function formatDateTime(')) {
  const helper = `
        function formatDateTime(dtStr) {
            if (!dtStr) return '-';
            try {
                // If it's already "YYYY-MM-DD HH:MM:SS"
                if (typeof dtStr === 'string' && /^\\d{4}-\\d{2}-\\d{2}/.test(dtStr)) {
                    const parts = dtStr.split(/[- :T]/);
                    if (parts.length >= 5) {
                        return \`\${parts[2]}/\${parts[1]}/\${parts[0]} \${parts[3]}:\${parts[4]}\`;
                    }
                }
                const d = new Date(dtStr);
                if (isNaN(d.getTime())) return String(dtStr);
                const day = String(d.getDate()).padStart(2, '0');
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const year = d.getFullYear();
                const hours = String(d.getHours()).padStart(2, '0');
                const mins = String(d.getMinutes()).padStart(2, '0');
                return \`\${day}/\${month}/\${year} \${hours}:\${mins}\`;
            } catch(e) {
                return String(dtStr);
            }
        }
  `;
  const insertTarget = 'function filterJobs(';
  html = html.replace(insertTarget, helper + '\n        ' + insertTarget);
  console.log('✅ Added formatDateTime function');
}

fs.writeFileSync('public/admin.html', html);
console.log('✅ admin.html updated successfully!');
