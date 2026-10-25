const fs = require('fs');
let html = fs.readFileSync('public/driver.html', 'utf8');

// 1. Dynamic Grace Badge Text
html = html.replace(
  "badge.textContent = isGraceArmedByDriver ? 'Armed: Starts After Grace' : 'Free 5-Min Grace';",
  "const freeMins = (masterTariff && masterTariff.freeWaitMins) ? masterTariff.freeWaitMins : 2; badge.textContent = isGraceArmedByDriver ? 'Armed: Starts After Grace' : `Free ${freeMins}-Min Grace`;"
);

// 2. Make waitChargeTimer update the main fare display every second live
const oldTimerLoop = `waitChargeTimer = setInterval(() => {
        waitChargeSeconds++;
        const mins = Math.floor(waitChargeSeconds / 60);
        const secs = waitChargeSeconds % 60;
        const billedMins = Math.ceil(waitChargeSeconds / 60);
        const fee = billedMins * WAIT_RATE;

        const clock = document.getElementById('waitClockDisplay');
        if (clock) {
            clock.innerHTML = '+' + String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0') + ' <span style="font-size:0.95rem; color:#f87171;">(+£' + fee.toFixed(2) + ')</span>';
        }

        if (waitChargeSeconds % 10 === 0) {
            syncFeeToServer(billedMins, fee, 0, 0);
        }
    }, 1000);`;

const liveTimerLoop = `waitChargeTimer = setInterval(() => {
        waitChargeSeconds++;
        const mins = Math.floor(waitChargeSeconds / 60);
        const secs = waitChargeSeconds % 60;
        const billedMins = Math.ceil(waitChargeSeconds / 60);
        const rate = (masterTariff && masterTariff.waitingRatePerMin) ? masterTariff.waitingRatePerMin : (window.WAIT_RATE || 0.35);
        const fee = billedMins * rate;

        // Update waiting box display
        const clock = document.getElementById('waitClockDisplay');
        if (clock) {
            clock.innerHTML = '+' + String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0') + ' <span style="font-size:0.95rem; color:#f87171;">(+£' + fee.toFixed(2) + ')</span>';
        }

        // Live update active header fare every second
        window.extraChargesTotal = fee;
        updateTotalFareDisplay();

        // Broadcast to server ledger every 5 seconds or upon first second
        if (waitChargeSeconds === 1 || waitChargeSeconds % 5 === 0) {
            syncFeeToServer(billedMins, fee, 0, 0);
        }
    }, 1000);`;

if (html.includes(oldTimerLoop)) {
  html = html.replace(oldTimerLoop, liveTimerLoop);
  console.log("✅ Updated waitChargeTimer for real-time header fare accrual!");
} else {
  console.log("⚠️ waitChargeTimer pattern slightly different, checking fallback...");
  html = html.replace(/waitChargeTimer\s*=\s*setInterval\(\(\)\s*=>\s*\{[\s\S]*?waitChargeSeconds\s*%\s*10\s*===\s*0[\s\S]*?\}, 1000\);/, liveTimerLoop);
}

fs.writeFileSync('public/driver.html', html);
console.log('✅ Driver badge & live ticking synced!');
