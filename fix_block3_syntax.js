const fs = require('fs');
let html = fs.readFileSync('public/book.html', 'utf8');

// 1. Remove duplicate async keywords
html = html.replace(/\basync\s+async\b/g, 'async');
html = html.replace(/\bfunction\s+async\b/g, 'async function');

// 2. Ensure syncLiveTariff is clean
html = html.replace(/async\s+async\s+function\s+syncLiveTariff/g, 'async function syncLiveTariff');
html = html.replace(/async\s+function\s+async\s+function\s+syncLiveTariff/g, 'async function syncLiveTariff');

fs.writeFileSync('public/book.html', html);
console.log('✅ Applied block 3 syntax cleanup');
