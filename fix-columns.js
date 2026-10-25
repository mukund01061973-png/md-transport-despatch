const Database = require('better-sqlite3');
const db = new Database('dispatch.db');

try {
  db.exec("ALTER TABLE drivers ADD COLUMN customCommissionPct REAL DEFAULT 20.0");
  console.log("Added customCommissionPct to drivers table.");
} catch(e) {
  // Already exists
}

try {
  // If commissionRate exists (like 0.80 for 80%), convert to 20% company cut or default 20.0
  db.exec("UPDATE drivers SET customCommissionPct = 20.0 WHERE customCommissionPct IS NULL");
} catch(e){}

console.log("Drivers table schema verified:");
console.table(db.prepare("PRAGMA table_info(drivers)").all());
