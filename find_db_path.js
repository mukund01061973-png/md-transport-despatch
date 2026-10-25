const fs = require('fs');

// 1. Look for database files on disk
console.log("=== 1. SQLITE FILES IN DIRECTORY ===");
const files = fs.readdirSync('.').filter(f => f.endsWith('.sqlite') || f.endsWith('.db'));
console.log("Found SQLite files:", files);

// Check data/ subfolder if it exists
if (fs.existsSync('data')) {
  const dataFiles = fs.readdirSync('data').filter(f => f.endsWith('.sqlite') || f.endsWith('.db'));
  console.log("Found in data/:", dataFiles);
}

// 2. Inspect where index.js initializes Database
console.log("\n=== 2. DATABASE INITIALIZATION IN index.js ===");
const index = fs.readFileSync('index.js', 'utf8');
const lines = index.split('\n');
lines.forEach((l, idx) => {
  if (l.includes("new Database(") || l.includes("better-sqlite3") || l.includes(".sqlite") || l.includes(".db")) {
    console.log(`Line ${idx + 1}: ${l.trim()}`);
  }
});
