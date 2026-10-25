const fs = require('fs');
let code = fs.readFileSync('index.js', 'utf8');

// 1. Add chat and waiting listeners inside socket connection
const socketHook = "socket.on('update_trip_status', (data) => {";

const newHandlers = `  // ================= 2-WAY CHAT & LIVE MESSAGING =================
  socket.on('send_driver_message', (data) => {
    try {
      const driverId = socket.driverId || (connectedDrivers[socket.id] && connectedDrivers[socket.id].driverId) || data.driverId;
      const driverName = (connectedDrivers[socket.id] && connectedDrivers[socket.id].name) || driverId || 'Driver';
      const text = (data.text || data.message || '').trim();
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      if (!text) return;

      const payload = {
        sender: 'driver',
        driverId: driverId,
        driverName: driverName,
        text: text,
        time: timeStr
      };

      console.log(\`💬 [\${driverId}] -> Dispatcher: \${text}\`);
      // Broadcast to admin dashboard
      io.emit('driver_message_received', payload);
      // Echo back to sender driver socket
      socket.emit('driver_message_received', payload);
    } catch(err) {
      console.error('Error in send_driver_message:', err.message);
    }
  });

  socket.on('send_admin_message', (data) => {
    try {
      const targetDriverId = (data.driverId || '').trim();
      const text = (data.text || data.message || '').trim();
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      if (!text) return;

      const payload = {
        sender: 'dispatcher',
        driverId: targetDriverId,
        text: text,
        time: timeStr
      };

      console.log(\`💬 Dispatcher -> [\${targetDriverId || 'ALL'}]: \${text}\`);

      if (targetDriverId && targetDriverId.toUpperCase() !== 'ALL') {
        const targetSid = findDriverSocket(targetDriverId);
        if (targetSid) {
          io.to(targetSid).emit('driver_message_received', payload);
        }
      } else {
        // Broadcast to all drivers
        Object.keys(connectedDrivers).forEach(sid => {
          io.to(sid).emit('driver_message_received', payload);
        });
      }
      // Also echo to admin
      io.emit('driver_message_received', payload);
    } catch(err) {
      console.error('Error in send_admin_message:', err.message);
    }
  });

  // ================= DRIVER WAITING TIME SYNC =================
  socket.on('driver_update_waiting', (data) => {
    try {
      const { jobId, arrivalWaitMins, enRouteWaitMins, waitingCharge, totalFare } = data;
      if (!jobId) return;

      db.prepare(\`
        UPDATE bookings SET
          arrivalWaitMins = COALESCE(?, arrivalWaitMins),
          enRouteWaitMins = COALESCE(?, enRouteWaitMins),
          waitingCharge = COALESCE(?, waitingCharge),
          fare = COALESCE(?, fare)
        WHERE id = ?
      \`).run(
        arrivalWaitMins !== undefined ? arrivalWaitMins : null,
        enRouteWaitMins !== undefined ? enRouteWaitMins : null,
        waitingCharge !== undefined ? waitingCharge : null,
        totalFare !== undefined ? totalFare : null,
        jobId
      );

      appendAudit(jobId, 'WAITING_SYNC', \`Waiting updated: Arr=\${arrivalWaitMins || 0}m, EnRoute=\${enRouteWaitMins || 0}m. Charge: £\${waitingCharge || 0}\`);
      broadcastAdminState();
    } catch(err) {
      console.error('Error in driver_update_waiting:', err.message);
    }
  });

  socket.on('update_trip_status', (data) => {`;

if (!code.includes("socket.on('send_driver_message'")) {
  code = code.replace(socketHook, newHandlers);
  fs.writeFileSync('index.js', code);
  console.log('✅ index.js successfully patched with Chat & Waiting Time handlers!');
} else {
  console.log('ℹ️ Chat handlers already present in index.js');
}
