const fs = require('fs');
const s = fs.readFileSync('index.js', 'utf8');

const connIdx = s.indexOf("io.on('connection'");
const idx = connIdx !== -1 ? connIdx : s.indexOf('io.on("connection"');

if (idx !== -1) {
  console.log("=== INSIDE io.on('connection') (first 1200 chars) ===");
  console.log(s.slice(idx, idx + 1200));
} else {
  console.log("io.on('connection') not found!");
}
