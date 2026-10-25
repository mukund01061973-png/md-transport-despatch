const sqlite3 = require('better-sqlite3');
const db = sqlite3('mdtaxi.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS tariffs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    baseFlagDrop REAL DEFAULT 5.00,
    firstMileRate REAL DEFAULT 2.00,
    tier1PerMile REAL DEFAULT 2.00,
    tier2PerMile REAL DEFAULT 1.80,
    tier3PerMile REAL DEFAULT 1.50,
    busySurgePct REAL DEFAULT 40.0,
    viaStopFee REAL DEFAULT 5.00,
    petSurcharge REAL DEFAULT 6.00,
    freeWaitMins INTEGER DEFAULT 5,
    waitingGraceMins INTEGER DEFAULT 5,
    waitRate REAL DEFAULT 0.35,
    estatePercent REAL DEFAULT 0.10,
    mpvPercent REAL DEFAULT 0.40,
    minibus7Percent REAL DEFAULT 0.60,
    minibus8Percent REAL DEFAULT 0.60,
    execPercent REAL DEFAULT 0.70,
    airportEstatePct REAL DEFAULT 10,
    airportMpvPct REAL DEFAULT 45,
    airportMinibus7Pct REAL DEFAULT 60,
    airportMinibus8Pct REAL DEFAULT 60,
    airportExecPct REAL DEFAULT 70
  );
`);

// Insert master tariff row if empty
const count = db.prepare("SELECT count(*) as c FROM tariffs").get().c;
if (count === 0) {
  db.prepare(`
    INSERT INTO tariffs (
      baseFlagDrop, firstMileRate, tier1PerMile, tier2PerMile, tier3PerMile,
      busySurgePct, viaStopFee, petSurcharge, freeWaitMins, waitingGraceMins,
      estatePercent, mpvPercent, minibus7Percent, minibus8Percent, execPercent
    ) VALUES (
      5.00, 2.00, 2.00, 1.80, 1.50,
      40.0, 5.00, 6.00, 5, 5,
      0.10, 0.40, 0.60, 0.60, 0.70
    )
  `).run();
  console.log("✅ Initialized master tariff table with 40% surge: 2.1 miles = £12.90!");
} else {
  // Update surge to 40% to match admin dispatch
  db.prepare("UPDATE tariffs SET busySurgePct = 40.0, baseFlagDrop = 5.00, firstMileRate = 2.00, tier1PerMile = 2.00 WHERE id = 1").run();
  console.log("✅ Updated existing tariff row in database!");
}
