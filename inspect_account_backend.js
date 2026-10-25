const fs = require('fs');
const index = fs.readFileSync('index.js', 'utf8');

console.log("=== SERVER CORPORATE ACCOUNTS SOCKET HANDLERS ===");
index.split('\n').forEach((line, idx) => {
  if (line.includes('admin_add_account') || line.includes('admin_edit_account') || line.includes('corporate_accounts') || line.includes('update_accounts')) {
    console.log(`Line ${idx + 1}: ${line.trim()}`);
  }
});
