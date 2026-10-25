const fs = require('fs');
let code = fs.readFileSync('index.js', 'utf8');

// Replace or install the get_driver_wallet handler matching driver.html lines 682-706
const exactWalletEngine = `
  // ================= DRIVER WALLET & EARNINGS ENGINE =================
  socket.on('get_driver_wallet', (data) => {
    try {
      const driverId = (data && data.driverId) ? String(data.driverId).trim().toUpperCase() : '';
      if (!driverId) return;

      // 1. Fetch completed trips for this driver
      let jobs = [];
      try {
        jobs = db.prepare(\`
          SELECT id, pickup, 
                 COALESCE(dropoff, destination) AS dropoff,
                 fare, waitingCharge, 
                 COALESCE(paymentMethod, 'Cash') AS paymentMethod,
                 createdAt, completedAt
          FROM bookings
          WHERE UPPER(COALESCE(assignedDriverId, '')) = ? AND UPPER(status) = 'COMPLETED'
          ORDER BY id DESC
        \`).all(driverId);
      } catch (e) {
        jobs = db.prepare(\`
          SELECT id, pickup, fare, waitingCharge, createdAt, completedAt
          FROM bookings
          WHERE UPPER(COALESCE(assignedDriverId, '')) = ? AND UPPER(status) = 'COMPLETED'
          ORDER BY id DESC
        \`).all(driverId);
      }

      // 2. Fetch driver custom commission percentage or fallback to 20%
      let commPct = 20.0;
      try {
        const dRow = db.prepare('SELECT customCommissionPct FROM drivers WHERE UPPER(driverId) = ?').get(driverId);
        if (dRow && dRow.customCommissionPct !== null && dRow.customCommissionPct !== undefined) {
          commPct = parseFloat(dRow.customCommissionPct) || 20.0;
        }
      } catch (e) {}

      // 3. Compute running gross totals
      let grossTotal = 0;
      let cashTotal = 0;
      let cardTotal = 0;

      jobs.forEach(j => {
        const fareVal = parseFloat(j.fare || 0);
        grossTotal += fareVal;
        const method = String(j.paymentMethod || 'Cash').toLowerCase();
        if (method.includes('card') || method.includes('prepaid') || method.includes('account')) {
          cardTotal += fareVal;
        } else {
          cashTotal += fareVal;
        }
      });

      const commission = grossTotal * (commPct / 100);
      const netPay = grossTotal - commission;

      // 4. Emit exact matching schema with success: true
      socket.emit('driver_wallet_data', {
        success: true,
        driverId: driverId,
        gross: grossTotal.toFixed(2),
        totalJobs: jobs.length,
        cashTotal: cashTotal.toFixed(2),
        cardTotal: cardTotal.toFixed(2),
        commission: commission.toFixed(2),
        commPct: commPct,
        netPay: netPay.toFixed(2),
        jobs: jobs.map(j => ({
          pickup: j.pickup || 'Pickup',
          dropoff: j.dropoff || 'Dropoff',
          createdAt: j.completedAt || j.createdAt || '',
          paymentMethod: j.paymentMethod || 'Cash',
          fare: parseFloat(j.fare || 0).toFixed(2)
        }))
      });
      console.log(\`💰 [WALLET] Dispatched earnings for driver \${driverId}: Gross=£\${grossTotal.toFixed(2)}, Net=£\${netPay.toFixed(2)}, Jobs=\${jobs.length}\`);
    } catch(err) {
      console.error('❌ Error processing get_driver_wallet:', err.message);
    }
  });
`;

// Replace previous get_driver_wallet handler cleanly
const regexExistingWallet = /\/\/\s*={10,}\s*DRIVER WALLET & EARNINGS ENGINE[\s\S]*?socket\.emit\('driver_wallet_data'[\s\S]*?\n\s*\}\);\s*\}\);/;
if (regexExistingWallet.test(code)) {
  code = code.replace(regexExistingWallet, exactWalletEngine.trim());
  console.log("✅ Replaced existing get_driver_wallet with the exact contract schema!");
} else {
  const insertPt = code.indexOf("socket.on('update_trip_status'");
  if (insertPt !== -1) {
    code = code.slice(0, insertPt) + exactWalletEngine + '\n\n  ' + code.slice(insertPt);
    console.log("✅ Inserted new exact get_driver_wallet handler into index.js!");
  }
}

// Ensure driver_update_waiting commits fare and broadcasts to admin immediately
const syncHook = "socket.on('driver_update_waiting', (data) => {";
const oldSyncBodyRegex = /socket\.on\('driver_update_waiting'[\s\S]*?appendAudit\(jobId,\s*'WAITING_SYNC'[\s\S]*?broadcastAdminState\(\);[\s\S]*?\}\);/;

const solidSyncBody = `socket.on('driver_update_waiting', (data) => {
    try {
      const { jobId, arrivalWaitMins, enRouteWaitMins, waitingCharge, totalFare } = data;
      if (!jobId) return;

      db.prepare(\`
        UPDATE bookings SET
          arrivalWaitMins = COALESCE(?, arrivalWaitMins),
          enRouteWaitMins = COALESCE(?, enRouteWaitMins),
          waitingCharge = COALESCE(?, waitingCharge),
          fare = COALESCE(?, fare)
        WHERE id = ?
      \`).run(
        arrivalWaitMins !== undefined ? arrivalWaitMins : null,
        enRouteWaitMins !== undefined ? enRouteWaitMins : null,
        waitingCharge !== undefined ? waitingCharge : null,
        totalFare !== undefined ? totalFare : null,
        jobId
      );

      // Instantly broadcast to admin ledger
      broadcastAdminState();
    } catch(err) {
      console.error('Error in driver_update_waiting:', err.message);
    }
  });`;

if (code.includes(syncHook)) {
  code = code.replace(oldSyncBodyRegex, solidSyncBody);
}

fs.writeFileSync('index.js', code);
console.log('✅ index.js successfully patched!');
