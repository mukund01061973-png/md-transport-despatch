const fs = require('fs');
let html = fs.readFileSync('public/driver.html', 'utf8');

// Replace the hard crashes with null-safe checks
const oldLabelsBlock = `document.getElementById('lblWaitRate').textContent = '£' + masterTariff.waitingRatePerMin.toFixed(2);
            document.getElementById('lblStopFee').textContent = '£' + masterTariff.viaStopFee.toFixed(2);
            document.getElementById('lblPobStopFee').textContent = '£' + masterTariff.viaStopFee.toFixed(2);`;

const safeLabelsBlock = `const elWait = document.getElementById('lblWaitRate'); if (elWait) elWait.textContent = '£' + masterTariff.waitingRatePerMin.toFixed(2);
            const elStop = document.getElementById('lblStopFee'); if (elStop) elStop.textContent = '£' + masterTariff.viaStopFee.toFixed(2);
            const elPobStop = document.getElementById('lblPobStopFee'); if (elPobStop) elPobStop.textContent = '£' + masterTariff.viaStopFee.toFixed(2);`;

if (html.includes(oldLabelsBlock)) {
  html = html.replace(oldLabelsBlock, safeLabelsBlock);
  fs.writeFileSync('public/driver.html', html);
  console.log('✅ Safely patched login_result handler!');
} else {
  // Regex fallback in case formatting differs slightly
  html = html.replace(/document\.getElementById\('lblWaitRate'\)\.textContent\s*=[^;]+;/g, "/* safe */");
  html = html.replace(/document\.getElementById\('lblStopFee'\)\.textContent\s*=[^;]+;/g, "/* safe */");
  html = html.replace(/document\.getElementById\('lblPobStopFee'\)\.textContent\s*=[^;]+;/g, "/* safe */");
  fs.writeFileSync('public/driver.html', html);
  console.log('✅ Fallback patch applied safely!');
}
