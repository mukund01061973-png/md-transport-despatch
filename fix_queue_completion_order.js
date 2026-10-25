const fs = require('fs');
let code = fs.readFileSync('index.js', 'utf8');

// Ensure that upon COMPLETED, we clear activeJobId in memory FIRST,
// then re-enter the queue and broadcast.
const searchMarker = `// Free driver in memory`;
const targetBlock = code.indexOf(searchMarker);

// Let's locate the re-entry try-catch block and place it AFTER freeing memory
const reEntryStart = code.indexOf('// Check if driver has any follow-up job or is completely free');
const reEntryEnd = code.indexOf('console.error("Queue re-entry error:", qe.message);\n        }', reEntryStart);

if (reEntryStart !== -1 && reEntryEnd !== -1) {
  const fullReEntryEnd = reEntryEnd + 'console.error("Queue re-entry error:", qe.message);\n        }'.length;
  const reEntrySnippet = code.substring(reEntryStart, fullReEntryEnd);
  
  // Cut reEntrySnippet from its old location
  code = code.substring(0, reEntryStart) + code.substring(fullReEntryEnd);
  
  // Place reEntrySnippet AFTER connectedDrivers freeing loop
  const freeLoopEndMarker = `delete d.activeJobId;`;
  const freeLoopEnd = code.indexOf(freeLoopEndMarker);
  
  if (freeLoopEnd !== -1) {
    const insertPoint = code.indexOf('});', freeLoopEnd) + 3;
    code = code.substring(0, insertPoint) + '\n\n        ' + reEntrySnippet + code.substring(insertPoint);
    console.log("✅ Moved queue re-entry to run AFTER clearing activeJobId!");
  }
}

// Ensure reconnect grace timer does not evict driver if they are currently connected under another socket
const graceSearch = `const isReconnected = Object.values(connectedDrivers).some(x => (x.driverId || "").toUpperCase() === dId);`;
const graceReplacement = `const isReconnected = Object.values(connectedDrivers).some(x => (x.driverId || "").toUpperCase() === dId);
        if (isReconnected) {
          console.log(\`🛡️ Driver \${dName} (\${dId}) is actively connected on another socket. Stand rank preserved.\`);
          return;
        }`;

if (code.includes(graceSearch) && !code.includes('🛡️ Driver ${dName}')) {
  code = code.replace(graceSearch, graceReplacement);
  console.log("✅ Protected active drivers from stale disconnect grace timer evictions!");
}

fs.writeFileSync('index.js', code);

const { execSync } = require('child_process');
try {
  execSync('node -c index.js');
  console.log("🚀 index.js syntax is 100% CLEAN!");
} catch (e) {
  console.error("Syntax status:", e.message);
}
