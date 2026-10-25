const fs = require('fs');
const html = fs.readFileSync('public/admin.html', 'utf8');
const scriptRegex = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
let match, count = 0;
while ((match = scriptRegex.exec(html)) !== null) {
  count++;
  if (!match[0].includes('src=')) {
    console.log(`=== INLINE SCRIPT #${count} TOP 30 LINES ===`);
    const lines = match[1].split('\n');
    lines.slice(0, 30).forEach((l, i) => console.log(`${i+1}: ${l}`));
    break;
  }
}
