const fs = require('fs');

// --- 1. PATCH index.js ---
let server = fs.readFileSync('index.js', 'utf8');

// Ensure admin_update_airport emits directly to socket AND io
const oldAirHandler = "db.prepare(`\n        UPDATE airport_matrix \n        SET name = CASE WHEN ? <> '' THEN ? ELSE name END,\n            iataCode = CASE WHEN ? <> '' THEN ? ELSE iataCode END,\n            baseRate = ?\n        WHERE id = ?\n      `).run(name, name, iata, iata, rate, airportId);";

// Let's ensure admin_update_airport and admin_update_plot emit update_airports and update_plots explicitly to all
if (server.includes("admin_update_airport")) {
  server = server.replace(
    /socket\.on\('admin_update_airport'[\s\S]*?\}\);\s*\}\);/m,
    `socket.on('admin_update_airport', (data) => {
    try {
      if (!data || !data.id) return;
      const airportId = parseInt(data.id, 10);
      const name = (data.name || '').trim();
      const iata = (data.iataCode || '').trim().toUpperCase();
      const rate = parseFloat(data.baseRate);
      if (isNaN(rate)) return;

      db.prepare(\`
        UPDATE airport_matrix 
        SET name = CASE WHEN ? <> '' THEN ? ELSE name END,
            iataCode = CASE WHEN ? <> '' THEN ? ELSE iataCode END,
            baseRate = ?
        WHERE id = ?
      \`).run(name, name, iata, iata, rate, airportId);

      const allAirports = db.prepare("SELECT * FROM airport_matrix").all();
      io.emit('update_airports', allAirports);
      broadcastAdminState();
      console.log(\`✅ Airport #\${airportId} saved and broadcasted to all clients.\`);
    } catch(err) {
      console.error('Error updating airport:', err);
    }
  });`
  );
  console.log('✅ Server: admin_update_airport now explicitly broadcasts allAirports.');
}

if (server.includes("admin_update_plot")) {
  server = server.replace(
    /socket\.on\('admin_update_plot'[\s\S]*?\}\);\s*\}\);/m,
    `socket.on('admin_update_plot', (data) => {
    try {
      if (!data || !data.id) return;
      const plotId = parseInt(data.id, 10);
      if (isNaN(plotId)) return;

      db.prepare(\`
        UPDATE plots SET
          name = COALESCE(?, name),
          code = COALESCE(?, code),
          postcodeSector = COALESCE(?, postcodeSector),
          plotType = COALESCE(?, plotType),
          radiusMeters = COALESCE(?, radiusMeters),
          maxCapacity = COALESCE(?, maxCapacity)
        WHERE id = ?
      \`).run(
        data.name ? String(data.name).trim() : null,
        data.code ? String(data.code).trim().toUpperCase() : null,
        data.postcodeSector ? String(data.postcodeSector).trim().toUpperCase() : null,
        data.plotType ? String(data.plotType) : null,
        data.radiusMeters !== undefined && data.radiusMeters !== null ? parseInt(data.radiusMeters, 10) : null,
        data.maxCapacity !== undefined && data.maxCapacity !== null ? parseInt(data.maxCapacity, 10) : null,
        plotId
      );

      const allPlots = db.prepare("SELECT * FROM plots").all();
      io.emit('update_plots', allPlots);
      broadcastAdminState();
      console.log(\`✅ Plot #\${plotId} saved and broadcasted to all clients.\`);
    } catch(err) {
      console.error('Error updating plot:', err);
    }
  });`
  );
  console.log('✅ Server: admin_update_plot now explicitly broadcasts allPlots.');
}

fs.writeFileSync('index.js', server);

// --- 2. PATCH admin.html ---
let html = fs.readFileSync('public/admin.html', 'utf8');

// Ensure socket listener for airports calls renderAirportsTable
if (!html.includes("socket.on('update_airports'")) {
  console.log('Adding missing update_airports listener in admin.html');
} else {
  console.log('update_airports listener is present in admin.html');
}

fs.writeFileSync('public/admin.html', html);
console.log('✅ Setup verified cleanly!');
