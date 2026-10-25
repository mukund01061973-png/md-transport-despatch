const fs = require('fs');
let code = fs.readFileSync('index.js', 'utf8');

// Replace the query that loads allJobs in broadcastAdminState
const oldQuery = 'db.prepare("SELECT * FROM bookings").all()';
const newQuery = 'db.prepare("SELECT rowid, * FROM bookings ORDER BY rowid DESC").all()';

if (code.includes(oldQuery)) {
  code = code.replace(oldQuery, newQuery);
  fs.writeFileSync('index.js', code);
  console.log('✅ Updated index.js to select rowid and order bookings by rowid DESC!');
} else {
  // If slightly different spacing:
  code = code.replace(/db\.prepare\(["']SELECT\s+\*\s+FROM\s+bookings["']\)\.all\(\)/g, newQuery);
  fs.writeFileSync('index.js', code);
  console.log('✅ Applied regex update for bookings query order in index.js');
}
