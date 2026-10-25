const fs = require('fs');
let html = fs.readFileSync('public/driver.html', 'utf8');

// Add driver return to base action right above or next to the main action button
const rejectActionEngine = `
    function driverReturnJobToBase() {
        if (!activeTrip && !window.currentTrip) return;
        const trip = activeTrip || window.currentTrip;
        const reason = prompt('Please enter reason for returning job to base (e.g. Passenger No-Show, Breakdown, Traffic):', 'Passenger No-Show');
        if (!reason) return;

        if (confirm('Are you sure you want to return this booking back to base? It will be unassigned and returned to the dispatch queue.')) {
            clearAllTimers();
            socket.emit('driver_reject_active_job', {
                jobId: trip.id || trip.bookingId,
                driverId: (myDriver && myDriver.driverId) ? myDriver.driverId : 'UKUND',
                reason: reason
            });
            activeTrip = null;
            window.currentTrip = null;
            document.getElementById('activeTripCard').style.display = 'none';
            document.getElementById('noTripSection').style.display = 'block';
            speakAlert("Job returned to base dispatch.");
        }
    }
`;

if (!html.includes('function driverReturnJobToBase')) {
    const insertPt = html.indexOf('function transitionTrip(');
    if (insertPt !== -1) {
        html = html.slice(0, insertPt) + rejectActionEngine + '\n\n        ' + html.slice(insertPt);
    }
}

// Add the Return to Base button inside updateSequentialUI for ARRIVED and POB states
const arrivedBtnHook = `container.innerHTML = '<button type="button" id="btnMainLifecycle" class="btn btn-green"`;
const arrivedBtnReplacement = `container.innerHTML = '<button type="button" id="btnMainLifecycle" class="btn btn-green"`;

// Add a secondary Return to Base button inside the waiting card or container
html = html.replace(
    '<div id="lifecycleActionBtnContainer"',
    '<div id="driverReturnBox" style="text-align:right; margin-bottom:6px;"><button type="button" onclick="driverReturnJobToBase()" style="background:transparent; border:none; color:#f87171; font-size:0.8rem; font-weight:700; cursor:pointer; text-decoration:underline;">⚠️ Problem? Return Job to Base</button></div>\n                    <div id="lifecycleActionBtnContainer"'
);

fs.writeFileSync('public/driver.html', html);
console.log('✅ Added driverReturnJobToBase function and UI trigger in public/driver.html');
