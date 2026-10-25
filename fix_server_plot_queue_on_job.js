const fs = require('fs');
let code = fs.readFileSync('index.js', 'utf8');

// 1. When a driver ACCEPTS an offer -> remove from stand queue so other drivers move up!
const acceptSearch = `const isCurrentlyOfferedToMe = (currentBooking.status === "Offered" && String(currentBooking.offeredToDriverId) === driverId);`;
const acceptReplacement = `const isCurrentlyOfferedToMe = (currentBooking.status === "Offered" && String(currentBooking.offeredToDriverId) === driverId);
        
        // Remove busy driver from stand queue so Position #2 immediately becomes Position #1!
        const curDriverPlot = d ? d.currentPlot : null;
        removeDriverFromPlotQueues(driverId);
        if (curDriverPlot) broadcastPlotQueueRanks(curDriverPlot);`;

if (!code.includes('removeDriverFromPlotQueues(driverId);\n        if (curDriverPlot) broadcastPlotQueueRanks(curDriverPlot);') && code.includes(acceptSearch)) {
  code = code.replace(acceptSearch, acceptReplacement);
  console.log("✅ Added stand queue removal on job ACCEPT!");
}

// 2. When a driver CLAIMS a bid board job -> remove from stand queue
const claimSearch = `socket.emit("active_trip_assigned", freshJob);`;
const claimReplacement = `socket.emit("active_trip_assigned", freshJob);

      // Remove busy driver from stand queue so other waiting drivers advance
      const claimingDriver = connectedDrivers[socket.id];
      const claimPlot = claimingDriver ? claimingDriver.currentPlot : null;
      removeDriverFromPlotQueues(driverId);
      if (claimPlot) broadcastPlotQueueRanks(claimPlot);`;

if (!code.includes('removeDriverFromPlotQueues(driverId);\n      if (claimPlot) broadcastPlotQueueRanks(claimPlot);') && code.includes(claimSearch)) {
  code = code.replace(claimSearch, claimReplacement);
  console.log("✅ Added stand queue removal on bid board CLAIM!");
}

// 3. When a driver FINISHES a job (COMPLETED) -> if they have no active/follow-up jobs, re-enter plot queue at back
const completedDbSearch = `UPDATE bookings SET 
            status = 'COMPLETED',
            fare = COALESCE(?, fare),
            waitingCharge = COALESCE(?, waitingCharge),
            completedAt = ?
          WHERE id = ? OR id = ?
        \`).run(fare, waitingCharge, completedIso, rawJobId, fullJobId);`;

const completedDbReplacement = `UPDATE bookings SET 
            status = 'COMPLETED',
            fare = COALESCE(?, fare),
            waitingCharge = COALESCE(?, waitingCharge),
            completedAt = ?
          WHERE id = ? OR id = ?
        \`).run(fare, waitingCharge, completedIso, rawJobId, fullJobId);

        // Check if driver has any follow-up job or is completely free
        try {
          const completedDrvId = (data.driverId || "").toUpperCase().trim();
          if (completedDrvId) {
            const remainingJobs = db.prepare("SELECT id FROM bookings WHERE assignedDriverId = ? AND status IN ('ACCEPTED', 'Accepted', 'Arrived', 'ARRIVED', 'POB')").all(completedDrvId);
            if (!remainingJobs || remainingJobs.length === 0) {
              // Completely free: re-insert into current stand queue at bottom
              const driverEntry = Object.values(connectedDrivers).find(x => x.driverId.toUpperCase() === completedDrvId);
              const dropPlot = driverEntry ? (driverEntry.currentPlot || "Larkhall") : "Larkhall";
              plotQueues[dropPlot] = plotQueues[dropPlot] || [];
              const alreadyIn = plotQueues[dropPlot].some(x => x.driverId.toUpperCase() === completedDrvId);
              if (!alreadyIn) {
                plotQueues[dropPlot].push({ driverId: completedDrvId, enteredAt: Date.now() });
              }
              broadcastPlotQueueRanks(dropPlot);
            }
          }
        } catch(qe) {
          console.error("Queue re-entry error:", qe.message);
        }`;

if (!code.includes('// Check if driver has any follow-up job or is completely free') && code.includes(completedDbSearch)) {
  code = code.replace(completedDbSearch, completedDbReplacement);
  console.log("✅ Added automatic re-queuing when a driver becomes completely free!");
}

fs.writeFileSync('index.js', code);

const { execSync } = require('child_process');
try {
  execSync('node -c index.js');
  console.log("🚀 index.js syntax is 100% CLEAN!");
} catch (e) {
  console.error("Syntax error in index.js:", e.message);
}
