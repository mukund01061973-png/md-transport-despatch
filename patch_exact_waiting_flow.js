const fs = require('fs');
let html = fs.readFileSync('public/driver.html', 'utf8');

// 1. Remove the first duplicate updateSequentialUI (around lines 485-535)
const firstDefStart = "function updateSequentialUI(status) {";
const firstDefEnd = "function transitionTrip(nextStatus) {";
const idx1 = html.indexOf(firstDefStart);
const idx2 = html.indexOf(firstDefEnd);

if (idx1 !== -1 && idx2 !== -1 && idx1 < idx2) {
  html = html.slice(0, idx1) + html.slice(idx2);
  console.log("✅ Removed duplicate first updateSequentialUI definition");
}

// 2. Remove the second duplicate and trailing code from "PRECISION WAITING" down to </script>
const marker = "// ================= PRECISION WAITING & LIFECYCLE CONTROLLER =================";
const lastScriptTag = html.lastIndexOf('</script>');
if (html.includes(marker)) {
  const markerIdx = html.indexOf(marker);
  html = html.slice(0, markerIdx) + html.slice(lastScriptTag);
  console.log("✅ Cleared previous waiting block");
}

// 3. Inject the clean, tested waiting engine before </script>
const exactEngine = `
// ==================== MASTER WAITING & EN-ROUTE CONTROLLER ====================
let freeGraceTimer = null;
let freeGraceSeconds = 300; // 5 mins free grace
let isGraceArmedByDriver = false;

let waitChargeTimer = null;
let waitChargeSeconds = 0;
let isChargingActive = false;

let enRouteTimer = null;
let enRouteSeconds = 0;
let isEnRouteStopped = false;

const WAIT_RATE = 0.35; // £0.35 per min

function clearAllTimers() {
    if (freeGraceTimer) { clearInterval(freeGraceTimer); freeGraceTimer = null; }
    if (waitChargeTimer) { clearInterval(waitChargeTimer); waitChargeTimer = null; }
    if (enRouteTimer) { clearInterval(enRouteTimer); enRouteTimer = null; }
    isChargingActive = false;
    isEnRouteStopped = false;
}

function updateSequentialUI(status) {
    const container = document.getElementById('lifecycleActionBtnContainer');
    const badge = document.getElementById('tripStatusBadge');
    const waitCard = document.getElementById('unifiedWaitingCard');
    const navBtn = document.getElementById('btnNavMaps');
    if (!container) return;

    const st = String(status || 'ACCEPTED').toUpperCase();
    if (badge) badge.textContent = st;

    if (st === 'ACCEPTED' || st === 'OFFERED' || st === 'PENDING') {
        clearAllTimers();
        isGraceArmedByDriver = false;
        waitChargeSeconds = 0;
        enRouteSeconds = 0;

        if (badge) badge.style.background = '#0284c7';
        if (waitCard) waitCard.style.display = 'none';
        if (navBtn) navBtn.textContent = '🗺️ Open Navigation to Pickup';

        container.innerHTML = '<button type="button" class="btn btn-blue" style="width:100%; padding:14px; font-size:1.1rem; font-weight:800; cursor:pointer;" onclick="transitionTrip(\\'Arrived\\')">📍 Mark Arrived at Pickup</button>';
    } 
    else if (st === 'ARRIVED') {
        clearAllTimers();
        if (badge) badge.style.background = '#f59e0b';
        if (navBtn) navBtn.textContent = '🗺️ Open Navigation to Pickup';
        if (waitCard) waitCard.style.display = 'block';

        startArrivalGraceCountdown();

        container.innerHTML = '<button type="button" class="btn btn-green" style="width:100%; padding:14px; font-size:1.1rem; font-weight:800; cursor:pointer; margin-top:8px;" onclick="transitionTrip(\\'POB\\')">👥 Passenger On Board (POB)</button>';
    } 
    else if (st === 'POB') {
        // PERMANENT STOP of arrival waiting
        clearAllTimers();
        if (badge) {
            badge.style.background = '#10b981';
            badge.textContent = 'POB (En Route)';
        }
        if (navBtn) navBtn.textContent = '🗺️ Open Navigation to Destination';
        if (waitCard) waitCard.style.display = 'block';

        renderEnRouteStopControls();

        container.innerHTML = '<button type="button" class="btn btn-red" style="width:100%; padding:14px; font-size:1.1rem; font-weight:800; cursor:pointer; margin-top:8px;" onclick="transitionTrip(\\'Completed\\')">🏁 Complete &amp; Clear Run</button>';
    } 
    else {
        clearAllTimers();
        if (waitCard) waitCard.style.display = 'none';
        container.innerHTML = '';
    }
}

// 1. ARRIVAL FREE WINDOW (Counts down 05:00 -> 00:00)
function startArrivalGraceCountdown() {
    clearAllTimers();
    freeGraceSeconds = 300; // 5 mins
    isGraceArmedByDriver = false;

    renderArrivalGraceUI();

    freeGraceTimer = setInterval(() => {
        freeGraceSeconds--;
        renderArrivalGraceUI();

        if (freeGraceSeconds <= 0) {
            clearInterval(freeGraceTimer);
            freeGraceTimer = null;
            onGraceWindowFinished();
        }
    }, 1000);
}

function renderArrivalGraceUI() {
    const title = document.getElementById('waitCardTitle');
    const badge = document.getElementById('waitCardBadge');
    const clock = document.getElementById('waitClockDisplay');
    const btnBox = document.getElementById('waitActionBtnBox');

    if (title) title.textContent = '⏱️ Free Arrival Grace Window';
    if (badge) {
        badge.textContent = isGraceArmedByDriver ? 'Armed: Starts After Grace' : 'Free 5-Min Grace';
        badge.style.background = isGraceArmedByDriver ? '#0284c7' : '#15803d';
        badge.style.color = '#fff';
    }

    const mins = Math.floor(Math.max(0, freeGraceSeconds) / 60);
    const secs = Math.max(0, freeGraceSeconds) % 60;
    if (clock) {
        clock.textContent = String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0');
        clock.style.color = '#fde047';
    }

    if (btnBox) {
        if (!isGraceArmedByDriver) {
            btnBox.innerHTML = '<button type="button" class="btn" style="width:100%; padding:10px; font-weight:700; background:#334155; color:#38bdf8; border:1px solid #0284c7; border-radius:6px; cursor:pointer;" onclick="toggleArmWaitingEarly()">⚡ Arm Waiting Charge (Starts After Grace)</button>';
        } else {
            btnBox.innerHTML = '<button type="button" class="btn" style="width:100%; padding:10px; font-weight:700; background:#065f46; color:#a7f3d0; border:1px solid #10b981; border-radius:6px; cursor:pointer;" onclick="toggleArmWaitingEarly()">✅ Armed: Free window running, will charge after 00:00 (Click to Disarm)</button>';
        }
    }
}

function toggleArmWaitingEarly() {
    isGraceArmedByDriver = !isGraceArmedByDriver;
    renderArrivalGraceUI();
}

// 2. WHEN 5 MINS EXPIRE
function onGraceWindowFinished() {
    if (isGraceArmedByDriver) {
        // Driver already authorized it: start charge timer now
        startWaitingChargeEngine();
    } else {
        // Driver has NOT clicked yet: stay at 00:00 with £0.00 until driver chooses to start
        const title = document.getElementById('waitCardTitle');
        const badge = document.getElementById('waitCardBadge');
        const clock = document.getElementById('waitClockDisplay');
        const btnBox = document.getElementById('waitActionBtnBox');

        if (title) title.textContent = '⏱️ Free Grace Expired';
        if (badge) {
            badge.textContent = 'Free Period Ended';
            badge.style.background = '#dc2626';
            badge.style.color = '#fff';
        }
        if (clock) {
            clock.textContent = '00:00 (+£0.00)';
            clock.style.color = '#ef4444';
        }
        if (btnBox) {
            btnBox.innerHTML = '<button type="button" class="btn" style="width:100%; padding:12px; font-weight:800; font-size:1rem; background:#dc2626; color:#fff; border-radius:6px; cursor:pointer;" onclick="startWaitingChargeEngine()">▶️ Start Waiting Charge (£0.35/min)</button>';
        }
    }
}

// 3. CHARGEABLE WAITING CLOCK
function startWaitingChargeEngine() {
    if (waitChargeTimer) clearInterval(waitChargeTimer);
    isChargingActive = true;

    const title = document.getElementById('waitCardTitle');
    const badge = document.getElementById('waitCardBadge');
    const btnBox = document.getElementById('waitActionBtnBox');

    if (title) title.textContent = '⏱️ Waiting Charge Running';
    if (badge) {
        badge.textContent = 'Charging Active';
        badge.style.background = '#b91c1c';
        badge.style.color = '#fff';
    }

    if (btnBox) {
        btnBox.innerHTML = '<button type="button" class="btn" style="width:100%; padding:10px; font-weight:700; background:#475569; color:#fff; border-radius:6px; cursor:pointer;" onclick="pauseWaitingCharge()">⏸️ Pause Waiting Charge</button>';
    }

    waitChargeTimer = setInterval(() => {
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
    }, 1000);
}

function pauseWaitingCharge() {
    if (waitChargeTimer) { clearInterval(waitChargeTimer); waitChargeTimer = null; }
    isChargingActive = false;
    const badge = document.getElementById('waitCardBadge');
    const btnBox = document.getElementById('waitActionBtnBox');
    if (badge) { badge.textContent = 'Paused'; badge.style.background = '#d97706'; }
    if (btnBox) {
        btnBox.innerHTML = '<button type="button" class="btn" style="width:100%; padding:10px; font-weight:700; background:#2563eb; color:#fff; border-radius:6px; cursor:pointer;" onclick="startWaitingChargeEngine()">▶️ Resume Waiting Charge</button>';
    }
}

// 4. EN-ROUTE STOPOVER / MULTI-DROP WAITING (POB)
function renderEnRouteStopControls() {
    const title = document.getElementById('waitCardTitle');
    const badge = document.getElementById('waitCardBadge');
    const clock = document.getElementById('waitClockDisplay');
    const btnBox = document.getElementById('waitActionBtnBox');

    if (title) title.textContent = '🚗 En-Route Stopover & Waiting';
    if (badge) {
        badge.textContent = isEnRouteStopped ? 'Vehicle Stopped' : 'En Route';
        badge.style.background = isEnRouteStopped ? '#b45309' : '#1e293b';
        badge.style.color = '#fff';
    }

    const mins = Math.floor(enRouteSeconds / 60);
    const secs = enRouteSeconds % 60;
    const billedMins = Math.ceil(enRouteSeconds / 60);
    const stopFee = billedMins > 0 ? (billedMins * WAIT_RATE) : 0;

    if (clock) {
        clock.innerHTML = String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0') + (stopFee > 0 ? ' <span style="font-size:0.95rem; color:#fde047;">(+£' + stopFee.toFixed(2) + ')</span>' : '');
        clock.style.color = '#38bdf8';
    }

    if (btnBox) {
        if (!isEnRouteStopped) {
            btnBox.innerHTML = '<button type="button" class="btn" style="width:100%; padding:12px; font-weight:800; background:#d97706; color:#fff; border-radius:6px; cursor:pointer;" onclick="toggleEnRouteTimer()">🛑 Passenger Stopped (Shop / Via / Wait)</button>';
        } else {
            btnBox.innerHTML = '<button type="button" class="btn" style="width:100%; padding:12px; font-weight:800; background:#15803d; color:#fff; border-radius:6px; cursor:pointer;" onclick="toggleEnRouteTimer()">▶️ Passenger Returned (Resume Journey)</button>';
        }
    }
}

function toggleEnRouteTimer() {
    if (!isEnRouteStopped) {
        isEnRouteStopped = true;
        renderEnRouteStopControls();

        enRouteTimer = setInterval(() => {
            enRouteSeconds++;
            renderEnRouteStopControls();

            if (enRouteSeconds % 10 === 0) {
                const billedMins = Math.ceil(enRouteSeconds / 60);
                const fee = billedMins * WAIT_RATE;
                const arrFee = Math.ceil(waitChargeSeconds / 60) * WAIT_RATE;
                syncFeeToServer(Math.ceil(waitChargeSeconds / 60), arrFee + fee, billedMins, fee);
            }
        }, 1000);
    } else {
        isEnRouteStopped = false;
        if (enRouteTimer) { clearInterval(enRouteTimer); enRouteTimer = null; }
        renderEnRouteStopControls();
    }
}

function syncFeeToServer(arrMins, totalFee, enRouteMins, enRouteFee) {
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
}
`;

const insertPoint = html.lastIndexOf('</script>');
html = html.slice(0, insertPoint) + exactEngine + '\n' + html.slice(insertPoint);

fs.writeFileSync('public/driver.html', html);
console.log('✅ public/driver.html successfully upgraded to exact master waiting workflow!');
