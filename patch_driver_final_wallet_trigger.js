const fs = require('fs');
let html = fs.readFileSync('public/driver.html', 'utf8');

// 1. Remove the duplicate wallet code block at lines 1180+ that had wrong element IDs
const dupWalletRegex = /\/\/\s*DRIVER WALLET & EARNINGS SYNC[\s\S]*?socket\.on\('driver_wallet_data'[\s\S]*?earnEl\.textContent\s*=\s*'£'[\s\S]*?\}\);[\s\S]*?\}/;
if (dupWalletRegex.test(html)) {
  html = html.replace(dupWalletRegex, '/* cleaned redundant wallet listener */');
  console.log("✅ Removed duplicate wallet listener from bottom of driver.html");
}

// 2. When transitionTrip('Completed') is triggered, ensure total fare is accurate and refresh wallet
const transitionCompletedOld = `if (nextStatus === 'Completed') {
                clearInterval(waitTimerInterval);
                activeTrip = null;
                currentOffer = null;`;

const transitionCompletedNew = `if (nextStatus === 'Completed' || nextStatus.toUpperCase() === 'COMPLETED') {
                clearAllTimers();
                setTimeout(() => { requestWalletUpdate(); }, 600);
                activeTrip = null;
                currentOffer = null;`;

if (html.includes(transitionCompletedOld)) {
  html = html.replace(transitionCompletedOld, transitionCompletedNew);
  console.log("✅ Connected requestWalletUpdate() to trip completion!");
}

fs.writeFileSync('public/driver.html', html);
console.log('✅ public/driver.html finalized!');
