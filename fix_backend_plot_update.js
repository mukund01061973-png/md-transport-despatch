const fs = require('fs');
let code = fs.readFileSync('index.js', 'utf8');

const pIdx = code.indexOf("'admin_update_plot'");
if (pIdx !== -1) {
  const endTry = code.indexOf("} catch", pIdx);
  const block = code.slice(pIdx, endTry);

  // If missing radiusMeters or other update fields, make it comprehensive
  const newHandler = `'admin_update_plot', (data) => {
    try {
      if (!data || !data.id) return;
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
        data.name || null,
        data.code || null,
        data.postcodeSector || null,
        data.plotType || null,
        data.radiusMeters || null,
        data.maxCapacity || null,
        data.id
      );
      console.log(\`✅ Stand/Plot #\${data.id} updated live\`);
      broadcastAdminState();
    } catch(err) {
      console.error('Error updating plot:', err);
    }
  });`;

  // Check if we need to replace the inner block
  const closeHandler = code.indexOf("});", pIdx);
  code = code.slice(0, pIdx) + newHandler + code.slice(closeHandler + 3);
  fs.writeFileSync('index.js', code);
  console.log('✅ index.js admin_update_plot verified and updated');
} else {
  console.log('ℹ️ admin_update_plot not found');
}
