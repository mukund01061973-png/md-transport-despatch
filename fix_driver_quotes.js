const fs = require('fs');
let html = fs.readFileSync('public/admin.html', 'utf8');

// Fix collapsed quotes in renderDriversTable
html = html.replace(
  /onclick="openEditDriverModal\(''\s*\+\s*escapeHtml\(d\.driverId\)\s*\+\s*''\)"/g,
  `onclick="openEditDriverModal('\${d.driverId}')"`
);
html = html.replace(
  /onclick="deleteDriver\(''\s*\+\s*escapeHtml\(d\.driverId\)\s*\+\s*''\)"/g,
  `onclick="deleteDriver('\${d.driverId}')"`
);

// Fallback direct string replacement for lines 254-255
html = html.replace(
  /<button class="btn-sm" onclick="openEditDriverModal\('' \+ escapeHtml\(d\.driverId\) \+ ''\)">✏️ Edit<\/button>/g,
  `<button class="btn-sm" onclick="openEditDriverModal('\${d.driverId}')">✏️️ Edit</button>`
);
html = html.replace(
  /<button class="btn-sm btn-red" onclick="deleteDriver\('' \+ escapeHtml\(d\.driverId\) \+ ''\)">🗑️<\/button>/g,
  `<button class="btn-sm btn-red" onclick="deleteDriver('\${d.driverId}')">🗑️</button>`
);

// Also fix corporate account buttons if collapsed
html = html.replace(
  /onclick="openEditAccountModal\(''\s*\+\s*escapeHtml\(num\)\s*\+\s*''\)"/g,
  `onclick="openEditAccountModal('\${num}')"`
);
html = html.replace(
  /onclick="deleteAccount\(''\s*\+\s*escapeHtml\(num\)\s*\+\s*''\)"/g,
  `onclick="deleteAccount('\${num}')"`
);

fs.writeFileSync('public/admin.html', html);
console.log('✅ Button quote handling repaired cleanly!');
