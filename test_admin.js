const fs = require('fs');
const vm = require('vm');

const html = fs.readFileSync('public/admin.html', 'utf8');

console.log("=== CHECKING HTML ELEMENTS ===");
console.log("socket.io.js tag:", html.includes('socket.io.js'));
console.log("jobsTableBody:", html.includes('jobsTableBody'));
console.log("driversTableBody:", html.includes('driversTableBody'));
console.log("airportsTableBody:", html.includes('airportsTableBody'));
console.log("plotsTableBody:", html.includes('plotsTableBody'));
console.log("accountsTableBody:", html.includes('accountsTableBody'));

console.log("\n=== COMPILING SCRIPT BLOCKS ===");
const scriptRegex = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
let match, count = 0;

while ((match = scriptRegex.exec(html)) !== null) {
  count++;
  const fullTag = match[0];
  const code = match[1];
  const isExternal = /src=["'][^"']+["']/.test(fullTag);
  
  if (isExternal) {
    const srcMatch = fullTag.match(/src=["']([^"']+)["']/);
    console.log(`Script #${count} [External]: ${srcMatch ? srcMatch[1] : 'unknown'}`);
  } else {
    try {
      new vm.Script(code, { filename: `script_${count}.js` });
      console.log(`Script #${count} [Inline]: ✅ 100% VALID`);
    } catch (err) {
      console.error(`Script #${count} [Inline]: ❌ ERROR: ${err.message}`);
      const lines = code.split('\n');
      const stackLine = err.stack.match(/script_\d+\.js:(\d+)/);
      if (stackLine) {
        const lNum = parseInt(stackLine[1]);
        console.log(`--- Lines around error (Line ${lNum}) ---`);
        for (let i = Math.max(0, lNum - 4); i < Math.min(lines.length, lNum + 4); i++) {
          const marker = (i + 1 === lNum) ? ">>> " : "    ";
          console.log(`${marker}${i + 1}: ${lines[i]}`);
        }
      } else {
        console.log(err.stack);
      }
    }
  }
}
