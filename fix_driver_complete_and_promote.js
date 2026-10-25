const fs = require('fs');
let html = fs.readFileSync('public/driver.html', 'utf8');

// Target the Completed branch in driver.html
const targetBranch = `} else if (nextStatus === 'Completed' || nextStatus.toUpperCase() === 'COMPLETED') {`;

const newBranch = `} else if (nextStatus === 'Completed' || nextStatus.toUpperCase() === 'COMPLETED') {
                clearAllTimers();
                setTimeout(() => { requestWalletUpdate(); }, 600);
                
                // Trigger resetDriverToStandby which automatically checks and promotes window.followUpJob!
                resetDriverToStandby();
                return;`;

if (html.includes(targetBranch)) {
  // Replace from targetBranch down to currentOffer = null;
  const startIdx = html.indexOf(targetBranch);
  const endIdx = html.indexOf(`currentOffer = null;`, startIdx);
  if (endIdx !== -1) {
    const fullEnd = endIdx + `currentOffer = null;`.length;
    html = html.substring(0, startIdx) + newBranch + html.substring(fullEnd);
    console.log("✅ Successfully patched driver.html to promote follow-up job on Completed!");
  } else {
    console.log("⚠️ Could not locate end marker in driver.html");
  }
} else {
  console.log("⚠️ Could not locate Completed branch target in driver.html");
}

fs.writeFileSync('public/driver.html', html);

// Validate JS syntax in driver.html
const scriptBlocks = [...html.matchAll(/<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/gi)];
let valid = true;
scriptBlocks.forEach((block, idx) => {
    try {
        new Function(block[1]);
    } catch (e) {
        valid = false;
        console.error(`Syntax error in script block:`, e.message);
    }
});
if (valid) console.log("🚀 public/driver.html syntax is 100% CLEAN!");
