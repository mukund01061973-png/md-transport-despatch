const fs = require('fs');
let code = fs.readFileSync('index.js', 'utf8');

// Ensure admin_update_plot is present and io.on('connection') closes properly before server.listen
const targetAirportEnd = `console.log(\`✅ Airport #\${airportId} saved and broadcasted to all clients.\`);
    } catch(err) {
      console.error('Error updating airport:', err);
    }
  });`;

const replacementTail = `console.log(\`✅ Airport #\${airportId} saved and broadcasted to all clients.\`);
    } catch(err) {
      console.error('Error updating airport:', err);
    }
  });

  socket.on('admin_update_plot', (data) => {
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
      console.log(\`✅ Stand/Plot #\${plotId} saved and broadcasted to all clients.\`);
    } catch(err) {
      console.error('Error updating plot:', err);
    }
  });
}); // <--- Cleanly closes io.on('connection')

server.listen(3000, () => {
  console.log('🚀 MD Transport Server Online on http://localhost:3000');
});
`;

if (code.includes(targetAirportEnd)) {
  const cutPoint = code.indexOf(targetAirportEnd) + targetAirportEnd.length;
  code = code.slice(0, cutPoint) + "\n\n  " + replacementTail.slice(replacementTail.indexOf("socket.on('admin_update_plot'"));
  fs.writeFileSync('index.js', code);
  console.log('✅ index.js closing braces and plot update restored!');
} else {
  console.log('❌ Could not locate targetAirportEnd anchor');
}
