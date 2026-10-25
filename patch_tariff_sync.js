const fs = require('fs');
let code = fs.readFileSync('index.js', 'utf8');

const tariffEndpoint = `
// ================= LIVE TARIFF ENDPOINT =================
app.get('/api/tariff', (req, res) => {
  try {
    const row = db.prepare("SELECT * FROM tariffs LIMIT 1").get();
    if (row) {
      // Sync waiting grace columns so there is no ambiguity
      row.waitingGraceMins = row.freeWaitMins || row.waitingGraceMins || 3;
      return res.json({ success: true, tariff: row });
    }
  } catch(e) {}
  res.json({ success: false, error: 'No tariff found' });
});
`;

if (!code.includes("app.get('/api/tariff'")) {
  const insertMarker = 'app.use(express.json());';
  code = code.replace(insertMarker, insertMarker + '\n' + tariffEndpoint);
  fs.writeFileSync('index.js', code);
  console.log('✅ Added /api/tariff endpoint to index.js!');
} else {
  console.log('ℹ️ /api/tariff already exists in index.js');
}

// Synchronize database waitingGraceMins to match freeWaitMins (3 min)
const Database = require('better-sqlite3');
const db = new Database('dispatch.db');
db.prepare("UPDATE tariffs SET waitingGraceMins = 3, freeWaitMins = 3, waitingRatePerMin = 0.45").run();
console.log('✅ Synchronized dispatch.db tariffs: freeWaitMins=3, waitingGraceMins=3, waitingRatePerMin=0.45');
