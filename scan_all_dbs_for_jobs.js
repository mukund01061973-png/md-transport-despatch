const Database = require('better-sqlite3');
const fs = require('fs');

const dbs = fs.readdirSync('.').filter(f => f.endsWith('.db') || f.endsWith('.sqlite'));

dbs.forEach(file => {
  try {
    const db = new Database(file, { readonly: true });
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(t => t.name);
    console.log(`\n📁 File: ${file}`);
    console.log(`   Tables: ${tables.join(', ')}`);
    
    // Check bookings or jobs table
    ['jobs', 'bookings'].forEach(t => {
      if (tables.includes(t)) {
        const count = db.prepare(`SELECT count(*) as c FROM ${t}`).get().c;
        console.log(`   👉 Found '${t}' table with ${count} records!`);
      }
    });
  } catch(e) {
    console.log(`   Error reading ${file}:`, e.message);
  }
});
