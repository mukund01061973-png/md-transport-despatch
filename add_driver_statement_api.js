const fs = require('fs');
let code = fs.readFileSync('index.js', 'utf8');

if (code.includes('/api/admin/driver-statement')) {
  console.log("⚠️ /api/admin/driver-statement already exists in index.js");
  process.exit(0);
}

const endpointCode = `
// ================= DRIVER SETTLEMENT & WEEKLY STATEMENT API =================
app.get('/api/admin/driver-statement', (req, res) => {
  try {
    const { driverId, startDate, endDate } = req.query;
    if (!driverId) {
      return res.status(400).json({ success: false, error: 'driverId is required' });
    }

    const dId = String(driverId).trim().toUpperCase();
    const driver = db.prepare('SELECT driverId, name, vehicle, phone, customCommissionPct FROM drivers WHERE UPPER(driverId) = ?').get(dId);
    if (!driver) {
      return res.status(404).json({ success: false, error: 'Driver not found' });
    }

    const commPct = parseFloat(driver.customCommissionPct) || 20.0;

    let query = \`
      SELECT id, pickup, COALESCE(dropoff, destination) AS dropoff,
             fare, waitingCharge, COALESCE(paymentMethod, 'Cash') AS paymentMethod,
             paymentType, createdAt, completedAt
      FROM bookings
      WHERE UPPER(COALESCE(assignedDriverId, '')) = ? AND UPPER(status) = 'COMPLETED'
    \`;
    const params = [dId];

    if (startDate && endDate) {
      query += \` AND createdAt >= ? AND createdAt <= ?\`;
      params.push(startDate, endDate);
    }

    query += \` ORDER BY rowid DESC\`;
    const jobs = db.prepare(query).all(...params);

    let grossTotal = 0;
    let cashTotal = 0;
    let cardTotal = 0;

    const itemized = jobs.map(j => {
      const f = parseFloat(j.fare || 0);
      grossTotal += f;
      const method = String(j.paymentMethod || j.paymentType || 'Cash').toLowerCase();
      const isCard = method.includes('card') || method.includes('account') || method.includes('prepaid');
      if (isCard) {
        cardTotal += f;
      } else {
        cashTotal += f;
      }
      const tripComm = f * (commPct / 100);
      const tripNet = f - tripComm;

      return {
        id: j.id,
        completedAt: j.completedAt || j.createdAt || '',
        pickup: j.pickup,
        dropoff: j.dropoff || 'Local Drop',
        paymentMethod: isCard ? 'Account / Card' : 'Cash',
        fare: f.toFixed(2),
        commission: tripComm.toFixed(2),
        net: tripNet.toFixed(2)
      };
    });

    const totalCommission = grossTotal * (commPct / 100);
    const driverNet = grossTotal - totalCommission;
    const settlement = driverNet - cashTotal; // Positive = Office pays driver, Negative = Driver owes office

    res.json({
      success: true,
      statementId: 'STM-' + dId + '-' + Date.now().toString().slice(-6),
      generatedAt: new Date().toLocaleString('en-GB'),
      driver: {
        id: driver.driverId,
        name: driver.name,
        vehicle: driver.vehicle,
        phone: driver.phone,
        commissionRatePct: commPct
      },
      summary: {
        totalJobs: jobs.length,
        grossTotal: grossTotal.toFixed(2),
        cashTotal: cashTotal.toFixed(2),
        cardTotal: cardTotal.toFixed(2),
        totalCommission: totalCommission.toFixed(2),
        driverNet: driverNet.toFixed(2),
        settlementBalance: Math.abs(settlement).toFixed(2),
        settlementType: settlement >= 0 ? 'OFFICE_OWES_DRIVER' : 'DRIVER_OWES_OFFICE'
      },
      jobs: itemized
    });
  } catch (err) {
    console.error('❌ Error generating driver statement:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});
`;

// Insert directly before app.listen or at bottom of routes
const listenIdx = code.indexOf("server.listen(");
if (listenIdx !== -1) {
  code = code.substring(0, listenIdx) + endpointCode + "\n" + code.substring(listenIdx);
} else {
  code += "\n" + endpointCode;
}

fs.writeFileSync('index.js', code);
console.log("✅ Added /api/admin/driver-statement endpoint to index.js");

const { execSync } = require('child_process');
try {
  execSync('node -c index.js');
  console.log("🚀 index.js syntax is 100% CLEAN!");
} catch (e) {
  console.error("Syntax error:", e.message);
}
