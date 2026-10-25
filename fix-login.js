const Database = require('better-sqlite3');
const db = new Database('dispatch.db');

// 1. Ensure all columns exist on drivers table
const driverCols = [
  "ALTER TABLE drivers ADD COLUMN customCommissionPct REAL DEFAULT 20.0",
  "ALTER TABLE drivers ADD COLUMN accountStatus TEXT DEFAULT 'Active'",
  "ALTER TABLE drivers ADD COLUMN acceptsPets INTEGER DEFAULT 1",
  "ALTER TABLE drivers ADD COLUMN maxPax INTEGER DEFAULT 4",
  "ALTER TABLE drivers ADD COLUMN vehicleClass TEXT DEFAULT 'Minibus_8'",
  "ALTER TABLE drivers ADD COLUMN status TEXT DEFAULT 'Offline'"
];
driverCols.forEach(sql => { try { db.exec(sql); } catch(e){} });

// 2. Ensure driver UKUND exists with pin 1234
const existing = db.prepare("SELECT * FROM drivers WHERE UPPER(TRIM(driverId)) = 'UKUND'").get();
if (!existing) {
  db.prepare(`
    INSERT INTO drivers (driverId, name, pin, vehicle, vehicleClass, maxPax, phone, customCommissionPct, accountStatus, status)
    VALUES ('UKUND', 'Mukund Desai', '1234', 'Hyundai i800', 'Minibus_8', 8, '07795681747', 20.0, 'Active', 'Offline')
  `).run();
  console.log("Created driver UKUND (PIN: 1234)");
} else {
  // Reset pin to 1234 just in case
  db.prepare("UPDATE drivers SET pin = '1234', accountStatus = 'Active' WHERE UPPER(TRIM(driverId)) = 'UKUND'").run();
  console.log("Confirmed driver UKUND (PIN: 1234) is Active in DB.");
}

console.log("All drivers in DB:");
console.table(db.prepare("SELECT driverId, name, pin, vehicle, accountStatus, status FROM drivers").all());
