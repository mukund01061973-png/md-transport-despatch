const fs = require('fs');
let code = fs.readFileSync('index.js', 'utf8');

// Replace the first lines of broadcastAdminState with a guaranteed fallback tenant
const oldStart = `function broadcastAdminState() {
  try {
    const activeTariff = typeof getTariff === "function" ? getTariff(clientTenant) : {};`;

const newStart = `function broadcastAdminState() {
  try {
    const tenant = (typeof clientTenant !== "undefined" && clientTenant) ? clientTenant : "MD-BATH";
    const activeTariff = typeof getTariff === "function" ? getTariff(tenant) : {};`;

if (code.includes(oldStart)) {
  code = code.replace(oldStart, newStart);
  console.log("✅ Replaced clientTenant check in broadcastAdminState");
} else {
  // Regex fallback in case spacing differs slightly
  code = code.replace(
    /function broadcastAdminState\(\)\s*\{\s*try\s*\{\s*const activeTariff = typeof getTariff === "function" \? getTariff\(clientTenant\) : \{\};/,
    `function broadcastAdminState() {\n  try {\n    const tenant = (typeof clientTenant !== "undefined" && clientTenant) ? clientTenant : "MD-BATH";\n    const activeTariff = typeof getTariff === "function" ? getTariff(tenant) : {};`
  );
  console.log("✅ Applied regex replacement for tenant fallback in broadcastAdminState");
}

// Also make sure getMergedDrivers uses the fallback tenant if present
code = code.replace(/getMergedDrivers\(clientTenant\)/g, 'getMergedDrivers(tenant)');

fs.writeFileSync('index.js', code);
console.log("✅ index.js successfully updated with permanent default tenant!");
