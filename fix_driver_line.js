const fs = require('fs');
let html = fs.readFileSync('public/admin.html', 'utf8');

// Replace the broken line with a clean template string
const target = `'<td><button class="btn-sm" onclick="openEditDriverModal(\'" + escapeHtml(d.driverId) + "\')">✏️ Edit</button></td>';`;
const clean = `\`<td><button class="btn-sm" onclick="openEditDriverModal('\${escapeHtml(d.driverId)}')">✏️ Edit</button></td>\`;`;

if (html.includes(target)) {
  html = html.replace(target, clean);
} else {
  // Regex catch-all for any variant of that line
  html = html.replace(
    /.*openEditDriverModal.*✏️ Edit.*/g,
    `        \`<td><button class="btn-sm" onclick="openEditDriverModal('\${escapeHtml(d.driverId)}')">✏️ Edit</button></td>\`;`
  );
}

fs.writeFileSync('public/admin.html', html);
console.log('✅ Line 167 patched cleanly!');
