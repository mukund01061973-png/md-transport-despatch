const fs = require('fs');
let code = fs.readFileSync('index.js', 'utf8');

const solidStatusHandler = `
  socket.on('update_trip_status', (data) => {
    try {
      const jobId = data.jobId || data.id;
      const status = (data.status || '').toUpperCase();
      const fare = data.fare !== undefined ? parseFloat(data.fare) : null;
      const driverId = (data.driverId || '').toUpperCase();
      const waitingCharge = data.waitingCharge !== undefined ? parseFloat(data.waitingCharge) : 0.00;

      if (!jobId) return;

      console.log(\`🔄 [STATUS UPDATE] Job #\${jobId} -> \${status} (Fare: £\${fare || 'N/A'}, Driver: \${driverId})\`);

      if (status === 'COMPLETED') {
        const completedIso = new Date().toISOString();
        
        // Finalize booking row
        db.prepare(\`
          UPDATE bookings SET 
            status = 'COMPLETED',
            fare = COALESCE(?, fare),
            waitingCharge = COALESCE(?, waitingCharge),
            completedAt = ?
          WHERE id = ?
        \`).run(fare, waitingCharge, completedIso, jobId);

        // Free driver in connected memory
        Object.values(connectedDrivers).forEach(d => {
          if (String(d.activeJobId) === String(jobId) || (driverId && String(d.driverId).toUpperCase() === driverId)) {
            d.activeJobId = null;
            d.status = 'Available';
          }
        });

        // Update driver table status to Available
        if (driverId) {
          try {
            db.prepare("UPDATE drivers SET status = 'Available' WHERE UPPER(driverId) = ?").run(driverId);
          } catch(e) {}
        }

        appendAudit(jobId, 'COMPLETED', \`Job completed. Final Fare: £\${fare ? fare.toFixed(2) : '0.00'}\`);
      } else {
        db.prepare(\`
          UPDATE bookings SET 
            status = ?,
            fare = COALESCE(?, fare)
          WHERE id = ?
        \`).run(status, fare, jobId);

        appendAudit(jobId, status, \`Driver updated status to \${status}\`);
      }

      // Notify driver client to sync wallet
      socket.emit('wallet_refresh_needed');
      io.emit('job_status_changed', { jobId, status, fare });

      // Push updated state to Admin Ledger immediately
      broadcastAdminState();
    } catch(err) {
      console.error('❌ Error updating trip status:', err.message);
    }
  });
`;

// Replace existing update_trip_status block
const regexStatusHook = /socket\.on\('update_trip_status'[\s\S]*?broadcastAdminState\(\);[\s\S]*?\}\);/;
if (regexStatusHook.test(code)) {
  code = code.replace(regexStatusHook, solidStatusHandler.trim());
  console.log("✅ Replaced update_trip_status cleanly!");
} else {
  console.log("⚠️ Target regex didn't match directly, searching fallback...");
  const startIdx = code.indexOf("socket.on('update_trip_status'");
  if (startIdx !== -1) {
    const endIdx = code.indexOf("socket.on('driver_update_waiting'", startIdx);
    if (endIdx !== -1) {
      code = code.slice(0, startIdx) + solidStatusHandler + '\n  ' + code.slice(endIdx);
      console.log("✅ Applied status handler replacement via index slice!");
    }
  }
}

fs.writeFileSync('index.js', code);
console.log('✅ Server completion engine updated!');
