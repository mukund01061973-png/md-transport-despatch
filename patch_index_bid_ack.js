const fs = require('fs');
let code = fs.readFileSync('index.js', 'utf8');

// Replace any bare socket.emit("job_created_ack") inside routeJobCascade
const buggyLine = `socket.emit("job_created_ack", { success: true, jobId: newJobId, message: "Booking confirmed successfully!" });`;

if (code.includes(buggyLine)) {
  code = code.replace(buggyLine, `// socket ack guarded: caller handles its own ack\n    if (typeof socket !== 'undefined' && socket && socket.emit) { socket.emit("job_created_ack", { success: true, jobId: job.id, message: "Booking confirmed successfully!" }); }`);
  fs.writeFileSync('index.js', code);
  console.log("✅ Fixed un-scoped socket.emit inside routeJobCascade!");
} else {
  console.log("ℹ️ No bare socket.emit found or already guarded.");
}

const { execSync } = require('child_process');
try {
  execSync('node -c index.js');
  console.log("🚀 index.js syntax is 100% CLEAN!");
} catch (e) {
  console.error("Syntax error in index.js:", e.message);
}
