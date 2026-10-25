const fs = require('fs');
let srv = fs.readFileSync('index.js', 'utf8');

if (!srv.includes('admin_archive_booking')) {
  const insertMarker = "socket.on('admin_delete_plot'";
  const newHandlers = `
    socket.on('admin_archive_booking', (jobId) => {
      try {
        db.prepare("UPDATE bookings SET status = 'Archived' WHERE id = ?").run(jobId);
        if (typeof sendAdminState === 'function') sendAdminState();
        console.log(\`📦 Booking #\${jobId} archived\`);
      } catch (err) {
        console.error('Archive error:', err.message);
      }
    });

    socket.on('admin_delete_booking', (jobId) => {
      try {
        db.prepare("DELETE FROM bookings WHERE id = ?").run(jobId);
        if (typeof sendAdminState === 'function') sendAdminState();
        console.log(\`🗑️️ Booking #\${jobId} deleted\`);
      } catch (err) {
        console.error('Delete booking error:', err.message);
      }
    });
`;
  srv = srv.replace(insertMarker, newHandlers + '\n    ' + insertMarker);
  fs.writeFileSync('index.js', srv);
  console.log("✅ Added admin_archive_booking and admin_delete_booking to index.js!");
} else {
  console.log("Archive handlers already present in index.js");
}
