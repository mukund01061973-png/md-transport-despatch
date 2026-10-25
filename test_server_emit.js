const Database = require('better-sqlite3');
const db = new Database('dispatch.db');

try {
  const jobs = db.prepare('SELECT * FROM bookings ORDER BY id DESC').all();
  const drivers = db.prepare('SELECT * FROM drivers').all();
  const airports = db.prepare('SELECT * FROM airport_matrix').all();
  const plots = db.prepare('SELECT * FROM plots').all();
  let accounts = [];
  try {
    accounts = db.prepare('SELECT * FROM corporate_accounts').all();
  } catch(e) {
    accounts = db.prepare('SELECT * FROM accounts').all();
  }
  
  console.log("=== DATABASE CHECK SUCCESS ===");
  console.log(`Jobs: ${jobs.length}, Drivers: ${drivers.length}, Airports: ${airports.length}, Plots: ${plots.length}, Accounts: ${accounts.length}`);
} catch (err) {
  console.error("Database query error:", err.message);
}
