const fs = require('fs');
let code = fs.readFileSync('index.js', 'utf8');

const targetRegex = /socket\.on\(\s*['"]get_driver_wallet['"][\s\S]*?socket\.emit\(\s*['"]driver_wallet_data['"][\s\S]*?\}\);\s*console\.log\([^)]*WALLET\] Dispatched[^)]*\);\s*\}\s*catch\s*\(err\)\s*\{[\s\S]*?\}\s*\}\);/;

const cleanWalletHandler = `socket.on('get_driver_wallet', (data) => {
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
          ORDER BY rowid DESC
        \`).all(driverId);
      } catch (e) {
        jobs = db.prepare(\`
          SELECT id, pickup, fare, waitingCharge, createdAt, completedAt
          FROM bookings
          WHERE UPPER(COALESCE(assignedDriverId, '')) = ? AND UPPER(status) = 'COMPLETED'
          ORDER BY rowid DESC
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
      const settlement = netPay - cashTotal;
      const settlementType = settlement >= 0 ? 'OFFICE_OWES_DRIVER' : 'DRIVER_OWES_OFFICE';

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
        settlement: Math.abs(settlement).toFixed(2),
        settlementRaw: settlement,
        settlementType: settlementType,
        jobs: jobs.map(j => ({
          id: j.id,
          pickup: j.pickup,
          dropoff: j.dropoff || 'Local Drop',
          fare: parseFloat(j.fare || 0).toFixed(2),
          paymentMethod: j.paymentMethod || 'Cash',
          completedAt: j.completedAt || j.createdAt || ''
        }))
      });

      console.log(\`💰 [WALLET] Driver \${driverId}: Gross=£\${grossTotal.toFixed(2)}, Cash=£\${cashTotal.toFixed(2)}, Card=£\${cardTotal.toFixed(2)}, Net=£\${netPay.toFixed(2)}, Settlement=\${settlementType} (£\${Math.abs(settlement).toFixed(2)})\`);
    } catch(err) {
      console.error('❌ Error processing get_driver_wallet:', err.message);
    }
  });`;

if (targetRegex.test(code)) {
  code = code.replace(targetRegex, cleanWalletHandler);
  fs.writeFileSync('index.js', code);
  console.log("✅ Patched get_driver_wallet in index.js");
} else {
  console.log("Regex did not match directly, checking index of get_driver_wallet");
  const idx = code.indexOf("socket.on('get_driver_wallet'");
  if (idx !== -1) {
    const endIdx = code.indexOf("console.log(`💰 [WALLET]", idx);
    const closeIdx = code.indexOf("});", endIdx);
    code = code.substring(0, idx) + cleanWalletHandler + code.substring(closeIdx + 3);
    fs.writeFileSync('index.js', code);
    console.log("✅ Patched get_driver_wallet by slice index");
  }
}

const { execSync } = require('child_process');
try {
  execSync('node -c index.js');
  console.log("🚀 index.js syntax is 100% CLEAN!");
} catch (e) {
  console.error("Syntax error:", e.message);
}
