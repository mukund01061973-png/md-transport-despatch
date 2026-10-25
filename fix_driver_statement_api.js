const fs = require('fs');
let code = fs.readFileSync('index.js', 'utf8');

const updatedEndpoint = `// ================= DRIVER SETTLEMENT & WEEKLY STATEMENT API =================
app.get('/api/admin/driver-statement', (req, res) => {
  try {
    const { driverId, startDate, endDate, periodLabel } = req.query;
    if (!driverId) {
      return res.status(400).json({ success: false, error: 'driverId is required' });
    }

    const dId = String(driverId).trim().toUpperCase();
    const driver = db.prepare('SELECT driverId, name, vehicle, phone, customCommissionPct FROM drivers WHERE UPPER(driverId) = ?').get(dId);
    if (!driver) {
      return res.status(404).json({ success: false, error: 'Driver not found' });
    }

    const commPct = parseFloat(driver.customCommissionPct) || 20.0;

    // Fetch all completed bookings for driver
    const allJobs = db.prepare(\`
      SELECT id, pickup, COALESCE(dropoff, destination) AS dropoff,
             fare, waitingCharge, COALESCE(paymentMethod, 'Cash') AS paymentMethod,
             paymentType, createdAt, completedAt
      FROM bookings
      WHERE UPPER(COALESCE(assignedDriverId, '')) = ? AND UPPER(status) = 'COMPLETED'
      ORDER BY rowid DESC
    \`).all(dId);

    // Filter by completedAt date range if provided
    let filteredJobs = allJobs;
    if (startDate && endDate) {
      const start = new Date(startDate).getTime();
      const end = new Date(endDate).getTime() + (24 * 60 * 60 * 1000) - 1; // inclusive of end day
      filteredJobs = allJobs.filter(j => {
        if (!j.completedAt) return false;
        const tripTime = new Date(j.completedAt).getTime();
        return !isNaN(tripTime) && tripTime >= start && tripTime <= end;
      });
    }

    let grossTotal = 0;
    let cashTotal = 0;
    let cardTotal = 0;

    const itemized = filteredJobs.map(j => {
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

      let formattedDate = '';
      if (j.completedAt && j.completedAt.includes('T')) {
        const d = new Date(j.completedAt);
        formattedDate = d.toLocaleDateString('en-GB') + ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
      } else {
        formattedDate = j.completedAt || j.createdAt || 'N/A';
      }

      return {
        id: j.id,
        dateTime: formattedDate,
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
    const settlement = driverNet - cashTotal;

    res.json({
      success: true,
      statementId: 'STMT-' + dId + '-' + Date.now().toString().slice(-6),
      generatedAt: new Date().toLocaleString('en-GB'),
      period: periodLabel || (startDate && endDate ? (startDate + ' to ' + endDate) : 'All Time to Date'),
      driverId: driver.driverId,
      driverName: driver.name || driver.driverId,
      vehicle: driver.vehicle || 'Standard Vehicle',
      phone: driver.phone || 'N/A',
      commPct: commPct,
      totalJobs: filteredJobs.length,
      gross: grossTotal.toFixed(2),
      cashTotal: cashTotal.toFixed(2),
      cardTotal: cardTotal.toFixed(2),
      commission: totalCommission.toFixed(2),
      netPay: driverNet.toFixed(2),
      settlement: Math.abs(settlement).toFixed(2),
      settlementType: settlement >= 0 ? 'OFFICE_OWES_DRIVER' : 'DRIVER_OWES_OFFICE',
      jobs: itemized
    });
  } catch (err) {
    console.error('❌ Error generating driver statement:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});`;

// Replace existing statement route in index.js
const startIdx = code.indexOf("// ================= DRIVER SETTLEMENT & WEEKLY STATEMENT API =================");
if (startIdx !== -1) {
  const nextRouteIdx = code.indexOf("\napp.", startIdx + 50);
  const endIdx = nextRouteIdx !== -1 ? nextRouteIdx : code.indexOf("server.listen", startIdx);
  code = code.substring(0, startIdx) + updatedEndpoint + "\n\n" + code.substring(endIdx);
  fs.writeFileSync('index.js', code);
  console.log("✅ Updated /api/admin/driver-statement endpoint with completedAt date filtering and flat schema.");
} else {
  console.error("❌ Could not find starting marker in index.js");
}

const { execSync } = require('child_process');
try {
  execSync('node -c index.js');
  console.log("🚀 index.js syntax is 100% CLEAN!");
} catch (e) {
  console.error("Syntax error:", e.message);
}
