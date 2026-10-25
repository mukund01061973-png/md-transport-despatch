const fs = require('fs');
let code = fs.readFileSync('index.js', 'utf8');

// Target block in status update
const oldBlock = `        const curJob = db.prepare("SELECT * FROM bookings WHERE id = ? OR id = ?").get(rawJobId, fullJobId);
        if (curJob && curJob.phone) {
          const trackLink = \`http://localhost:3000/track/\${rawJobId}\`;
          if (status === "ARRIVED") {
            sendPassengerSMS(curJob.phone, \`Your MD Taxi driver (\${curJob.assignedDriverId || "Mukund"}) has arrived outside \${curJob.pickup || "your address"}. Track: \${trackLink}\`);
          } else if (status === "ACCEPTED") {
            sendPassengerSMS(curJob.phone, \`Your MD Taxi booking #\${rawJobId} has been dispatched! Track your driver live: \${trackLink}\`);
          }
        }`;

const newBlock = `        const curJob = db.prepare("SELECT * FROM bookings WHERE id = ? OR id = ?").get(rawJobId, fullJobId);
        if (curJob && curJob.phone) {
          const baseUrl = process.env.APP_BASE_URL || "http://localhost:3000";
          const trackLink = \`\${baseUrl}/track.html?jobId=\${rawJobId}\`;
          
          // Fetch assigned driver and vehicle specs
          let driverDetails = "Your driver";
          let carDetails = "";
          const dId = curJob.assignedDriverId || driverId;
          if (dId) {
            try {
              const dRow = db.prepare("SELECT name, vehicleMake, vehicleModel, vehicleReg, vehicleColor FROM drivers WHERE UPPER(driverId) = UPPER(?)").get(dId);
              if (dRow) {
                driverDetails = dRow.name || dId;
                const vParts = [dRow.vehicleColor, dRow.vehicleMake, dRow.vehicleModel].filter(Boolean).join(" ");
                if (vParts || dRow.vehicleReg) {
                  carDetails = \` in \${vParts || "vehicle"}\${dRow.vehicleReg ? " (" + dRow.vehicleReg + ")" : ""}\`;
                }
              }
            } catch(e) {}
          }

          if (status === "ACCEPTED" || status === "ON_THE_WAY" || status === "EN_ROUTE") {
            const msg = \`MD Taxi Update: Driver \${driverDetails}\${carDetails} is on the way! Live Tracking: \${trackLink}\`;
            sendPassengerSMS(curJob.phone, msg);
          } else if (status === "ARRIVED") {
            const msg = \`MD Taxi: Driver \${driverDetails}\${carDetails} has arrived outside \${curJob.pickup || "your address"}. Track: \${trackLink}\`;
            sendPassengerSMS(curJob.phone, msg);
          }
        }`;

if (code.includes(oldBlock)) {
  code = code.replace(oldBlock, newBlock);
  fs.writeFileSync('index.js', code);
  console.log('✅ Driver En Route SMS + Full Host URL successfully injected into index.js!');
} else {
  // Line-by-line replacement fallback
  const startIdx = code.indexOf('const curJob = db.prepare("SELECT * FROM bookings WHERE id = ? OR id = ?").get(rawJobId, fullJobId);');
  const endIdx = code.indexOf('}\n      }\n\n      socket.emit("wallet_refresh_needed");', startIdx);
  if (startIdx !== -1 && endIdx !== -1) {
    code = code.substring(0, startIdx) + newBlock + code.substring(endIdx);
    fs.writeFileSync('index.js', code);
    console.log('✅ Injected via offset anchor!');
  } else {
    console.warn('⚠️ Manual verification required for status handler block.');
  }
}

// Ensure create_job also uses the standardized APP_BASE_URL
const oldBookingSmsLink = 'Live Tracking: /track.html?jobId=';
if (code.includes(oldBookingSmsLink)) {
  code = code.replace(/Live Tracking: \/track\.html\?jobId=/g, 'Live Tracking: " + (process.env.APP_BASE_URL || "http://localhost:3000") + "/track.html?jobId=');
  fs.writeFileSync('index.js', code);
  console.log('✅ Standardized base URL in booking confirmation SMS!');
}
