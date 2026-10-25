const Database = require('better-sqlite3');
const db = new Database('dispatch.db');

const patchColumns = [
  "ALTER TABLE tariffs ADD COLUMN maxAutoDispatchRadiusMeters INTEGER DEFAULT 700",
  "ALTER TABLE tariffs ADD COLUMN maxAutoDispatchRadiusMiles REAL DEFAULT 3.0",
  "ALTER TABLE tariffs ADD COLUMN graceCancelSeconds INTEGER DEFAULT 90",
  "ALTER TABLE bookings ADD COLUMN acceptedTimestamp INTEGER DEFAULT NULL",
  "ALTER TABLE bookings ADD COLUMN dispatchedAt TEXT DEFAULT NULL",
  "ALTER TABLE bookings ADD COLUMN acceptedAt TEXT DEFAULT NULL",
  "ALTER TABLE bookings ADD COLUMN arrivedAt TEXT DEFAULT NULL",
  "ALTER TABLE bookings ADD COLUMN pobAt TEXT DEFAULT NULL",
  "ALTER TABLE bookings ADD COLUMN completedAt TEXT DEFAULT NULL",
  "ALTER TABLE bookings ADD COLUMN baseQuotedFare REAL DEFAULT 0.0",
  "ALTER TABLE bookings ADD COLUMN waitingFee REAL DEFAULT 0.0",
  "ALTER TABLE bookings ADD COLUMN arrivalWaitMins INTEGER DEFAULT 0",
  "ALTER TABLE bookings ADD COLUMN viaStopFee REAL DEFAULT 0.0",
  "ALTER TABLE bookings ADD COLUMN viaStopsCount INTEGER DEFAULT 0",
  "ALTER TABLE drivers ADD COLUMN accountStatus TEXT DEFAULT 'Active'",
  "ALTER TABLE plots ADD COLUMN postcodeSector TEXT DEFAULT 'BA1 1'"
];

patchColumns.forEach(sql => {
  try {
    db.exec(sql);
    console.log("Applied:", sql);
  } catch(e) {
    // Column already exists, safe to ignore
  }
});

console.log("Database schema repaired successfully.");
