const fs = require('fs');
let s = fs.readFileSync('index.js', 'utf8');

let modified = false;

// 1. Add admin_save_tariff if not present
if (!s.includes('admin_save_tariff')) {
  const insertMarker = "socket.on('admin_update_airport'";
  const tariffHandler = `
    socket.on('admin_save_tariff', (tariffData) => {
      try {
        console.log('💾 Saving Master Tariff:', tariffData);
        // Update database if table exists or cache in memory
        try {
          db.prepare(\`
            INSERT INTO tariff_settings (tenantId, baseFlagDrop, firstMileRate, tier1PerMile, tier2PerMile, tier3PerMile, viaStopFee, petSurcharge)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(tenantId) DO UPDATE SET
              baseFlagDrop=excluded.baseFlagDrop,
              firstMileRate=excluded.firstMileRate,
              tier1PerMile=excluded.tier1PerMile,
              tier2PerMile=excluded.tier2PerMile,
              tier3PerMile=excluded.tier3PerMile,
              viaStopFee=excluded.viaStopFee,
              petSurcharge=excluded.petSurcharge
          \`).run(
            'MD-BATH',
            tariffData.baseFlagDrop || 5.0,
            tariffData.firstMileRate || 2.0,
            tariffData.tier1PerMile || 2.0,
            tariffData.tier2PerMile || 1.8,
            tariffData.tier3PerMile || 1.5,
            tariffData.viaStopFee || 5.0,
            tariffData.petSurcharge || 6.0
          );
        } catch(e) {
          // If tariff_settings table doesn't exist, create it
          db.exec(\`
            CREATE TABLE IF NOT EXISTS tariff_settings (
              tenantId TEXT PRIMARY KEY,
              baseFlagDrop REAL,
              firstMileRate REAL,
              tier1PerMile REAL,
              tier2PerMile REAL,
              tier3PerMile REAL,
              viaStopFee REAL,
              petSurcharge REAL
            );
          \`);
          db.prepare(\`
            INSERT OR REPLACE INTO tariff_settings (tenantId, baseFlagDrop, firstMileRate, tier1PerMile, tier2PerMile, tier3PerMile, viaStopFee, petSurcharge)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          \`).run(
            'MD-BATH',
            tariffData.baseFlagDrop || 5.0,
            tariffData.firstMileRate || 2.0,
            tariffData.tier1PerMile || 2.0,
            tariffData.tier2PerMile || 1.8,
            tariffData.tier3PerMile || 1.5,
            tariffData.viaStopFee || 5.0,
            tariffData.petSurcharge || 6.0
          );
        }
        io.emit('update_tariff', tariffData);
        socket.emit('tariff_saved_ack', { success: true });
        console.log('✅ Master Tariff saved and broadcasted!');
      } catch (err) {
        console.error('❌ Tariff save error:', err.message);
      }
    });
`;
  if (s.includes(insertMarker)) {
    s = s.replace(insertMarker, tariffHandler + '\n    ' + insertMarker);
    modified = true;
  }
}

// 2. Add admin_create_plot if missing
if (!s.includes('admin_create_plot') && !s.includes('admin_add_plot')) {
  const insertMarker2 = "socket.on('admin_delete_plot'";
  const plotCreateHandler = `
    socket.on('admin_create_plot', (plotData) => {
      try {
        db.prepare('INSERT INTO plots (code, name, postcodeSector, radiusMeters, tenantId) VALUES (?, ?, ?, ?, ?)')
          .run(plotData.code, plotData.name, plotData.postcodeSector, plotData.radiusMeters || 350, 'MD-BATH');
        const updatedPlots = db.prepare('SELECT * FROM plots').all();
        io.emit('update_plots', updatedPlots);
        console.log('✅ Plot created:', plotData.name);
      } catch (err) {
        console.error('❌ Plot create error:', err.message);
      }
    });
`;
  if (s.includes(insertMarker2)) {
    s = s.replace(insertMarker2, plotCreateHandler + '\n    ' + insertMarker2);
    modified = true;
  }
}

if (modified) {
  fs.writeFileSync('index.js', s);
  console.log('✅ index.js successfully patched with tariff & plot handlers!');
} else {
  console.log('Backend handlers already exist or ready.');
}
