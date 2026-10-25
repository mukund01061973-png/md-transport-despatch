const fs = require('fs');
let code = fs.readFileSync('index.js', 'utf8');

// 1. Fix literal string in booking confirmation SMS
code = code.replace(
  'Live Tracking: " + (process.env.APP_BASE_URL || "http://localhost:3000") + "/track.html?jobId=',
  'Live Tracking: ${process.env.APP_BASE_URL || "http://localhost:3000"}/track.html?jobId='
);

// 2. Fix driver arrival phrasing and name lookup
const oldDriverBlock = `          // Fetch assigned driver and vehicle specs
          let driverDetails = "Your driver";
          let carDetails = "";
          const dId = curJob.assignedDriverId || driverId;`;

const newDriverBlock = `          // Fetch assigned driver and vehicle specs
          const dId = curJob.assignedDriverId || driverId;
          let driverDetails = "Mukund Desai";
          let carDetails = "";`;

if (code.includes(oldDriverBlock)) {
  code = code.replace(oldDriverBlock, newDriverBlock);
}

// 3. Clean up the "Driver Your driver" phrasing
code = code.replace('MD Taxi: Driver ${driverDetails}', 'MD Taxi: Driver${driverDetails}');
code = code.replace('Driver Your driver', 'Your driver');

fs.writeFileSync('index.js', code);
console.log('✅ SMS strings and driver display name cleaned up!');
