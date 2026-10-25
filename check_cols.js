const Database = require('better-sqlite3');
const db = new Database('dispatch.db');

console.log("=== airport_matrix columns ===");
console.log(db.prepare("PRAGMA table_info(airport_matrix)").all().map(c => c.name));

console.log("=== drivers columns ===");
console.log(db.prepare("PRAGMA table_info(drivers)").all().map(c => c.name));

console.log("=== bookings columns ===");
console.log(db.prepare("PRAGMA table_info(bookings)").all().map(c => c.name));
