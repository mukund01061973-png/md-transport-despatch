const fs = require('fs');
let html = fs.readFileSync('public/driver.html', 'utf8');

// Fix: if rank is 0, it means the driver is not ranked (or busy on trip), NOT rank 1!
const targetRankLine = `const rank = data.plotRank || 1;`;
const fixedRankLine = `const rank = (data.plotRank !== undefined && data.plotRank !== null) ? data.plotRank : 0;`;

if (html.includes(targetRankLine)) {
  html = html.replace(targetRankLine, fixedRankLine);
  console.log("✅ Fixed plotRank 0 handling in driver.html!");
}

// In updateHeaderBadge, if rank is 0 and no trip is active, show Standby instead of Position #1
const rankTxtLine = `const rankTxt = "Position #" + rank + " of " + total;`;
const fixedRankTxtLine = `const rankTxt = rank > 0 ? ("Position #" + rank + " of " + total) : "In Plot (Standby)";`;

if (html.includes(rankTxtLine)) {
  html = html.replace(rankTxtLine, fixedRankTxtLine);
  console.log("✅ Handled non-zero rank formatting in driver.html!");
}

fs.writeFileSync('public/driver.html', html);
console.log("🚀 public/driver.html patched successfully!");
