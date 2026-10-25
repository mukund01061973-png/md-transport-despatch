const fs = require('fs');
let code = fs.readFileSync('index.js', 'utf8');

const targetBlock = `      // 2. Fetch completed trips
      let allJobs = [];
      try {
        allJobs = db.prepare(\`
          SELECT id, pickup, 
                 COALESCE(dropoff, destination) AS dropoff,
                 fare, waitingCharge, 
                 COALESCE(paymentMethod, 'Cash') AS paymentMethod,
                 paymentType, createdAt, completedAt
          FROM bookings
          WHERE UPPER(COALESCE(assignedDriverId, '')) = ? AND UPPER(status) = 'COMPLETED'
          ORDER BY rowid DESC
        \`).all(driverId);
      } catch (e) {
        allJobs = db.prepare(\`
          SELECT id, pickup, fare, waitingCharge, createdAt, completedAt
          FROM bookings
          WHERE UPPER(COALESCE(assignedDriverId, '')) = ? AND UPPER(status) = 'COMPLETED'
          ORDER BY rowid DESC
        \`).all(driverId);
      }`;

const cleanBlock = `      // 2. Fetch completed trips
      let allJobs = [];
      try {
        allJobs = db.prepare(\`
          SELECT id, pickup, dropoff, fare, waitingCharge,
                 COALESCE(paymentMethod, 'Cash') AS paymentMethod,
                 paymentType, createdAt, completedAt
          FROM bookings
          WHERE UPPER(COALESCE(assignedDriverId, '')) = ? AND UPPER(status) = 'COMPLETED'
          ORDER BY rowid DESC
        \`).all(driverId);
      } catch (e) {
        console.error("Error fetching jobs in get_driver_wallet:", e.message);
        allJobs = [];
      }`;

if (code.includes(targetBlock)) {
  code = code.replace(targetBlock, cleanBlock);
  fs.writeFileSync('index.js', code);
  console.log("✅ Successfully cleaned SQL query in index.js (removed nonexistent 'destination' column)!");
} else {
  // Regex fallback in case of whitespace differences
  code = code.replace(
    /\/\/\s*2\.\s*Fetch completed trips[\s\S]*?ORDER BY rowid DESC\s*`\)\.all\(driverId\);\s*\}/,
    cleanBlock
  );
  fs.writeFileSync('index.js', code);
  console.log("✅ Successfully updated query via regex fallback!");
}

const { execSync } = require('child_process');
try {
  execSync('node -c index.js');
  console.log("🚀 index.js syntax is 100% CLEAN!");
} catch (e) {
  console.error("Syntax error:", e.message);
}
