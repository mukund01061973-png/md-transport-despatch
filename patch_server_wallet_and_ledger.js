const fs = require('fs');
let code = fs.readFileSync('index.js', 'utf8');

// 1. Add driver wallet & earnings query endpoint to socket handlers
const walletHandler = `
  // ================= DRIVER WALLET & EARNINGS ENGINE =================
  socket.on('get_driver_wallet', (data) => {
    try {
      const driverId = (data && data.driverId) ? String(data.driverId).trim().toUpperCase() : null;
      if (!driverId) return;

      // Fetch all completed bookings for this driver
      const completedRuns = db.prepare(\`
        SELECT id, fare, waitingCharge, pickup, destination, completedAt, createdAt
        FROM bookings 
        WHERE UPPER(assignedDriverId) = ? AND UPPER(status) = 'COMPLETED'
        ORDER BY id DESC
      \`).all(driverId);

      // Fetch driver commission rate
      const driverInfo = db.prepare('SELECT customCommissionPct FROM drivers WHERE UPPER(driverId) = ?').get(driverId);
      const commRate = driverInfo ? (parseFloat(driverInfo.customCommissionPct) || 20.0) : 20.0;

      let grossFareTotal = 0;
      let totalWaitingTotal = 0;

      completedRuns.forEach(r => {
        const fare = parseFloat(r.fare || 0);
        const wait = parseFloat(r.waitingCharge || 0);
        grossFareTotal += fare;
        totalWaitingTotal += wait;
      });

      const commissionDue = (grossFareTotal * (commRate / 100));
      const netDriverEarnings = grossFareTotal - commissionDue;

      socket.emit('driver_wallet_data', {
        driverId: driverId,
        completedCount: completedRuns.length,
        grossTotal: grossFareTotal.toFixed(2),
        waitingTotal: totalWaitingTotal.toFixed(2),
        commissionRate: commRate,
        commissionDue: commissionDue.toFixed(2),
        netEarnings: netDriverEarnings.toFixed(2),
        recentRuns: completedRuns.slice(0, 10)
      });
    } catch(err) {
      console.error('Error calculating driver wallet:', err.message);
    }
  });
`;

if (!code.includes("socket.on('get_driver_wallet'")) {
  const hook = "socket.on('update_trip_status'";
  const idx = code.indexOf(hook);
  if (idx !== -1) {
    code = code.slice(0, idx) + walletHandler + '\n  ' + code.slice(idx);
    console.log("✅ Added socket.on('get_driver_wallet') engine to index.js!");
  }
}

// 2. Ensure update_trip_status commits the final fare and waiting charge into the completed row
const oldUpdateTrip = "db.prepare(`UPDATE bookings SET status = ?, fare = COALESCE(?, fare) ${col} WHERE id = ?`).run(stUpper, fare, jobId);";
const solidUpdateTrip = "db.prepare(`UPDATE bookings SET status = ?, fare = COALESCE(?, fare) ${col} WHERE id = ?`).run(stUpper, fare, jobId);\n      broadcastAdminState();";

if (code.includes(oldUpdateTrip)) {
  code = code.replace(oldUpdateTrip, solidUpdateTrip);
}

fs.writeFileSync('index.js', code);
console.log('✅ index.js updated with driver earnings & real-time broadcast!');
