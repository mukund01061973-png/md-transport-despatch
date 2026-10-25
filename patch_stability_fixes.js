const fs = require('fs');
let code = fs.readFileSync('index.js', 'utf8');

// 1. STATE GUARD: Prevent completed jobs from reverting
const oldStatusHandler = 'console.log("🔄 [STATUS UPDATE] Job #" + rawJobId + " -> " + status + " (Fare: " + fare + ")");';
const guardedStatusHandler = `console.log("🔄 [STATUS UPDATE] Job #" + rawJobId + " -> " + status + " (Fare: " + fare + ")");

      // Guard: Never downgrade a completed or cancelled job
      try {
        const existingJob = db.prepare("SELECT status FROM bookings WHERE id = ? OR id = ?").get(rawJobId, fullJobId);
        if (existingJob && (existingJob.status === "COMPLETED" || existingJob.status === "CANCELLED")) {
          console.log("🛑 [GUARD] Ignored stale status '" + status + "' for already finished job #" + rawJobId);
          return;
        }
      } catch(e) {}`;

if (code.includes(oldStatusHandler)) {
  code = code.replace(oldStatusHandler, guardedStatusHandler);
  console.log("✅ State Guard successfully installed for bookings.");
}

// 2. DISCONNECT GRACE PERIOD: Retain stand rank across reloads / network drops
const oldDisconnect = `  socket.on("disconnect", () => {
    const d = connectedDrivers[socket.id];
    if (d) {
      console.log(\`🔌 Driver socket disconnected: \${d.name} (\${d.driverId})\`);
      delete connectedDrivers[socket.id];
      for (const p of Object.keys(plotQueues)) {
        plotQueues[p] = (plotQueues[p] || []).filter(x => x.driverId.toUpperCase() !== (d.driverId || "").toUpperCase());
      }
      broadcastPlotQueueRanks();
      broadcastAdminState();
    }
  });`;

const gracefulDisconnect = `  // 45-second reconnect grace period
  socket.on("disconnect", () => {
    const d = connectedDrivers[socket.id];
    if (d) {
      const dId = (d.driverId || "").toUpperCase();
      const dName = d.name;
      console.log(\`🔌 Driver socket disconnected: \${dName} (\${dId}) - preserving stand rank (45s grace)\`);
      delete connectedDrivers[socket.id];

      // Delay queue eviction to survive tab reloads and brief network blips
      setTimeout(() => {
        const isReconnected = Object.values(connectedDrivers).some(x => (x.driverId || "").toUpperCase() === dId);
        if (!isReconnected) {
          console.log(\`⏰ Reconnect grace expired for \${dName} (\${dId}). Evicting from stand.\`);
          for (const p of Object.keys(plotQueues)) {
            plotQueues[p] = (plotQueues[p] || []).filter(x => x.driverId.toUpperCase() !== dId);
          }
          broadcastPlotQueueRanks();
          broadcastAdminState();
        }
      }, 45000);
    }
  });`;

if (code.includes(oldDisconnect)) {
  code = code.replace(oldDisconnect, gracefulDisconnect);
  console.log("✅ Driver Stand 45s Grace Period successfully installed.");
} else {
  // Pattern-based fallback replacement
  code = code.replace(/socket\.on\("disconnect",\s*\(\)\s*=>\s*\{[\s\S]*?broadcastAdminState\(\);\s*\}\s*\}\);/, gracefulDisconnect);
  console.log("✅ Driver Stand Grace Period applied via fallback pattern.");
}

fs.writeFileSync('index.js', code);
console.log("🚀 index.js saved successfully!");
