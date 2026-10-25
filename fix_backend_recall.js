const fs = require('fs');
let code = fs.readFileSync('index.js', 'utf8');

if (!code.includes("'admin_recall_job'")) {
  const marker = "socket.on('admin_cancel_job'";
  const idx = code.indexOf(marker);
  if (idx !== -1) {
    const recallHandler = `
    socket.on('admin_recall_job', (data) => {
      try {
        if (!data || !data.id) return;
        db.prepare("UPDATE bookings SET status = 'Pending', assignedDriverId = NULL WHERE id = ?").run(data.id);
        console.log(\`↩️ Booking #\${data.id} recalled/reactivated to Pending\`);
        broadcastAdminState();
      } catch(err) {
        console.error('Error recalling job:', err);
      }
    });
`;
    code = code.slice(0, idx) + recallHandler + '\n    ' + code.slice(idx);
    fs.writeFileSync('index.js', code);
    console.log('✅ Added admin_recall_job handler to index.js');
  } else {
    console.log('ℹ️ admin_cancel_job marker not found');
  }
} else {
  console.log('ℹ️ admin_recall_job already exists');
}
