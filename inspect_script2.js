const fs = require('fs');
const html = fs.readFileSync('public/admin.html', 'utf8');
const scriptRegex = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
let match, count = 0;
while ((match = scriptRegex.exec(html)) !== null) {
  count++;
  console.log(`\n=== SCRIPT TAG #${count} (Length: ${match[1].length} chars) ===`);
  console.log(match[1].slice(0, 300));
}
