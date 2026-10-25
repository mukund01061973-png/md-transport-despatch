const fs = require('fs');
let html = fs.readFileSync('public/driver.html', 'utf8');

// 1. Remove the old duplicate blue waiting box (lines 111-132)
const oldBoxRegex = /<div id="waitingTimeBox"[\s\S]*?<\/div>\s*<\/div>/;
html = html.replace(oldBoxRegex, '');

// 2. Disable the legacy automatic countdown that runs on "Arrived"
// We replace the legacy timer logic with a clean no-op so arrival does NOT start any timer
const oldTimerCode = `waitCountdownSeconds = (masterTariff.freeWaitingMins || 2) * 60;
            if (waitingInterval) clearInterval(waitingInterval);
            waitingInterval = setInterval(() => {
                waitCountdownSeconds--;
                if (waitCountdownSeconds >= 0) {
                    const mins = Math.floor(waitCountdownSeconds / 60);
                    const secs = waitCountdownSeconds % 60;
                    if (timerEl) {
                        timerEl.textContent = (mins < 10 ? '0' : '') + mins + ':' + (secs < 10 ? '0' : '') + secs;
                        timerEl.style.color = '#fde047';
                    }
                    if (subEl) subEl.textContent = '(Free Grace)';
                } else {
                    const over = Math.abs(waitCountdownSeconds);
                    const mins = Math.floor(over / 60);
                    const secs = over % 60;
                    if (timerEl) {
                        timerEl.textContent = '+' + (mins < 10 ? '0' : '') + mins + ':' + (secs < 10 ? '0' : '') + secs;
                        timerEl.style.color = '#ef4444';
                    }
                    if (subEl) subEl.textContent = '(Charging Waiting)';

                    // Automatically accumulate every full minute passed grace window
                    if (secs === 0) {
                        addWaitingFee(masterTariff.waitingRatePerMin, '1 minute waiting');
                    }
                }
            }, 1000);`;

// Replace with driver-controlled state initialization
const newTimerCode = `// Automatic charging disabled: driver controls waiting explicitly via toggleDriverWaiting()
            if (waitingInterval) { clearInterval(waitingInterval); waitingInterval = null; }
            const waitDisp = document.getElementById('waitingTimerDisplay');
            if (waitDisp) waitDisp.innerHTML = '00:00 <span style="font-size:0.75rem; color:#94a3b8; font-weight:400;">(+£0.00)</span>';`;

if (html.includes(oldTimerCode)) {
  html = html.replace(oldTimerCode, newTimerCode);
} else {
  // If slightly modified, neutralize the auto-tick block directly
  html = html.replace(/addWaitingFee\(masterTariff\.waitingRatePerMin,\s*'1 minute waiting'\);/g, '// auto-charging removed');
}

// 3. Ensure the driver HUD syncs directly with activeTrip fare calculations
const driverWaitSyncTarget = "function syncWaitingToServer(mins, charge) {";
const driverWaitSyncUpdated = `function syncWaitingToServer(mins, charge) {
    const trip = activeTrip || currentTrip;
    if (!trip || !trip.id) return;
    extraChargesTotal = parseFloat(charge || 0);
    updateTotalFareDisplay();
    socket.emit('driver_update_waiting', {
        jobId: trip.id,
        arrivalWaitMins: waitType === 'arrival' ? mins : 0,
        enRouteWaitMins: waitType === 'enroute' ? mins : 0,
        waitingCharge: parseFloat(charge || 0),
        totalFare: (parseFloat(trip.fare || 0) + parseFloat(charge || 0)).toFixed(2)
    });
`;

if (html.includes(driverWaitSyncTarget)) {
  html = html.replace(driverWaitSyncTarget, driverWaitSyncUpdated);
}

fs.writeFileSync('public/driver.html', html);
console.log('✅ Legacy automatic waiting timer and duplicate UI removed successfully!');
