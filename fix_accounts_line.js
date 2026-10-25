const fs = require('fs');
let html = fs.readFileSync('public/admin.html', 'utf8');

// Fix the single-quoted ${num} string concatenation in accounts table
html = html.replace(
  /'<button class="btn-sm" onclick="openEditAccountModal\(\x27\$\{num\}\x27\)">✏️ Edit<\/button> '\s*\+\s*'<button class="btn-sm btn-red" onclick="deleteAccount\(\x27\$\{num\}\x27\)">🗑️<\/button>'/g,
  `'<button class="btn-sm" data-action="edit-account" data-id="' + escapeHtml(num) + '">✏️ Edit</button> ' + '<button class="btn-sm btn-red" data-action="delete-account" data-id="' + escapeHtml(num) + '">🗑️</button>'`
);

// Fallback direct line replacements if spaced differently
html = html.replace(
  /onclick="openEditAccountModal\('\$\{num\}'\)"/g,
  `data-action="edit-account" data-id="' + escapeHtml(num) + '"`
);
html = html.replace(
  /onclick="deleteAccount\('\$\{num\}'\)"/g,
  `data-action="delete-account" data-id="' + escapeHtml(num) + '"`
);

fs.writeFileSync('public/admin.html', html);
console.log('✅ Repaired accounts table action buttons!');
