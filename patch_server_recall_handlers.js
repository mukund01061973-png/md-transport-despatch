const fs = require('fs');
let code = fs.readFileSync('index.js', 'utf8');

const recallEngine = `
  // ================= RECALL & RETURN TO BASE HANDLERS =================
  socket.on('driver_reject_active_job', (data) => {
    try {
      const { jobId, driverId, reason } = data;
      if (!jobId) return;

      db.prepare(\`
        UPDATE bookings SET 
          status = 'UNASSIGNED', 
          assignedDriverId = NULL, 
          assignedDriverName = NULL 
        WHERE id = ?
      \`).run(jobId);

      const d = connectedDrivers[socket.id];
      if (d) {
        d.status = 'Available';
        d.activeJobId = null;
      }

      appendAudit(jobId, 'RETURNED_TO_BASE', \`Driver \${driverId || 'MUKUND'} returned job to base. Reason: \${reason || 'Driver problem'}\`);
      broadcastAdminState();
      io.emit('job_recalled_to_base', { jobId });
      console.log(\`📢 Job #\${jobId} returned to base by driver \${driverId}\`);
    } catch(err) {
      console.error('Error in driver_reject_active_job:', err.message);
    }
  });

  socket.on('admin_recall_job', (data) => {
    try {
      const { id } = data;
      if (!id) return;

      const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(id);
      db.prepare(\`
        UPDATE bookings SET 
          status = 'UNASSIGNED', 
          assignedDriverId = NULL, 
          assignedDriverName = NULL 
        WHERE id = ?
      \`).run(id);

      // Free up any driver who was assigned
      Object.values(connectedDrivers).forEach(dr => {
        if (dr.activeJobId === id) {
          dr.activeJobId = null;
          dr.status = 'Available';
        }
      });

      appendAudit(id, 'RECALLED_TO_BASE', 'Admin recalled job back to base dispatch.');
      broadcastAdminState();
      io.emit('job_recalled_to_base', { jobId: id });
      console.log(\`📢 Admin recalled job #\${id} back to base\`);
    } catch(err) {
      console.error('Error in admin_recall_job:', err.message);
    }
  });
`;

if (!code.includes('driver_reject_active_job')) {
  const insertPt = code.indexOf("socket.on('update_trip_status'");
  if (insertPt !== -1) {
    code = code.slice(0, insertPt) + recallEngine + '\n  ' + code.slice(insertPt);
    fs.writeFileSync('index.js', code);
    console.log('✅ index.js updated with driver_reject_active_job and admin_recall_job handlers!');
  }
} else {
  console.log('ℹ️ Server already has recall handlers.');
}
