const fs = require('fs');
const Database = require('better-sqlite3');

console.log("=== 1. DATABASE & RECORD HEALTH ===");
try {
  const db = new Database('database.sqlite', { readonly: true });
  const counts = {
    jobs: db.prepare("SELECT count(*) as c FROM jobs").get().c,
    drivers: db.prepare("SELECT count(*) as c FROM drivers").get().c,
    accounts: db.prepare("SELECT count(*) as c FROM accounts").get().c,
    airports: db.prepare("SELECT count(*) as c FROM airport_matrix").get().c,
    tariffs: db.prepare("SELECT count(*) as c FROM tariffs").get().c,
  };
  console.log("✅ Database connected successfully:");
  console.log(`   - Bookings (jobs): ${counts.jobs}`);
  console.log(`   - Drivers: ${counts.drivers}`);
  console.log(`   - Corporate Accounts: ${counts.accounts}`);
  console.log(`   - Airport Matrix: ${counts.airports}`);
  console.log(`   - Tariffs records: ${counts.tariffs}`);

  console.log("\n=== 2. TARIFF SCHEMA COLUMNS ===");
  const tCols = db.prepare("PRAGMA table_info(tariffs)").all().map(c => c.name);
  console.log("   Columns:", tCols.join(', '));

  console.log("\n=== 3. CORPORATE ACCOUNTS SCHEMA ===");
  const aCols = db.prepare("PRAGMA table_info(accounts)").all().map(c => c.name);
  console.log("   Columns:", aCols.join(', '));
} catch(err) {
  console.log("❌ Database check error:", err.message);
}

console.log("\n=== 4. FRONTEND SCRIPT INTEGRITY CHECK ===");
try {
  const html = fs.readFileSync('public/admin.html', 'utf8');
  console.log(`   - File size: ${(html.length / 1024).toFixed(1)} KB`);
  
  const scripts = [...html.matchAll(/<script[\s\S]*?>([\s\S]*?)<\/script>/gi)];
  console.log(`   - Total script blocks: ${scripts.length}`);
  
  scripts.forEach((s, idx) => {
    try {
      new Function(s[1]);
      console.log(`   ✅ Script #${idx + 1} syntax: Clean`);
    } catch (e) {
      console.log(`   ❌ Script #${idx + 1} syntax error: ${e.message}`);
    }
  });

  // Check key DOM IDs
  const keyIds = ['jobsTableBody', 'driversTableBody', 'airportsTableBody', 'plotsTableBody', 'jobAccountSelect', 'invAccountSelect'];
  console.log("\n=== 5. KEY UI ELEMENT BINDINGS ===");
  keyIds.forEach(id => {
    const present = html.includes(`id="${id}"`) || html.includes(`id='${id}'`);
    console.log(`   ${present ? '✅' : '⚠️'} DOM ID [${id}]: ${present ? 'Found' : 'Missing'}`);
  });
} catch(err) {
  console.log("❌ Frontend check error:", err.message);
}
