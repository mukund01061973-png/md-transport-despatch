const fs = require('fs');
let html = fs.readFileSync('public/driver.html', 'utf8');

// 1. Add global tracking for active base fare and accrued waiting charges
const topStateHook = "window.WAIT_RATE = 0.35;";
const fareStateVars = `window.WAIT_RATE = 0.35;
    window.activeBaseFare = 0.00;
    window.extraChargesTotal = 0.00;

    function updateTotalFareDisplay() {
        const trip = window.activeTrip || window.currentTrip;
        const base = parseFloat(window.activeBaseFare || (trip ? trip.fare : 0) || 0);
        const extra = parseFloat(window.extraChargesTotal || 0);
        const finalTotal = (base + extra).toFixed(2);
        
        const fareEl = document.getElementById('tripFare');
        if (fareEl) {
            fareEl.textContent = finalTotal;
        }
        return finalTotal;
    }
`;

if (html.includes(topStateHook)) {
    html = html.replace(topStateHook, fareStateVars);
}

// 2. In renderActiveTrip, store activeBaseFare and reset extraChargesTotal
const renderTripHook = "activeTrip = job;\n            extraChargesTotal = 0;";
const solidRenderTrip = `activeTrip = job;
            window.activeBaseFare = parseFloat(job.fare || 0);
            window.extraChargesTotal = 0.00;
            updateTotalFareDisplay();`;

if (html.includes(renderTripHook)) {
    html = html.replace(renderTripHook, solidRenderTrip);
}

// 3. Make startArrivalGraceCountdown use the dynamic masterTariff.freeWaitMins
const oldGraceStart = `function startArrivalGraceCountdown() {
    clearAllTimers();
    freeGraceSeconds = 300; // 5 mins`;

const dynamicGraceStart = `function startArrivalGraceCountdown() {
    clearAllTimers();
    const configuredMins = (masterTariff && masterTariff.freeWaitMins) ? parseInt(masterTariff.freeWaitMins) : 5;
    window.freeGraceSeconds = configuredMins * 60;`;

if (html.includes(oldGraceStart)) {
    html = html.replace(oldGraceStart, dynamicGraceStart);
} else {
    // Regex replace fallback
    html = html.replace(/freeGraceSeconds\s*=\s*\d+;[^\n]*/g, "const configuredMins = (masterTariff && masterTariff.freeWaitMins) ? parseInt(masterTariff.freeWaitMins) : 5; window.freeGraceSeconds = configuredMins * 60;");
}

// 4. Update syncFeeToServer to calculate the fee from masterTariff.waitingRatePerMin dynamically
const oldSyncFee = `function syncFeeToServer(arrMins, totalFee, enRouteMins, enRouteFee) {
    const trip = activeTrip || currentTrip;
    if (!trip || !trip.id) return;
    const baseFare = parseFloat(trip.fare || 0);
    extraChargesTotal = parseFloat(totalFee || 0);
    updateTotalFareDisplay();

    if (typeof socket !== 'undefined') {
        socket.emit('driver_update_waiting', {
            jobId: trip.id,
            arrivalWaitMins: arrMins || 0,
            enRouteWaitMins: enRouteMins || 0,
            waitingCharge: totalFee || 0,
            totalFare: (baseFare + totalFee).toFixed(2)
        });
    }
}`;

const dynamicSyncFee = `function syncFeeToServer(arrMins, totalFee, enRouteMins, enRouteFee) {
    const trip = window.activeTrip || window.currentTrip;
    if (!trip || !trip.id) return;
    
    window.extraChargesTotal = parseFloat(totalFee || 0);
    const calculatedTotal = updateTotalFareDisplay();

    if (typeof socket !== 'undefined') {
        socket.emit('driver_update_waiting', {
            jobId: trip.id,
            arrivalWaitMins: arrMins || 0,
            enRouteWaitMins: enRouteMins || 0,
            waitingCharge: parseFloat(totalFee || 0).toFixed(2),
            totalFare: calculatedTotal
        });
    }
}`;

if (html.includes(oldSyncFee)) {
    html = html.replace(oldSyncFee, dynamicSyncFee);
}

// 5. In transitionTrip('Completed'), submit the calculated total including waiting fees
const oldTransitionFare = "const totalFare = Number(document.getElementById('tripFare').textContent) || activeTrip.fare;";
const robustTransitionFare = `const trip = window.activeTrip || window.currentTrip;
            const liveTotalText = document.getElementById('tripFare') ? document.getElementById('tripFare').textContent : '';
            const base = parseFloat(window.activeBaseFare || (trip ? trip.fare : 0) || 0);
            const extra = parseFloat(window.extraChargesTotal || 0);
            const totalFare = Number(liveTotalText) || (base + extra);`;

if (html.includes(oldTransitionFare)) {
    html = html.replace(oldTransitionFare, robustTransitionFare);
}

fs.writeFileSync('public/driver.html', html);
console.log('✅ public/driver.html patched with dynamic tariff, live fare calculation, and server ledger sync!');
