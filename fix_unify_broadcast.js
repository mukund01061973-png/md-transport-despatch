const fs = require('fs');
let code = fs.readFileSync('index.js', 'utf8');

// 1. Fix line 495 where "tenant" was referenced without definition in sendAdminState
const brokenDriverLine = "allDrivers = typeof getMergedDrivers === \"function\" ? getMergedDrivers(tenant) : db.prepare(\"SELECT * FROM drivers\").all();";
const cleanDriverLine = "allDrivers = typeof getMergedDrivers === \"function\" ? getMergedDrivers(typeof clientTenant !== 'undefined' && clientTenant ? clientTenant : 'MD-BATH') : db.prepare(\"SELECT * FROM drivers\").all();";

if (code.includes(brokenDriverLine)) {
  code = code.replace(brokenDriverLine, cleanDriverLine);
  console.log("✅ Fixed undefined 'tenant' bug in sendAdminState!");
}

// 2. Also replace any other loose getMergedDrivers(tenant) or getAllJobs(clientTenant) with safe fallback
code = code.replace(/getMergedDrivers\(tenant\)/g, "getMergedDrivers('MD-BATH')");

// 3. In both admin_update_airport and admin_update_plot, ensure both broadcastAdminState() and sendAdminState(io) run
const oldAirportBroadcast = `console.log(\`✅ Airport #\${airportId} updated live: \${name} (\${iata}) = £\${rate}\`);\n      broadcastAdminState();`;
const newAirportBroadcast = `console.log(\`✅ Airport #\${airportId} updated live: \${name} (\${iata}) = £\${rate}\`);\n      broadcastAdminState();\n      if (typeof sendAdminState === 'function') sendAdminState(io);`;

if (code.includes(oldAirportBroadcast)) {
  code = code.replace(oldAirportBroadcast, newAirportBroadcast);
  console.log("✅ Enhanced admin_update_airport with dual broadcast!");
}

const oldPlotBroadcast = `console.log(\`✅ Stand/Plot #\${plotId} updated live (changes: \${result.changes})\`);\n      broadcastAdminState();`;
const newPlotBroadcast = `console.log(\`✅ Stand/Plot #\${plotId} updated live (changes: \${result.changes})\`);\n      broadcastAdminState();\n      if (typeof sendAdminState === 'function') sendAdminState(io);`;

if (code.includes(oldPlotBroadcast)) {
  code = code.replace(oldPlotBroadcast, newPlotBroadcast);
  console.log("✅ Enhanced admin_update_plot with dual broadcast!");
}

fs.writeFileSync('index.js', code);
console.log("✅ index.js successfully unified and updated!");
