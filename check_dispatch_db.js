const Database = require('better-sqlite3');
const db = new Database('dispatch.db', { readonly: true });

console.log("=== 1. DISPATCH.DB TABLE AUDIT ===");
const tables = ['jobs', 'drivers', 'accounts', 'airport_matrix', 'tariffs', 'plots'];
tables.forEach(tbl => {
  try {
    const count = db.prepare(`SELECT count(*) as c FROM ${tbl}`).get().c;
    console.log(`✅ Table [${tbl}]: ${count} records`);
  } catch (e) {
    console.log(`❌ Table [${tbl}]: ${e.message}`);
  }
});

console.log("\n=== 2. TARIFFS COLUMNS & ACTIVE VALUES ===");
try {
  const tCols = db.prepare("PRAGMA table_info(tariffs)").all().map(c => c.name);
  console.log("Columns:", tCols.join(', '));
  const activeTariff = db.prepare("SELECT * FROM tariffs LIMIT 1").get();
  console.log("Active tariff row:", activeTariff);
} catch (e) {
  console.log("Tariffs query error:", e.message);
}

console.log("\n=== 3. CORPORATE ACCOUNTS (SAMPLE) ===");
try {
  const accCols = db.prepare("PRAGMA table_info(accounts)").all().map(c => c.name);
  console.log("Columns:", accCols.join(', '));
  const accs = db.prepare("SELECT accountNumber, companyName, billingEmail FROM accounts LIMIT 3").all();
  console.log("Sample accounts:", accs);
} catch (e) {
  console.log("Accounts query error:", e.message);
}
