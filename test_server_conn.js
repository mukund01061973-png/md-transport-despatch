const fs = require('fs');
const s = fs.readFileSync('index.js', 'utf8');

const ioConnIdx = s.indexOf("io.on('connection'");
const ioConnIdx2 = s.indexOf('io.on("connection"');
const idx = ioConnIdx !== -1 ? ioConnIdx : ioConnIdx2;

if (idx !== -1) {
  console.log("=== io.on('connection') in index.js ===");
  console.log(s.slice(idx, idx + 800));
} else {
  console.log("Could not find io.on('connection') directly!");
}
