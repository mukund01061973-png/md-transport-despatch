const fs = require('fs');
let html = fs.readFileSync('public/driver.html', 'utf8');

// 1. Fix En-Route (POB) Timer so it updates total fare every second live!
const oldEnRouteLoop = `enRouteTimer = setInterval(() => {
            enRouteSeconds++;
            renderEnRouteStopControls();

            if (enRouteSeconds % 10 === 0) {
                const billedMins = Math.ceil(enRouteSeconds / 60);
                const fee = billedMins * WAIT_RATE;
                const arrFee = Math.ceil(waitChargeSeconds / 60) * WAIT_RATE;
                syncFeeToServer(Math.ceil(waitChargeSeconds / 60), arrFee + fee, billedMins, fee);
            }
        }, 1000);`;

const liveEnRouteLoop = `enRouteTimer = setInterval(() => {
            enRouteSeconds++;
            
            const billedMins = Math.ceil(enRouteSeconds / 60);
            const rate = (masterTariff && masterTariff.waitingRatePerMin) ? masterTariff.waitingRatePerMin : (window.WAIT_RATE || 0.35);
            const stopFee = billedMins * rate;
            const arrMins = Math.ceil(waitChargeSeconds / 60);
            const arrFee = arrMins * rate;
            const combinedExtra = arrFee + stopFee;

            // Live update header fare on screen every second
            window.extraChargesTotal = combinedExtra;
            updateTotalFareDisplay();

            // Refresh the stopover control badge & counter
            renderEnRouteStopControls();

            // Sync to server every 5 seconds or upon first second
            if (enRouteSeconds === 1 || enRouteSeconds % 5 === 0) {
                syncFeeToServer(arrMins, combinedExtra, billedMins, stopFee);
            }
        }, 1000);`;

if (html.includes(oldEnRouteLoop)) {
  html = html.replace(oldEnRouteLoop, liveEnRouteLoop);
  console.log("✅ Replaced enRouteTimer loop with 1-second live fare accrual!");
} else {
  // Regex fallback
  html = html.replace(/enRouteTimer\s*=\s*setInterval\(\(\)\s*=>\s*\{[\s\S]*?enRouteSeconds\s*%\s*10\s*===\s*0[\s\S]*?\}, 1000\);/, liveEnRouteLoop);
  console.log("✅ Applied enRouteTimer live ticker via regex fallback!");
}

// 2. Add Wallet UI refresh requester & socket listener
const walletListenerCode = `
    // DRIVER WALLET & EARNINGS SYNC
    function requestDriverWalletRefresh() {
        const dId = (myDriver && myDriver.driverId) ? myDriver.driverId : 'UKUND';
        if (typeof socket !== 'undefined') {
            socket.emit('get_driver_wallet', { driverId: dId });
        }
    }

    if (typeof socket !== 'undefined') {
        socket.on('wallet_refresh_needed', () => {
            requestDriverWalletRefresh();
        });

        socket.on('driver_wallet_data', (w) => {
            const earnEl = document.getElementById('driverNetEarningsDisplay') || document.getElementById('hdrDriverEarnings');
            if (earnEl) {
                earnEl.textContent = '£' + Number(w.netEarnings || 0).toFixed(2);
            }
            const countEl = document.getElementById('driverCompletedCount');
            if (countEl) {
                countEl.textContent = w.completedCount || 0;
            }
        });
    }
`;

if (!html.includes('function requestDriverWalletRefresh()')) {
  const closingScript = '</script>';
  const lastScriptIdx = html.lastIndexOf(closingScript);
  if (lastScriptIdx !== -1) {
    html = html.slice(0, lastScriptIdx) + walletListenerCode + '\n' + html.slice(lastScriptIdx);
    console.log("✅ Hooked requestDriverWalletRefresh & wallet_refresh_needed listener!");
  }
}

// 3. Trigger wallet refresh when driver logs in and completes trip
html = html.replace(
  "socket.emit('update_trip_status', {",
  "requestDriverWalletRefresh();\n            socket.emit('update_trip_status', {"
);

fs.writeFileSync('public/driver.html', html);
console.log('✅ Driver interface updated!');
