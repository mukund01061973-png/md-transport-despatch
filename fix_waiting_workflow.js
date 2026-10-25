const fs = require('fs');
let html = fs.readFileSync('public/driver.html', 'utf8');

// 1. Remove the old static manual buttons (+1 Min and +Stopover) completely
const manualBtnsRegex = /<div style="display:flex; gap:6px; margin-top:6px;">[\s\S]*?addWaitingFeeManually\(\)[\s\S]*?<\/div>\s*<\/div>/;
html = html.replace(manualBtnsRegex, '');
html = html.replace(/<button[^>]*addWaitingFeeManually[^>]*>[\s\S]*?<\/button>/gi, '');
html = html.replace(/<button[^>]*addStopoverFee[^>]*>[\s\S]*?<\/button>/gi, '');

// 2. Remove any leftover static driverWaitingHUD and pobExtraBox
const hudRegex = /<!-- DRIVER-CONTROLLED WAITING & EN-ROUTE STOPS -->[\s\S]*?<div id="driverWaitingHUD"[\s\S]*?<\/div>\s*<\/div>/;
html = html.replace(hudRegex, '');
html = html.replace(/<div id="driverWaitingHUD"[\s\S]*?<\/div>\s*<\/div>/, '');
html = html.replace(/<div id="pobExtraBox"[\s\S]*?<\/div>/, '');

// 3. Insert our unified clean Waiting Card right above lifecycleActionBtnContainer
const hook = '<div id="lifecycleActionBtnContainer"></div>';
const unifiedWaitingCard = `<!-- DYNAMIC UNIFIED WAITING CONTROL -->
                <div id="unifiedWaitingCard" style="display:none; background:#0f172a; border:1px solid #334155; border-radius:8px; padding:12px; margin-bottom:10px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                        <span id="waitCardTitle" style="font-size:0.85rem; font-weight:700; color:#38bdf8;">⏱️ Arrival Waiting Window</span>
                        <span id="waitCardBadge" style="font-size:0.75rem; padding:2px 8px; border-radius:4px; background:#1e293b; color:#94a3b8; font-weight:700;">Free Grace</span>
                    </div>

                    <div id="waitClockDisplay" style="font-size:1.4rem; font-weight:900; color:#fde047; text-align:center; padding:8px; background:#1e293b; border-radius:6px; font-family:monospace; margin-bottom:8px;">
                        05:00
                    </div>

                    <div id="waitActionBtnBox"></div>
                </div>

                <div id="lifecycleActionBtnContainer"></div>`;

if (!html.includes('id="unifiedWaitingCard"')) {
  html = html.replace(hook, unifiedWaitingCard);
}

