const fs = require('fs');
const html = fs.readFileSync('public/admin.html', 'utf8');

console.log("=== 1. SOCKET LISTENERS IN admin.html ===");
const socketEvents = [...html.matchAll(/socket\.on\(\s*['"]([^'"]+)['"]/g)].map(m => m[1]);
console.log("Registered socket listeners:", [...new Set(socketEvents)]);

console.log("\n=== 2. JOBS / BOOKINGS RENDER FUNCTION ===");
const jIdx = html.indexOf('function renderJobsTable');
const jIdx2 = html.indexOf('function renderLedger');
const jIdx3 = html.indexOf('function renderJobs');
console.log("renderJobsTable exists?", jIdx !== -1);
console.log("renderLedger exists?", jIdx2 !== -1);
console.log("renderJobs exists?", jIdx3 !== -1);

console.log("\n=== 3. CORPORATE ACCOUNT DROPDOWN / RENDER ===");
const cIdx = html.indexOf('populateAllAccountDropdowns');
console.log("populateAllAccountDropdowns exists?", cIdx !== -1);
if (cIdx !== -1) {
  console.log(html.substring(cIdx, cIdx + 400));
}

console.log("\n=== 4. DRIVER CIRCUIT / SETTLEMENT SHEET CHECKS ===");
const dSettlement = html.includes('driverSettlement') || html.includes('settlementSheet') || html.includes('circuitFee') || html.includes('driverRent');
console.log("Settlement / Rent functions in admin.html?", dSettlement);
