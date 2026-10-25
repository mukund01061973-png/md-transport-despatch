const fs = require('fs');
let code = fs.readFileSync('index.js', 'utf8');

// 1. Check if cancel_booking socket event updates audit log
const cancelSection = `
    // === BOOKING CANCELLATION WITH AUDIT LOG ===
    socket.on('admin_cancel_job', (data) => {
      try {
        if (!data || !data.id) return;
        const jobId = data.id;
        const reason = (data.reason || 'Admin cancelled').trim();
        const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

        const current = db.prepare("SELECT dispatchAuditLog FROM bookings WHERE id = ?").get(jobId);
        let logs = [];
        try {
          logs = current && current.dispatchAuditLog ? JSON.parse(current.dispatchAuditLog) : [];
        } catch(e) { logs = []; }

        logs.push({
          action: 'CANCELLED',
          details: \`Reason: \${reason}\`,
          timestamp: now,
          actor: 'Admin'
        });

        db.prepare(\`
          UPDATE bookings SET 
            status = 'Cancelled', 
            assignedDriverId = NULL,
            dispatchAuditLog = ?
          WHERE id = ?
        \`).run(JSON.stringify(logs), jobId);

        console.log(\`🛑 Cancelled booking #\${jobId} with reason: "\${reason}"\`);
        broadcastAdminState();
      } catch(err) {
        console.error('Error in admin_cancel_job:', err);
      }
    });

    // === TRIP HISTORY / AUDIT HANDLER ===
    socket.on('admin_get_booking_audit', (data) => {
      try {
        if (!data || !data.jobId) return;
        const job = db.prepare("SELECT * FROM bookings WHERE id = ?").get(data.jobId);
        if (!job) {
          socket.emit('booking_audit_data', { logs: [] });
          return;
        }

        let logs = [];
        try {
          logs = job.dispatchAuditLog ? JSON.parse(job.dispatchAuditLog) : [];
        } catch(e) { logs = []; }

        // If no explicit logs yet, generate foundational milestones from columns
        if (logs.length === 0) {
          if (job.createdAt) {
            logs.push({ action: 'CREATED', details: \`Created via \${job.source || 'Web'} - Passenger: \${job.passenger || 'Guest'}\`, timestamp: job.createdAt });
          }
          if (job.dispatchedAt) {
            logs.push({ action: 'DISPATCHED', details: \`Sent to driver queue\`, timestamp: job.dispatchedAt });
          }
          if (job.acceptedAt) {
            logs.push({ action: 'ACCEPTED', details: \`Driver \${job.assignedDriverId || ''} accepted\`, timestamp: job.acceptedAt });
          }
          if (job.arrivedAt) {
            logs.push({ action: 'ARRIVED', details: 'Driver arrived at pickup', timestamp: job.arrivedAt });
          }
          if (job.pobAt) {
            logs.push({ action: 'POB', details: 'Passenger on board', timestamp: job.pobAt });
          }
          if (job.completedAt) {
            logs.push({ action: 'COMPLETED', details: \`Fare £\${Number(job.fare || 0).toFixed(2)}\`, timestamp: job.completedAt });
          }
        }

        socket.emit('booking_audit_data', { logs: logs, jobId: data.jobId });
      } catch(err) {
        console.error('Error fetching booking audit:', err);
      }
    });
`;

// Insert right before the driver wallet handler
const target = "// 10. DRIVER WALLET & EARNINGS";
if (code.includes(target) && !code.includes("admin_get_booking_audit")) {
  code = code.replace(target, cancelSection + '\n  ' + target);
  fs.writeFileSync('index.js', code);
  console.log('✅ Added admin_cancel_job and admin_get_booking_audit handlers to index.js');
} else {
  console.log('ℹ️ Handlers already exist or target line not found');
}
