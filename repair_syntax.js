const fs = require('fs');
let lines = fs.readFileSync('index.js', 'utf8').split('\n');

// Find the broadcastPlotQueueRanks block and repair lines around line 670-696
const startIdx = lines.findIndex(l => l.includes('function broadcastPlotQueueRanks'));
const endIdx = lines.findIndex((l, i) => i > startIdx && l.includes('function initQueues'));

if (startIdx !== -1 && endIdx !== -1) {
  const cleanFunc = [
    'function broadcastPlotQueueRanks(targetPlotId) {',
    '  try {',
    '    // 1. Emit precise rank & total count to each driver terminal',
    '    for (const [pId, q] of Object.entries(plotQueues)) {',
    '      const total = (q || []).length;',
    '      (q || []).forEach((entry, idx) => {',
    '        const rank = idx + 1;',
    '        for (const [sid, d] of Object.entries(connectedDrivers)) {',
    '          if (d && d.driverId && d.driverId.toUpperCase() === entry.driverId.toUpperCase()) {',
    '            d.plotRank = rank;',
    '            d.totalInPlot = total;',
    '            d.currentPlotName = pId;',
    '            io.to(sid).emit("queue_update", {',
    '              plotName: pId,',
    '              plotRank: rank,',
    '              totalInPlot: total',
    '            });',
    '          }',
    '        }',
    '      });',
    '    }',
    '',
    '    // Drivers not present in any queue get notified',
    '    for (const [sid, d] of Object.entries(connectedDrivers)) {',
    '      if (d && d.driverId) {',
    '        let foundInAny = false;',
    '        let pName = d.currentPlot || "Standby";',
    '        for (const [pId, q] of Object.entries(plotQueues)) {',
    '          if ((q || []).some(x => x.driverId.toUpperCase() === d.driverId.toUpperCase())) {',
    '            foundInAny = true;',
    '            break;',
    '          }',
    '        }',
    '        if (!foundInAny && d.activeJobId == null) {',
    '          d.plotRank = 0;',
    '          d.totalInPlot = (plotQueues[pName] || []).length;',
    '          io.to(sid).emit("queue_update", {',
    '            plotName: pName;',
    '            plotRank: 0;',
    '            totalInPlot: d.totalInPlot',
    '          });',
    '        }',
    '      }',
    '    }',
    '',
    '    // 2. Fetch all registered plots and compute driver headcount',
    '    let allPlots = [];',
    '    try {',
    '      allPlots = db.prepare("SELECT name FROM plots ORDER BY name ASC").all();',
    '    } catch(e) {',
    '      allPlots = [{ name: "Larkhall" }, { name: "City Centre" }, { name: "Station" }, { name: "Oldfield Park" }, { name: "Weston" }];',
    '    }',
    '',
    '    const densities = allPlots.map(p => {',
    '      const q = plotQueues[p.name] || [];',
    '      return { plotName: p.name, count: q.length };',
    '    });',
    '',
    '    // 3. Push complete directory to all terminals',
    '    io.emit("all_plot_densities", densities);',
    '  } catch (err) {',
    '    console.error("Error in broadcastPlotQueueRanks:", err.message);',
    '  }',
    '}'
  ];

  // Fix typo in JSON object inside cleanFunc if any
  const cleanCodeStr = cleanFunc.join('\n')
    .replace('plotName: pName;', 'plotName: pName,')
    .replace('plotRank: 0;', 'plotRank: 0,');

  lines.splice(startIdx, endIdx - startIdx, cleanCodeStr);
  fs.writeFileSync('index.js', lines.join('\n'));
  console.log("✅ Replaced broadcastPlotQueueRanks cleanly without duplicate catches!");
}

const { execSync } = require('child_process');
try {
  execSync('node -c index.js');
  console.log("🚀 index.js syntax is 100% CLEAN!");
} catch (e) {
  console.error("Syntax status:", e.message);
}
