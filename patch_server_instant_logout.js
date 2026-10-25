const fs = require('fs');
let code = fs.readFileSync('index.js', 'utf8');

// Update broadcastPlotQueueRanks to inform drivers if they are no longer in queue
const broadcastFuncTarget = `function broadcastPlotQueueRanks(targetPlotId) {`;

const newBroadcastFunc = `function broadcastPlotQueueRanks(targetPlotId) {
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

    // Drivers not present in any queue get notified
    for (const [sid, d] of Object.entries(connectedDrivers)) {
      if (d && d.driverId) {
        let foundInAny = false;
        let pName = d.currentPlot || "Standby";
        for (const [pId, q] of Object.entries(plotQueues)) {
          const idx = (q || []).findIndex(x => x.driverId.toUpperCase() === d.driverId.toUpperCase());
          if (idx !== -1) {
            foundInAny = true;
            break;
          }
        }
        if (!foundInAny && d.activeJobId == null) {
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
  } catch(e) {
    console.error("Error in broadcastPlotQueueRanks:", e.message);
  }`;

if (code.includes(broadcastFuncTarget)) {
  const funcStart = code.indexOf(broadcastFuncTarget);
  const nextMarker = `// 2. Fetch all registered plots and compute driv`;
  const funcEnd = code.indexOf(nextMarker, funcStart);
  if (funcEnd !== -1) {
    code = code.substring(0, funcStart) + newBroadcastFunc + "\n\n    " + code.substring(funcEnd);
    console.log("✅ Updated broadcastPlotQueueRanks with rank clearing for unqueued drivers!");
  }
}

// Enhance socket.on("driver_logout")
const logoutRegex = /socket\.on\(["']driver_logout["'][\s\S]*?\}\);/;
const robustLogoutHandler = `socket.on("driver_logout", (data) => {
    try {
      const d = connectedDrivers[socket.id];
      const dId = ((data && data.driverId) || (d ? d.driverId : "")).toUpperCase().trim();
      const dName = d ? d.name : dId;
      console.log(\`🚪 Driver explicit logout: \${dName} (\${dId}) - instant zero-delay stand purge.\`);
      
      // Purge driver from all stands immediately
      if (dId) {
        removeDriverFromPlotQueues(dId);
      }
      
      // Clean up connectedDriver entry
      delete connectedDrivers[socket.id];
      
      // Re-broadcast updated ranks to all remaining connected drivers
      broadcastPlotQueueRanks();
      broadcastAdminState();
    } catch(err) {
      console.error("Error in driver_logout:", err.message);
    }
  });`;

if (logoutRegex.test(code)) {
  code = code.replace(logoutRegex, robustLogoutHandler);
  console.log("✅ Replaced driver_logout handler with synchronous zero-delay eviction!");
}

fs.writeFileSync('index.js', code);

const { execSync } = require('child_process');
try {
  execSync('node -c index.js');
  console.log("🚀 index.js syntax is 100% CLEAN!");
} catch (e) {
  console.error("Syntax error in index.js:", e.message);
}
