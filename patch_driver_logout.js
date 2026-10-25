const fs = require('fs');
let code = fs.readFileSync('index.js', 'utf8');

// Ensure explicit driver_logout removes driver from plot queues immediately
const logoutHandler = `  socket.on("driver_logout", (data) => {
    try {
      const d = connectedDrivers[socket.id];
      const dId = ((data && data.driverId) || (d ? d.driverId : "")).toUpperCase().trim();
      console.log(\`🚪 Driver explicit logout: \${dId} - evicting immediately from all stands.\`);
      if (dId) {
        removeDriverFromPlotQueues(dId);
        broadcastPlotQueueRanks();
      }
      delete connectedDrivers[socket.id];
      broadcastAdminState();
    } catch(err) {
      console.error("Error in driver_logout handler:", err.message);
    }
  });\n\n`;

if (!code.includes('socket.on("driver_logout"')) {
  const disconnectMarker = 'socket.on("disconnect", () => {';
  if (code.includes(disconnectMarker)) {
    code = code.replace(disconnectMarker, logoutHandler + '  ' + disconnectMarker);
    console.log("✅ Added immediate driver_logout socket handler!");
  }
} else {
  console.log("ℹ️ driver_logout handler already present, ensuring queue purge is present...");
  code = code.replace(/socket\.on\(["']driver_logout["'][\s\S]*?\}\);/, logoutHandler.trim());
}

fs.writeFileSync('index.js', code);

const { execSync } = require('child_process');
try {
  execSync('node -c index.js');
  console.log("🚀 index.js syntax is 100% CLEAN!");
} catch (e) {
  console.error("Syntax error in index.js:", e.message);
}
