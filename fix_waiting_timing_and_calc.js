const fs = require('fs');
let html = fs.readFileSync('public/driver.html', 'utf8');

// Replace Math.ceil with Math.floor across waiting charge calculations
// 1. Arrival timer loop
html = html.replace(
  /const billedMins = Math\.ceil\(waitChargeSeconds \/ 60\);/g,
  "const billedMins = Math.floor(waitChargeSeconds / 60);"
);

// 2. En-route stopover timer loop
html = html.replace(
  /const billedMins = Math\.ceil\(enRouteSeconds \/ 60\);/g,
  "const billedMins = Math.floor(enRouteSeconds / 60);"
);

// 3. syncFeeToServer callers
html = html.replace(
  /Math\.ceil\(waitChargeSeconds \/ 60\)/g,
  "Math.floor(waitChargeSeconds / 60)"
);
html = html.replace(
  /Math\.ceil\(enRouteSeconds \/ 60\)/g,
  "Math.floor(enRouteSeconds / 60)"
);

fs.writeFileSync('public/driver.html', html);
console.log('✅ Waiting timers now charge only after a full 60 seconds completes!');
