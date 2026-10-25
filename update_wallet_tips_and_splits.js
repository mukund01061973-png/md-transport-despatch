const fs = require('fs');
let code = fs.readFileSync('index.js', 'utf8');

// 1. Update SQL query to include tip and tollFee
const oldQuery = `SELECT id, pickup, dropoff, fare, waitingCharge,
                 COALESCE(paymentMethod, 'Cash') AS paymentMethod,
                 paymentType, createdAt, completedAt
          FROM bookings`;

const newQuery = `SELECT id, pickup, dropoff, fare, waitingCharge,
                 COALESCE(paymentMethod, 'Cash') AS paymentMethod,
                 paymentType, COALESCE(tip, 0.0) AS tip, COALESCE(tollFee, 0.0) AS tollFee,
                 createdAt, completedAt
          FROM bookings`;

if (code.includes(oldQuery)) {
  code = code.replace(oldQuery, newQuery);
  console.log("✅ Updated SQL query in index.js to select tip and tollFee!");
}

// 2. Update totals computation block
const oldCalcRegex = /\/\/ 4\. Compute totals[\s\S]*?const settlementType = settlement >= 0 \? 'OFFICE_OWES_DRIVER' : 'DRIVER_OWES_OFFICE';/;

const newCalcBlock = `// 4. Compute totals (Separate Cash, Prepaid, Corporate Account, Tips & Tolls)
      let grossTotal = 0;
      let cashTotal = 0;
      let prepaidTotal = 0;
      let accountTotal = 0;
      let tipsTotal = 0;
      let tollsTotal = 0;

      filteredJobs.forEach(j => {
        const fareVal = parseFloat(j.fare || 0);
        const tipVal = parseFloat(j.tip || 0);
        const tollVal = parseFloat(j.tollFee || 0);

        grossTotal += fareVal;
        tipsTotal += tipVal;
        tollsTotal += tollVal;

        const method = String(j.paymentMethod || j.paymentType || 'Cash').toLowerCase();
        if (method.includes('account') || method.includes('corporate')) {
          accountTotal += fareVal;
        } else if (method.includes('card') || method.includes('prepaid') || method.includes('online')) {
          prepaidTotal += fareVal;
        } else {
          cashTotal += fareVal;
        }
      });

      const cardTotal = prepaidTotal + accountTotal;
      // Commission is charged ONLY on gross core fare (0% on tips and tolls)
      const commission = grossTotal * (commPct / 100);
      const netPay = grossTotal - commission + tipsTotal + tollsTotal;
      const settlement = netPay - cashTotal;
      const settlementType = settlement >= 0 ? 'OFFICE_OWES_DRIVER' : 'DRIVER_OWES_OFFICE';`;

if (oldCalcRegex.test(code)) {
  code = code.replace(oldCalcRegex, newCalcBlock);
  console.log("✅ Updated totals calculation with dedicated Prepaid, Account, Tip & Toll buckets!");
} else {
  console.log("⚠️ Could not locate oldCalcBlock with regex.");
}

// 3. Update the emitted payload to include the new fields
const oldEmitSearch = `gross: grossTotal.toFixed(2),
        totalJobs: filteredJobs.length,
        cashTotal: cashTotal.toFixed(2),
        cardTotal: cardTotal.toFixed(2),`;

const newEmitReplace = `gross: grossTotal.toFixed(2),
        totalJobs: filteredJobs.length,
        cashTotal: cashTotal.toFixed(2),
        prepaidTotal: prepaidTotal.toFixed(2),
        accountTotal: accountTotal.toFixed(2),
        cardTotal: cardTotal.toFixed(2),
        tipsTotal: tipsTotal.toFixed(2),
        tollsTotal: tollsTotal.toFixed(2),`;

if (code.includes(oldEmitSearch)) {
  code = code.replace(oldEmitSearch, newEmitReplace);
  console.log("✅ Injected prepaidTotal, accountTotal, tipsTotal, tollsTotal into socket emit!");
}

// 4. Update the per-job return mapping to include tip and toll
const oldJobMap = `paymentMethod: j.paymentMethod || 'Cash',
            completedAt: j.completedAt || '',`;

const newJobMap = `paymentMethod: j.paymentMethod || 'Cash',
            tip: parseFloat(j.tip || 0).toFixed(2),
            tollFee: parseFloat(j.tollFee || 0).toFixed(2),
            completedAt: j.completedAt || '',`;

if (code.includes(oldJobMap)) {
  code = code.replace(oldJobMap, newJobMap);
  console.log("✅ Injected tip and tollFee into jobs mapping!");
}

fs.writeFileSync('index.js', code);

const { execSync } = require('child_process');
try {
  execSync('node -c index.js');
  console.log("🚀 index.js syntax is 100% CLEAN!");
} catch (e) {
  console.error("Syntax error:", e.message);
}
