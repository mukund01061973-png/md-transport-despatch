const fs = require('fs');
let code = fs.readFileSync('index.js', 'utf8');

const oldGetters = `function getTariff(tenantId = 'MD-BATH') {
  return db.prepare('SELECT * FROM tariffs WHERE tenantId = ? LIMIT 1').get(tenantId) || db.prepare('SELECT * FROM tariffs LIMIT 1').get() || {};
}
function getAirports(tenantId = 'MD-BATH') {
  return db.prepare('SELECT * FROM airport_matrix WHERE tenantId = ? ORDER BY id ASC').all(tenantId);
}
function getAccounts(tenantId = 'MD-BATH') {
  return db.prepare('SELECT * FROM corporate_accounts WHERE tenantId = ? ORDER BY id DESC').all(tenantId);
}
function getAllJobs(tenantId = 'MD-BATH') {
  return db.prepare('SELECT * FROM bookings WHERE tenantId = ? ORDER BY rowid DESC LIMIT 250').all(tenantId);
}
function getPlots(tenantId = 'MD-BATH') {
  return db.prepare('SELECT * FROM plots WHERE tenantId = ? ORDER BY id ASC').all(tenantId).map(p => ({
    ...p,
    queueCount: (plotQueues[p.id] || []).length,
    queue: (plotQueues[p.id] || []).map((q, idx) => ({ ...q, rank: idx + 1 }))
  }));
}
function getAllDrivers(tenantId = 'MD-BATH') {
  return db.prepare('SELECT * FROM drivers WHERE tenantId = ?').all(tenantId).map(d => {`;

const newGetters = `function isAllTenant(t) {
  return !t || t === 'ALL' || t === 'MD-ALL' || t === 'GLOBAL';
}

function getTariff(tenantId = 'ALL') {
  if (isAllTenant(tenantId)) {
    return db.prepare('SELECT * FROM tariffs LIMIT 1').get() || {};
  }
  return db.prepare('SELECT * FROM tariffs WHERE tenantId = ? LIMIT 1').get(tenantId) || db.prepare('SELECT * FROM tariffs LIMIT 1').get() || {};
}
function getAirports(tenantId = 'ALL') {
  if (isAllTenant(tenantId)) {
    return db.prepare('SELECT * FROM airport_matrix ORDER BY id ASC').all();
  }
  return db.prepare('SELECT * FROM airport_matrix WHERE tenantId = ? ORDER BY id ASC').all(tenantId);
}
function getAccounts(tenantId = 'ALL') {
  if (isAllTenant(tenantId)) {
    return db.prepare('SELECT * FROM corporate_accounts ORDER BY id DESC').all();
  }
  return db.prepare('SELECT * FROM corporate_accounts WHERE tenantId = ? ORDER BY id DESC').all(tenantId);
}
function getAllJobs(tenantId = 'ALL') {
  if (isAllTenant(tenantId)) {
    return db.prepare('SELECT * FROM bookings ORDER BY rowid DESC LIMIT 250').all();
  }
  return db.prepare('SELECT * FROM bookings WHERE tenantId = ? ORDER BY rowid DESC LIMIT 250').all(tenantId);
}
function getPlots(tenantId = 'ALL') {
  const plotsQuery = isAllTenant(tenantId) 
    ? db.prepare('SELECT * FROM plots ORDER BY id ASC').all()
    : db.prepare('SELECT * FROM plots WHERE tenantId = ? ORDER BY id ASC').all(tenantId);
  return plotsQuery.map(p => ({
    ...p,
    queueCount: (plotQueues[p.id] || []).length,
    queue: (plotQueues[p.id] || []).map((q, idx) => ({ ...q, rank: idx + 1 }))
  }));
}
function getAllDrivers(tenantId = 'ALL') {
  const driversQuery = isAllTenant(tenantId)
    ? db.prepare('SELECT * FROM drivers').all()
    : db.prepare('SELECT * FROM drivers WHERE tenantId = ?').all(tenantId);
  return driversQuery.map(d => {`;

if (code.includes("function isAllTenant")) {
  console.log("ℹ️ index.js already has unified getters");
} else {
  code = code.replace(oldGetters, newGetters);
  // Default clientTenant to ALL so nothing is restricted
  code = code.replace(/let clientTenant = 'MD-BATH';/g, "let clientTenant = 'ALL';");
  fs.writeFileSync('index.js', code);
  console.log("✅ index.js successfully patched for Unified Network & Arbitrary Postcode Sectors!");
}
