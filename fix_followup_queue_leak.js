const fs = require('fs');
let code = fs.readFileSync('index.js', 'utf8');

const targetLoop = `        // Free driver in memory
        Object.values(connectedDrivers).forEach(d => {
          if (String(d.activeJobId) === rawJobId || String(d.activeJobId) === fullJobId || (driverId && String(d.driverId).toUpperCase() === driverId)) {
            d.activeJobId = null;
            d.status = "Available";
            // Re-join plot stand at the BACK of the queue (FIFO tail)
            const pName = d.currentPlotName || "Larkhall";
            if (!plotQueues[pName]) plotQueues[pName] = [];
            plotQueues[pName] = plotQueues[pName].filter(x => x.driverId.toUpperCase() !== d.driverId.toUpperCase());
            plotQueues[pName].push({ driverId: d.driverId, enteredAt: Date.now() });
          }
        });
        broadcastPlotQueueRanks();`;

const newLoop = `        // Free driver in memory ONLY IF NO FOLLOW-UP/NEXT TRIP EXISTS
        Object.values(connectedDrivers).forEach(d => {
          const isTargetDriver = String(d.activeJobId) === rawJobId || 
                                 String(d.activeJobId) === fullJobId || 
                                 (driverId && String(d.driverId).toUpperCase() === driverId.toUpperCase());

          if (isTargetDriver) {
            const thisDriverId = String(d.driverId).toUpperCase();
            
            // Check if driver has another active or accepted job queued
            let nextJob = null;
            try {
              nextJob = db.prepare(\`
                SELECT id FROM bookings 
                WHERE UPPER(assignedDriverId) = ? 
                  AND status IN ('ACCEPTED', 'Accepted', 'ARRIVED', 'Arrived', 'POB')
                  AND id != ? AND id != ?
                ORDER BY id ASC LIMIT 1
              \`).get(thisDriverId, rawJobId, fullJobId);
            } catch(e) {
              console.error("Error checking next job:", e.message);
            }

            if (nextJob) {
              // Driver is still busy with follow-up run: DO NOT re-enter stand queue!
              d.activeJobId = nextJob.id;
              d.status = "On Job";
              removeDriverFromPlotQueues(thisDriverId);
              console.log(\`🚖 Driver \${thisDriverId} transitioned immediately to follow-up Job #\${nextJob.id}. Stand queue bypassed.\`);
            } else {
              // Driver is completely free: re-join stand queue at back
              d.activeJobId = null;
              d.status = "Available";
              const pName = d.currentPlotName || d.currentPlot || "Larkhall";
              if (!plotQueues[pName]) plotQueues[pName] = [];
              plotQueues[pName] = plotQueues[pName].filter(x => x.driverId.toUpperCase() !== thisDriverId);
              plotQueues[pName].push({ driverId: d.driverId, enteredAt: Date.now() });
              console.log(\`🏁 Driver \${thisDriverId} completed all jobs. Returned to stand \${pName}.\`);
            }
          }
        });
        broadcastPlotQueueRanks();`;

if (code.includes(targetLoop)) {
  code = code.replace(targetLoop, newLoop);
  fs.writeFileSync('index.js', code);
  console.log("✅ Successfully patched queue re-entry in index.js!");
} else {
  console.error("❌ Target loop not found. Check formatting.");
}

const { execSync } = require('child_process');
try {
  execSync('node -c index.js');
  console.log("🚀 index.js syntax is 100% CLEAN!");
} catch(e) {
  console.error("Syntax status:", e.message);
}
