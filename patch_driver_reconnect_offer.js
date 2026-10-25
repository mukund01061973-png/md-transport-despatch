const fs = require('fs');
let code = fs.readFileSync('index.js', 'utf8');

// Target the block right after sending open bids to re-deliver active offers
const oldTarget = `      // Deliver all existing Open For Bidding jobs directly to this driver handset
      try {
        const currentBids = db.prepare("SELECT * FROM bookings WHERE status = 'Open For Bidding'").all();
        currentBids.forEach(b => socket.emit("open_job_for_bidding", b));
      } catch(e) {}`;

const newTarget = `      // Deliver all existing Open For Bidding jobs directly to this driver handset
      try {
        const currentBids = db.prepare("SELECT * FROM bookings WHERE status = 'Open For Bidding'").all();
        currentBids.forEach(b => socket.emit("open_job_for_bidding", b));
      } catch(e) {}

      // Re-deliver any active, unexpired 15s job offer if driver reconnected mid-offer
      try {
        if (typeof activeOfferTimers !== 'undefined') {
          for (const [offerJobId, timer] of Object.entries(activeOfferTimers)) {
            if (timer) {
              const pendingJob = db.prepare("SELECT * FROM bookings WHERE id = ?").get(offerJobId);
              if (pendingJob && !['Accepted', 'ACCEPTED', 'Arrived', 'ARRIVED', 'POB', 'Completed', 'COMPLETED', 'Cancelled'].includes(pendingJob.status)) {
                socket.emit("job_offer", pendingJob);
                console.log(\`🔄 Re-delivered active 15s offer for #\${pendingJob.id} to reconnected driver \${driverId}\`);
              }
            }
          }
        }
      } catch(e) {
        console.error("Error re-delivering active offer:", e.message);
      }`;

if (code.includes(oldTarget)) {
  code = code.replace(oldTarget, newTarget);
  fs.writeFileSync('index.js', code);
  console.log("✅ Successfully patched index.js to re-deliver active offers on driver reconnect!");
} else {
  console.log("⚠️ Could not match target block exactly in index.js");
}

const { execSync } = require('child_process');
try {
  execSync('node -c index.js');
  console.log("🚀 index.js syntax is 100% CLEAN!");
} catch (e) {
  console.error("Syntax error:", e.message);
}
