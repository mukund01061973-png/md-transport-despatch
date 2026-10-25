const fs = require('fs');
let code = fs.readFileSync('index.js', 'utf8');

// 1. Upgrade findDriverSocket to handle case insensitivity & clean lookups
const oldFindDriverSocket = `function findDriverSocket(targetId) {
  if (!targetId || targetId === "AUTO" || targetId === "Unassigned") return null;
  const cleanTarget = String(targetId).trim().toUpperCase();
  for (const sid of Object.keys(connectedDrivers)) {
    const cd = connectedDrivers[sid];
    if (!cd) continue;
    const dId = String(cd.driverId || "").trim().toUpperCase();
    const dName = String(cd.name || "").trim().toUpperCase();
    if (dId === cleanTarget || dName === cleanTarget || dId.includes(cleanTarget) || cleanTarget.includes(dId)) {
      return sid;
    }
  }
  return null;
}`;

const newFindDriverSocket = `function findDriverSocket(targetId) {
  if (!targetId) return null;
  const clean = String(targetId).trim().toUpperCase();
  if (clean === 'AUTO' || clean === 'UNASSIGNED' || clean === 'NONE' || clean === '') return null;
  for (const sid of Object.keys(connectedDrivers)) {
    const cd = connectedDrivers[sid];
    if (!cd) continue;
    const dId = String(cd.driverId || "").trim().toUpperCase();
    const dName = String(cd.name || "").trim().toUpperCase();
    if (dId === clean || dName === clean || (dId && clean.includes(dId)) || (dName && clean.includes(dName))) {
      return sid;
    }
  }
  return null;
}`;

code = code.replace(oldFindDriverSocket, newFindDriverSocket);

// 2. Patch dispatch routing in create_job
const oldCreateDispatch = `      // Alert the assigned driver or broadcast to available drivers
      if (job.assignedDriverId && String(job.assignedDriverId).toUpperCase() !== 'AUTO') {
        const targetSid = findDriverSocket(job.assignedDriverId);

        if (targetSid) {
          const freshJob = db.prepare('SELECT * FROM bookings WHERE id = ?').get(newJobId);
          io.to(targetSid).emit('job_offer', freshJob);
          console.log(\`📲 Dispatched job offer #\${newJobId} directly to driver socket \${targetSid} (\${job.assignedDriverId})\`);
        }
      } else {
        // Auto / Unassigned: send to available connected drivers
        const freshJob = db.prepare('SELECT * FROM bookings WHERE id = ?').get(newJobId);
        const onlineSids = Object.keys(connectedDrivers);
        if (onlineSids.length > 0) {
          onlineSids.forEach(sid => {
            io.to(sid).emit('job_offer', freshJob);
          });
          console.log(\`📢 Broadcast job offer #\${newJobId} to \${onlineSids.length} online driver(s)\`);
        } else {
          console.log(\`ℹ️ Booking #\${newJobId} pending - no drivers currently connected\`);
        }
      }`;

const newCreateDispatch = `      // Robust dispatch bridge for create_job
      const freshJob = db.prepare('SELECT * FROM bookings WHERE id = ?').get(newJobId) || jobRecord;
      const targetDriverStr = String(job.assignedDriverId || '').trim();
      const targetSid = findDriverSocket(targetDriverStr);

      if (targetSid) {
        io.to(targetSid).emit('job_offer', freshJob);
        console.log(\`📲 Dispatched job offer #\${newJobId} directly to driver \${targetDriverStr} (socket: \${targetSid})\`);
      } else {
        // Broadcast to all active connected drivers
        const onlineSids = Object.keys(connectedDrivers);
        if (onlineSids.length > 0) {
          onlineSids.forEach(sid => {
            io.to(sid).emit('job_offer', freshJob);
          });
          console.log(\`📢 Broadcast job offer #\${newJobId} to \${onlineSids.length} connected driver(s)\`);
        } else {
          console.log(\`ℹ️ Booking #\${newJobId} queued - 0 drivers currently connected\`);
        }
      }`;

code = code.replace(oldCreateDispatch, newCreateDispatch);

// 3. Patch admin_reassign_booking so manual admin allocation always pushes offer to driver
const oldReassign = `  socket.on('admin_reassign_booking', (data) => {
    try {
      const { jobId, newDriverId, reason } = data;
      db.prepare("UPDATE bookings SET assignedDriverId = ?, status = 'Accepted' WHERE id = ?").run(newDriverId, jobId);
      appendAudit(jobId, 'REASSIGNED', \`Reassigned to \${newDriverId}. Reason: \${reason || 'None'}\`);
      const targetSocketId = findDriverSocket(newDriverId);
      if (targetSocketId) {
        const freshJob = db.prepare('SELECT * FROM bookings WHERE id = ?').get(jobId);
        io.to(targetSocketId).emit('job_offer', freshJob);
      }
      broadcastAdminState();
    } catch (err) {
      console.error('Error in admin_reassign_booking:', err.message);
    }
  });`;

const newReassign = `  socket.on('admin_reassign_booking', (data) => {
    try {
      const jobId = data.jobId || data.id;
      const newDriverId = data.newDriverId || data.driverId || 'UNASSIGNED';
      const reason = data.reason || 'Admin reassign';

      const isUnassigned = (!newDriverId || ['AUTO', 'UNASSIGNED', 'NONE'].includes(String(newDriverId).trim().toUpperCase()));
      const newStatus = isUnassigned ? 'Pending' : 'Accepted';
      const assignedVal = isUnassigned ? null : String(newDriverId).trim();

      db.prepare("UPDATE bookings SET assignedDriverId = ?, status = ? WHERE id = ?").run(assignedVal, newStatus, jobId);
      if (typeof appendAudit === 'function') {
        appendAudit(jobId, 'REASSIGNED', \`Reassigned to \${assignedVal || 'Unassigned'}. Reason: \${reason}\`);
      }

      const freshJob = db.prepare('SELECT * FROM bookings WHERE id = ?').get(jobId);
      const targetSocketId = findDriverSocket(assignedVal);

      if (targetSocketId) {
        io.to(targetSocketId).emit('job_offer', freshJob);
        io.to(targetSocketId).emit('active_trip_assigned', freshJob);
        console.log(\`📲 Dispatched reassigned job #\${jobId} directly to driver \${assignedVal}\`);
      } else if (isUnassigned) {
        const onlineSids = Object.keys(connectedDrivers);
        onlineSids.forEach(sid => io.to(sid).emit('job_offer', freshJob));
        console.log(\`📢 Broadcast unassigned job #\${jobId} to \${onlineSids.length} drivers\`);
      }

      broadcastAdminState();
    } catch (err) {
      console.error('Error in admin_reassign_booking:', err.message);
    }
  });`;

code = code.replace(oldReassign, newReassign);

fs.writeFileSync('index.js', code);
console.log('✅ Dispatch bridge successfully upgraded in index.js!');
