const fs = require('fs');
const html = fs.readFileSync('public/admin.html', 'utf8');

console.log("=== 1. WHERE IS 'update_accounts' HANDLED? ===");
const idx = html.indexOf("socket.on('update_accounts'");
if (idx !== -1) {
  console.log(html.substring(idx, idx + 450));
} else {
  console.log("No explicit socket.on('update_accounts') found");
}

console.log("\n=== 2. ACCOUNT MODAL / TABLE INPUTS ===");
const matches = [...html.matchAll(/<input[^>]+id=["']([^"']*(?:acc|corp|discount|surcharge)[^"']*)["'][^>]*>/gi)];
matches.forEach(m => console.log(m[0]));
