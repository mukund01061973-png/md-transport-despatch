const Database = require('better-sqlite3');
const db = new Database('dispatch.db');

const cols = db.prepare("PRAGMA table_info(bookings)").all().map(c => c.name);

if (!cols.includes('tip')) {
  db.prepare("ALTER TABLE bookings ADD COLUMN tip REAL DEFAULT 0.0").run();
  console.log("✅ Added column: tip");
} else {
  console.log("ℹ️ Column 'tip' already exists.");
}

if (!cols.includes('tollFee')) {
  db.prepare("ALTER TABLE bookings ADD COLUMN tollFee REAL DEFAULT 0.0").run();
  console.log("✅ Added column: tollFee");
} else {
  console.log("ℹ️ Column 'tollFee' already exists.");
}

const verifyCols = db.prepare("PRAGMA table_info(bookings)").all().map(c => c.name);
console.log("Verified booking columns include tip & tollFee:", verifyCols.includes('tip') && verifyCols.includes('tollFee'));
