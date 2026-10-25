const fs = require('fs');
let code = fs.readFileSync('index.js', 'utf8');

// 1. Ensure `let clientTenant = 'MD-BATH';` is declared globally right under DB initialization
if (!code.includes("let clientTenant = 'MD-BATH';") && !code.includes("var clientTenant = 'MD-BATH';")) {
  const dbLine = "const db = new Database('dispatch.db');";
  if (code.includes(dbLine)) {
    code = code.replace(dbLine, `${dbLine}\nlet clientTenant = 'MD-BATH'; // Guaranteed global default tenant`);
    console.log("✅ Initialized global clientTenant = 'MD-BATH' right after DB declaration!");
  } else {
    // Top of file fallback
    code = `let clientTenant = 'MD-BATH';\n` + code;
    console.log("✅ Placed global clientTenant at top of file!");
  }
}

// 2. Ensure admin_update_airport immediately calls broadcastAdminState without error
const airUpdateStart = "admin_update_airport', (data) => {";
const aIdx = code.indexOf(airUpdateStart);
if (aIdx !== -1) {
  const closeIdx = code.indexOf("});", aIdx);
  const cleanAirportHandler = `admin_update_airport', (data) => {
    try {
      if (!data || !data.id) return;
      const airportId = parseInt(data.id, 10);
      const name = (data.name || '').trim();
      const iata = (data.iataCode || '').trim().toUpperCase();
      const rate = parseFloat(data.baseRate);

      if (isNaN(rate)) {
        console.error('❌ Invalid baseRate received for airport ID:', airportId);
        return;
      }

      db.prepare(\`
        UPDATE airport_matrix 
        SET name = CASE WHEN ? <> '' THEN ? ELSE name END,
            iataCode = CASE WHEN ? <> '' THEN ? ELSE iataCode END,
            baseRate = ?
        WHERE id = ?
      \`).run(name, name, iata, iata, rate, airportId);

      console.log(\`✅ Airport #\${airportId} updated live: \${name} (\${iata}) = £\${rate}\`);
      broadcastAdminState();
    } catch(err) {
      console.error('Error updating airport:', err);
    }
  });`;

  code = code.slice(0, aIdx) + cleanAirportHandler + code.slice(closeIdx + 3);
  console.log("✅ Refactored admin_update_airport handler with safe integers and direct broadcast!");
}

fs.writeFileSync('index.js', code);
console.log('✅ index.js updated successfully!');
