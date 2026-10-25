const fs = require('fs');
let html = fs.readFileSync('public/admin.html', 'utf8');

// 1. Add 🛑 Cancelled button to the Live Ledger filter pills
const oldPills = `<button type="button" class="btn-pill" onclick="filterJobs('completed', this)">✅ Completed</button>`;
const newPills = `<button type="button" class="btn-pill" onclick="filterJobs('completed', this)">✅ Completed</button>
                            <button type="button" class="btn-pill" onclick="filterJobs('cancelled', this)">🛑 Cancelled</button>`;

if (html.includes(oldPills) && !html.includes("filterJobs('cancelled'")) {
  html = html.replace(oldPills, newPills);
  console.log('✅ Injected 🛑 Cancelled filter pill button!');
}

// 2. Fix descending sort so alphanumeric IDs like WEB-9618, JOB-8512 sort newest-first
const oldSortBlock = `if (Array.isArray(allJobs)) {
                // Strictly enforce newest-first (descending by job ID)
                allJobs.sort((a, b) => Number(b.id || 0) - Number(a.id || 0));
            }`;

const newSortBlock = `if (Array.isArray(allJobs)) {
                // Strictly enforce newest-first: extract numeric portion, fallback to string compare
                allJobs.sort((a, b) => {
                    const numA = parseInt(String(a.id || '').replace(/\\D/g, ''), 10);
                    const numB = parseInt(String(b.id || '').replace(/\\D/g, ''), 10);
                    if (!isNaN(numA) && !isNaN(numB) && numA !== numB) {
                        return numB - numA; // Highest/newest number at top
                    }
                    // If no numbers or identical numbers, compare created timestamp or string ID
                    if (a.createdAt && b.createdAt) {
                        return new Date(b.createdAt) - new Date(a.createdAt);
                    }
                    return String(b.id || '').localeCompare(String(a.id || ''), undefined, { numeric: true });
                });
            }`;

if (html.includes(oldSortBlock)) {
  html = html.replace(oldSortBlock, newSortBlock);
  console.log('✅ Upgraded sort logic to handle alphanumeric IDs (WEB-9618, JOB-8512) descending!');
} else {
  // Line-replace fallback
  html = html.replace(
    /allJobs\.sort\(\(a,\s*b\)\s*=>\s*Number\(b\.id[^)]*\)\s*-\s*Number\(a\.id[^)]*\)\);/g,
    `allJobs.sort((a, b) => {
                    const numA = parseInt(String(a.id || '').replace(/\\D/g, ''), 10);
                    const numB = parseInt(String(b.id || '').replace(/\\D/g, ''), 10);
                    if (!isNaN(numA) && !isNaN(numB) && numA !== numB) return numB - numA;
                    if (a.createdAt && b.createdAt) return new Date(b.createdAt) - new Date(a.createdAt);
                    return String(b.id || '').localeCompare(String(a.id || ''), undefined, { numeric: true });
                });`
  );
  console.log('✅ Applied regex upgrade for alphanumeric job sorting');
}

fs.writeFileSync('public/admin.html', html);
console.log('✅ admin.html updated!');
