const fs = require('fs');
let code = fs.readFileSync('index.js', 'utf8');

const updatedSocketHandler = `socket.on('get_driver_wallet', (data) => {
    try {
      const driverId = (data && data.driverId) ? String(data.driverId).trim().toUpperCase() : '';
      if (!driverId) return;

      // 1. Fetch driver details (name and commission)
      let commPct = 20.0;
      let driverName = driverId;
      try {
        const dRow = db.prepare('SELECT name, customCommissionPct FROM drivers WHERE UPPER(driverId) = ?').get(driverId);
        if (dRow) {
          if (dRow.name) driverName = dRow.name;
          if (dRow.customCommissionPct !== null && dRow.customCommissionPct !== undefined) {
            commPct = parseFloat(dRow.customCommissionPct) || 20.0;
          }
        }
      } catch (e) {}

      // 2. Fetch completed trips
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
      }

      // 3. Date Range Filtering
      const period = (data && data.period) ? data.period : 'ALL';
      let startDate = (data && data.startDate) ? data.startDate : null;
      let endDate = (data && data.endDate) ? data.endDate : null;
      let periodLabel = 'All Time to Date';

      const now = new Date();

      if (period === 'THIS_WEEK') {
        const day = now.getDay(); // 0 is Sunday
        const diffToMon = (day === 0 ? -6 : 1) - day;
        const monday = new Date(now);
        monday.setDate(now.getDate() + diffToMon);
        monday.setHours(0, 0, 0, 0);

        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        sunday.setHours(23, 59, 59, 999);

        startDate = monday.toISOString();
        endDate = sunday.toISOString();
        periodLabel = monday.toLocaleDateString('en-GB') + ' - ' + sunday.toLocaleDateString('en-GB');
      } else if (period === 'LAST_WEEK') {
        const day = now.getDay();
        const diffToMon = (day === 0 ? -6 : 1) - day - 7;
        const monday = new Date(now);
        monday.setDate(now.getDate() + diffToMon);
        monday.setHours(0, 0, 0, 0);

        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        sunday.setHours(23, 59, 59, 999);

        startDate = monday.toISOString();
        endDate = sunday.toISOString();
        periodLabel = monday.toLocaleDateString('en-GB') + ' - ' + sunday.toLocaleDateString('en-GB');
      } else if (startDate && endDate) {
        periodLabel = new Date(startDate).toLocaleDateString('en-GB') + ' - ' + new Date(endDate).toLocaleDateString('en-GB');
      }

      let filteredJobs = allJobs;
      if (startDate && endDate) {
        const startTime = new Date(startDate).getTime();
        const endTime = new Date(endDate).getTime();
        filteredJobs = allJobs.filter(j => {
          if (!j.completedAt) return false;
          const tripTime = new Date(j.completedAt).getTime();
          return !isNaN(tripTime) && tripTime >= startTime && tripTime <= endTime;
        });
      }

      // 4. Compute totals
      let grossTotal = 0;
      let cashTotal = 0;
      let cardTotal = 0;

      filteredJobs.forEach(j => {
        const fareVal = parseFloat(j.fare || 0);
        grossTotal += fareVal;
        const method = String(j.paymentMethod || j.paymentType || 'Cash').toLowerCase();
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

      // 5. Emit complete payload with driverName, period, and formatted dates
      socket.emit('driver_wallet_data', {
        success: true,
        driverId: driverId,
        driverName: driverName,
        period: periodLabel,
        gross: grossTotal.toFixed(2),
        totalJobs: filteredJobs.length,
        cashTotal: cashTotal.toFixed(2),
        cardTotal: cardTotal.toFixed(2),
        commission: commission.toFixed(2),
        commPct: commPct,
        netPay: netPay.toFixed(2),
        settlement: Math.abs(settlement).toFixed(2),
        settlementRaw: settlement,
        settlementType: settlementType,
        jobs: filteredJobs.map(j => {
          let formattedDate = '-';
          if (j.completedAt && j.completedAt.includes('T')) {
            const d = new Date(j.completedAt);
            formattedDate = !isNaN(d) 
              ? d.toLocaleDateString('en-GB') + ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
              : j.completedAt;
          } else {
            formattedDate = j.completedAt || j.createdAt || '-';
          }
          return {
            id: j.id,
            pickup: j.pickup,
            dropoff: j.dropoff || 'Local Drop',
            fare: parseFloat(j.fare || 0).toFixed(2),
            paymentMethod: j.paymentMethod || 'Cash',
            completedAt: j.completedAt || '',
            dateTime: formattedDate
          };
        })
      });

      console.log(\`💰 [WALLET] Driver \${driverName} (\${driverId}) Period: \${periodLabel} -> Trips=\${filteredJobs.length}, Gross=£\${grossTotal.toFixed(2)}, Settlement=\${settlementType} (£\${Math.abs(settlement).toFixed(2)})\`);
    } catch(err) {
      console.error('❌ Error processing get_driver_wallet:', err.message);
    }
  });`;

const startIdx = code.indexOf("socket.on('get_driver_wallet'");
if (startIdx !== -1) {
  const closeLogIdx = code.indexOf("console.log(`💰 [WALLET]", startIdx);
  const endIdx = code.indexOf("});", closeLogIdx);
  code = code.substring(0, startIdx) + updatedSocketHandler + code.substring(endIdx + 3);
  fs.writeFileSync('index.js', code);
  console.log("✅ Successfully updated socket get_driver_wallet in index.js");
} else {
  console.error("❌ Could not find socket.on('get_driver_wallet')");
}

const { execSync } = require('child_process');
try {
  execSync('node -c index.js');
  console.log("🚀 index.js syntax is 100% CLEAN!");
} catch (e) {
  console.error("Syntax check error:", e.message);
}