// 4. Implement the precise workflow in JavaScript
const jsEngine = `
// ================= PRECISION WAITING & LIFECYCLE CONTROLLER =================
let arrivalGraceTimer = null;
let arrivalGraceSeconds = 300; // 5 mins free grace
let isArrivalGraceExpired = false;

let waitChargeTimer = null;
let chargeableSeconds = 0;
let isWaitChargingActive = false;

let enRouteTimer = null;
let enRouteSeconds = 0;
let isEnRouteWaiting = false;

const WAIT_RATE = 0.35; // £0.35/min

function stopAllWaitingTimers() {
    if (arrivalGraceTimer) { clearInterval(arrivalGraceTimer); arrivalGraceTimer = null; }
    if (waitChargeTimer) { clearInterval(waitChargeTimer); waitChargeTimer = null; }
    if (enRouteTimer) { clearInterval(enRouteTimer); enRouteTimer = null; }
    isWaitChargingActive = false;
    isEnRouteWaiting = false;
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
        stopAllWaitingTimers();
        if (badge) badge.style.background = '#0284c7';
        if (waitCard) waitCard.style.display = 'none';
        if (navBtn) navBtn.textContent = '🗺️ Open Navigation to Pickup';

        container.innerHTML = '<button type="button" class="btn btn-blue" style="width:100%; padding:14px; font-size:1.1rem; font-weight:800; cursor:pointer;" onclick="transitionTrip(\\'Arrived\\')">📍 Mark Arrived at Pickup</button>';
    } 
    else if (st === 'ARRIVED') {
        if (badge) badge.style.background = '#f59e0b';
        if (navBtn) navBtn.textContent = '🗺️ Open Navigation to Pickup';
        if (waitCard) waitCard.style.display = 'block';

        initArrivalGraceWindow();

        container.innerHTML = '<button type="button" class="btn btn-green" style="width:100%; padding:14px; font-size:1.1rem; font-weight:800; cursor:pointer; margin-top:8px;" onclick="transitionTrip(\\'POB\\')">👥 Passenger On Board (POB)</button>';
    } 
    else if (st === 'POB') {
        // Passenger on board -> ARRIVAL WAITING CEASES PERMANENTLY!
        stopAllWaitingTimers();
        if (badge) {
            badge.style.background = '#10b981';
            badge.textContent = 'POB (En Route)';
        }
        if (navBtn) navBtn.textContent = '🗺️ Open Navigation to Destination';
        if (waitCard) waitCard.style.display = 'block';

        renderEnRouteControls();

        container.innerHTML = '<button type="button" class="btn btn-red" style="width:100%; padding:14px; font-size:1.1rem; font-weight:800; cursor:pointer; margin-top:8px;" onclick="transitionTrip(\\'Completed\\')">🏁 Complete &amp; Clear Run</button>';
    } 
    else {
        stopAllWaitingTimers();
        if (waitCard) waitCard.style.display = 'none';
        container.innerHTML = '';
    }
}

// 1. ARRIVAL FREE GRACE COUNTDOWN
function initArrivalGraceWindow() {
    stopAllWaitingTimers();
    arrivalGraceSeconds = 300; // 5 mins free grace
    isArrivalGraceExpired = false;

    const title = document.getElementById('waitCardTitle');
    const badge = document.getElementById('waitCardBadge');
    const clock = document.getElementById('waitClockDisplay');
    const btnBox = document.getElementById('waitActionBtnBox');

    if (title) title.textContent = '⏱️ Free Arrival Grace Window';
    if (badge) {
        badge.textContent = 'Free Period';
        badge.style.background = '#15803d';
        badge.style.color = '#fff';
    }
    if (btnBox) btnBox.innerHTML = '<div style="text-align:center; font-size:0.75rem; color:#94a3b8;">Passenger has 5 minutes free window.</div>';

    updateGraceClockUI();

    arrivalGraceTimer = setInterval(() => {
        arrivalGraceSeconds--;
        updateGraceClockUI();

        if (arrivalGraceSeconds <= 0) {
            clearInterval(arrivalGraceTimer);
            arrivalGraceTimer = null;
            isArrivalGraceExpired = true;
            onGracePeriodExpired();
        }
    }, 1000);
}

function updateGraceClockUI() {
    const clock = document.getElementById('waitClockDisplay');
    if (!clock) return;
    const mins = Math.floor(Math.max(0, arrivalGraceSeconds) / 60);
    const secs = Math.max(0, arrivalGraceSeconds) % 60;
    clock.textContent = String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0');
    clock.style.color = '#fde047';
}

// 2. WHEN FREE GRACE RUNS OUT -> DO NOT AUTO CHARGE! PRESENT DRIVER BUTTON
function onGracePeriodExpired() {
    const title = document.getElementById('waitCardTitle');
    const badge = document.getElementById('waitCardBadge');
    const clock = document.getElementById('waitClockDisplay');
    const btnBox = document.getElementById('waitActionBtnBox');

    if (title) title.textContent = '⏱️ Free Window Expired';
    if (badge) {
        badge.textContent = 'Overdue';
        badge.style.background = '#dc2626';
        badge.style.color = '#fff';
    }
    if (clock) {
        clock.textContent = '00:00';
        clock.style.color = '#ef4444';
    }

    if (btnBox) {
        btnBox.innerHTML = '<button type="button" class="btn" style="width:100%; padding:10px; font-weight:800; background:#dc2626; color:#fff; border-radius:6px; cursor:pointer;" onclick="startChargeableWaiting()">▶️ Start Waiting Charge (£0.35/min)</button>';
    }
}

// 3. DRIVER EXPLICITLY PRESSES CHARGE BUTTON
function startChargeableWaiting() {
    if (waitChargeTimer) clearInterval(waitChargeTimer);
    chargeableSeconds = 0;
    isWaitChargingActive = true;

    const title = document.getElementById('waitCardTitle');
    const badge = document.getElementById('waitCardBadge');
    const btnBox = document.getElementById('waitActionBtnBox');

    if (title) title.textContent = '⏱️️ Waiting Charge Running';
    if (badge) {
        badge.textContent = 'Charging Active';
        badge.style.background = '#b91c1c';
        badge.style.color = '#fff';
    }

    if (btnBox) {
        btnBox.innerHTML = '<button type="button" class="btn" style="width:100%; padding:10px; font-weight:800; background:#475569; color:#fff; border-radius:6px; cursor:pointer;" onclick="pauseChargeableWaiting()">⏸️ Pause Waiting Charge</button>';
    }

    waitChargeTimer = setInterval(() => {
        chargeableSeconds++;
        const mins = Math.floor(chargeableSeconds / 60);
        const secs = chargeableSeconds % 60;
        const totalChargedMins = Math.ceil(chargeableSeconds / 60);
        const fee = (totalChargedMins * WAIT_RATE);

        const clock = document.getElementById('waitClockDisplay');
        if (clock) {
            clock.innerHTML = '+' + String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0') + ' <span style="font-size:0.9rem; color:#f87171;">(+£' + fee.toFixed(2) + ')</span>';
        }

        if (chargeableSeconds % 10 === 0) {
            syncWaitingFee(totalChargedMins, fee);
        }
    }, 1000);
}

function pauseChargeableWaiting() {
    if (waitChargeTimer) { clearInterval(waitChargeTimer); waitChargeTimer = null; }
    isWaitChargingActive = false;
    const badge = document.getElementById('waitCardBadge');
    const btnBox = document.getElementById('waitActionBtnBox');
    if (badge) {
        badge.textContent = 'Paused';
        badge.style.background = '#ca8a04';
    }
    if (btnBox) {
        btnBox.innerHTML = '<button type="button" class="btn" style="width:100%; padding:10px; font-weight:800; background:#2563eb; color:#fff; border-radius:6px; cursor:pointer;" onclick="resumeChargeableWaiting()">▶️ Resume Waiting Charge</button>';
    }
}

function resumeChargeableWaiting() {
    startChargeableWaiting();
}

// 4. EN-ROUTE STOPOVER / MID-TRIP DELAY ENGINE (POB)
function renderEnRouteControls() {
    const title = document.getElementById('waitCardTitle');
    const badge = document.getElementById('waitCardBadge');
    const clock = document.getElementById('waitClockDisplay');
    const btnBox = document.getElementById('waitActionBtnBox');

    if (title) title.textContent = '🚗 En-Route Stop & Wait';
    if (badge) {
        badge.textContent = 'Idle';
        badge.style.background = '#334155';
        badge.style.color = '#94a3b8';
    }
    if (clock) {
        clock.textContent = '00:00';
        clock.style.color = '#38bdf8';
    }

    if (btnBox) {
        btnBox.innerHTML = '<button type="button" class="btn" id="btnEnRouteToggle" style="width:100%; padding:10px; font-weight:800; background:#d97706; color:#fff; border-radius:6px; cursor:pointer;" onclick="toggleEnRouteStop()">🛑 Passenger Stopped (Start Stopover Wait)</button>';
    }
}

function toggleEnRouteStop() {
    const btn = document.getElementById('btnEnRouteToggle');
    const badge = document.getElementById('waitCardBadge');

    if (!isEnRouteWaiting) {
        isEnRouteWaiting = true;
        if (btn) {
            btn.textContent = '▶️ Passenger Returned (Resume Journey)';
            btn.style.background = '#15803d';
        }
        if (badge) {
            badge.textContent = 'Vehicle Stopped';
            badge.style.background = '#b45309';
            badge.style.color = '#fff';
        }

        enRouteTimer = setInterval(() => {
            enRouteSeconds++;
            const mins = Math.floor(enRouteSeconds / 60);
            const secs = enRouteSeconds % 60;
            const chargedMins = Math.ceil(enRouteSeconds / 60);
            const stopFee = (chargedMins * WAIT_RATE);

            const clock = document.getElementById('waitClockDisplay');
            if (clock) {
                clock.innerHTML = String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0') + ' <span style="font-size:0.9rem; color:#fde047;">(+£' + stopFee.toFixed(2) + ')</span>';
            }

            if (enRouteSeconds % 10 === 0) {
                syncWaitingFee(chargedMins, stopFee);
            }
        }, 1000);
    } else {
        isEnRouteWaiting = false;
        if (enRouteTimer) { clearInterval(enRouteTimer); enRouteTimer = null; }
        if (btn) {
            btn.textContent = '🛑 Passenger Stopped Again';
            btn.style.background = '#d97706';
        }
        if (badge) {
            badge.textContent = 'Journey In Motion';
            badge.style.background = '#1e293b';
            badge.style.color = '#38bdf8';
        }
    }
}

function syncWaitingFee(mins, fee) {
    const trip = activeTrip || currentTrip;
    if (!trip || !trip.id) return;
    const baseFare = parseFloat(trip.fare || 0);
    extraChargesTotal = parseFloat(fee || 0);
    updateTotalFareDisplay();

    if (typeof socket !== 'undefined') {
        socket.emit('driver_update_waiting', {
            jobId: trip.id,
            arrivalWaitMins: mins,
            enRouteWaitMins: 0,
            waitingCharge: fee,
            totalFare: (baseFare + fee).toFixed(2)
        });
    }
}
`;

// Insert jsEngine before script ends
const scriptEnd = '</script>';
const lastScriptIdx = html.lastIndexOf(scriptEnd);
if (lastScriptIdx !== -1) {
  html = html.slice(0, lastScriptIdx) + jsEngine + '\n' + html.slice(lastScriptIdx);
}

fs.writeFileSync('public/driver.html', html);
console.log('✅ Driver waiting workflow rewritten with zero conflicts!');
