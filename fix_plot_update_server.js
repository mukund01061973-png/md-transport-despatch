const fs = require('fs');
let code = fs.readFileSync('index.js', 'utf8');

const targetStr = "admin_update_plot";
const pIdx = code.indexOf(targetStr);

if (pIdx !== -1) {
  const closeIdx = code.indexOf("});", pIdx);
  const newHandler = `admin_update_plot', (data) => {
    try {
      if (!data || !data.id) return;
      const plotId = parseInt(data.id, 10);
      if (isNaN(plotId)) return;

      const stmt = db.prepare(\`
        UPDATE plots SET
          name = COALESCE(?, name),
          code = COALESCE(?, code),
          postcodeSector = COALESCE(?, postcodeSector),
          plotType = COALESCE(?, plotType),
          radiusMeters = COALESCE(?, radiusMeters),
          maxCapacity = COALESCE(?, maxCapacity)
        WHERE id = ?
      \`);

      const result = stmt.run(
        data.name ? String(data.name).trim() : null,
        data.code ? String(data.code).trim().toUpperCase() : null,
        data.postcodeSector ? String(data.postcodeSector).trim().toUpperCase() : null,
        data.plotType ? String(data.plotType) : null,
        data.radiusMeters !== undefined && data.radiusMeters !== null ? parseInt(data.radiusMeters, 10) : null,
        data.maxCapacity !== undefined && data.maxCapacity !== null ? parseInt(data.maxCapacity, 10) : null,
        plotId
      );

      console.log(\`✅ Stand/Plot #\${plotId} updated live (changes: \${result.changes})\`);
      broadcastAdminState();
    } catch (err) {
      console.error('Error updating plot:', err);
    }
  });`;

  code = code.slice(0, pIdx) + newHandler + code.slice(closeIdx + 3);
  fs.writeFileSync('index.js', code);
  console.log('✅ index.js admin_update_plot updated successfully!');
} else {
  console.log('❌ admin_update_plot not found');
}
