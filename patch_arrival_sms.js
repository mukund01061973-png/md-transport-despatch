const fs = require('fs');
let code = fs.readFileSync('index.js', 'utf8');

// Look for arrival SMS template
const oldSms1 = 'DriverMukund';
if (code.includes(oldSms1)) {
  code = code.replace(/DriverMukund/g, 'Driver Mukund');
  console.log("✅ Fixed missing space in Driver name for SMS!");
}

// Ensure the driver name comes from the booking's assigned driver or driver table
const oldArrivalSmsSearch = `Driver\${driverName || 'Our driver'}`;
// replace any static "DriverMukund Desai"
code = code.replace(/DriverMukund Desai/g, `Driver \${driverName || 'MD Taxi'}`);

fs.writeFileSync('index.js', code);
console.log("🚀 index.js SMS updated!");
