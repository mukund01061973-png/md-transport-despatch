const fs = require('fs');
let code = fs.readFileSync('index.js', 'utf8');

// 1. Locate broadcastPlotQueueRanks definition
const funcStartMarker = 'function broadcastPlotQueueRanks(';
const funcIdx = code.indexOf(funcStartMarker);

// 2. Locate the next top-level function or socket block after it
const nextBlockMarker = code.indexOf('// 2. Fetch all registered plots', funcIdx);
const altNextMarker = code.indexOf('io.on("connection"', funcIdx);
const altNextMarker2 = code.indexOf('io.on(\x27connection\x27', funcIdx);

// Locate end of broadcastPlotQueueRanks
let endIdx = -1;
if (nextBlockMarker !== -1) {
  // Find where this section concludes
  const plotLookupMarker = code.indexOf('io.emit("plots_status_update"', nextBlockMarker);
  if (plotLookupMarker !== -1) {
    endIdx = code.indexOf('}', plotLookupMarker);
    if (endIdx !== -1) endIdx = code.indexOf('}', endIdx + 1); // Close try
    if (endIdx !== -1) endIdx = code.indexOf('}', endIdx + 1); // Close function
  }
}

// Clean unified broadcastPlotQueueRanks implementation
const cleanBroadcastFunc = `function broadcastPlotQueueRanks(targetPlotId) {
  try {
    for (const [pId, q] of Object.entries(plotQueues)) {
      const total = (q || []).length;
      (q || []).forEach((entry, idx) => {
        const rank = idx + 1;
        for (const [sid, d] of Object.entries(connectedDrivers)) {
          if (d && d.driverId && d.driverId.toUpperCase() === entry.driverId.toUpperCase()) {
            d.plotRank = rank;
            d.totalInPlot = total;
            d.currentPlotName = pId;
            io.to(sid).emit("queue_update", {
              plotName: pId,
              plotRank: rank,
              totalInPlot: total
            });
          }
        }
      });
    }

    for (const [sid, d] of Object.entries(connectedDrivers)) {
      if (d && d.driverId) {
        let found = false;
        let pName = d.currentPlot || "Standby";
        for (const [pId, q] of Object.entries(plotQueues)) {
          if ((q || []).some(x => x.driverId.toUpperCase() === d.driverId.toUpperCase())) {
            found = true;
            break;
          }
        }
        if (!found && d.activeJobId == null) {
          d.plotRank = 0;
          d.totalInPlot = (plotQueues[pName] || []).length;
          io.to(sid).emit("queue_update", {
            plotName: pName,
            plotRank: 0,
            totalInPlot: d.totalInPlot
          });
        }
      }
    }
  } catch (err) {
    console.error("Error in broadcastPlotQueueRanks:", err.message);
  }
}`;

// If syntax is broken, inspect and replace the broken broadcast block
if (code.includes('} catch (err) {') && code.indexOf('} catch (err) {') < 720) {
  // Extract clean file up to function broadcastPlotQueueRanks
  const beforeFunc = code.substring(0, code.indexOf('function broadcastPlotQueueRanks'));
  // Find where socket connection starts
  let afterFuncIdx = code.indexOf('io.on("connection"');
  if (afterFuncIdx === -1) afterFuncIdx = code.indexOf('io.on(\x27connection\x27');
  
  if (afterFuncIdx !== -1) {
    code = beforeFunc + cleanBroadcastFunc + '\n\n' + code.substring(afterFuncIdx);
    console.log("✅ Rebuilt broadcastPlotQueueRanks and removed broken braces!");
  }
}

fs.writeFileSync('index.js', code);

const { execSync } = require('child_process');
try {
  execSync('node -c index.js');
  console.log("🚀 index.js syntax is 100% CLEAN!");
} catch (e) {
  console.error("Syntax status:", e.message);
}
