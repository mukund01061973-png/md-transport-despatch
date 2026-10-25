const fs = require('fs');
let html = fs.readFileSync('public/driver.html', 'utf8');

// Replace any call to requestDriverWalletRefresh with requestWalletUpdate
html = html.replace(/requestDriverWalletRefresh\(\);/g, 'requestWalletUpdate();');

// Also define an alias fallback just in case
if (!html.includes('function requestDriverWalletRefresh')) {
  const insertHook = 'function requestWalletUpdate() {';
  const idx = html.indexOf(insertHook);
  if (idx !== -1) {
    html = html.slice(0, idx) + 'function requestDriverWalletRefresh() { requestWalletUpdate(); }\n        ' + html.slice(idx);
  }
}

fs.writeFileSync('public/driver.html', html);
console.log('✅ Fixed driver app Arrived crash!');
